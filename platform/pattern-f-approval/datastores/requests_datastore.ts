import { DefineDatastore, Schema } from "deno-slack-sdk/mod.ts";

/**
 * 申請レコードを保存する Datastore。
 *
 * - SaaS ホストの DynamoDB 互換ストア。`slack deploy` 後はワークスペースごとに
 *   完全に分離された領域に保存される (同じアプリでもワークスペースを跨いだ参照は不可)。
 * - `primary_key` は `id` (UUID)。`apps.datastore.get` / `update` で使う。
 * - 属性の型は `Schema.types.*` または `Schema.slack.types.*` を指定する。
 *   ここでは requester / approver を `user_id` 型にして Slack User ID であることを表現。
 * - `status` は文字列で "pending" / "approved" / "rejected" の 3 状態を取る。
 *   Datastore 側で enum 制約は付かないので、関数側で値を制限する。
 */
export const RequestsDatastore = DefineDatastore({
  name: "requests_datastore",
  primary_key: "id",
  attributes: {
    id: {
      type: Schema.types.string,
    },
    requester: {
      type: Schema.slack.types.user_id,
    },
    approver: {
      type: Schema.slack.types.user_id,
    },
    content: {
      type: Schema.types.string,
    },
    status: {
      type: Schema.types.string,
    },
    created_at: {
      // Unix epoch millisecond。Date.now() の値をそのまま入れる。
      type: Schema.types.number,
    },
  },
});
