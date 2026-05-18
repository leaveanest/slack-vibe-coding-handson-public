# 案 A — `/summarize` スレッド要約コマンド (Bolt)

長くなったスレッドを開いて、`/summarize <thread_ts>` と打つと、その場で AI が要約してくれる Slack アプリを作ります。要約は実行者にだけ見える（エフェメラル）ので、チャンネルを汚しません。

## お題

> ユーザーが任意のスレッドで `/summarize <thread_ts>` を実行すると、
> そのスレッドのメッセージを AI が要約してエフェメラルメッセージで返す Slack アプリを作ってください。

要件:

- Slash Command `/summarize` を Bolt for TypeScript で実装する
- スレッドの全メッセージは `conversations.replies` で取得する
- 要約は OpenAI API (`chat.completions`) で生成する
- 結果は `chat.postEphemeral` で実行者にだけ返す
- Slack の 3 秒応答制約に違反しない（ack 先行 + 後追い投稿）

## 触れる技術

| カテゴリ | 内容 |
| --- | --- |
| Bolt | `App` / `command()` / `ack` / `respond` |
| Slack API | Slash Commands / `conversations.replies` / `chat.postEphemeral` |
| Slack 設定 | Manifest（Slash Command / Bot Token Scopes / Socket Mode / App-Level Token） |
| AI | OpenAI Chat Completions API（最新のモデルを使用） |
| ランタイム | Node.js 20+ / TypeScript / dotenv |

## 想定時間

**30〜40 分**（Slack App 作成と Scopes 設定込み）

## はじめかた

> Bolt 案も Platform 案と同じ `slack` CLI フローに統一されています ([SETUP.md §4](../../SETUP.md))。`api.slack.com/apps` で手動で App を作って Token をコピーする必要はありません。

```bash
# 1. 依存インストール
cd bolt/pattern-a-summarize
npm install

# 2. 環境変数 (OPENAI_API_KEY だけ)
cp .env.example .env
# .env を編集して OPENAI_API_KEY だけ埋める (Token 系は slack CLI が注入)

# 3. Slack 側に App を作成 (manifest.json を読んで自動で作る)
slack install

# 4. Socket Mode で起動 (xoxb / xapp は自動注入、ホットリロードあり)
slack run
```

`slack install` した際に出る Bot を、テスト用チャンネルに招待します:

```text
/invite @summarize-bot
```

Slack ワークスペースで適当なスレッドを開き、メッセージリンクから thread_ts (`p17150000001234` → `1715000000.1234`) を取り出して:

```text
/summarize 1715000000.1234
```

エフェメラルで要約が返ってきたら成功です。

> 💡 **fallback:** `slack` CLI が使えない場合のみ、`docs/manifest-template.md` の手順で Token を手動 `.env` に貼って `npm run dev` でも動きます。当日のメインフローは `slack run` です。

## ファイル構成

```text
bolt/pattern-a-summarize/
├── README.md                    # このファイル（お題）
├── HINTS.md                     # 詰まったらここ
├── AGENTS.md                    # Codex 向けプロジェクトルール
├── manifest.json                # ★ slack CLI が読む App 定義
├── package.json
├── tsconfig.json
├── .env.example                 # OPENAI_API_KEY のみ
├── src/
│   └── index.ts                 # 完成版コード（コメント付き）
└── docs/
    └── manifest-template.md     # 手動 App 作成 fallback 手順
```

## Codex でのアプローチ例

`codex` をこのディレクトリで起動して、こんな感じのお願いをしてみてください:

> Bolt for TypeScript で `/summarize <thread_ts>` Slash Command を作りたい。
> `slack install` で App を作って `slack run` で起動できる構成にして。
> `conversations.replies` でスレッドを取得して、OpenAI Chat Completions で
> 要約し、`chat.postEphemeral` で実行者にだけ返す。
> エラーハンドリングと 3 秒応答制約も考慮して。

Codex は `AGENTS.md` を読んで Socket Mode / SDK バージョン / Slack CLI フローの制約を踏まえてコードを生成します。完成版が `src/index.ts` / `manifest.json` にあるので、Codex が出した差分と読み比べると学びが深いです。

## 動作確認チェックリスト

- [ ] `npm install` がエラーなく完了する
- [ ] `slack install` で App が Slack 側に作成される
- [ ] `slack run` で `⚡️ /summarize bolt app is running` が出る
- [ ] Slack で `/summarize <thread_ts>` が動く
- [ ] 引数なしで実行するとヘルプがエフェメラルで返る
- [ ] 不正な ts を渡してもアプリが落ちずエラーメッセージを返す
