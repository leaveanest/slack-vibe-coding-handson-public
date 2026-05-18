# CLAUDE.md — slack-vibe-coding-handson

## このリポジトリは何か

Slack ハンズオンワークショップ「Vibe Coding で Slack アプリ開発をマスター」の教材。

- 5/19 Slack Community Tokyo（試行・複数パターン体験）
- 6/8 AWTT 本番（採用パターンを 40 分でハンズオン）

## ワークショップの設定

- 対象: 非エンジニア〜エンジニアの混在
- 環境: 参加者には OpenAI API キーを配布し、Codex App で vibe coding させる
- 構成: Bolt 版（Bolt for TypeScript）と Slack Platform 版（Slack Automations / Deno SDK）の両方を用意

## 採用 4 案 vs リポジトリ全 12 案

- **当日ハンズオンで参加者に出すのは 4 案のみ**: 案A / 案B / 案D / 案K
- **残り 8 案 (C/G/H/I/E/F/J/L) は当日使わないが main にマージ済み** — 後日参加者が自社で類似のものを作る際の参考実装

## 技術スタックの統一

- Bolt 版: TypeScript / Bolt for JavaScript / Socket Mode
- Platform 版: Deno / Slack Automations / `slack` CLI
- AI: OpenAI API（Codex App で生成、実行時は `openai` SDK）

## 各パターンディレクトリの規約

```text
pattern-X-name/
├── README.md           # お題 + 触れる技術 + 想定時間
├── HINTS.md            # 段階的ヒント
├── package.json (Bolt) or manifest.ts (Platform)
├── src/ or functions+workflows+triggers/
├── .env.example
└── docs/
```

## 品質基準

1. 動作する: 実機の Slack ワークスペースで動作確認済み
2. 読める: コメント・型・エラーハンドリングがある
3. 再現できる: 過度に抽象化せず、参加者が Codex で再現可能
4. お題と回答の分離: README にはお題、`src/` に完成版
5. 30〜40 分でハンズオン完走できる範囲

## コミットルール

- Conventional Commits（`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`）
- 1 パターン = 1 ブランチ = 1 PR
- ブランチ命名: `feat/sla-XX-{kebab-name}`
- PR タイトル: `[SLA-XX] パターン名 / 短い説明`
- Squash and merge を基本にする
