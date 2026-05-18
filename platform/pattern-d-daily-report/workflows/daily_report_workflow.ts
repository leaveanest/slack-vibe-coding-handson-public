// ---------------------------------------------------------------------------
// Workflow: daily_report_workflow
// ---------------------------------------------------------------------------
// 3 ステップ構成:
//   1. OpenForm        … 日報フォームを Slack 上に表示してユーザー入力を受ける
//   2. format_daily_report (Custom Function) … OpenAI で整形
//   3. SendMessage     … 指定チャンネルへ投稿
//
// ポイント:
//   * OpenForm を使うワークフローは必ず input_parameters に `interactivity` を
//     宣言し、トリガーから受け取る必要がある (ボタンクリック等の "対話の起点" 情報)。
//   * Link Trigger からは `interactivity` と `channel` (起動チャンネル) が
//     自動で流れてくるので、ここでは受け口を用意するだけで良い。
//   * 各ステップの outputs は後段の inputs に "直接プロパティ参照" で渡せる。
//     これは TS の型システムに乗っているので、IDE 上で補完が効く。
// ---------------------------------------------------------------------------

import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { FormatDailyReportFunction } from "../functions/format_daily_report.ts";

const DailyReportWorkflow = DefineWorkflow({
  callback_id: "daily_report_workflow",
  title: "Daily Report",
  description: "日報フォームを開いて、OpenAI で整形してチャンネルに投稿する",
  input_parameters: {
    properties: {
      // OpenForm を出すために interactivity は必須。
      interactivity: { type: Schema.slack.types.interactivity },
      // 起動したチャンネルをフォームのデフォルト投稿先として使う。
      channel: { type: Schema.slack.types.channel_id },
      // 起動したユーザー (= 日報の起票者) をデフォルト author として渡す。
      user: { type: Schema.slack.types.user_id },
    },
    required: ["interactivity"],
  },
});

// ---------- Step 1: OpenForm ----------
// OpenForm は組み込みの Slack Function (Schema.slack.functions.OpenForm)。
// fields.elements の配列順がそのままフォームの表示順になる。
const formStep = DailyReportWorkflow.addStep(
  Schema.slack.functions.OpenForm,
  {
    title: "日報を書く",
    description: "今日やったこと / 明日やること / 所感を入力してください。",
    interactivity: DailyReportWorkflow.inputs.interactivity,
    submit_label: "投稿する",
    fields: {
      elements: [
        {
          name: "today",
          title: "今日やったこと",
          type: Schema.types.string,
          // `long: true` で multiline 入力 (textarea) になる。
          long: true,
        },
        {
          name: "tomorrow",
          title: "明日やること",
          type: Schema.types.string,
          long: true,
        },
        {
          name: "feeling",
          title: "所感 (任意)",
          description: "今日の気分、学び、困っていることなど自由に",
          type: Schema.types.string,
          long: true,
        },
        {
          name: "channel",
          title: "投稿先チャンネル",
          type: Schema.slack.types.channel_id,
          // トリガー起動時のチャンネルをデフォルト選択にする。
          default: DailyReportWorkflow.inputs.channel,
        },
      ],
      required: ["today", "tomorrow", "channel"],
    },
  },
);

// ---------- Step 2: Custom Function (OpenAI で整形) ----------
const formatStep = DailyReportWorkflow.addStep(
  FormatDailyReportFunction,
  {
    today: formStep.outputs.fields.today,
    tomorrow: formStep.outputs.fields.tomorrow,
    feeling: formStep.outputs.fields.feeling,
    // 起票者はワークフロー入力の user を渡す。
    author_id: DailyReportWorkflow.inputs.user,
  },
);

// ---------- Step 3: SendMessage ----------
// SendMessage も組み込みの Slack Function。
// "channel_id" はフォームで選ばれたチャンネル、"message" は整形済み本文。
DailyReportWorkflow.addStep(Schema.slack.functions.SendMessage, {
  channel_id: formStep.outputs.fields.channel,
  message: formatStep.outputs.formatted_message,
});

export default DailyReportWorkflow;
