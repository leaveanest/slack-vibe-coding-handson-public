import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { SummarizeThreadFunction } from "../functions/summarize_thread.ts";
import { CreateCanvasFunction } from "../functions/create_canvas.ts";

/**
 * CanvasMinutesWorkflow
 *
 * トリガーから受け取った `channel_id` / `thread_ts` を起点に:
 *   1. スレッドを取得して AI で議事録 Markdown に要約
 *   2. その Markdown で Canvas を作成
 *   3. 元スレッドに Canvas のリンクを返信
 * の 3 ステップで Canvas 議事録を生成する。
 */
const CanvasMinutesWorkflow = DefineWorkflow({
  callback_id: "canvas_minutes_workflow",
  title: "Canvas Minutes Workflow",
  description: ":memo: リアクションでスレッドを Canvas 議事録化する",
  input_parameters: {
    properties: {
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "リアクションが付いたメッセージのチャンネル",
      },
      thread_ts: {
        type: Schema.types.string,
        description: "スレッドのルートメッセージ ts",
      },
      user_id: {
        type: Schema.slack.types.user_id,
        description: "リアクションを付けたユーザー",
      },
    },
    required: ["channel_id", "thread_ts", "user_id"],
  },
});

// Step 1: スレッド要約 → 議事録 Markdown
const summarized = CanvasMinutesWorkflow.addStep(SummarizeThreadFunction, {
  channel_id: CanvasMinutesWorkflow.inputs.channel_id,
  thread_ts: CanvasMinutesWorkflow.inputs.thread_ts,
});

// Step 2: Markdown を Canvas として作成
const canvas = CanvasMinutesWorkflow.addStep(CreateCanvasFunction, {
  title: summarized.outputs.title,
  markdown: summarized.outputs.markdown,
});

// Step 3: 元スレッドに Canvas リンクを返信
// `ReplyInThread` は `message_context: { channel_id, message_ts }` を取り、
// その message を起点としてスレッド返信する。今回は thread_ts をそのまま渡せばよい。
CanvasMinutesWorkflow.addStep(Schema.slack.functions.ReplyInThread, {
  message_context: {
    channel_id: CanvasMinutesWorkflow.inputs.channel_id,
    message_ts: CanvasMinutesWorkflow.inputs.thread_ts,
  },
  message:
    `<@${CanvasMinutesWorkflow.inputs.user_id}> 議事録を Canvas にまとめました :memo:\n` +
    `<${canvas.outputs.canvas_url}|${summarized.outputs.title}>`,
});

export default CanvasMinutesWorkflow;
