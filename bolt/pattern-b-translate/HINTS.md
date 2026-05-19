# 案 B 国旗翻訳 Bot — 詰まりやすいポイント集

Codex で生成中に詰まったらここを覗いてください。段階的ヒントです。**最初の段だけ見て自分で試す** のがおすすめ。

---

## ① リアクションを付けても Bot が反応しない

### Lv1 ヒント — 方向

リアクション系イベントは Bot Token Scopes と Event Subscriptions の **両方** が必要です。どちらか抜けてないか確認。

### Lv2 ヒント — 必要設定

| 項目 | 値 |
| --- | --- |
| Event Subscriptions | `reaction_added` を Subscribe |
| Bot Token Scope | `reactions:read` |
| メッセージ取得用 Scope | `channels:read`, `channels:history`, `groups:read`, `groups:history` |
| 投稿用 Scope | `chat:write` |

### Lv3 ヒント — チャンネル招待

Bot をリアクション対象のチャンネルに **招待** していますか? Public でも明示的に `/invite @translate-bot` が必要。
あと、スコープ追加後は **Reinstall to Workspace** で Bot Token を再発行しないと反映されません。

---

## ② 国旗の short name がワークスペース毎に違う

### Lv1 ヒント — 方向

Slack のリアクション short name(`event.reaction` に来る文字列)はワークスペースの emoji セットに依存します。`us` と `flag-us` のどっちで来るか、最初は予測できません。

### Lv2 ヒント — 両対応する

マッピングのキーに両方を入れておくのが安全:

```ts
const flagToLang = {
  us: "en", "flag-us": "en",
  jp: "ja", "flag-jp": "ja",
  // ...
};
```

### Lv3 ヒント — 確認方法

`app.event("reaction_added", async ({ event, logger }) => { logger.info(event.reaction); })` で
ログに出してから、自分のワークスペースで実際に飛んでくる名前を確かめると確実。

---

## ③ 翻訳結果に「以下が翻訳です:」みたいな前置きが付く

### Lv1 ヒント — 方向

OpenAI のデフォルト応答はおせっかいで丁寧。プロンプトで「説明を一切付けるな」と縛る必要があります。

### Lv2 ヒント — 厳しい system prompt

```text
You translate Slack messages into <LANG>. Return ONLY the translation.
Do not add explanations, quotation marks, or any preface.
Preserve emojis and user mentions (<@U...>) verbatim.
```

### Lv3 ヒント — temperature

`temperature: 0.2` 程度に下げると訳ブレが減ります。デフォルト(1.0)だと毎回違う訳になり、テストしづらい。

---

## ④ 同じ国旗が連続で付くと二重投稿される

### Lv1 ヒント — 方向

`reaction_added` イベントは **リアクションごとに毎回飛んできます**。同じ国旗が 2 人から付くと 2 回ハンドラが走る → 2 回投稿。

### Lv2 ヒント — count を見る

`reactions.get` の戻り値に各リアクションの `count` がついています。`count > 1` なら **2 人目以降** ということなのでスキップ。

```ts
const result = await client.reactions.get({ channel, timestamp, full: true });
const r = result.message.reactions.find(r => r.name === event.reaction);
if (r && r.count > 1) return;
```

### Lv3 ヒント — 完璧を目指すなら

レースコンディション(ほぼ同時に 2 人が付ける)では `count` が両方とも 1 に見えることがあります。
完璧を目指すなら、`${channel}:${ts}:${reaction}` をキーにした in-memory Set で重複検出するのもアリ。
ハンズオン教材としては count 判定で十分。

---

## ⑤ Bot 自身が国旗を付けると無限ループする

### Lv1 ヒント — 方向

Bot 自身が `chat.postMessage` で投稿した翻訳に、誰かが別の国旗を付けたらまた翻訳が走る…まではいいが、**Bot 自身がリアクションを付けたとき** に反応すると無限ループのリスク。

### Lv2 ヒント — 自分の user_id を覚える

起動時に `auth.test` で自分の `user_id` を取得してキャッシュし、ハンドラの先頭でガード:

```ts
if (event.user === botUserId) return;
```

### Lv3 ヒント — auth.test のタイミング

`app.start()` の **後** で `client.auth.test()` を呼ぶ。Socket Mode の接続前に呼ぶと token に対する WebClient が初期化されていないこともあり、ハマりがち。
