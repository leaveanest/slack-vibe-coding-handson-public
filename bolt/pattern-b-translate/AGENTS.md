# AGENTS.md — pattern-b-translate (SLA-39)

> 親 [`AGENTS.md`](../../AGENTS.md) (リポジトリ共通) を継承。ここではパターン B 固有のルールのみ。

## このパターンは何か

メッセージに 🇺🇸 / 🇯🇵 / 🇫🇷 / 🇰🇷 / 🇨🇳 のリアクションが付くと、対応言語に翻訳して **同じスレッドに返信** する Bolt アプリ。所要 30〜35 分。

## ファイル構成 (生成して良い範囲)

```text
bolt/pattern-b-translate/
├── README.md            # 参加者向け
├── HINTS.md             # 参加者向け
├── AGENTS.md            # このファイル
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   └── index.ts         # ★ ここを書く。1 ファイル完結
└── docs/
    └── manifest-template.md
```

`src/` 配下のファイル追加は禁止。

## 実装の必須ポイント

1. **`app.event("reaction_added", ...)`** で受ける (Events API)
2. **Bot 自身のリアクションを無視** — 起動時に `app.client.auth.test()` を呼んで `bot_user_id` を保存し、`event.user === bot_user_id` なら早期 return
3. **国旗 → 言語マッピング** — 最低限 `us`/`jp`/`fr`/`kr`/`cn` の 5 つ。`Record<string, { lang: string; label: string }>` で定数化
4. **対応外の国旗は無視** — マップに無ければ `return`、エラーにしない
5. 元メッセージ取得: `client.reactions.get({ channel, timestamp, full: true })` を使う
6. **重複処理を防ぐ** — 同じメッセージに同じ国旗が複数付いても、`reactions.get` の結果から `count` を見て **1 件目だけ翻訳**。素朴な実装としてメッセージ内 (スレッド内) を `conversations.replies` で見て「自分の同言語翻訳が既にあれば skip」も可
7. 翻訳結果は **元メッセージのスレッドに `chat.postMessage`** で返信。`thread_ts` は元メッセージの `thread_ts ?? ts` で解決
8. OpenAI モデルは `OPENAI_MODEL` 環境変数で指定する (未設定時は最新の軽量モデル)

## Slack CLI を使った開発フロー (このパターンのデフォルト)

**Codex は `slack` CLI を使ってアプリ作成・実行する**。Web UI からの Manifest 貼り付けは生成しない。

```bash
cd bolt/pattern-b-translate
slack install              # manifest.json を Slack 側に登録
slack run                  # Socket Mode で起動 (xoxb / xapp 自動注入)
```

manifest は **`manifest.json` をこのディレクトリ直下** に置く。Bolt 用 manifest を Slack CLI が読み込む。

## 必須 env

- `OPENAI_API_KEY` — **`.env` に書く** (Slack CLI の管轄外)
- `OPENAI_MODEL` (任意)

**Token 系は `.env` に書かない** — `slack run` が自動注入。コード側は `process.env.SLACK_BOT_TOKEN` を読むだけ。起動時の env 検証は `OPENAI_API_KEY` のみで OK。

## Slack Manifest 要件 (`manifest.json`)

- Event Subscriptions (`bot_events`): `reaction_added`
- Bot Token Scopes: `reactions:read` / `channels:history` / `groups:history` / `chat:write`
- App-Level Token Scopes: `connections:write`
- Socket Mode: **enabled**

```json
{
  "display_information": { "name": "pattern-b-translate" },
  "features": {
    "bot_user": { "display_name": "translate-bot" }
  },
  "oauth_config": {
    "scopes": { "bot": ["reactions:read", "channels:history", "groups:history", "chat:write"] }
  },
  "settings": {
    "event_subscriptions": { "bot_events": ["reaction_added"] },
    "interactivity": { "is_enabled": false },
    "socket_mode_enabled": true
  }
}
```

## 既知の落とし穴 (このパターン固有)

| 取り違え | 正しい |
|---|---|
| `event.item.ts` vs `event.item.thread_ts` | `event.item` は `{ type: "message", channel, ts }` のみ。スレッド内で reaction された場合の親 ts は **`reactions.get` の結果メッセージから取る** |
| 国旗 emoji の `name` | Slack の reaction `name` は `flag-us` ではなく **`us`** (国旗の場合は ISO 国コード単体)。`+1` / `heart` などと同じ命名 |
| Bot ループ | Bot が翻訳を返信した時点で Bot 自身のメッセージにもリアクションが飛んでくるパターンがある (人間が翻訳に再リアクションした場合)。マッピングに無ければ無視されるので追加のループ防止は不要 |
| `thread_ts` の解決 | 元メッセージが既にスレッド内なら `message.thread_ts`、そうでなければ `message.ts` を `thread_ts` として `chat.postMessage` に渡す |

## やらないこと (このパターン固有)

- ❌ 翻訳結果のキャッシュ (KV / Redis / メモリ Map の追加)
- ❌ `reaction_removed` への対応 (枠外)
- ❌ DM への翻訳通知 (チャンネル内 reaction → スレッド返信に固定)
- ❌ 国旗マップを外部 JSON / 環境変数化する (定数で十分)
- ❌ `i18n` ライブラリの導入
- ❌ Token 系を `.env` に追記する手順を生成する (Slack CLI 注入が前提)
- ❌ `npm run dev` を README のメインフローとして書く (fallback として残すが Slack CLI 推奨)

## 完成版コードと差分を比較する

`src/index.ts` が完成版。Codex が「マッピングを `JSON` ファイル化しましょう」など提案しても断る。教材として **コードを開いてすぐ国旗を増やせる** のが価値。
