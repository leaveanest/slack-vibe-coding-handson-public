# 案 H — App Home AI 日報フォーム (Bolt)

App Home(アプリのホームタブ)に日報フォームを置き、入力 → 送信ボタンで AI が整形して指定チャンネルに投稿します。「ホームタブってこんなことできたのか」感が出ます。

## お題

> Bot の App Home を開くと「今日やったこと / 明日やること / 所感」を入力できる日報フォームが表示され、
> 送信すると AI が整形してチャンネルに投稿される Slack アプリを作ってください。

要件:

- App Home tab を有効化
- `app_home_opened` で `views.publish` し Block Kit フォームを描画
- 入力欄: `plain_text_input` 3 つ(multiline)、送信は `actions` のボタン
- 送信ボタン押下 → `body.view.state.values` から値取り出し
- OpenAI で Slack mrkdwn 形式に整形
- 投稿先チャンネルは `REPORT_CHANNEL_ID` 環境変数(ハードコード回避)
- 送信完了後はホームタブを「✅ 投稿しました」表示に差し替え

## 触れる技術

| カテゴリ | 内容 |
| --- | --- |
| Bolt | `App` / `app.event("app_home_opened")` / `app.action()` |
| Slack API | `views.publish` / `chat.postMessage` |
| Block Kit | header / section / input(plain_text_input multiline) / actions(button) / context |
| AI | OpenAI Chat Completions(mrkdwn 整形) |
| 設定 | App Home tab ON / Event Subscriptions |

## 想定時間

**35〜40 分**(Slack App 作成と Scopes 設定込み)

## はじめかた

```bash
cd bolt/pattern-h-app-home
npm install
cp .env.example .env
# REPORT_CHANNEL_ID に投稿先チャンネル ID を入れる

# Slack App 作成 (docs/manifest-template.md)
npm run dev
```

Slack で Bot の DM を開く → 上の「ホーム」タブをクリック → フォームが表示 → 入力して送信。

## Block Kit Builder 推奨

ブロック構造の確認・調整は [Block Kit Builder](https://app.slack.com/block-kit-builder) でビジュアルにやるのが圧倒的に速いです。`src/index.ts` の `buildHomeView` をそのまま貼って eye-checking してください。

## ファイル構成

```text
bolt/pattern-h-app-home/
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

> Bolt for TypeScript で App Home に日報フォームを表示するアプリを作って。
> 入力欄は今日やったこと/明日やること/所感の 3 つで multiline。
> 送信ボタンを押したら body.view.state.values から値を取り、
> OpenAI で Slack mrkdwn に整形して REPORT_CHANNEL_ID に投稿、
> その後ホームタブを送信済み表示に差し替えて。

## 動作確認チェックリスト

- [ ] `npm install` & `npm run build` 成功
- [ ] `npm run dev` で起動メッセージが出る
- [ ] Slack で Bot を開くと App Home にフォームが表示される
- [ ] 「送信」ボタンを押すと `REPORT_CHANNEL_ID` にメッセージが投稿される
- [ ] 投稿後にホームタブが「✅ 投稿しました」に変わる
- [ ] 「今日やったこと」「明日やること」両方空のまま送信するとエラー警告が表示される
