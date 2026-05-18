# AGENTS.md — pattern-d-daily-report (SLA-44)

> 親 [`AGENTS.md`](../../AGENTS.md) (リポジトリ共通) を継承。ここではパターン D 固有のルールのみ。

## このパターンは何か

**Link Trigger → OpenForm → Custom Function (OpenAI 整形) → SendMessage** という Slack Platform Workflow 1 周分を体験するパターン。所要 30〜35 分。`slack run` でローカル実行可能。

## ファイル構成 (生成して良い範囲)

```text
platform/pattern-d-daily-report/
├── README.md
├── HINTS.md
├── AGENTS.md
├── deno.json
├── slack.json
├── manifest.ts                          # ★
├── functions/
│   └── format_daily_report.ts           # ★ Custom Function
├── workflows/
│   └── daily_report_workflow.ts         # ★ Workflow
├── triggers/
│   └── link_trigger.ts                  # ★ Link Trigger 定義
└── .env.example
```

ファイル 4 つ (`manifest` + `function` + `workflow` + `trigger`) の構成は **Platform の基本ユニット**。これを増やしたり減らしたりしない。

## 実装の必須ポイント

### manifest.ts

- `name: "pattern-d-daily-report"`
- `functions: [FormatDailyReportFunction]`
- `workflows: [DailyReportWorkflow]`
- **`outgoingDomains: ["api.openai.com"]`** ← 必須。これが無いと OpenAI 呼び出しが "Network request not allowed" で落ちる
- `botScopes: ["commands", "chat:write", "chat:write.public"]`

### functions/format_daily_report.ts

- `DefineFunction({ callback_id: "format_daily_report", ... })` で I/O スキーマを宣言
- **入力**: `today` (string, 必須) / `tomorrow` (string, 必須) / `feeling` (string, 任意) / `author_id` (`Schema.slack.types.user_id`, 必須)
- **出力**: `formatted_message` (string, 必須)
- `source_file: "functions/format_daily_report.ts"` — manifest.ts からの相対パス
- 実装は **`SlackFunction(definition, async ({ inputs, env }) => { ... })`** の形
- OpenAI は **`fetch` で直接呼ぶ** (`npm:openai` SDK は使わない)。`env.OPENAI_API_KEY` を Bearer ヘッダで渡す
- モデルは最新の汎用モデル (`OPENAI_MODEL` 環境変数で指定)、`temperature: 0.3`
- system prompt は「Slack mrkdwn の日報フォーマット」を指示。当日この部分を書き換えるのが訴求点なので **`SYSTEM_PROMPT` 定数を分離**

### workflows/daily_report_workflow.ts

- `DefineWorkflow` で Workflow を作る
- **Step 順序固定**:
  1. `Schema.slack.functions.OpenForm` — title / fields (`today` / `tomorrow` / `feeling`) を Workflow Input 引数から渡す
  2. `FormatDailyReportFunction` — Step 1 の outputs を渡す
  3. `Schema.slack.functions.SendMessage` — `channel_id` + Step 2 の `formatted_message`
- **Workflow Input** には Link Trigger から `interactivity` と `channel` を渡す前提

### triggers/link_trigger.ts

- `Trigger<typeof DailyReportWorkflow.definition>` 型で書く
- `type: TriggerTypes.Shortcut`、`name: "日報を書く"`
- `inputs.channel` と `inputs.interactivity` を Workflow に渡す
- `slack trigger create --trigger-def triggers/link_trigger.ts` で URL を発行する想定

## 必須 env

- `OPENAI_API_KEY` — `slack run` 起動時に環境変数として渡される (`.env` から自動ロード or `--env` フラグ)

## 既知の落とし穴 (このパターン固有)

| 取り違え | 正しい |
|---|---|
| `slack run` vs `slack deploy` | このパターンは **`slack run`** (ローカル / Socket Mode) で完結。`deploy` は不要 |
| Workflow Step の入力参照 | Step 2 から Step 1 の outputs を参照するときは **`step1.outputs.<field>`** (`step1.outputs.fields.<field>` ではない) |
| OpenForm の `fields.required` | `required` は **配列で field 名** を渡す。`element.required: true` ではない |
| Custom Function の input/output 型 | `Schema.slack.types.user_id` は **string で来る** (U... 形式)。SendMessage で `<@${author_id}>` のように使う |
| outgoingDomains 欠落 | OpenAI fetch が落ちる。`manifest.ts` 編集後は **`slack run` の再起動が必要** |

## やらないこと (このパターン固有)

- ❌ `npm:openai` / 他の npm SDK 経由で OpenAI を呼ぶ (Deno-native fetch 固定)
- ❌ Datastore (`DefineDatastore`) を使った履歴保存 (枠外)
- ❌ Workflow の Step を増やす (4 ステップで固定: OpenForm → AI → SendMessage が最小コア)
- ❌ Custom Function を複数定義する (1 ファイル 1 Function)
- ❌ `slack deploy` でホスト版を作る (このパターンは `slack run` 体験)
- ❌ Workflow Builder (WFB) UI からの利用 (それは SLA-48 のスコープ)

## 完成版コードと差分を比較する

`functions/format_daily_report.ts` などが完成版。Codex が **DRY 化のためにロジックを `lib/openai.ts` に切り出しましょう** と提案しても断る。各ファイルが自己完結している方が教材として読みやすい。
