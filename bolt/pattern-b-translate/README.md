# 案 B — 国旗リアクション翻訳 Bot (Bolt)

メッセージに 🇺🇸 / 🇯🇵 / 🇫🇷 / 🇰🇷 / 🇨🇳 のリアクションを付けると、対応言語に翻訳してスレッドに返信する Bot を作ります。海外メンバーのいるチームで「ぱっと意味を伝える」のに便利です。

## お題

> Slack の任意のメッセージに国旗リアクションが付くと、Bot がその言語へ翻訳して
> 同じスレッドに返信する Slack アプリを作ってください。

要件:

- Events API の `reaction_added` を Bolt for TypeScript で受信
- 国旗 emoji → 言語コードのマッピングを実装(初期: 🇺🇸/🇯🇵/🇫🇷/🇰🇷/🇨🇳)
- 翻訳は OpenAI API
- 結果は `chat.postMessage` でスレッド返信
- Bot 自身のリアクションは無視(無限ループ防止)
- 同じメッセージに同じ国旗が複数付いた場合は **最初の 1 つだけ** 処理
- 対応していない国旗は無視

## 触れる技術

| カテゴリ | 内容 |
| --- | --- |
| Bolt | `App` / `app.event("reaction_added")` |
| Slack API | Events API / `reactions.get` / `chat.postMessage` / `auth.test` |
| Slack 設定 | Manifest(Event Subscriptions / Bot Token Scopes / Socket Mode) |
| AI | OpenAI Chat Completions API |
| TS | 国旗 → 言語マッピング・スレッド ID の解決 |

## 想定時間

**30〜35 分**(Slack App 作成と Scopes 設定込み)

## はじめかた

> Bolt 案も Platform 案と同じ `slack` CLI フローに統一されています ([SETUP.md §4](../../SETUP.md))。

```bash
cd bolt/pattern-b-translate
npm install
cp .env.example .env
# .env には OPENAI_API_KEY だけ書く (Token は slack CLI が注入)

slack install            # manifest.json を Slack 側に登録
slack run                # Socket Mode で起動 (ホットリロードあり)
```

起動後、Bot を対象チャンネルに招待:

```text
/invite @translate-bot
```

適当なメッセージに 🇺🇸 などのリアクションを付ければスレッドに翻訳が返ってきます。

> 💡 **fallback:** `slack` CLI が使えない場合のみ、`docs/manifest-template.md` の手順で Token を手動 `.env` に貼って `npm run dev` でも動きます。

## ファイル構成

```text
bolt/pattern-b-translate/
├── README.md
├── HINTS.md
├── AGENTS.md               # Codex 向けプロジェクトルール
├── manifest.json           # ★ slack CLI が読む App 定義
├── package.json
├── tsconfig.json
├── .env.example            # OPENAI_API_KEY のみ
├── src/
│   └── index.ts
└── docs/
    └── manifest-template.md  # 手動 App 作成 fallback 手順
```

## Codex でのお願い例

> Bolt for TypeScript で reaction_added イベントを受け、
> 国旗の emoji 名 (`us`, `jp`, `fr`, `kr`, `cn`) を言語にマッピングして、
> `reactions.get` で取った元メッセージを OpenAI で翻訳し、
> `chat.postMessage` で同スレッドに返信する Bot を作って。
> Bot 自身のリアクションは無視、同じ国旗が複数付いたら最初の 1 つだけ処理。
> manifest.json には reaction_added event と、reactions:read / channels:read /
> channels:history / groups:read / groups:history / chat:write scope を入れて。
> 起動後は対象チャンネルに `/invite @translate-bot` することも README に書いて。
> `slack install` で App を作って `slack run` で起動できる構成にして。

Codex は `AGENTS.md` を読んで Socket Mode / Bot ループ防止 / Slack CLI フローを踏まえてコードを生成します。完成版が `src/index.ts` / `manifest.json` にあります。

## 動作確認チェックリスト

- [ ] `npm install` がエラーなく完了
- [ ] `slack install` で App が Slack 側に作成される
- [ ] `slack run` で `pattern-b-translate is running` と `bot user_id=U...` が出る
- [ ] 🇺🇸 リアクションで英訳がスレッドに返る
- [ ] 🇯🇵 リアクションで日本語訳が返る
- [ ] 🇫🇷 / 🇰🇷 / 🇨🇳 でそれぞれの言語に翻訳される
- [ ] 同じ国旗を 2 回目に付けても二重に投稿されない
- [ ] 対応外の国旗(例: 🇩🇪)はスルーされる
- [ ] Bot 自身のリアクションには反応しない
