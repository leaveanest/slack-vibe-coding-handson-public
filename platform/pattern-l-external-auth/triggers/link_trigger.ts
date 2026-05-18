import { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerContextData, TriggerTypes } from "deno-slack-api/mod.ts";
import PRSummaryWorkflow from "../workflows/pr_summary_workflow.ts";

/**
 * Link Trigger
 *
 * Slack の「Workflow を起動するショートカット URL」。
 * このトリガーをチャンネルに投稿 / ブックマークすると、ボタンをクリックして
 * ワークフローを起動できる。
 *
 * inputs:
 *   - interactivity: ボタン押下時のコンテキスト (OpenForm に必須)
 *   - github_access_token_id: End-User の GitHub OAuth トークン ID
 *
 * NOTE: github_access_token_id は `customizable_input_parameters` で指定して
 * Trigger を作成すると、ユーザーが Slack の UI 上で「どの GitHub アカウントを使うか」
 * を選択できるようになる。CLI からは `slack trigger create --trigger-def ...` で登録する。
 */
const linkTrigger: Trigger<typeof PRSummaryWorkflow.definition> = {
  type: TriggerTypes.Shortcut,
  name: "GitHub PR を要約する",
  description: "PR URL を入力すると、OpenAI で要約して Slack に投稿します",
  workflow: `#/workflows/${PRSummaryWorkflow.definition.callback_id}`,
  inputs: {
    interactivity: {
      value: TriggerContextData.Shortcut.interactivity,
    },
    // Slack 側の UI で End-User に GitHub アカウントを選択させるため、
    // 値はトリガー作成時にユーザーが指定する (customizable な input)。
    // 詳細は HINTS.md セクション 3 を参照。
    github_access_token_id: {
      // `{{data.github_access_token_id}}` の参照は CLI 経由でトリガー登録した際に
      // Slack が UI で選ばせる仕組みになっており、ここではプレースホルダとして
      // customizable_input_parameters に登録した名前で受ける。
      customizable: true,
    },
  },
};

export default linkTrigger;
