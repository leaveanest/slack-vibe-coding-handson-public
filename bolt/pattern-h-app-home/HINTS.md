# 案 H App Home — 詰まりやすいポイント集

---

## ① App Home にフォームが表示されない

### Lv1 ヒント — 方向

App Home 機能は **デフォルト OFF**。アプリ管理画面で明示的に有効化する必要があります。

### Lv2 ヒント — 設定

- App settings → **App Home** → 「Home Tab」を ON
- Event Subscriptions → `app_home_opened` を Subscribe
- スコープは `chat:write` のみで OK(views.publish 用の特別な scope 不要)

### Lv3 ヒント — UI の反映タイミング

Home tab を ON にしても、Slack クライアント側のキャッシュで反映されないことがあります。
ワークスペースから一度 Bot を **アンインストール → 再インストール** すると確実。

---

## ② Block Kit の JSON 構造に頭が痛い

### Lv1 ヒント — 方向

[Block Kit Builder](https://app.slack.com/block-kit-builder) で組み立て→コピペが最速です。

### Lv2 ヒント — ホームタブの最小構造

```json
{
  "type": "home",
  "blocks": [
    { "type": "header", "text": { "type": "plain_text", "text": "Title" } },
    {
      "type": "input",
      "block_id": "today_block",
      "label": { "type": "plain_text", "text": "今日やったこと" },
      "element": { "type": "plain_text_input", "action_id": "today_input", "multiline": true }
    },
    {
      "type": "actions",
      "elements": [
        { "type": "button", "text": { "type": "plain_text", "text": "送信" }, "action_id": "daily_report_submit" }
      ]
    }
  ]
}
```

### Lv3 ヒント — 補足

- `optional: true` を付けない input ブロックは未入力で送信されると Slack 側で送信ボタンが押せなくなることが
- ホームタブには **モーダルの "submit" は使えない**。ボタンの `action_id` でハンドラを書く

---

## ③ 送信ボタンを押しても値が取れない

### Lv1 ヒント — 方向

App Home の action ハンドラでは `body.view.state.values` から値を引きます。`payload` や `event` ではないので注意。

### Lv2 ヒント — コード

```ts
app.action("daily_report_submit", async ({ ack, body, client }) => {
  await ack();
  if (body.type !== "block_actions" || !("view" in body) || !body.view) return;
  const values = body.view.state.values;
  const today = values["today_block"]["today_input"].value;
});
```

### Lv3 ヒント — 型エラー

`body.view` は optional のため TypeScript で undefined ガードが必要。`"view" in body` で narrowing するのが安全。

---

## ④ 投稿先チャンネルがハードコードされてしまう

### Lv1 ヒント — 方向

Codex は親切に specific な channel id を埋めがちですが、ハンズオン後にチャンネル変えるのが面倒。**最初から環境変数化** しましょう。

### Lv2 ヒント — .env

```env
REPORT_CHANNEL_ID=C0123ABCD
```

```ts
const REPORT_CHANNEL_ID = process.env.REPORT_CHANNEL_ID!;
await client.chat.postMessage({ channel: REPORT_CHANNEL_ID, text: "..." });
```

### Lv3 ヒント — channel id の調べ方

Slack のチャンネル詳細から「リンクをコピー」すると `https://example.slack.com/archives/C0123ABCD` → 末尾の `C...` が ID。

---

## ⑤ 送信後にフォームが残って二重送信される

### Lv1 ヒント — 方向

送信が成功したら、ホームタブの内容を「送信済みです」表示に **差し替えて** あげると、ユーザーが混乱しません。

### Lv2 ヒント — 再 publish

```ts
await client.views.publish({
  user_id: body.user.id,
  view: buildHomeView(":white_check_mark: 投稿しました。"),
});
```

### Lv3 ヒント — ユーザー単位

`views.publish` はユーザーごとに独立。複数人が同時に使ってもお互いに影響しません。
