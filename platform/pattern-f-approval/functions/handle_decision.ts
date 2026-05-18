import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

/**
 * 承認 / 却下の意思決定を反映する関数。
 *
 * - Datastore の該当レコードを update して status を "approved" / "rejected" に書き換える。
 * - 申請者に DM で結果を通知する。
 *
 * この関数は 2 通りの呼び方ができる:
 *   1. Workflow ② (handle_decision_workflow) から step として呼ばれる (Block Action Trigger 経由)
 *   2. send_approver_dm の addBlockActionsHandler から内部的に呼ばれる
 *
 * 教材としてはどちらの動線でも同じロジックが動くことが重要なので、ロジックは
 * `applyDecision` ヘルパとして外出ししておき、両方から再利用できるようにしている。
 */
export const HandleDecisionFunction = DefineFunction({
  callback_id: "handle_decision",
  title: "承認/却下の決定を反映",
  description: "Datastore を更新し、申請者へ結果を DM で通知する",
  source_file: "functions/handle_decision.ts",
  input_parameters: {
    properties: {
      request_id: {
        type: Schema.types.string,
        description: "申請 ID (UUID)",
      },
      decision: {
        type: Schema.types.string,
        description: '"approved" もしくは "rejected"',
      },
      reviewer: {
        type: Schema.slack.types.user_id,
        description: "ボタンを押したユーザー (承認者)",
      },
    },
    required: ["request_id", "decision", "reviewer"],
  },
  output_parameters: {
    properties: {
      request_id: { type: Schema.types.string },
      status: { type: Schema.types.string },
    },
    required: ["request_id", "status"],
  },
});

/**
 * Datastore 更新 + 申請者通知 の共通ロジック。
 *
 * Slack の `client` は SlackAPIClient 互換オブジェクト。
 */
export async function applyDecision(
  client: {
    apps: {
      datastore: {
        // deno-slack-api の型と互換になるよう any にしているが、実体は SlackAPIClient。
        // deno check では Deno のグローバル型が解決されれば通る。
        // deno-lint-ignore no-explicit-any
        get: (args: any) => Promise<any>;
        // deno-lint-ignore no-explicit-any
        update: (args: any) => Promise<any>;
      };
    };
    chat: {
      // deno-lint-ignore no-explicit-any
      postMessage: (args: any) => Promise<any>;
    };
  },
  args: { request_id: string; decision: "approved" | "rejected"; reviewer: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { request_id, decision, reviewer } = args;

  // 1. レコードを取得 (申請者 / content を取り出して通知に使うため)
  const getResp = await client.apps.datastore.get({
    datastore: "requests_datastore",
    id: request_id,
  });
  if (!getResp.ok || !getResp.item) {
    return { ok: false, error: `request_id=${request_id} が見つかりません: ${getResp.error ?? "no item"}` };
  }

  const requester: string = getResp.item.requester;
  const content: string = getResp.item.content;

  // 2. status を更新
  const updateResp = await client.apps.datastore.update({
    datastore: "requests_datastore",
    item: {
      id: request_id,
      // primary_key 以外も全て上書き対象。put と違って既存の属性は維持されないので、
      // 変更したい属性だけでなく既存の値も全部明示する必要がある点に注意。
      requester,
      approver: reviewer,
      content,
      status: decision,
      created_at: getResp.item.created_at,
    },
  });
  if (!updateResp.ok) {
    return { ok: false, error: `Datastore update に失敗: ${updateResp.error}` };
  }

  // 3. 申請者へ DM で結果通知
  const headline = decision === "approved"
    ? ":white_check_mark: あなたの申請は *承認されました*"
    : ":x: あなたの申請は *却下されました*";

  const postResp = await client.chat.postMessage({
    channel: requester,
    text: headline,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${headline}\n\n*申請内容:*\n>${content.replace(/\n/g, "\n>")}\n\n*対応者:* <@${reviewer}>`,
        },
      },
      {
        type: "context",
        elements: [
          { type: "mrkdwn", text: `request_id: \`${request_id}\`` },
        ],
      },
    ],
  });
  if (!postResp.ok) {
    return { ok: false, error: `申請者への DM 送信に失敗: ${postResp.error}` };
  }

  return { ok: true };
}

export default SlackFunction(
  HandleDecisionFunction,
  async ({ inputs, client }) => {
    const decision = inputs.decision === "approved" ? "approved" : "rejected";

    const result = await applyDecision(client, {
      request_id: inputs.request_id,
      decision,
      reviewer: inputs.reviewer,
    });

    if (!result.ok) {
      console.error(`[handle_decision] ${result.error}`);
      return { error: result.error };
    }

    return {
      outputs: {
        request_id: inputs.request_id,
        status: decision,
      },
    };
  },
);
