# 案 I — キーワード見守り Bot (Bolt)

特定のチャンネルでキーワードが投稿されたら、AI が文脈ごと要約して、登録ユーザーに **DM** で通知する Bot です。「自分の代わりに見ててくれる」体験が強み。

## お題

> 事前に登録したキーワード(例: `リリース`/`障害`/`緊急`)が監視対象チャンネルで使われたら、
> 該当メッセージとその前のメッセージ N 件を AI で要約して、登録ユーザーに DM で通知する Bot を作ってください。

要件:

- `message.channels` イベントを Bolt で受信
- WATCH_KEYWORDS(カンマ区切り、case-insensitive)
- ヒット時に直前 N 件を `conversations.history` で取得して文脈にする
- OpenAI で「何が起きた / 重要度 / 次のアクション」をまとめる
- 通知先は `NOTIFY_USER_ID`(`chat.postMessage` の channel に user_id を渡すと DM になる)
- Bot 自身のメッセージ・スレッド内メッセージは無視
- 同じメッセージで二重通知しないよう in-memory Set で dedup

## 触れる技術

| カテゴリ | 内容 |
| --- | --- |
| Bolt | `App` / `app.event("message")` |
| Slack API | `conversations.history` / `chat.postMessage` (DM) / `auth.test` |
| TS | キーワードマッチング(case-insensitive)、文脈整形、dedup |
| AI | OpenAI Chat Completions API |
| 設定 | 環境変数で全てのチューニング |

## 想定時間

**30〜35 分**(Slack App 作成と Scopes 設定込み)

## はじめかた

```bash
cd bolt/pattern-i-keyword-watcher
npm install
cp .env.example .env
# WATCH_KEYWORDS と NOTIFY_USER_ID を設定

# Slack App 作成 (docs/manifest-template.md)
npm run dev
```

監視対象チャンネルに Bot を招待し、誰かが `リリース` 等を含むメッセージを投稿すると、`NOTIFY_USER_ID` の DM に通知が届きます。

## ファイル構成

```text
bolt/pattern-i-keyword-watcher/
├── README.md
├── HINTS.md
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   └── index.ts
└── docs/
    └── manifest-template.md
```

## Codex CLI でのお願い例

> Bolt for TypeScript で message.channels イベントを受け、
> WATCH_KEYWORDS のいずれかを case-insensitive で含むメッセージを検知。
> 直前 5 件を conversations.history で取って文脈にして、
> OpenAI で要約して NOTIFY_USER_ID に DM (chat.postMessage with channel=user_id) する Bot を作って。
> Bot 自身は無視、スレッド内も無視、二重通知防止に in-memory Set 利用。

## 動作確認チェックリスト

- [ ] `npm install` & `npm run build` 成功
- [ ] `npm run dev` 起動 (キーワード一覧と通知先がログに出る)
- [ ] 監視対象チャンネルでキーワードを含む発言 → DM 着信
- [ ] スレッド返信ではトリガーしない
- [ ] 同じメッセージ更新時に二重通知しない
- [ ] case-insensitive (`DEPLOY` でもヒット)
