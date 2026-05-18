# HINTS — pattern-j 詰まりポイント集

Scheduled Trigger は「動いてるのかどうか分かりにくい」のが最大の罠です。
最後の `5. 動作確認用の短時間スケジュール` を活用して、まずは数分で結果が見える状態を作ることを強くおすすめします。

---

## 1. Scheduled Trigger は **`slack trigger create` を打たないと動かない**

`slack deploy` だけでは Scheduled Trigger は登録されません。
manifest が反映されるだけで、トリガー自体は別レイヤーです。必ず:

```bash
slack trigger create --trigger-def triggers/scheduled_trigger.ts
```

を実行してください。成功すると `Ft0XXXXXXXXX` という Trigger ID が返ります。
反映確認:

```bash
slack trigger list
```

> 同じトリガー定義を二度 `create` すると **重複して** 登録されます (同名でも別 ID になる)。
> 既存を更新したい時は `slack trigger update --trigger-id Ft0XXXXXXXXX --trigger-def triggers/scheduled_trigger.ts`、もしくは `slack trigger delete` してから create し直しましょう。

---

## 2. `timezone: "Asia/Tokyo"` を忘れると **UTC で動く**

ScheduledTrigger の `schedule.timezone` が未指定だと、`start_time` の解釈は UTC として扱われます。
「金曜 18:00」のつもりで `start_time: "2026-05-15T18:00:00Z"` と書くと、それは UTC の 18:00 = **JST の翌土曜 03:00** です。

正しくは:

```ts
schedule: {
  start_time: "2026-05-15T09:00:00Z", // 18:00 JST に相当する UTC
  timezone: "Asia/Tokyo",
  frequency: {
    type: "weekly",
    on_days: ["Friday"],
    repeats_every: 1,
  },
},
```

このテンプレでは `nextFridayAt18JstIso()` ヘルパが「次に来る金曜 09:00 UTC」を返してくれるので、ロジックに任せて OK です。

> `on_days` の曜日名は **キャピタライズ** された英語フルスペル (`"Friday"`)。`"friday"` や `"fri"` は通りません。

---

## 3. `conversations.history` の `oldest` は **Unix epoch 秒** (ミリ秒ではない)

JavaScript で素直に `Date.now()` を書くとミリ秒なので、Slack に投げると「未来の値」になってしまい 0 件が返ってきます。
必ず 1000 で割って秒にし、文字列化して渡します:

```ts
const oldestSec = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
await client.conversations.history({
  channel: inputs.source_channel,
  oldest: String(oldestSec), // ← 文字列の秒
  latest: String(Math.floor(Date.now() / 1000)),
  inclusive: false,
  limit: 1000,
});
```

Slack のメッセージ ID (`ts`) は `"1715419200.000300"` のように **秒.マイクロ秒** の文字列なので、`Number(m.ts)` してから `Math.floor` すると安全に Date に戻せます。

---

## 4. 1000 件を超えるチャンネルでは **ページネーション** 必須

`conversations.history` は 1 回で最大 1000 件しか返しません。
レスポンスの `response_metadata.next_cursor` が空文字以外なら続きがあります。

このテンプレでは `functions/summarize_week.ts` 内で `do { ... } while (cursor)` ループを回し、安全弁として 20 ページ (= 20,000 件) で打ち切るようにしています。
活発なチャンネル相手なら、`MAX_PAGES` を引き上げるか、サマリ対象を時間でさらに絞る (例: oldest=3日前) を検討してください。

---

## 5. 動作確認用に **「毎分」スケジュール** へ一時差し替えする

「毎週金曜まで待つ」のは無理なので、テストの時は frequency を一時的に短くします。
**hourly が最短** で、`repeats_every: 1` で 1 時間ごとに発火します。

「もっと早く」をやりたい時は `frequency.type: "once"` + `start_time` を 1〜2 分後にして、ログを確認してから再 create するのが現実的です。

### 5-a. 毎時 1 回 (hourly) に切り替えるパッチ

```ts
// triggers/scheduled_trigger.ts (一時)
schedule: {
  start_time: new Date(Date.now() + 60 * 1000).toISOString(), // 60 秒後
  timezone: "Asia/Tokyo",
  frequency: {
    type: "hourly",
    repeats_every: 1,
  },
},
```

```bash
# 既存トリガーを差し替え (テスト用)
slack trigger list                                          # ID 確認
slack trigger update --trigger-id Ft0XXXXXXXXX \
  --trigger-def triggers/scheduled_trigger.ts

# 動作確認できたら weekly に戻して再 update
git checkout triggers/scheduled_trigger.ts
slack trigger update --trigger-id Ft0XXXXXXXXX \
  --trigger-def triggers/scheduled_trigger.ts
```

### 5-b. 1 回だけ (once) を 1 分後に発火させてサクッと確認

```ts
schedule: {
  start_time: new Date(Date.now() + 60 * 1000).toISOString(),
  timezone: "Asia/Tokyo",
  frequency: { type: "once" },
},
```

once は 1 度走って終わりなので、テスト後に消し忘れる心配がありません。
ログは:

```bash
slack activity --tail
```

で流して、`summarize_week` の console.log が出てくることを確認しましょう。

### 5-c. ロジック自体だけテストしたい (Scheduled Trigger を介さない)

開発中は Link Trigger / Shortcut Trigger を **もう 1 本** 用意して、ボタン一発で同じ Workflow を起動できるようにしておくのが楽です。
例: `triggers/manual_trigger.ts` を `type: TriggerTypes.Shortcut` で作り、`slack trigger create --trigger-def triggers/manual_trigger.ts` で並行登録。

---

## 6. Bot メッセージのフィルタは **`bot_id` だけでは不十分**

`conversations.history` の戻りには色々な subtype が混ざります:

| 種類 | 判定 |
|---|---|
| 普通の人間投稿 | `user` あり / `bot_id` なし / `subtype` なし |
| Bot 投稿 | `bot_id` あり (場合により `user` もあるので注意) |
| ユーザー参加メッセージ | `subtype: "channel_join"` |
| ファイル添付通知 | `subtype: "file_share"` (`user` ありだが情報量低) |
| Edit 通知 | `subtype: "message_changed"` |

このテンプレでは `isHumanMessage(m)` で

```ts
if (m.bot_id) return false;
if (m.subtype) return false;
if (!m.user) return false;
if (!m.text?.trim()) return false;
```

の 4 条件を全部満たすものだけ通しています。
`file_share` も対象に含めたい時は subtype を allow-list 化してください。

---

## まとめ: 動作確認のおすすめ手順

1. まず `frequency: { type: "once" }` + `start_time: 1 分後` で create して 1 回走らせる
2. ログ (`slack activity --tail`) で関数が完走したことを確認
3. 出力先チャンネルにメッセージが届いていれば成功
4. `triggers/scheduled_trigger.ts` を weekly に戻して `slack trigger update`
5. `slack trigger list` で `frequency: weekly / on_days: Friday` になっていることを確認

これで「金曜 18:00 まで動くか分からないドキドキ」を消せます。
