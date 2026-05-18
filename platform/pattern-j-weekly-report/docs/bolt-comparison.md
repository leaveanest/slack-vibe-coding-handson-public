# Bolt 版で同じことを実現するとどうなるか

「毎週金曜 18:00 JST に Slack チャンネルの履歴を要約して投稿する」アプリを、従来の **Bolt フレームワーク** で組んだ場合と、本パターン (Slack Platform / Deno SDK の **Scheduled Trigger**) で組んだ場合の比較です。

## TL;DR

| 観点 | Bolt (Node/Python) | Slack Platform (Deno SDK) |
|---|---|---|
| スケジューラ | 自前で用意 (cron, Cloud Scheduler, GH Actions...) | **manifest + trigger ファイル**だけで済む |
| ホスティング | **24 時間稼働するプロセス**が必要 | 不要 (Slack インフラが実行) |
| 認証 | xoxb トークンの管理 | 自動 (Workflow 内で `client` が払い出される) |
| Secrets | 別途 KMS / Secret Manager / `.env` を準備 | `slack env add` で完結 |
| 監査ログ | アプリ側で実装 | Slack Admin Audit Logs に自動記録 |
| デプロイ手順 | Docker build → push → revision update → IAM 設定... | `slack deploy` 一発 |
| 月額コスト | Cloud Run + Cloud Scheduler などの稼働費 | Slack のプラン費に含まれる |

ひとことで言うと、**Scheduled Trigger を使うと「定期実行する仕組み」を自前で持たなくてよくなる**のが最大の差です。

---

## Bolt で組む場合に必要なもの

実は Bolt そのものは **イベント駆動** のフレームワークで、スケジューラ機能は持っていません。
「毎週金曜 18:00 に何かする」を実現するには、**Slack の外側にトリガーを置く必要**があります。代表的な構成:

### 構成 A: Cloud Run + Cloud Scheduler

```text
+-----------------+   HTTP POST    +-----------------------+   chat.postMessage   +-------+
| Cloud Scheduler | -------------> | Cloud Run (Bolt app)  | -------------------> | Slack |
| (cron: 18 * 5)  |  every Fri     | weekly-report-handler |                      |       |
+-----------------+   18:00 JST    +-----------------------+                      +-------+
```

- Cloud Run の Service Account を `cloudscheduler.invoker` で許可
- `OPENAI_API_KEY` / `SLACK_BOT_TOKEN` は Secret Manager に格納してマウント
- Cloud Scheduler の cron 表現は `0 18 * * 5` + `timeZone: Asia/Tokyo`
- 死活監視・ログ転送 (Cloud Logging) の設定も必要

### 構成 B: Fly.io / Render / EC2 + node-cron

- 24 時間稼働する 1 プロセスが必要 (= 月額固定費)
- node-cron 等で `node-cron.schedule('0 18 * * 5', ..., { timezone: 'Asia/Tokyo' })`
- プロセス再起動時にもタイマーが失われない保証が要る

### 構成 C: GitHub Actions schedule

- `.github/workflows/weekly-report.yml` に `on: schedule: cron: '0 9 * * 5'` (UTC) を書く
- ベスト・エフォートで最大 1 時間遅延、Friday の Slack 稼働時間に間に合わない可能性
- 認証情報は GitHub Secrets

いずれの場合も、**Slack 外** のスケジューラ + 24 時間アクセス可能なエンドポイント (またはランナー) を運用する必要があります。

---

## サンプルコード比較

### Bolt for JavaScript (Cloud Run 想定)

```javascript
// app.js
import { App, ExpressReceiver } from '@slack/bolt';
import OpenAI from 'openai';

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
});
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Cloud Scheduler から HTTP POST されるエンドポイント
receiver.router.post('/cron/weekly', async (req, res) => {
  // 認証 (OIDC token 検証 など) を自前で実装する必要あり
  if (req.header('X-CloudScheduler') !== 'true') {
    return res.status(401).send('unauthorized');
  }

  const sourceChannel = process.env.SOURCE_CHANNEL;
  const destChannel = process.env.DEST_CHANNEL;
  const oldest = Math.floor(Date.now() / 1000) - 7 * 86400;

  // ページネーションも自前
  const messages = [];
  let cursor;
  do {
    const resp = await app.client.conversations.history({
      channel: sourceChannel,
      oldest: String(oldest),
      limit: 1000,
      cursor,
    });
    messages.push(...resp.messages);
    cursor = resp.response_metadata?.next_cursor || undefined;
  } while (cursor);

  const human = messages.filter(m => !m.bot_id && !m.subtype && m.user);
  const prompt = human.reverse().map(m => `<@${m.user}> ${m.text}`).join('\n');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Slack 週次サマリを作る編集者です...' },
      { role: 'user', content: prompt },
    ],
  });

  await app.client.chat.postMessage({
    channel: destChannel,
    text: completion.choices[0].message.content,
  });

  res.status(200).send('ok');
});

const port = process.env.PORT || 8080;
receiver.app.listen(port);
```

加えて以下が **すべて手作業** で必要:

- `Dockerfile` を書いて `gcloud run deploy`
- Service Account を作って `roles/secretmanager.secretAccessor` を付与
- Secret Manager に `SLACK_BOT_TOKEN`, `OPENAI_API_KEY` を作成
- Cloud Scheduler ジョブを作成: `gcloud scheduler jobs create http weekly-report --schedule='0 18 * * 5' --time-zone='Asia/Tokyo' --uri='https://...run.app/cron/weekly' --oidc-service-account-email=...`
- ログモニタリング・アラート設定

### Slack Platform (Deno SDK) — このリポジトリ

```typescript
// triggers/scheduled_trigger.ts
const trigger: Trigger<typeof WeeklyReportWorkflow.definition> = {
  type: TriggerTypes.Scheduled,
  name: "Weekly Report (Fri 18:00 JST)",
  workflow: `#/workflows/${WeeklyReportWorkflow.definition.callback_id}`,
  inputs: {
    source_channel: { value: "C0123456789" },
    dest_channel: { value: "C0123456789" },
  },
  schedule: {
    start_time: nextFridayAt18JstIso(),
    timezone: "Asia/Tokyo",
    frequency: { type: "weekly", on_days: ["Friday"], repeats_every: 1 },
  },
};
export default trigger;
```

デプロイは:

```bash
slack deploy
slack trigger create --trigger-def triggers/scheduled_trigger.ts
```

これだけ。Cloud Scheduler も Service Account も Docker も不要です。

---

## なぜこんな差が出るのか

Slack Platform (Deno SDK) は、Slack 自身が次のレイヤーをホストしてくれているからです:

1. **関数の実行ランタイム** (V8 / Deno isolate)
2. **Scheduled Trigger のクーロン基盤** (Asia/Tokyo を含む各タイムゾーン対応)
3. **OAuth トークンの自動払い出し** (Workflow 内 `client` に自動注入)
4. **Secrets ストレージ** (`slack env add` で完結)
5. **実行ログ閲覧** (`slack activity --tail`)

Bolt は「Slack へ送る・Slack から受ける」アプリのフレームワークなので、**実行の起点となるスケジューラとホスティング** は引き続き開発者が用意する必要があります。

---

## どっちを選ぶべき?

| ケース | おすすめ |
|---|---|
| 「Slack 内で完結する自動化」が主目的 | **Slack Platform (Deno SDK)** |
| データベース・既存のマイクロサービスを大量に呼ぶ | Bolt (or 既存システム + Webhook Trigger) |
| Enterprise Grid の細かい統制が必要 | 両方検証 (Platform 側に未対応機能の可能性) |
| 数十秒以上かかる重いバッチ | Bolt + Cloud Run (Platform の関数は実行時間制限がある) |
| 「とりあえず週報を Slack に流したい」 | **Slack Platform (Deno SDK)** ← 本パターン |

定期実行 + Slack への投稿だけ、というユースケースなら Slack Platform の Scheduled Trigger が圧倒的に楽です。
複雑な外部システム連携やストリーミング処理が混ざってくる場合は、Webhook Trigger 経由で Bolt / Cloud Run と組み合わせるハイブリッドも検討しましょう。
