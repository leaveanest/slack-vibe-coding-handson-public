import { Manifest } from "deno-slack-sdk/mod.ts";

// Datastores
import { RequestsDatastore } from "./datastores/requests_datastore.ts";

// Functions
import { SaveRequestFunction } from "./functions/save_request.ts";
import { SendApproverDmFunction } from "./functions/send_approver_dm.ts";
import { HandleDecisionFunction } from "./functions/handle_decision.ts";

// Workflows
import SubmitRequestWorkflow from "./workflows/submit_request_workflow.ts";
import HandleDecisionWorkflow from "./workflows/handle_decision_workflow.ts";

/**
 * pattern-f: 申請承認ワークフロー (Datastore 活用)。
 *
 * Manifest は「アプリ全体のメタデータ + 登録対象の全コンポーネント (functions /
 * workflows / datastores / types / events) の宣言」を担う唯一のエントリーポイント。
 *
 * 同じアプリで複数の workflow / function を動かすには、ここに **全部** 並べて
 * 列挙する必要がある。1 つでも書き忘れると `slack run` 時に「該当 workflow が
 * 見つからない」エラーになるので注意。
 *
 * botScopes:
 *   - chat:write       : メッセージ送信 (承認者 DM / 申請者通知の両方)
 *   - im:write         : DM チャンネルを開く
 *   - datastore:read   : Datastore からの読み取り
 *   - datastore:write  : Datastore への書き込み
 */
export default Manifest({
  name: "pattern-f-approval",
  description: "Link Trigger + Datastore + Block Actions を組み合わせた申請承認ワークフロー",
  icon: "assets/default_new_app_icon.png",

  functions: [
    SaveRequestFunction,
    SendApproverDmFunction,
    HandleDecisionFunction,
  ],
  workflows: [
    SubmitRequestWorkflow,
    HandleDecisionWorkflow,
  ],
  datastores: [
    RequestsDatastore,
  ],

  outgoingDomains: [],

  botScopes: [
    "chat:write",
    "im:write",
    "datastore:read",
    "datastore:write",
  ],
});
