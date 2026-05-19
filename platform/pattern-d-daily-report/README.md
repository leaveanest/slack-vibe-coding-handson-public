# Pattern D — Daily Report (Slack Platform / Deno SDK)

> Link Trigger で起動するフォームに日報を書き、OpenAI で Slack mrkdwn に整形してチャンネルに投稿する Slack Automation アプリ。

## お題

Slack のチャンネルから "日報を書く" リンクをクリックするとフォームが開く。
フォームで「今日やったこと / 明日やること / 所感 / 投稿先チャンネル」を入力して送信すると、
裏で OpenAI が Slack mrkdwn 形式に整形し、指定チャンネルにキレイな日報として投稿される。

```text
[Link Trigger]  →  [OpenForm]  →  [Custom Function: OpenAI で整形]  →  [SendMessage]
```

## 触れる技術

- **Slack Platform (Deno SDK 2.x)**
  - Manifest / Workflow / Custom Function / Link Trigger
  - 組み込み Slack Function: `OpenForm`, `SendMessage`
- **Deno + TypeScript** (型付きの workflow チェイン)
- **OpenAI Chat Completions API** を Deno-native `fetch` で直接呼ぶ
- **`slack` CLI** によるローカル実行 / デプロイ / トリガー登録

## 想定時間

**30〜35 分** (Codex で生成 → 動作確認 → 微修正の往復含む)

| フェーズ | 目安 |
| --- | --- |
| 0. 環境準備 (`slack login` / `.env`) | 5 分 |
| 1. Codex でひな型生成 | 5 分 |
| 2. manifest / workflow / function 整備 | 10 分 |
| 3. `slack run` でローカル起動 + Link Trigger 登録 | 5 分 |
| 4. チャンネルで動作確認 + プロンプト微調整 | 10 分 |

## ディレクトリ構成

```text
pattern-d-daily-report/
├── README.md
├── HINTS.md
├── manifest.ts                       # アプリ全体の宣言 (関数/WF/scope/外部ドメイン)
├── slack.json                        # slack CLI ← deno-slack-hooks の橋渡し
├── deno.json                         # imports map / tasks
├── .env.example                      # OPENAI_API_KEY などのテンプレート
├── functions/
│   └── format_daily_report.ts        # Custom Function: OpenAI 呼び出し
├── workflows/
│   └── daily_report_workflow.ts      # OpenForm → format → SendMessage
└── triggers/
    └── link_trigger.ts               # Link Trigger 定義
```

## slack CLI でのセットアップ手順

> 前提: `slack` CLI / Deno 2.x がインストール済み (リポジトリ root の [SETUP.md](../../SETUP.md) 参照)。

```bash
# 1. このディレクトリに移動
cd platform/pattern-d-daily-report

# 2. Slack ワークスペースにログイン (初回のみ)
slack login
slack auth list

# 3. 環境変数を準備
cp .env.example .env
# .env を編集して OPENAI_API_KEY を入れる

# 4. ローカル実行 (hot reload あり)
slack run
#   ↑ 初回はワークスペース選択を聞かれる。dev 用ワークスペースを選ぶ。

# 5. 別ターミナルで Link Trigger を登録 (slack run 中のままで OK)
slack trigger create --trigger-def triggers/link_trigger.ts
#   → 発行された URL をコピー

# 6. Slack のチャンネルにその URL を貼り付ける
#   → "日報を書く" ボタンになる → クリックでフォームが開く
```

本番デプロイ:

```bash
slack deploy
slack env add OPENAI_API_KEY sk-xxxxx   # クラウド側にも env を登録
slack trigger create --trigger-def triggers/link_trigger.ts
```

## Codex での生成例

このパターンは Codex に対して、次のようなプロンプトで生成できます。

Platform アプリの `manifest.ts` / `slack.json` / Trigger / Custom Function で詰まった場合は、実運用に近い参考実装として [leaveanest/slack-utils-channel](https://github.com/leaveanest/slack-utils-channel) を確認してください。関連サービス紹介: [Slack Utils Channel](https://slack-utils.lne.st/)

```text
Slack Platform (Deno SDK 2.x) で日報投稿アプリを作って。

要件:
- Link Trigger を貼ったチャンネルから起動
- フォーム: today (長文必須) / tomorrow (長文必須) / feeling (長文任意) / channel (channel_id 必須)
- OpenForm → Custom Function → SendMessage の 3 ステップワークフロー
- Custom Function は fetch で OpenAI Chat Completions を呼び、
  Slack mrkdwn 形式に整形した文字列を返す
- 環境変数 OPENAI_API_KEY は SlackFunction の env から読む
- manifest.ts は functions / workflows / outgoingDomains / botScopes を明示する
- Custom Function の source_file は manifest.ts からの相対パスで
  "functions/format_daily_report.ts" と書く ("./" は付けない)
- Workflow input は interactivity / channel / user を受け取り、OpenForm に interactivity を渡す
- Trigger は Trigger<typeof DailyReportWorkflow.definition> 型、TriggerTypes.Shortcut、
  TriggerContextData.Shortcut.interactivity / channel_id / user_id を使う
- manifest の outgoingDomains に "api.openai.com" を入れ、botScopes は
  commands / chat:write / chat:write.public を入れる
- slack.json は deno-slack-hooks の get-hooks、manifest.ts、local の env_file ".env" を設定する
- ファイル構成: manifest.ts / slack.json / deno.json / .env.example /
  functions/format_daily_report.ts / workflows/daily_report_workflow.ts /
  triggers/link_trigger.ts
```

詰まったら [HINTS.md](./HINTS.md) を順番にめくってください。

## 動作確認チェックリスト

実装が完了したら、以下を順にチェック:

- [ ] `deno check manifest.ts` がエラーなく通る (型整合性 OK)
- [ ] `slack run` がエラーなく起動し、`Connected, awaiting events` 相当のログが出る
- [ ] `slack trigger create --trigger-def triggers/link_trigger.ts` で URL が払い出される
- [ ] その URL を Slack の任意のチャンネルに貼ると "日報を書く" ボタン (Link Trigger) になる
- [ ] ボタンをクリックすると、4 項目 (today / tomorrow / feeling / channel) のフォームモーダルが開く
- [ ] フォーム送信後、指定チャンネルに `:memo: <@USER> さんの日報` で始まるメッセージが投稿される
- [ ] メッセージ内で `*今日やったこと*` などが **太字** として正しくレンダリングされる (Slack mrkdwn になっている)
- [ ] `feeling` を空欄で送ると、その「所感」セクションが省略されている
- [ ] OPENAI_API_KEY を意図的に外すと、わかりやすいエラーメッセージがログに出る (ハンドリング確認)
- [ ] `slack deploy` 後、`slack env add OPENAI_API_KEY ...` を済ませれば本番でも同じ挙動になる
