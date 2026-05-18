import { Manifest } from "deno-slack-sdk/mod.ts";
import WeeklyReportWorkflow from "./workflows/weekly_report_workflow.ts";
import { SummarizeWeekFunction } from "./functions/summarize_week.ts";

/**
 * pattern-j: Scheduled Trigger 週報自動生成
 *
 * - Scheduled Trigger (毎週金曜 18:00 JST) で起動する Workflow
 * - 対象チャンネルの過去 7 日間を `conversations.history` で取得し、
 *   OpenAI で要約 → 投稿先チャンネルに自動投稿
 *
 * 必要 scope:
 *  - chat:write       投稿先チャンネルに送信
 *  - channels:history 対象チャンネル (パブリック) の履歴取得
 *  - groups:history   対象チャンネル (プライベート) の履歴取得
 *
 * outgoingDomains:
 *  - api.openai.com   OpenAI Chat Completions
 */
export default Manifest({
  name: "pattern-j-weekly-report",
  description: "毎週金曜 18:00 JST に週次レポートを自動生成・投稿するアプリ",
  icon: "assets/default_new_app_icon.png",
  workflows: [WeeklyReportWorkflow],
  functions: [SummarizeWeekFunction],
  outgoingDomains: ["api.openai.com"],
  botScopes: [
    "chat:write",
    "channels:history",
    "groups:history",
  ],
});
