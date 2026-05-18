import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

/**
 * フォームで集めた申請内容を Datastore に保存する関数。
 *
 * 入力:
 *   - requester: 申請者の User ID (Workflow から渡す)
 *   - approver:  承認者の User ID (OpenForm の出力)
 *   - content:   申請本文 (OpenForm の出力)
 *
 * 出力:
 *   - request_id: 採番した UUID。次のステップ (send_approver_dm) に渡す。
 *   - requester / approver / content: そのまま素通し。
 */
export const SaveRequestFunction = DefineFunction({
  callback_id: "save_request",
  title: "申請内容を Datastore に保存",
  description: "UUID を採番し、申請レコードを pending 状態で保存する",
  source_file: "functions/save_request.ts",
  input_parameters: {
    properties: {
      requester: {
        type: Schema.slack.types.user_id,
        description: "申請者",
      },
      approver: {
        type: Schema.slack.types.user_id,
        description: "承認者",
      },
      content: {
        type: Schema.types.string,
        description: "申請内容",
      },
    },
    required: ["requester", "approver", "content"],
  },
  output_parameters: {
    properties: {
      request_id: {
        type: Schema.types.string,
        description: "発行された申請 ID (UUID)",
      },
      requester: { type: Schema.slack.types.user_id },
      approver: { type: Schema.slack.types.user_id },
      content: { type: Schema.types.string },
    },
    required: ["request_id", "requester", "approver", "content"],
  },
});

export default SlackFunction(
  SaveRequestFunction,
  async ({ inputs, client }) => {
    // Deno には Web 標準の `crypto.randomUUID()` がグローバルに提供されている。
    // Node.js のように `import { randomUUID } from "crypto"` する必要はない。
    const request_id = crypto.randomUUID();
    const created_at = Date.now();

    const putResp = await client.apps.datastore.put({
      datastore: "requests_datastore",
      item: {
        id: request_id,
        requester: inputs.requester,
        approver: inputs.approver,
        content: inputs.content,
        status: "pending",
        created_at,
      },
    });

    if (!putResp.ok) {
      const error = `Datastore put に失敗しました: ${putResp.error}`;
      console.error(error);
      return { error };
    }

    console.log(
      `[save_request] 保存完了 id=${request_id} requester=${inputs.requester} approver=${inputs.approver}`,
    );

    return {
      outputs: {
        request_id,
        requester: inputs.requester,
        approver: inputs.approver,
        content: inputs.content,
      },
    };
  },
);
