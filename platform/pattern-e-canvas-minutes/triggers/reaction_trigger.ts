import { Trigger } from "deno-slack-sdk/types.ts";
import {
  TriggerContextData,
  TriggerEventTypes,
  TriggerTypes,
} from "deno-slack-api/mod.ts";
import CanvasMinutesWorkflow from "../workflows/canvas_minutes_workflow.ts";

/**
 * `:memo:` リアクションが付いたら CanvasMinutesWorkflow を起動する Event Trigger。
 *
 * 重要ポイント:
 *  - `filter` で `data.reaction == memo` のみに絞り込む
 *  - 親メッセージへのリアクションでは `data.thread_ts` が空なので、
 *    その場合は `data.message_ts` をスレッド ts として扱う必要がある。
 *    ここでは Workflow 側に両方の値を渡し、Slack のテンプレート式
 *    `{{...}}` のフォールバック表現で吸収する。
 *
 *  - 登録方法:
 *      slack trigger create --trigger-def triggers/reaction_trigger.ts
 */
const reactionTrigger: Trigger<typeof CanvasMinutesWorkflow.definition> = {
  type: TriggerTypes.Event,
  name: "Memo reaction → Canvas minutes",
  description: "Run when someone reacts with :memo: on a message",
  workflow: `#/workflows/${CanvasMinutesWorkflow.definition.callback_id}`,
  event: {
    event_type: TriggerEventTypes.ReactionAdded,
    // TODO: ハンズオン参加者は対象チャンネルの ID をここに書き換えてください。
    //       (Slack のチャンネル名右クリック → 「チャンネルの詳細を表示」 → 最下部に ID)
    channel_ids: ["C0123456789"],
    filter: {
      version: 1,
      root: {
        statement: "{{data.reaction}} == memo",
      },
    },
  },
  inputs: {
    channel_id: {
      value: TriggerContextData.Event.ReactionAdded.channel_id,
    },
    user_id: {
      value: TriggerContextData.Event.ReactionAdded.user_id,
    },
    // 親メッセージ自体に :memo: された場合 thread_ts は空文字となる。
    // その場合は message_ts をそのままスレッド ts として扱う。
    thread_ts: {
      value: TriggerContextData.Event.ReactionAdded.message_ts,
    },
  },
};

export default reactionTrigger;
