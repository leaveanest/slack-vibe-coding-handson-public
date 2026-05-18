import { Trigger } from "deno-slack-sdk/types.ts";
import HandleDecisionWorkflow from "../workflows/handle_decision_workflow.ts";

/**
 * Block Action Trigger (参考実装)。
 *
 * --------------------------------------------------------------------------
 * 重要: この pattern-f の本筋の動線は `send_approver_dm.ts` の
 *       `addBlockActionsHandler` で完結します。
 *       このファイルは「ボタンクリックを別 workflow として起動するパターンも
 *       書ける」ことを示すための参考実装です。
 * --------------------------------------------------------------------------
 *
 * - 仕様:
 *     - `type: "block_actions"` (Slack の Trigger API 上の値)
 *     - `filter` で `action_id` が `approve_button` か `reject_button` のものだけマッチ。
 *     - ボタンの `value` に仕込んだ `request_id` を `{{data.actions[0].value}}` で取り出す。
 *     - 押された側の `action_id` を `{{data.actions[0].action_id}}` で取り出し、
 *       "approve_button" → "approved" / "reject_button" → "rejected" に変換するのは
 *       本来 workflow 側 (もしくは中継 function 側) で行う。
 *       ここではシンプルに action_id をそのまま渡し、handle_decision 側で
 *       "approved" / "rejected" 以外を rejected として扱う実装になっている。
 *
 * - Deno SDK 同梱の `TriggerTypes` enum には現時点で BlockActions 用の値が定義
 *   されていないので、`type` は文字列リテラルで指定し、Trigger 型は `unknown` の
 *   ベース型 (BaseTrigger) で書く形になる。
 *   そのため `Trigger<typeof Workflow.definition>` の型ガードを少しだけ緩めている。
 *
 * - このトリガを実際に使う場合:
 *     1. `slack trigger create --trigger-def triggers/block_action_trigger.ts`
 *     2. ただし `addBlockActionsHandler` と二重に動いてしまうので、
 *        `send_approver_dm.ts` のハンドラ側はコメントアウトしておくこと。
 */

// deno-slack-sdk の Trigger 型は EventTrigger / ShortcutTrigger などのユニオン型で、
// block_actions はそのままだとマッチしないため、互換のため Record で表現する。
type BlockActionsTrigger = Trigger<typeof HandleDecisionWorkflow.definition> | {
  type: "block_actions";
  name: string;
  description?: string;
  workflow: string;
  inputs: Record<string, { value: string }>;
  filter?: {
    version: number;
    root: {
      statement: string;
    };
  };
};

const trigger: BlockActionsTrigger = {
  type: "block_actions",
  name: "承認/却下ボタンの押下を捕捉",
  description: "approve_button か reject_button が押されたら decision workflow を起動",
  workflow: `#/workflows/${HandleDecisionWorkflow.definition.callback_id}`,
  inputs: {
    request_id: { value: "{{data.actions[0].value}}" },
    // action_id をそのまま渡し、handle_decision 側で
    // "approve_button" 以外を rejected として扱う実装になっているので、
    // ここでは値変換は行わない。
    decision: { value: "{{data.actions[0].action_id}}" },
    reviewer: { value: "{{data.user.id}}" },
  },
  filter: {
    version: 1,
    // action_id でフィルタする式。CEL 風の DSL。
    // "approve_button" もしくは "reject_button" のときだけ workflow が走る。
    root: {
      statement:
        '{{data.actions[0].action_id}} == "approve_button" || {{data.actions[0].action_id}} == "reject_button"',
    },
  },
};

export default trigger;
