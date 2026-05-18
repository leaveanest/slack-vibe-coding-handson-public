# AGENTS.md — pattern-k-custom-step (SLA-48)

> 親 [`AGENTS.md`](../../AGENTS.md) (リポジトリ共通) を継承。ここではパターン K 固有のルールのみ。

## このパターンは何か

Workflow Builder (WFB / Slack 標準ノーコード) の **Custom セクションに自前の AI ステップを出現させる** パターン。Connector Function を Deno SDK で実装 → `slack deploy` → WFB の「自社用ステップ」になる。所要 35〜40 分。

**Platform 唯一の差別化体験** (社内共有資料 §4 採用理由)。

## ファイル構成 (生成して良い範囲)

```text
platform/pattern-k-custom-step/
├── README.md
├── HINTS.md
├── AGENTS.md
├── deno.json
├── slack.json
├── manifest.ts                          # ★
├── functions/
│   └── ai_format_step.ts                # ★ Connector Function
├── docs/
│   └── (Workflow Builder 手順 / スクショ)
└── .env.example
```

このパターンは **自前 Workflow を持たない**。`workflows/` ディレクトリ自体が無い。WFB 側でユーザーが Workflow を組み立てる前提。

## 実装の必須ポイント

### manifest.ts

- `name: "pattern-k-custom-step"`
- `functions: [AIFormatStepFunction]`
- **`workflows: []`** ← 空配列で固定。WFB 側に任せるので自前 Workflow は持たない
- `outgoingDomains: ["api.openai.com"]`
- `botScopes: ["commands", "chat:write", "chat:write.public"]`

### functions/ai_format_step.ts

- `DefineFunction({ callback_id: "ai_format_step", title: "AI で整形", ... })`
- **入力**:
  - `text` (string, 必須) — 整形対象本文。`title` / `description` を WFB UI 用に書く
  - `format_style` (string, 必須) — **`enum: ["formal", "casual", "bullet", "summary"]`**。enum 指定で WFB がドロップダウン UI を生成する
- **出力**: `formatted_text` (string, 必須)
- `source_file: "functions/ai_format_step.ts"`
- 実装は `SYSTEM_PROMPTS: Record<string, string>` で 4 スタイルそれぞれの system prompt を定数化
- OpenAI は `fetch` で直接、モデルは最新の汎用モデル (`OPENAI_MODEL` 環境変数で指定)、`temperature` はスタイルごとに調整可 (formal: 0.2 / casual: 0.6 / bullet: 0.3 / summary: 0.3 程度)
- **未知の `format_style` が来たら error 出力** (`{ error: "..." }` を `SlackFunction` の返り値にする) — Slack Function は `{ outputs, error }` 形式で返す

### Workflow Builder 側 (コード対象外)

- `slack deploy` 後、Slack Desktop で WFB を開く → 「ステップを追加」→ Custom セクション → 「AI で整形」が出現
- 当日のデモは **enum に 1 要素追加 (`"meeting_minutes"` 等) → 再 deploy → WFB のドロップダウンに反映** が訴求点。`SYSTEM_PROMPTS` と `enum` の両方を更新する必要があることをコメントで明示

## 必須 env

- `OPENAI_API_KEY` — **デプロイ時は `slack env add OPENAI_API_KEY <value>`** で Slack 側に登録する (deploy 環境のため `.env` ではなく Slack 管理シークレットに置く)
- ローカル `slack run` でも動かす場合は `.env` 経由でも可

## 既知の落とし穴 (このパターン固有)

| 取り違え | 正しい |
|---|---|
| **`slack run` vs `slack deploy`** | WFB に出すには **必ず `slack deploy`** が必要。`slack run` (ローカル) では Custom セクションに現れない |
| `workflows: []` | 自前 Workflow を持たないので **空配列**。誤って Workflow を定義すると WFB に「自社 Workflow」も並んで意図と異なる UI になる |
| Function `title` / `description` | WFB UI に表示されるラベル。**長い英語の callback_id をユーザーに見せない** ためにも日本語 `title` を必ず書く |
| `format_style` の enum | enum を指定すると WFB はドロップダウン、無指定だと自由入力。**ハンズオン中の訴求点なので enum は外さない** |
| OPENAI_API_KEY の置き場 | `slack deploy` 後の関数は Slack のホスト環境で動くので、`.env` ではなく **`slack env add`** で Slack 側に渡す |
| 再 deploy のタイミング | manifest.ts / function 本体を変更したら **`slack deploy` 必須**。`slack run` 時のホットリロードは deploy 環境には届かない |

## やらないこと (このパターン固有)

- ❌ 自前 Workflow を `workflows/` に追加する (WFB に任せる)
- ❌ Trigger を追加する (WFB 側の Trigger を使う)
- ❌ `npm:openai` SDK 経由 (fetch 固定)
- ❌ `format_style` の enum を動的化する (環境変数 / Datastore からの読み込みは枠外)
- ❌ 結果を Slack に直接投げる (Connector Function の責務は **整形した文字列を return するだけ**。送信は WFB の次ステップの SendMessage に任せる)
- ❌ ファイル添付 / 画像 / Block Kit リッチ出力 (string で返す)

## 完成版コードと差分を比較する

`functions/ai_format_step.ts` が完成版。Codex が **Strategy パターンでスタイルクラスを分けましょう** と提案しても断る。`SYSTEM_PROMPTS` という単純な辞書のほうが、WFB の enum 追加と 1 対 1 で対応していて教材として読みやすい。
