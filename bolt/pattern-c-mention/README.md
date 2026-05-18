# 案 C — メンション質問 Bot (Bolt)

`@bot` でメンションすると、そのチャンネルの直近メッセージを踏まえて回答する「うちのチーム専用 ChatGPT」っぽい Bot です。

## お題

> `@bot 〇〇について教えて` でメンションされたら、Bot はチャンネルの直近メッセージを
> コンテキストとして Codex に渡し、回答をスレッドに投稿する Slack アプリを作ってください。

要件:

- Events API の `app_mention` を Bolt で受信
- メンション文から `<@U...>` を除去して「質問本文」を取り出す
- 同チャンネルの直近 N 件(デフォルト 50)を `conversations.history` で取得
- Bot 自身の発言は履歴から除外
- 履歴をコンテキスト、質問を user メッセージとして OpenAI に投げる
- 回答は `chat.postMessage` でスレッド返信
- 履歴件数は環境変数 `HISTORY_LIMIT` で上限制御(トークン爆発防止)

## 触れる技術

| カテゴリ | 内容 |
| --- | --- |
| Bolt | `App` / `app.event("app_mention")` |
| Slack API | Events API / `conversations.history` / `chat.postMessage` / `auth.test` |
| Slack 設定 | Manifest(Event Subscriptions / Bot Token Scopes / Socket Mode) |
| AI | OpenAI Chat Completions API |
| TS | メンション除去 / 履歴の整形 / トークン上限 |

## 想定時間

**35〜40 分**（Slack App 作成と Scopes 設定込み）

## はじめかた

```bash
cd bolt/pattern-c-mention
npm install
cp .env.example .env
# .env を編集してトークンを埋める

# Slack App 作成 (docs/manifest-template.md)
npm run dev
```

起動後、Bot を対象チャンネルに招待し、`@bot 直近の議論を要約して` のようにメンションすると、スレッドに回答が返ってきます。

## ファイル構成

```text
bolt/pattern-c-mention/
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

> Bolt for TypeScript で app_mention イベントを受け取って、
> conversations.history で直近 50 件の履歴(bot 自身の発言は除外)を取得し、
> メンション本文 (`<@U...>` 除去後) を質問として OpenAI に渡して、
> 履歴をコンテキストにした回答をスレッドに返す Bot を作って。
> 履歴件数は HISTORY_LIMIT 環境変数で制御できるように。

完成版が `src/index.ts` にあります。

## 動作確認チェックリスト

- [ ] `npm install` がエラーなく完了
- [ ] `npm run build` が通る
- [ ] `npm run dev` で `pattern-c-mention is running` と `bot user_id=U...` が出る
- [ ] `@bot 何かを質問` → スレッドに回答が来る
- [ ] 履歴を踏まえた回答になっている(直近の話題を「履歴では...と話されています」のように引用)
- [ ] Bot 自身の過去発言は履歴から除かれている
- [ ] メンションのみ(本文無し)だとヘルプを返す
