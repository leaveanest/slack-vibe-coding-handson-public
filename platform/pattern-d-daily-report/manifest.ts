// ---------------------------------------------------------------------------
// Slack App Manifest
// ---------------------------------------------------------------------------
// このファイルが Slack Platform アプリの "心臓部" です。
//   * どんなアプリ名 / 説明か
//   * どんな Custom Function を持つか
//   * どんな Workflow を持つか
//   * 外部にどのドメインへ fetch して良いか (outgoingDomains)
//   * どんな bot scope が必要か
// を一元的に宣言します。
//
// `slack deploy` でこの manifest が Slack 側に反映されます。
// ハンズオン中の頻出ハマりどころ:
//   - Custom Function や Workflow を新規追加したら、必ずこの配列に登録する
//   - 外部 API (OpenAI 等) を叩く場合は outgoingDomains に追加しないと
//     fetch が "Network request not allowed" で落ちる
// ---------------------------------------------------------------------------

import { Manifest } from "deno-slack-sdk/mod.ts";
import { FormatDailyReportFunction } from "./functions/format_daily_report.ts";
import DailyReportWorkflow from "./workflows/daily_report_workflow.ts";

export default Manifest({
  name: "pattern-d-daily-report",
  description: "日報フォーム → OpenAI 整形 → チャンネル投稿 (ハンズオン用)",
  icon: "assets/default_new_app_icon.png",
  // ↓ 新規追加した関数・ワークフローはここに必ず登録する。
  functions: [FormatDailyReportFunction],
  workflows: [DailyReportWorkflow],
  // ↓ OpenAI を fetch するのに必須。ここに無いドメインへの外部通信は
  //   Slack Platform のサンドボックスがブロックする。
  outgoingDomains: ["api.openai.com"],
  // ↓ SendMessage を public channel に投げるために chat:write.public が必要。
  //   commands は Link Trigger をワークスペースから利用するために付けておく。
  botScopes: [
    "commands",
    "chat:write",
    "chat:write.public",
  ],
});
