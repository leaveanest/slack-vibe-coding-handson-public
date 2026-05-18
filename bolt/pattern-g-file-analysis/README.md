# 案 G — ファイル投稿 AI 解析 Bot (Bolt / Vision)

チャンネルに画像をアップロードすると、Bot が AI で内容を解析して結果を返してくれます。マルチモーダル感が強くてデモ映え◎。

## お題

> ユーザーが Slack に画像をアップロードしたら、Bot がその内容を解析して
> 「何が写っているか」「テキストがあれば文字起こし」「気付き」を返す Slack アプリを作ってください。

要件:

- `file_shared` イベントを Bolt for TypeScript で受信
- `files.info` でファイル情報取得
- **画像のみ** に対象を絞る(jpeg/png/gif/webp)
- ファイルサイズが大きすぎる場合(デフォルト 5MB 超)はスキップ
- `url_private_download` から **Bot Token を Bearer ヘッダで** ダウンロード
- base64 化して OpenAI Vision API へ
- 結果を `chat.postMessage` で投稿

## 触れる技術

| カテゴリ | 内容 |
| --- | --- |
| Bolt | `App` / `app.event("file_shared")` |
| Slack API | Events API / `files.info` / `chat.postMessage` |
| HTTP | `fetch` + Bot Token Bearer 認証 |
| AI | OpenAI Vision Chat Completions(data URL 形式) |
| 制限 | MIME type フィルタ / サイズ上限 |

## 想定時間

**35〜40 分**(Slack App 作成と Scopes 設定込み)

## はじめかた

```bash
cd bolt/pattern-g-file-analysis
npm install
cp .env.example .env
# .env を編集してトークンを埋める

# Slack App 作成 (docs/manifest-template.md)
npm run dev
```

起動後、Bot を対象チャンネルに招待し、適当な画像(スクリーンショット等)をアップロードすれば数秒後に解析結果が返ってきます。

## ファイル構成

```text
bolt/pattern-g-file-analysis/
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

> Bolt for TypeScript で file_shared イベントを受け、files.info でファイル情報を取り、
> 画像ファイル(jpeg/png/gif/webp、5MB 以下)だけを Bot Token で認証ダウンロードして、
> base64 化して OpenAI Vision API に投げて、解析結果をチャンネルに返す Bot を作って。
> 画像以外は無視。

**最大の詰まりポイント** は「ダウンロード時の Bot Token 認証」です。HINTS.md を必ず参照。

## 動作確認チェックリスト

- [ ] `npm install` & `npm run build` 成功
- [ ] `npm run dev` で `pattern-g-file-analysis is running` が出る
- [ ] PNG/JPG をアップロードすると数秒で解析結果が返る
- [ ] テキストファイル(`.txt`)をアップロードしても無視される
- [ ] 5MB 超の画像はスキップメッセージが返る
- [ ] 解析結果に「写っているもの」「文字起こし」「気付き」の 3 セクションが揃う
