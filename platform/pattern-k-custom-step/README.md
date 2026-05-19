# Pattern K — Workflow Builder 用カスタムステップ (Connector Function)

## お題

Slack 標準の **Workflow Builder (WFB / ノーコード)** から呼び出せる **「AI で整形」カスタムステップ** を Slack Automations (Deno SDK) で自作する。

`slack deploy` 後、WFB の「ステップを追加」画面の Custom セクションに自動で本ステップが現れ、**非エンジニアでもクリックだけでワークフローに組み込める** ようになる。

- Input: `text` (string, 必須) / `format_style` (enum: `formal` / `casual` / `bullet` / `summary`, 必須)
- Output: `formatted_text` (string)
- 内部処理: OpenAI Chat Completions API を `format_style` ごとに異なる system prompt で呼び出して整形

## 触れる技術 / 概念

- **Slack Automations / Deno SDK**
- **Custom Step (Connector Function)** — `DefineFunction` で WFB に公開する
- **WFB の UI ラベル** — `title` / `description` がそのまま表示される
- **`enum` でのドロップダウン化**
- **OpenAI Chat Completions API** (`fetch` 直叩き)
- **`slack deploy` と `slack run` の違い** — WFB から見えるのは deploy 済みのみ

## 想定時間

**35〜40 分**(`slack deploy` と Workflow Builder 操作含む)

| ステップ | 目安 |
| --- | --- |
| 0. 環境準備 (`slack` CLI, Deno, OpenAI キー) | 3 分 |
| 1. `manifest.ts` で functions に登録 | 5 分 |
| 2. `functions/ai_format_step.ts` で Input/Output schema を書く | 7 分 |
| 3. OpenAI 呼び出しと style 別 system prompt | 10 分 |
| 4. `slack deploy` & WFB 反映確認 | 8 分 |
| 5. WFB でワークフローを組んで動作確認 | 7 分 |

## ディレクトリ構成

```text
pattern-k-custom-step/
├── README.md
├── HINTS.md
├── manifest.ts                   # functions に AIFormatStepFunction を登録 (workflows は空)
├── slack.json                    # deno-slack-hooks
├── deno.json                     # imports (deno-slack-sdk@2.14.2 / deno-slack-api@2.8.0)
├── .env.example                  # OPENAI_API_KEY / OPENAI_MODEL
├── functions/
│   └── ai_format_step.ts         # Custom Step 本体
└── docs/
    ├── workflow-builder-usage.md # 非エンジニア向け WFB 利用ガイド
    └── screenshots/              # 実機検証時のスクショ置き場 (.gitkeep)
```

## 触ってみる手順

### 1. 事前準備

```bash
# 最新版 Slack CLI のセットアップ済み前提
slack version
deno --version
```

### 2. 依存解決と型チェック

```bash
cd platform/pattern-k-custom-step
deno task check
```

### 3. デプロイ (WFB から見えるようにする)

> **重要:** WFB のステップ一覧に出現させるには `slack run` ではなく **`slack deploy`** が必須。
> ローカル実行 (Socket Mode) では WFB はカスタムステップを検出できない。

```bash
slack deploy
```

初回は対象ワークスペース / Team を聞かれるので選択する。

### 4. OpenAI キーをアプリ環境変数に登録

```bash
slack env add OPENAI_API_KEY sk-xxxxxxxxxxxxxxxxxxxx
slack env add OPENAI_MODEL gpt-4o-mini     # 任意 (省略時は gpt-4o-mini)
```

### 5. WFB から呼ぶ

1. Slack の左下「その他 (More)」→ **Automations** → **Workflow Builder** を開く
2. **New Workflow** → トリガー (例: Link trigger) を選ぶ
3. **+ ステップを追加** → **Custom** タブを開く
4. **`AI で整形`** が一覧に出ているのでクリック
5. `整形するテキスト` フィールドにテキスト or 変数を、`整形スタイル` ドロップダウンからスタイルを選ぶ
6. 次のステップ (例: 「メッセージを送信」) の本文に `formatted_text` 変数を差し込む
7. Publish → ワークフローを実行

詳細な手順は [`docs/workflow-builder-usage.md`](./docs/workflow-builder-usage.md) を参照。

### 6. 詰まったら

[`HINTS.md`](./HINTS.md) に詰まりポイント 5 個をまとめている。

## 学べるポイント

- **「自作ステップを WFB に公開する」というプラットフォーム最大の強み** を実体験できる
- 一度デプロイすれば **コードを触らない人 (PM / 営業 / カスタマーサクセスなど) が** ワークフローを自由に組み立てて再利用できる
- Bolt 版 (Socket Mode) では実現できない、Slack Platform ならではの差別化機能
