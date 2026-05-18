import { Manifest } from "deno-slack-sdk/mod.ts";
import { AIFormatStepFunction } from "./functions/ai_format_step.ts";

/**
 * Pattern K - Workflow Builder 用カスタムステップ
 *
 * このアプリは Slack 標準の Workflow Builder (WFB / ノーコード) から
 * 呼び出せる「AI で整形」カスタムステップ (Connector Function) を提供する。
 *
 * - functions に AIFormatStepFunction を登録すると、`slack deploy` 後に
 *   WFB のステップ選択画面 (Custom 配下) にこのステップが自動的に出現する。
 * - 自前の Workflow は持たないため `workflows` は空配列。WFB 側で
 *   ワークフローを組み立てる前提。
 *
 * 重要: WFB から呼び出すには `slack run` (Socket Mode / ローカル実行) ではなく
 *       必ず `slack deploy` でホストデプロイする必要がある。
 */
export default Manifest({
  name: "pattern-k-custom-step",
  description: "Workflow Builder から呼べる「AI で整形」カスタムステップ",
  icon: "assets/default_new_app_icon.png",
  functions: [AIFormatStepFunction],
  workflows: [],
  outgoingDomains: ["api.openai.com"],
  botScopes: [
    "commands",
    "chat:write",
    "chat:write.public",
  ],
});
