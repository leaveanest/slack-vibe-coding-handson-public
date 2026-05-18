import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { SummarizeGitHubPRDefinition } from "../functions/summarize_github_pr.ts";

/**
 * PR 要約ワークフロー
 *
 * 流れ:
 *   1. Link Trigger 起動 (interactivity と github_access_token_id を受け取る)
 *   2. OpenForm で PR URL と投稿先 channel を入力
 *   3. SummarizeGitHubPRDefinition で要約を生成
 *   4. SendMessage で channel に投稿
 */
export const PRSummaryWorkflow = DefineWorkflow({
  callback_id: "pr_summary_workflow",
  title: "GitHub PR を要約してチャンネルに投稿",
  description: "GitHub の PR URL を入力すると、OpenAI で要約して Slack に投稿します",
  input_parameters: {
    properties: {
      interactivity: {
        // OpenForm を起動するために必須
        type: Schema.slack.types.interactivity,
      },
      // Link Trigger 起動時に Slack 側で End-User のトークン ID をバインドする
      github_access_token_id: {
        type: Schema.slack.types.oauth2,
        oauth2_provider_key: "github",
      },
    },
    required: ["interactivity", "github_access_token_id"],
  },
});

// Step 1: PR URL と投稿先 channel をユーザーに入力させる
const formStep = PRSummaryWorkflow.addStep(
  Schema.slack.functions.OpenForm,
  {
    title: "要約したい GitHub PR を指定",
    interactivity: PRSummaryWorkflow.inputs.interactivity,
    submit_label: "要約する",
    fields: {
      elements: [
        {
          name: "pr_url",
          title: "Pull Request の URL",
          type: Schema.types.string,
          description:
            "例: https://github.com/slackapi/deno-slack-sdk/pull/123",
        },
        {
          name: "channel",
          title: "投稿先チャンネル",
          type: Schema.slack.types.channel_id,
        },
      ],
      required: ["pr_url", "channel"],
    },
  },
);

// Step 2: GitHub API + OpenAI で要約を生成
const summarizeStep = PRSummaryWorkflow.addStep(
  SummarizeGitHubPRDefinition,
  {
    pr_url: formStep.outputs.fields.pr_url,
    channel: formStep.outputs.fields.channel,
    // End-User の GitHub トークン ID をそのまま渡す
    github_access_token_id: PRSummaryWorkflow.inputs.github_access_token_id,
  },
);

// Step 3: 要約を指定チャンネルに投稿
PRSummaryWorkflow.addStep(Schema.slack.functions.SendMessage, {
  channel_id: summarizeStep.outputs.channel,
  message:
    `:octocat: *PR 要約*: <${summarizeStep.outputs.pr_url}|${summarizeStep.outputs.pr_title}>\n\n${summarizeStep.outputs.summary}`,
});

export default PRSummaryWorkflow;
