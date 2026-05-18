import { Manifest } from "deno-slack-sdk/mod.ts";
import CanvasMinutesWorkflow from "./workflows/canvas_minutes_workflow.ts";
import { SummarizeThreadFunction } from "./functions/summarize_thread.ts";
import { CreateCanvasFunction } from "./functions/create_canvas.ts";

/**
 * Pattern E: スレッドリアクション → Canvas 議事録
 *
 * `:memo:` リアクションをメッセージに付けると、そのスレッド全体を AI が要約し、
 * Canvas に議事録として保存して、元スレッドにリンクを返信するワークフロー。
 */
export default Manifest({
  name: "pattern-e-canvas-minutes",
  description: "Reaction (:memo:) → AI summary → Canvas minutes",
  icon: "assets/icon.png",
  workflows: [CanvasMinutesWorkflow],
  functions: [SummarizeThreadFunction, CreateCanvasFunction],
  // OpenAI に対する外向き通信を許可する
  outgoingDomains: ["api.openai.com"],
  botScopes: [
    "commands",
    "chat:write",
    "chat:write.public",
    // スレッドの履歴を読むのに必要
    "channels:history",
    "groups:history",
    // リアクションイベントを受け取るのに必要
    "reactions:read",
    // Canvas を作成するのに必要
    "canvases:write",
  ],
});
