# 案 C メンション Bot — 詰まりやすいポイント集

---

## ① `app_mention` が来ない

### Lv1 ヒント — 方向

`app_mention` イベントは「Bot を **直接** メンション」した時だけ飛びます。間違えやすいパターンに注意。

### Lv2 ヒント — チェック

- Event Subscriptions に `app_mention` を **追加** したか
- Bot Token Scope に `app_mentions:read` を入れたか
- スコープ追加後に **Reinstall to Workspace** したか
- Bot を **対象チャンネルに招待** したか(`/invite @qa-bot`)

### Lv3 ヒント — 紛らわしい挙動

`<@bot> hello` ではなく `<!everyone>` で来た場合は `app_mention` ではなく `message.channels` イベントになります。ハマったら `logger.info(event)` で型を確認。

---

## ② 質問テキストにメンション `<@U…>` が残る

### Lv1 ヒント — 方向

Slack の event.text には自分宛のメンションが `<@U12345>` の形でそのまま入っています。これを LLM に渡すと「U12345」を人物名と勘違いされることが。

### Lv2 ヒント — 除去

```ts
const stripped = text.replace(new RegExp(`<@${botId}>`, "g"), "").trim();
```

### Lv3 ヒント — 自分以外も剥がす

質問内に第三者のメンション (`<@U67890>`) を残したい場合もあるので、**自分宛だけ** を消すのが上品。ID 不明時の保険として `<@[^>]+>` を全部消すフォールバックを噛ませる。

---

## ③ トークン上限超過 (`context_length_exceeded`)

### Lv1 ヒント — 方向

長期間使われているチャンネルだと、500 件取って全部投げるとコンテキスト長を超えます。固定上限が必須。

### Lv2 ヒント — 戦略

`HISTORY_LIMIT` 環境変数 (デフォルト 50) で件数を固定。`conversations.history` の `limit` パラメータに渡す。

```ts
const result = await client.conversations.history({
  channel,
  limit: HISTORY_LIMIT,
  latest: event.ts,
  inclusive: false,
});
```

### Lv3 ヒント — 動的に切り詰める

件数だけでなく文字数でも切るとさらに安全:

- N 件取った後、新しい順に文字数を積み上げて 8000 文字超えたら打ち切る、等。
- ハンズオン時間内ではここまで凝らなくて OK。

---

## ④ Bot 自身の過去発言が履歴に混じって回答が変になる

### Lv1 ヒント — 方向

Bot は自分の過去回答も `conversations.history` に含まれます。フィルタしないと「Bot が自分の発言を引用しながら回答」する変な状況に。

### Lv2 ヒント — 除外

`auth.test` で取った自分の user_id でフィルタ:

```ts
historyMessages.filter(m => m.user !== botUserId);
```

### Lv3 ヒント — bot_id でも漏れる

Bot を別の名前で別途投稿した場合 `bot_id` で識別したいこともあります。完璧を目指すなら `m.bot_id` も併用チェック。

---

## ⑤ スレッドに返したいのに、メインのチャンネルに飛ぶ

### Lv1 ヒント — 方向

`chat.postMessage` には `thread_ts` を渡さないと、スレッド外(メインタイムライン)に投稿されてしまいます。

### Lv2 ヒント — どの ts を渡すか

```ts
const threadTs = event.thread_ts ?? event.ts;
await client.chat.postMessage({ channel, thread_ts: threadTs, text });
```

- メンションが「スレッド内で」されたら `event.thread_ts` がそのスレッド ID
- メインタイムラインでメンションされたら `event.ts` 自体を thread_ts にすれば、自分の回答が新スレッドの 1 件目になる

### Lv3 ヒント — UX

`reply_broadcast: true` を渡すと「Also send to channel」状態でスレッド外にも見えるようになります。質問への回答ならチャンネル汚しなのでオフ推奨。
