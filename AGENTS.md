# AGENTS.md — slack-vibe-coding-handson (共通テンプレ)

> このファイルは **Codex App / Claude Code / 他のコーディング AI が読み込むプロジェクトルール**です。参加者向けの「お題」は各 `pattern-*/README.md`、AI 向けの「ルール」がここ。
>
> Codex は実行時にカレント階層と親階層の `AGENTS.md` を順に読みます。各パターンディレクトリには **このリポジトリ共通ルールを継承しつつパターン固有の制約だけを上書きする** `AGENTS.md` を別途置いています。

## このリポジトリは何か

Slack ハンズオン教材「Vibe Coding で Slack アプリ開発をマスター」(5/19 Slack Community Tokyo / 6/8 AWTT)。参加者が **Codex App で 30 分で 1 つのパターンを完走** するための教材リポジトリ。

採用 4 案: SLA-38 (`/summarize`) / SLA-39 (国旗翻訳) / SLA-44 (日報) / SLA-48 (Custom Step)。

## ランタイム制約 (固定)

| カテゴリ | 値 | 補足 |
|---|---|---|
| Node.js | **20 系** | Bolt パターンのみ。`engines.node: >=20` を package.json で固定 |
| Deno | **2.x (`deno_slack_sdk@2.14.2` 互換)** | Platform パターンのみ |
| Slack CLI | **2.x** | **Bolt パターン・Platform パターンの両方で必須** (2026-05-13 方針変更) |
| Codex App | 最新 | 参加者環境 |
| OpenAI モデル | **最新の軽量モデル** (デフォルト) | コスト最適化のため。`OPENAI_MODEL` 環境変数で上書き可 |

**勝手にバージョンを上げない**。とくに Bolt v4 / deno-slack-sdk v3 系の生成は禁止 (5/18 までに動作確認済みの組み合わせは上記)。

## 採用 SDK / バージョン

Bolt パターン (TypeScript / Node):

- `@slack/bolt@^3.22.0`
- `openai@^4.65.0`
- `dotenv@^16.4.5`
- `typescript@^5.5.4` + `ts-node@^10.9.2`

Platform パターン (Deno):

- `deno-slack-sdk@2.14.2`
- `deno-slack-api@2.8.0`
- OpenAI 呼び出しは **npm 互換ではなく `fetch` で直接** (`api.openai.com` を `manifest.ts` の `outgoingDomains` に追加)

## Transport (Bolt パターン)

- **Socket Mode 固定**。HTTP リスナー (`receiver` を自前で構築) / Events API の生 HTTP ハンドラを生成してはいけない。理由: ngrok / 公開エンドポイントを参加者に用意させない
- 接続には `SLACK_APP_TOKEN` (`xapp-`) と `SLACK_BOT_TOKEN` (`xoxb-`) の **両方** が必要。混同は最頻出ミス
- `app.start(process.env.PORT || 3000)` の引数は **Socket Mode では実際にはポートを開かない**。記法上の慣習として残してよいが、ファイアウォール設定を案内する必要はない

## Slack CLI を使った開発フロー (Bolt / Platform 共通)

**Codex はこのフローでアプリの作成・実行・更新を行うこと**。`api.slack.com/apps` の Web UI からの手動 Manifest 貼り付け / Token コピー手順は **生成しない** (参加者には案内可、但しコード生成のデフォルトは Slack CLI)。

```bash
# 1. リポジトリのパターンディレクトリへ
cd bolt/pattern-a-summarize   # or platform/pattern-d-daily-report

# 2. Slack ワークスペースとリンク (初回 1 回だけ)
#    - 既存ワークスペース or Developer sandbox を選ぶ
#    - これで App が Slack 側に作成され、xoxb / xapp が CLI 内部に保存される
slack auth login              # 未ログインの場合
slack install                 # このディレクトリの manifest を Slack 側にインストール

# 3. 開発実行 (Bolt も Platform も同じコマンド)
slack run                     # Socket Mode で接続、ホットリロードあり

# 4. (Platform 案 K のみ) WFB に出すには deploy
slack deploy
```

**重要:**

- `slack run` 起動時に **`SLACK_BOT_TOKEN` (`xoxb`) と `SLACK_APP_TOKEN` (`xapp`) が自動で環境変数として注入**される ([Slack CLI](https://docs.slack.dev/tools/slack-cli/))。`.env` に Token を手動コピーする必要なし
- `OPENAI_API_KEY` は依然 **`.env` に書く** (Slack CLI の管轄外)
- manifest を変えたら `slack run` を再起動 (Bolt) / `slack deploy` (Platform 案 K)
- `npm run dev` (Bolt) / `deno run` (Platform) は **Token を手動で `.env` に書いた場合の fallback**。Codex が生成するコードでは `slack run` を前提にすること

## コード規約

- **1 パターン = 1 完成版コード**。Bolt は `src/index.ts` 1 ファイル、Platform は `manifest.ts` + `functions/<name>.ts` + `workflows/<name>.ts` + `triggers/<name>.ts` で完結
- **過度に抽象化しない**。Repository パターン / DI コンテナ / Factory / Strategy パターンを勝手に導入しない。30 分で読める粒度を優先
- 共通ロジックを `lib/` や `utils/` に切り出すのは原則禁止 (パターンを跨いだ再利用は教材として狙わない)
- コメントは **「なぜ」だけ書く**。「何をしているか」はコードと識別子で表現する
- TypeScript の型は実用最小限。Bolt の `App` / `SlashCommand` / `KnownEventFromType<...>` 等は使うが、自前で型定義をいちから書かない

## エラーハンドリング

- Bolt の Slash Command / Action は **3 秒以内に ack** 必須。重い処理 (OpenAI 呼び出し) は ack の後に走らせる
- ユーザー入力不備 (`thread_ts` 形式違い、対応外の国旗) は **エフェメラル or DM で短く返す**。例外を投げて落とさない
- 内部例外は `app.error()` で握って `logger.error` する。クラッシュさせない
- リトライ・指数バックオフ・サーキットブレーカーは **書かない** (枠外)

## 既知の落とし穴 (Codex が混同しがち)

| 取り違え | 正しい |
|---|---|
| `xoxb` (Bot) vs `xapp` (App-Level) | Bot Token = `xoxb-` (`token` に渡す) / App Token = `xapp-` (`appToken` に渡す、Socket Mode 専用) |
| `thread_ts` vs `message_ts` | 「スレッドを取得するなら親の `thread_ts`」。Slash Command 引数で渡される `1715000000.1234` 形式は **小数点付き** |
| Slash Command の `respond()` vs `chat.postMessage` | 実行者にだけ返すなら `respond({ response_type: "ephemeral" })` か `client.chat.postEphemeral`。チャンネルに残すなら `chat.postMessage` |
| Bot 自身のリアクション処理 | `reaction_added` は **Bot 自身の reaction も飛んでくる**。`auth.test` で `bot_user_id` を取って自前で弾く |
| Custom Function の `source_file` | `manifest.ts` からの**相対パス**で書く。`./functions/foo.ts` ではなく `functions/foo.ts` (Slack Platform 仕様) |
| outgoingDomains | OpenAI を fetch する Platform パターンは `manifest.ts` に `outgoingDomains: ["api.openai.com"]` 必須。忘れると "Network request not allowed" |

## やらないこと (スコープ外)

- ❌ ユニットテスト / 結合テスト (`jest` / `vitest` / `deno test` の追加禁止)
- ❌ CI への追加ジョブ (`.github/workflows/` を勝手に増やさない。markdownlint / tsc / deno check の 3 つで止める)
- ❌ Dockerfile / docker-compose の追加
- ❌ Lint / Prettier 設定の変更 (既存の `.markdownlint.jsonc` / `deno fmt` 設定のみ)
- ❌ 過剰な型抽象 (Generics で SDK ラッパーを作る等)
- ❌ パターン間の共通ライブラリ化
- ❌ 環境変数を `.env` 以外の場所 (1Password CLI / Doppler 等) から読む実装

## コミットルール

- **Conventional Commits** (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`)
- 1 パターン = 1 ブランチ = 1 PR、ブランチ命名は `feat/sla-XX-{kebab-name}`
- PR タイトル: `[SLA-XX] パターン名 / 短い説明`
- マージは Squash and merge

## 参考

- 教材全体ガイド: [CLAUDE.md](./CLAUDE.md)
- 環境構築: [SETUP.md](./SETUP.md)
- Codex AGENTS.md 公式: <https://developers.openai.com/codex/guides/agents-md>
