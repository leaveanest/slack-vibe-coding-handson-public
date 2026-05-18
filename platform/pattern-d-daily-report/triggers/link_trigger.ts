// ---------------------------------------------------------------------------
// Trigger: Link Trigger for Daily Report
// ---------------------------------------------------------------------------
// Link Trigger は Slack 内で「URL」になります。
// 共有された URL をクリック (またはチャンネルにペースト → ボタン化) すると
// 紐づけたワークフローが起動します。
//
// 使い方:
//   1. `slack run` or `slack deploy` でアプリを起動 / デプロイ
//   2. `slack trigger create --trigger-def triggers/link_trigger.ts`
//      で Slack 側にトリガーを登録 → URL が払い出される
//   3. その URL を任意のチャンネルに貼り付けると "日報を書く" ボタンになる
//
// 注意:
//   * Slack CLI のトリガー定義としては `Trigger<typeof Workflow.definition>`
//     を default export する形が公式。
//   * `TriggerContextData.Shortcut` は Link Trigger / Shortcut 共用のコンテキスト。
//     `interactivity` を渡さないと OpenForm が開けないので忘れずに。
// ---------------------------------------------------------------------------

import { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerContextData, TriggerTypes } from "deno-slack-api/mod.ts";
import DailyReportWorkflow from "../workflows/daily_report_workflow.ts";

const trigger: Trigger<typeof DailyReportWorkflow.definition> = {
  // Link Trigger は internally "shortcut" 型として登録される
  // (Slack Platform 用語の歴史的事情。気にしなくて OK)
  type: TriggerTypes.Shortcut,
  name: "日報を書く",
  description: "OpenAI で整形した日報をチャンネルに投稿します",
  workflow: `#/workflows/${DailyReportWorkflow.definition.callback_id}`,
  inputs: {
    // OpenForm を開くために必須。
    interactivity: { value: TriggerContextData.Shortcut.interactivity },
    // 起動チャンネル / 起動ユーザーをワークフローに引き渡す。
    channel: { value: TriggerContextData.Shortcut.channel_id },
    user: { value: TriggerContextData.Shortcut.user_id },
  },
};

export default trigger;
