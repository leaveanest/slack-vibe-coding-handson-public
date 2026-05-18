import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { applyDecision } from "./handle_decision.ts";

/**
 * 承認者へ Block Actions 付きの DM を送る関数。
 *
 * ポイント:
 * - `completed: false` を返して、ボタン押下まで関数の完了を保留にする。
 * - ボタンの `value` に `request_id` を仕込む。
 *   Workflow ② (Block Action Trigger) で `{{data.actions[0].value}}` として
 *   取り出せるのと同じ値を、ハンドラ内では `action.value` で受け取れる。
 * - `action_id` を `approve_button` / `reject_button` の 2 種類用意し、押された
 *   どちらかを `action.action_id` で判別する。
 *
 * 動線の話:
 *   教材では「2 つの Workflow を 1 アプリで動かす」ことを示すため、決定処理は
 *   `functions/handle_decision.ts` の `applyDecision` ヘルパに分離している。
 *   ここの addBlockActionsHandler では同期的にそのヘルパを呼び出して結果を反映する。
 *   (Block Action Trigger 経由で workflow ② を別途起動するパターンも可能だが、
 *    Datastore の更新と DM 送信は素直に同じ関数内で完結させた方が学習に効く。)
 */
export const SendApproverDmFunction = DefineFunction({
  callback_id: "send_approver_dm",
  title: "承認者に承認/却下ボタン付き DM を送る",
  description: "申請内容を承認者にDMで通知し、ボタンで意思決定させる",
  source_file: "functions/send_approver_dm.ts",
  input_parameters: {
    properties: {
      request_id: {
        type: Schema.types.string,
        description: "申請 ID (save_request の出力)",
      },
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
    required: ["request_id", "requester", "approver", "content"],
  },
  output_parameters: {
    properties: {
      request_id: { type: Schema.types.string },
      decision: { type: Schema.types.string },
    },
    required: ["request_id", "decision"],
  },
});

export default SlackFunction(
  SendApproverDmFunction,
  async ({ inputs, client }) => {
    const { request_id, requester, approver, content } = inputs;

    const postResp = await client.chat.postMessage({
      channel: approver, // User ID を `channel` に渡せば DM になる (`im:write` が必要)
      text: `<@${requester}> さんから承認依頼が届きました`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*<@${requester}> さんから承認依頼が届きました*\n\n*申請内容:*\n>${content.replace(/\n/g, "\n>")}`,
          },
        },
        {
          type: "context",
          elements: [
            { type: "mrkdwn", text: `request_id: \`${request_id}\`` },
          ],
        },
        {
          type: "actions",
          block_id: "approval_buttons",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "承認する" },
              style: "primary",
              action_id: "approve_button",
              // value にはハンドラと Block Action Trigger の双方で
              // 取り出せる文字列 (= request_id) を載せる。
              value: request_id,
            },
            {
              type: "button",
              text: { type: "plain_text", text: "却下する" },
              style: "danger",
              action_id: "reject_button",
              value: request_id,
            },
          ],
        },
      ],
    });

    if (!postResp.ok) {
      const error = `承認者への DM 送信に失敗: ${postResp.error}`;
      console.error(error);
      return { error };
    }

    console.log(
      `[send_approver_dm] DM 送信完了 approver=${approver} request_id=${request_id} ts=${postResp.ts}`,
    );

    // ボタンが押されるまで関数を完了しない。
    return { completed: false };
  },
)
  // 承認 / 却下ボタンのどちらかを押したときのハンドラ。
  // 第一引数の `string[]` を渡すと、action_id がそのいずれかに一致したものだけがマッチする。
  .addBlockActionsHandler(
    ["approve_button", "reject_button"],
    async ({ action, body, client }) => {
      const request_id = action.value as string;
      const decision: "approved" | "rejected" =
        action.action_id === "approve_button" ? "approved" : "rejected";

      console.log(
        `[send_approver_dm] action_id=${action.action_id} request_id=${request_id} reviewer=${body.user.id}`,
      );

      // body.message は型定義上 optional だが、Block Kit のボタン押下時には
      // 必ず付与される。安全のためフォールバックを用意する。
      const messageTs = body.message?.ts;

      // 共通ロジックを呼び出して Datastore 更新 + 申請者通知を行う。
      const result = await applyDecision(client, {
        request_id,
        decision,
        reviewer: body.user.id,
      });

      if (!result.ok) {
        // 失敗した場合は元の DM に注釈を足してユーザーに伝える (ts が取れた場合のみ)。
        if (messageTs) {
          await client.chat.update({
            channel: body.container.channel_id,
            ts: messageTs,
            text: `エラー: ${result.error}`,
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `:warning: 処理に失敗しました\n\`\`\`${result.error}\`\`\``,
                },
              },
            ],
          });
        }

        await client.functions.completeError({
          function_execution_id: body.function_data.execution_id,
          error: result.error,
        });
        return;
      }

      // ボタンの DM をリプレースして「対応済み」表示にする。
      const label = decision === "approved" ? ":white_check_mark: 承認しました" : ":x: 却下しました";
      if (messageTs) {
        await client.chat.update({
          channel: body.container.channel_id,
          ts: messageTs,
          text: label,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `${label} (<@${body.user.id}> による操作)\nrequest_id: \`${request_id}\``,
              },
            },
          ],
        });
      }

      // 関数を成功で終了させる。
      await client.functions.completeSuccess({
        function_execution_id: body.function_data.execution_id,
        outputs: {
          request_id,
          decision,
        },
      });
    },
  );
