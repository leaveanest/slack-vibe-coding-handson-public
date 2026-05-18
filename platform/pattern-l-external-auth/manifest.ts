import { Manifest } from "deno-slack-sdk/mod.ts";
// External Auth Provider は manifest で必ず登録する
import { GitHubProvider } from "./providers/github_provider.ts";
import { PRSummaryWorkflow } from "./workflows/pr_summary_workflow.ts";
import { SummarizeGitHubPRDefinition } from "./functions/summarize_github_pr.ts";

export default Manifest({
  name: "pattern-l-external-auth",
  description: "GitHub External Auth を使って PR を要約する Slack Automation",
  icon: "assets/default_new_app_icon.png",
  workflows: [PRSummaryWorkflow],
  functions: [SummarizeGitHubPRDefinition],
  // 外部 API を叩く場合は明示的に許可ドメインに追加する
  outgoingDomains: ["api.openai.com", "api.github.com"],
  // External Auth Provider をここに登録することで `slack external-auth add` が使える
  externalAuthProviders: [GitHubProvider],
  botScopes: [
    "commands",
    "chat:write",
    "chat:write.public",
  ],
});
