# 案 A `/summarize` — 詰まりやすいポイント集

Codex で生成中に詰まったらここを覗いてください。段階的にヒントを書いています。
**いきなり最後の段を読まずに**、まず最初の方向ヒントだけ見て自分で試すのがおすすめです。

---

## ① Slash Command が Slack に届かない

### Lv1 ヒント — 方向

「Slack 側の設定」と「ローカル側の起動」の **両方** が必要です。どちらが原因かを切り分けましょう。

### Lv2 ヒント — 切り分け

- ローカル: `npm run dev` のログに `⚡️ /summarize bolt app is running` が出ているか？
- Slack: アプリ管理画面 ([api.slack.com/apps](https://api.slack.com/apps)) で
  - 「Socket Mode」が **ON**
  - 「Slash Commands」に `/summarize` が登録済み
  - 「OAuth & Permissions」で Bot Token Scope に `commands` がある
  - App をワークスペースに **再インストール** したか（Scopes 変更後は再インストール必須）

### Lv3 ヒント — よくある原因

`SLACK_APP_TOKEN` が `xoxb-` で始まっていたりしないか確認してください。
App-Level Token は **`xapp-`** で始まります。`xoxb-` は Bot Token です。
混同すると `WebClient` が握っているように見えて Socket 接続だけ失敗します。

---

## ② 3 秒で `command_response_too_late` エラーが出る

### Lv1 ヒント — 方向

Slack は Slash Command 受信後 **3 秒以内** に何か返さないと、ユーザー側に「操作のタイムアウト」と表示してしまいます。重い処理は ack の後にずらしましょう。

### Lv2 ヒント — 構造

```ts
app.command('/summarize', async ({ ack, command, client, respond }) => {
  await ack();             // ← まずこれを最初に呼ぶ
  // ↓ 以降は時間がかかっても OK（OpenAI 呼び出し等）
  const summary = await heavyTask();
  await respond({ ... });
});
```

### Lv3 ヒント — 検証方法

`ack()` の直後に `console.time/timeEnd` を挟んで、`ack()` が 1 秒以内に走っているか確認すると、原因が ack 漏れか OpenAI 呼び出しかが切り分けやすいです。

---

## ③ `conversations.replies` で `missing_scope` エラー

### Lv1 ヒント — 方向

スコープ不足です。`commands` だけでは足りません。

### Lv2 ヒント — 必要スコープ

| スコープ | 用途 |
| --- | --- |
| `commands` | Slash Command を受ける |
| `channels:history` | パブリックチャンネルのメッセージ取得 |
| `groups:history` | プライベートチャンネルのメッセージ取得 |
| `chat:write` | `postEphemeral` でメッセージ送信 |

### Lv3 ヒント — 反映タイミング

「OAuth & Permissions」でスコープを追加したら **必ず「Reinstall to Workspace」をクリック** してください。スコープは追加しただけでは Bot Token に反映されません。

---

## ④ `chat.postEphemeral` がエフェメラルにならない / 表示されない

### Lv1 ヒント — 方向

`postEphemeral` には特殊な制約があります。「どこに」「誰に」を両方正しく指定しないと黙って失敗します。

### Lv2 ヒント — チェックポイント

- `user` パラメータに「実行者の user_id」を渡しているか？
- `channel` パラメータは Slash Command 実行チャンネルになっているか？
- `thread_ts` を渡している場合、それが **その channel に実在する** か？

### Lv3 ヒント — 落とし穴

DM チャンネルでは Bot がそのユーザーと既に DM スレッドを開いていないと
`channel_not_found` になることがあります。テスト用パブリックチャンネルで動作確認するのが安全です。

---

## ⑤ OpenAI 応答が返ってこない / 文字化けする

### Lv1 ヒント — 方向

入力の組み立て、モデル名、API キーの権限のどれかです。順に切り分けましょう。

### Lv2 ヒント — 切り分け

```bash
# CLI で素のリクエストを試す
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"hello"}]}'
```

これが通れば API キーは生きています。アプリ側のプロンプト or 投稿者列挙の文字列処理を見直し。

### Lv3 ヒント — トークン超過

スレッドが極端に長いとプロンプトがコンテキスト長を超えます。`limit: 200` で `conversations.replies` を絞ったり、`messages` を末尾 N 件だけ取るなど。

---

## おまけ: thread_ts の取り出し方

Slack の UI で「メッセージにカーソル合わせ → :link: コピー」すると URL が:

```text
https://example.slack.com/archives/C0123/p1715000000123456
```

末尾の `p1715000000123456` を `1715000000.123456` に変換した値が `thread_ts` です。
`src/index.ts` の `parseThreadTs` 関数がどちらの形式にも対応しています。
