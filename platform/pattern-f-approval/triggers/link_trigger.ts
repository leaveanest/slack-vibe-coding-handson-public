import { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerContextData, TriggerTypes } from "deno-slack-api/mod.ts";
import SubmitRequestWorkflow from "../workflows/submit_request_workflow.ts";

/**
 * Link Trigger (= Shortcut Trigger)。
 *
 * - `slack trigger create --trigger-def triggers/link_trigger.ts` で発行すると
 *   返ってきた URL を Slack のメッセージ入力欄に貼ると、その場でワークフローを
 *   起動できる "リンク" になる。
 * - フォームを開くために `interactivity` が必須。
 * - `requester` は「リンクを踏んだユーザー」= 申請者として記録される。
 */
const trigger: Trigger<typeof SubmitRequestWorkflow.definition> = {
  type: TriggerTypes.Shortcut,
  name: "申請を提出する",
  description: "フォームを開いて申請内容と承認者を入力する",
  workflow: `#/workflows/${SubmitRequestWorkflow.definition.callback_id}`,
  inputs: {
    interactivity: { value: TriggerContextData.Shortcut.interactivity },
    requester: { value: TriggerContextData.Shortcut.user_id },
  },
};

export default trigger;
