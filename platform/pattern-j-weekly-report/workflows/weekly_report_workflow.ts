import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { SummarizeWeekFunction } from "../functions/summarize_week.ts";

/**
 * WeeklyReportWorkflow
 *
 * Scheduled Trigger から起動される、週次レポート生成 Workflow。
 *
 * inputs:
 *  - source_channel: 要約対象チャンネル
 *  - dest_channel:   サマリの投稿先チャンネル
 *
 * steps:
 *  1. summarize_week — 過去 7 日間を要約 (本体は functions/summarize_week.ts)
 *  2. SendMessage    — 結果を dest_channel に投稿
 */
const WeeklyReportWorkflow = DefineWorkflow({
  callback_id: "weekly_report_workflow",
  title: "Weekly Report Workflow",
  description: "毎週金曜 18:00 JST に対象チャンネルの週次サマリを投稿します",
  input_parameters: {
    properties: {
      source_channel: {
        type: Schema.slack.types.channel_id,
        description: "要約対象のチャンネル",
      },
      dest_channel: {
        type: Schema.slack.types.channel_id,
        description: "週次レポートを投稿するチャンネル",
      },
    },
    required: ["source_channel", "dest_channel"],
  },
});

// Step 1: 過去 1 週間の履歴を要約
const summarizeStep = WeeklyReportWorkflow.addStep(SummarizeWeekFunction, {
  source_channel: WeeklyReportWorkflow.inputs.source_channel,
});

// Step 2: dest_channel に結果を投稿
WeeklyReportWorkflow.addStep(Schema.slack.functions.SendMessage, {
  channel_id: WeeklyReportWorkflow.inputs.dest_channel,
  message:
    `:memo: *週次レポート* (チャンネル: <#${WeeklyReportWorkflow.inputs.source_channel}>)\n\n${summarizeStep.outputs.summary}`,
});

export default WeeklyReportWorkflow;
