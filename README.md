# slack-vibe-coding-handson-public

> Slack ハンズオンワークショップ「**Vibe Coding で Slack アプリ開発をマスター**」の教材リポジトリ。

Codex App（OpenAI API）を使って "vibe coding" で Slack アプリをサクッと作る体験を、Bolt 版と Slack Platform 版の 2 系統で揃えています。

## 対象ワークショップ

| 日時 | イベント | 時間 | 内容 |
| --- | --- | --- | --- |
| 2026-05-19 | Slack Community Tokyo | 2 時間 (予行演習) | 試行・複数パターン体験 |
| 2026-06-08 | AWTT 本番 | 1 時間 (ハンズオン 40 分) | 採用パターンを 40 分でハンズオン |

## パターン一覧

> **当日ハンズオンで出すのは ★ の 4 案 (A / B / D / K)。** 残り 8 案 (C / G / H / I / E / F / J / L) は当日は使いませんが、リポジトリには参考実装として含まれています。

### 🅰️ Bolt 版（Bolt for TypeScript / Socket Mode）

| ID | パターン | 概要 |
| --- | --- | --- |
| ★ A | [pattern-a-summarize](./bolt/pattern-a-summarize/) | `/summarize` でスレッドを要約する Slash Command |
| ★ B | [pattern-b-translate](./bolt/pattern-b-translate/) | リアクションでメッセージを翻訳 |
| C | [pattern-c-mention](./bolt/pattern-c-mention/) | `@mention` で AI が応答するボット |
| G | [pattern-g-file-analysis](./bolt/pattern-g-file-analysis/) | アップロードされたファイルを解析 |
| H | [pattern-h-app-home](./bolt/pattern-h-app-home/) | App Home タブで個人ダッシュボード |
| I | [pattern-i-keyword-watcher](./bolt/pattern-i-keyword-watcher/) | 特定キーワードを監視してアラート |

### 🅱️ Platform 版（Deno / Slack Automations / `slack` CLI）

| ID | パターン | 概要 |
| --- | --- | --- |
| ★ D | [pattern-d-daily-report](./platform/pattern-d-daily-report/) | 日報をフォームで提出 → チャンネル投稿 |
| E | [pattern-e-canvas-minutes](./platform/pattern-e-canvas-minutes/) | 議事録を Canvas に自動生成 |
| F | [pattern-f-approval](./platform/pattern-f-approval/) | 承認ワークフロー |
| J | [pattern-j-weekly-report](./platform/pattern-j-weekly-report/) | 週次レポートを定期生成 |
| ★ K | [pattern-k-custom-step](./platform/pattern-k-custom-step/) | Workflow Builder 用のカスタムステップ |
| L | [pattern-l-external-auth](./platform/pattern-l-external-auth/) | 外部 API への OAuth 連携 |

## クイックスタート

### 1. 環境準備

[SETUP.md](./SETUP.md) を読んで、Mac / Windows の手順で開発環境をセットアップしてください。

ざっくり必要なもの：

- Node.js 20+ / npm（Bolt 版）
- Deno 1.40+ / `slack` CLI（Platform 版）
- Codex App（vibe coding 用）
- OpenAI API キー（当日配布）
- 開発用 Slack ワークスペース

### 2. パターンを選んで開く

```bash
# 例: Bolt の要約パターンを試す
cd bolt/pattern-a-summarize
cat README.md   # お題を読む
cat HINTS.md    # 詰まったら段階的ヒントを参照
```

### 3. Codex App で実装

各パターンの `README.md` に書かれている「お題」を Codex に投げ、生成された差分を確認しながら完成させてください。完成版は `src/`（Bolt）または `functions/` `workflows/` `triggers/`（Platform）にあります。

## ドキュメント

- [CLAUDE.md](./CLAUDE.md) — Claude Code セッションで参照する共通コンテキスト
- [SETUP.md](./SETUP.md) — 環境構築（Mac / Windows）
- [`.env.example`](./.env.example) — 環境変数テンプレート
- [`docs/event-2026-05-19/`](./docs/event-2026-05-19/) — 参加者向け配布資料 (ハンドブック / チートシート / 投票)

## ライセンス

[MIT](./LICENSE)
