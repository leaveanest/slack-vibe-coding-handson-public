# 案 G ファイル解析 Bot — 詰まりやすいポイント集

---

## ① ファイルがダウンロードできない / HTML が返ってくる

### Lv1 ヒント — 方向

これがこのパターンの **最大の落とし穴**。Slack のファイル URL は `Authorization: Bearer <xoxb-...>` ヘッダ無しだと、HTML のログインページが 200 で返ってきます。

### Lv2 ヒント — fetch コード

```ts
const res = await fetch(file.url_private_download, {
  headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` },
});
const buf = Buffer.from(await res.arrayBuffer());
```

### Lv3 ヒント — 症状診断

`buf` の中身を `head -c 200` 相当で見て `<!DOCTYPE html>` で始まっていたら token 抜け確定。完成版コードでは Content-Type をチェックして早期に投げ捨てています。

---

## ② `file_shared` イベントが飛ばない

### Lv1 ヒント — 方向

`file_shared` は **チャンネルにファイルが共有されたとき** に飛ぶイベント。DM や非招待チャンネルでは飛びません。

### Lv2 ヒント — Scope

| Scope | 用途 |
| --- | --- |
| `files:read` | files.info とダウンロード |
| `channels:history` | パブリックチャンネル |
| `chat:write` | 結果投稿 |

Event Subscriptions に `file_shared` を Subscribe するのも忘れずに。

### Lv3 ヒント — file_id だけ来る

`file_shared` の payload には **file_id しか入っていません**。`files.info` で別途取り直す必要があります。`event.file` は存在しないので注意。

---

## ③ Vision API への画像の渡し方が分からない

### Lv1 ヒント — 方向

OpenAI Vision API は `image_url` 型のコンテンツに data URL を渡すのが便利。`https://...` の外部 URL でも OK だが、Slack のプライベートファイルは外部から見えないので data URL 必須。

### Lv2 ヒント — フォーマット

```ts
const dataUrl = `data:image/png;base64,${buf.toString("base64")}`;
const res = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "この画像を解析してください..." },
        { type: "image_url", image_url: { url: dataUrl } },
      ],
    },
  ],
});
```

### Lv3 ヒント — モデル選択

最新の軽量モデルでも Vision に対応しており、コストを抑えられます。より高精度なモデルに切り替えることもできますが、ハンズオンでは軽量モデルで十分です。

---

## ④ 画像以外のファイルも処理しようとして崩れる

### Lv1 ヒント — 方向

`file_shared` は MP4 や CSV や PDF でも飛びます。「画像のみ」を明示的にフィルタしないと、テキストファイルを Vision に投げて意味不明になります。

### Lv2 ヒント — MIME 判定

```ts
const SUPPORTED = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
if (!SUPPORTED.has(file.mimetype ?? "")) return;
```

### Lv3 ヒント — 拡張余地

時間が余ったら以下を追加:

- `text/csv` → `pdfjs-dist` でテキスト抽出して LLM に渡す
- `application/pdf` → 同上
- `audio/*` → Whisper で書き起こし

---

## ⑤ 同じファイルに複数イベントが飛んでくる

### Lv1 ヒント — 方向

Slack の `file_shared` は、ファイル共有先(チャンネル)が複数あれば **複数イベント** として飛ぶことがあります。同じファイル ID を 2 回解析するのは無駄。

### Lv2 ヒント — 重複防止

in-memory Set で `processedFileIds` を持ち、見た file_id はスキップ:

```ts
const seen = new Set<string>();
if (seen.has(event.file_id)) return;
seen.add(event.file_id);
```

### Lv3 ヒント — 完璧を目指すなら

プロセス再起動で Set がリセットされるので、永続化するなら Redis 等が必要。ハンズオンでは in-memory で十分。
