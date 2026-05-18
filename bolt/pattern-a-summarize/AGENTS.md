# AGENTS.md — pattern-a-summarize (SLA-38)

> 親 [`AGENTS.md`](../../AGENTS.md) (リポジトリ共通) を継承。ここではパターン A 固有のルールのみ。

## このパターンは何か

`/summarize <thread_ts>` Slash Command でスレッドを AI 要約し、**実行者にだけ** エフェメラルメッセージで返す Bolt アプリ。所要 30〜40 分。

## ファイル構成 (生成して良い範囲)

```text
bolt/pattern-a-summarize/
├── README.md            # お題 (参加者向け、AI は触らない)
├── HINTS.md             # 段階的ヒント (参加者向け、AI は触らない)
├── AGENTS.md            # このファイル
├── package.json         # 依存・scripts 固定
├── tsconfig.json
├── .env.example
├── src/
│   └── index.ts         # ★ ここを書く。1 ファイル完結
└── docs/
    └── manifest-template.md
```

**`src/` 配下にファイルを増やさない** (handlers/, services/ などへの分割は禁止)。Codex がリファクタを提案してきたら断る。

## 実装の必須ポイント

1. **Slash Command `/summarize`** を `app.command("/summarize", ...)` で受ける
2. **3 秒 ack 制約** — `await ack()` を最初に呼ぶ。その後に OpenAI を呼ぶ
3. **引数なし / 不正な ts** — エフェメラルで使い方を返す。例外を投げない
4. スレッド取得は `client.conversations.replies({ channel, ts: threadTs, limit: 200 })`。`limit` は 200 で固定 (LLM コンテキスト保護)
5. **`chat.postEphemeral`** で実行者にだけ返す (`response.response_type = "ephemeral"` の `respond()` でも可)
6. OpenAI モデルは `process.env.OPENAI_MODEL` で切り替え可能にし、未設定時は最新の軽量モデルをデフォルトにする
7. System prompt は「決定事項 / 宿題 / 未解決の論点」を箇条書きで返すよう指示 — 当日この部分を書き換えるデモが訴求点なので、**`SYSTEM_PROMPT` を 1 つの定数に切り出す**

## Slack CLI を使った開発フロー (このパターンのデフォルト)

**Codex は `slack` CLI を使ってアプリ作成・実行する**。Web UI からの Manifest 貼り付けは生成しない。

```bash
cd bolt/pattern-a-summarize
slack install              # manifest.json をワークスペースに登録 (App 作成)
slack run                  # Socket Mode で起動 (xoxb / xapp は CLI が自動注入)
```

manifest は **`manifest.json` をこのディレクトリ直下に置く** (Bolt 用、Slack CLI が読む)。`docs/manifest-template.md` は人間向けの参照用に残し、コード生成時は `manifest.json` を直接編集する。

## 必須 env (`.env.example` と一致させる)

- `OPENAI_API_KEY` — **`.env` に書く** (Slack CLI の管轄外)
- `OPENAI_MODEL` (任意、デフォルト: 最新の軽量モデル)

**Token 系 (`SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN` / `SLACK_SIGNING_SECRET`) は `.env` に書かない** — `slack run` が自動で注入する。

ただしコード側は `process.env.SLACK_BOT_TOKEN` などを **そのまま読む** (Bolt App の初期化は変えない)。`slack run` が起動時環境変数として渡してくれる前提。起動時の検証 (`throw new Error(...)`) は **`OPENAI_API_KEY` のみ** チェックすればよい (Slack トークンは CLI が保証)。

## Slack Manifest 要件 (`manifest.json`)

- Slash Command: `/summarize`、`usage_hint: "<thread_ts>"`
- Bot Token Scopes: `commands` / `channels:history` / `groups:history` / `chat:write`
- App-Level Token Scopes: `connections:write`
- Socket Mode: **enabled**

`manifest.json` の例:

```json
{
  "display_information": { "name": "pattern-a-summarize" },
  "features": {
    "bot_user": { "display_name": "summarize-bot" },
    "slash_commands": [
      { "command": "/summarize", "description": "スレッドを要約", "usage_hint": "<thread_ts>" }
    ]
  },
  "oauth_config": {
    "scopes": { "bot": ["commands", "channels:history", "groups:history", "chat:write"] }
  },
  "settings": {
    "event_subscriptions": {},
    "interactivity": { "is_enabled": true },
    "socket_mode_enabled": true
  }
}
```

## 既知の落とし穴 (このパターン固有)

| 取り違え | 正しい |
|---|---|
| `thread_ts` 引数の形式 | `1715000000.1234` (小数点付き)。`p17150000001234` (Slack URL からコピーした形式) は **小数点を補う必要がある** |
| `conversations.replies` の戻り | `messages[0]` はスレッドの **親メッセージ** (`thread_ts` と同じ)。返信のみが欲しい場合は `slice(1)` |
| エフェメラルの寿命 | エフェメラルは **チャンネル更新でも消えない**。`response_type: "in_channel"` にしないこと |

## やらないこと (このパターン固有)

- ❌ DB / KV / Redis に要約結果をキャッシュする実装
- ❌ Slash Command 以外のトリガー (メンション / 絵文字) を追加する
- ❌ `respond()` と `chat.postEphemeral` の両方を呼ぶ (どちらか 1 つ)
- ❌ ストリーミング応答 (OpenAI の `stream: true`) — エフェメラルは編集不可なので意味がない
- ❌ Token 系を `.env` に追記する手順を生成する (Slack CLI 注入が前提)
- ❌ `npm run dev` を README のメインフローとして書く (fallback として残すが Slack CLI 推奨)

## 完成版コードと差分を比較する

`src/index.ts` が完成版。Codex が出した差分とこれを読み比べて学ぶのが教材の狙い。**Codex が完成版より「親切」なコードを出してきたら、それは過剰**。
