import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { SaveRequestFunction } from "../functions/save_request.ts";
import { SendApproverDmFunction } from "../functions/send_approver_dm.ts";

/**
 * Workflow ①: 申請を提出するワークフロー。
 *
 * Link Trigger でフォームを開き、入力された内容を Datastore に保存して、
 * 最後に承認者へ Block Actions 付き DM を送る。
 *
 * 入力 (Link Trigger から):
 *   - interactivity: OpenForm を表示するために必須
 *   - requester:     リンクをクリックしたユーザー (= 申請者)
 */
export const SubmitRequestWorkflow = DefineWorkflow({
  callback_id: "submit_request_workflow",
  title: "申請を提出する",
  description: "Link Trigger からフォームを開き、Datastore に保存後、承認者へ DM を送る",
  input_parameters: {
    properties: {
      interactivity: { type: Schema.slack.types.interactivity },
      requester: { type: Schema.slack.types.user_id },
    },
    required: ["interactivity", "requester"],
  },
});

// Step 1: OpenForm で content と approver を入力させる
const formStep = SubmitRequestWorkflow.addStep(
  Schema.slack.functions.OpenForm,
  {
    title: "申請フォーム",
    interactivity: SubmitRequestWorkflow.inputs.interactivity,
    submit_label: "申請する",
    description: "承認者と申請内容を入力してください",
    fields: {
      elements: [
        {
          name: "content",
          title: "申請内容",
          type: Schema.types.string,
          long: true,
          description: "何を承認してほしいかを記入してください",
        },
        {
          name: "approver",
          title: "承認者",
          type: Schema.slack.types.user_id,
          description: "この依頼を承認/却下する人",
        },
      ],
      required: ["content", "approver"],
    },
  },
);

// Step 2: Datastore に保存 (request_id を採番)
const saveStep = SubmitRequestWorkflow.addStep(SaveRequestFunction, {
  requester: SubmitRequestWorkflow.inputs.requester,
  approver: formStep.outputs.fields.approver,
  content: formStep.outputs.fields.content,
});

// Step 3: 承認者へ Block Actions 付きの DM を送る
SubmitRequestWorkflow.addStep(SendApproverDmFunction, {
  request_id: saveStep.outputs.request_id,
  requester: saveStep.outputs.requester,
  approver: saveStep.outputs.approver,
  content: saveStep.outputs.content,
});

export default SubmitRequestWorkflow;
