import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { HandleDecisionFunction } from "../functions/handle_decision.ts";

/**
 * Workflow ②: 承認 / 却下を反映するワークフロー。
 *
 * 役割:
 *   このワークフローは「Datastore を更新して、申請者へ結果を通知する」処理を
 *   再利用可能な単位として独立に切り出したもの。
 *
 *   メインのボタン操作は send_approver_dm の addBlockActionsHandler が同期的に
 *   `applyDecision` を呼び出して処理するが、この decision_workflow があると:
 *     - 同じ処理を CLI 経由 (`slack run` の手動実行など) で再現できる
 *     - 後から「Block Action Trigger 経由で外から起動する」設計に切り替えるのが容易
 *     - 申請の取り消し/再決定など、別ルートから呼び出す導線が増えても流用できる
 *
 * 入力:
 *   - request_id: 対象の申請 ID
 *   - decision:   "approved" | "rejected"
 *   - reviewer:   操作したユーザー ID
 */
export const HandleDecisionWorkflow = DefineWorkflow({
  callback_id: "handle_decision_workflow",
  title: "承認/却下を反映する",
  description: "Datastore のステータスを更新し、申請者へ結果を通知する",
  input_parameters: {
    properties: {
      request_id: { type: Schema.types.string },
      decision: { type: Schema.types.string },
      reviewer: { type: Schema.slack.types.user_id },
    },
    required: ["request_id", "decision", "reviewer"],
  },
});

HandleDecisionWorkflow.addStep(HandleDecisionFunction, {
  request_id: HandleDecisionWorkflow.inputs.request_id,
  decision: HandleDecisionWorkflow.inputs.decision,
  reviewer: HandleDecisionWorkflow.inputs.reviewer,
});

export default HandleDecisionWorkflow;
