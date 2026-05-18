# 案 I キーワード見守り Bot — 詰まりやすいポイント集

---

## ① `message.channels` イベントが届かない

### Lv1 ヒント — 方向

`message.channels` はチャンネル内の **すべての** メッセージを Bot に流すので、Slack 的にも権限がそれなりに重く、設定の取りこぼしが多いイベントです。

### Lv2 ヒント — 設定

- Event Subscriptions に **`message.channels`** を Subscribe(`message` ではない)
- スコープ: `channels:history`(public) / `groups:history`(private)
- Bot を **対象チャンネルに招待**(必須)

### Lv3 ヒント — DM

DM のキーワード見張りは **本パターン対象外**(`message.im` が必要)。「うちのチャンネルだけ見守ってほしい」用途で MVP は十分。

---

## ② 自分の DM 通知でループする

### Lv1 ヒント — 方向

Bot 自身が `chat.postMessage` で投稿した通知も、その通知先チャンネルでイベントとして飛んでくる可能性があります。フィルタしないと無限ループ。

### Lv2 ヒント — 自分の user_id でガード

```ts
const auth = await app.client.auth.test({ token: process.env.SLACK_BOT_TOKEN });
const botUserId = auth.user_id;

// in handler:
if (event.user === botUserId) return;
```

### Lv3 ヒント — subtype チェック

Bot の通知投稿は subtype が `bot_message` や undefined。Bot Token を使った投稿は自動的に subtype 付きで来るので、`if ("subtype" in event && event.subtype) return;` で雑に弾けます。

---

## ③ DM の送り方が分からない

### Lv1 ヒント — 方向

意外な仕様: `chat.postMessage` の `channel` 引数に **ユーザー ID をそのまま** 渡すと、Slack が自動で Bot とそのユーザーの DM チャンネルを開いてくれます。

### Lv2 ヒント — コード

```ts
await client.chat.postMessage({
  channel: process.env.NOTIFY_USER_ID, // "U0123ABCD"
  text: "通知です",
});
```

`conversations.open` で DM channel id を取り直す必要はありません。

### Lv3 ヒント — スコープ

`im:write` が必要(Bot が DM を **開く** 権限)。`chat:write` だけだと `not_allowed_token_type` 等になることが。

---

## ④ キーワードマッチが大文字小文字でハマる

### Lv1 ヒント — 方向

`String.prototype.includes` は case-sensitive。`deploy` と `Deploy` をマッチさせたいなら両方小文字化が必要です。

### Lv2 ヒント — 起動時に正規化

```ts
const KEYWORDS = process.env.WATCH_KEYWORDS!
  .split(",")
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

function hit(text: string) {
  const lower = text.toLowerCase();
  return KEYWORDS.some(k => lower.includes(k));
}
```

### Lv3 ヒント — 単語境界

「リリース」を「プレリリース」でも拾ってしまうのが嫌な場合は、正規表現の `\b` を使う必要があります(ただし日本語には `\b` が効きません)。MVP では部分一致で OK。

---

## ⑤ 同じメッセージで複数回通知される

### Lv1 ヒント — 方向

Slack は同じメッセージ ts に対して、編集や、何らかの理由でイベントを再送することがあります。

### Lv2 ヒント — 簡易 dedup

```ts
const processed = new Set<string>();
const key = `${event.channel}:${event.ts}`;
if (processed.has(key)) return;
processed.add(key);
```

### Lv3 ヒント — メモリリーク対策

`processed` Set はプロセス再起動でリセットされるが、長時間稼働だとメモリが伸びます。対策(MVP 不要): 1 時間ごとにクリアする、または `Map<ts, expireAt>` で TTL を持たせる。
