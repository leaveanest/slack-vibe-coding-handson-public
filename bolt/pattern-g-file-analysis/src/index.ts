/**
 * pattern-g-file-analysis / src/index.ts
 *
 * ファイル投稿 AI 解析 Bot の完成版コード。
 *
 * 動作概要:
 *   1. ユーザーがチャンネルに画像をアップロード → `file_shared` イベント
 *   2. `files.info` でファイル情報取得
 *   3. 画像以外/サイズ超過は無視
 *   4. `url_private_download` から **Bot Token で認証して** ダウンロード
 *   5. base64 にエンコードして OpenAI Vision API に投げる
 *   6. 解析結果を該当チャンネルに投稿
 *
 * MVP は **画像のみ** 対応。CSV/PDF は拡張ポイントとして HINTS に記載。
 */

import { App, LogLevel } from "@slack/bolt";
import OpenAI from "openai";
import * as dotenv from "dotenv";

dotenv.config();

const requiredEnv = [
  "SLACK_BOT_TOKEN",
  "SLACK_APP_TOKEN",
  "SLACK_SIGNING_SECRET",
  "OPENAI_API_KEY",
] as const;
for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

const OPENAI_VISION_MODEL = process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini";
const MAX_FILE_SIZE_BYTES = Number(
  process.env.MAX_FILE_SIZE_BYTES ?? "5242880"
);
const LOG_LEVEL =
  (process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined) ??
  LogLevel.INFO;

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  logLevel: LOG_LEVEL,
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SUPPORTED_IMAGE_MIMETYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

/**
 * Slack のプライベートファイル URL を Bot Token 付きで取得する。
 *
 * **これが一番の落とし穴**: Slack 上のファイルは `url_private` も
 * `url_private_download` も Bot Token を Bearer ヘッダで付けないと
 * HTML のログインページが返ってくる (401 ではなく 200 で HTML)。
 */
async function downloadSlackFile(
  url: string,
  botToken: string
): Promise<Buffer> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${botToken}` },
  });
  if (!res.ok) {
    throw new Error(`Slack file download failed: ${res.status} ${res.statusText}`);
  }
  // Content-Type が text/html の時はログインページ。token 抜けの典型症状。
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.startsWith("text/html")) {
    throw new Error(
      "Got HTML instead of binary — Bot Token did not authenticate. " +
        "Check SLACK_BOT_TOKEN and files:read scope."
    );
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * 画像を Vision API に渡して解析させる。
 *
 * data URL 形式で渡せば、画像のホスティング先 URL が外部公開されていなくても
 * OpenAI API 側に渡せる。今回の用途では Slack 上のプライベートファイルなので
 * data URL を使うのが必須。
 */
async function analyzeImage(
  imageBuffer: Buffer,
  mimetype: string
): Promise<string> {
  const b64 = imageBuffer.toString("base64");
  const dataUrl = `data:${mimetype};base64,${b64}`;

  const completion = await openai.chat.completions.create({
    model: OPENAI_VISION_MODEL,
    temperature: 0.3,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "この画像を解析してください。日本語で:\n" +
              "1. 何が写っているか (1〜2 文)\n" +
              "2. テキストが含まれていれば文字起こし\n" +
              "3. 注目すべき点 / 気付き (箇条書き 2〜3 個)\n",
          },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  });

  return (
    completion.choices[0]?.message?.content?.trim() ??
    "(解析結果を生成できませんでした)"
  );
}

app.event("file_shared", async ({ event, client, logger }) => {
  try {
    // ① ファイル詳細を取得
    //    `file_shared` の event には file_id しか入っていないので、
    //    metadata は files.info で別途取得する必要がある。
    const fileInfo = await client.files.info({ file: event.file_id });
    const file = fileInfo.file;
    if (!file) {
      logger.warn(`files.info returned no file for ${event.file_id}`);
      return;
    }

    const channel =
      event.channel_id ?? file.channels?.[0] ?? file.groups?.[0];
    if (!channel) {
      logger.warn("No channel context for file_shared event");
      return;
    }

    // ② MIME タイプで画像かどうかを判定
    const mimetype = file.mimetype ?? "";
    if (!SUPPORTED_IMAGE_MIMETYPES.has(mimetype)) {
      logger.info(`Skipping non-image file: ${file.name} (${mimetype})`);
      return;
    }

    // ③ サイズチェック
    if ((file.size ?? 0) > MAX_FILE_SIZE_BYTES) {
      await client.chat.postMessage({
        channel,
        thread_ts: file.shares?.public?.[channel]?.[0]?.ts,
        text: `:warning: ${file.name} は ${MAX_FILE_SIZE_BYTES} bytes を超えるため解析をスキップしました。`,
      });
      return;
    }

    // ④ ダウンロード URL を選ぶ (download 版が確実)
    const downloadUrl = file.url_private_download ?? file.url_private;
    if (!downloadUrl) {
      logger.warn(`No download URL for file ${file.id}`);
      return;
    }

    // ⑤ Bot Token で認証ダウンロード → Vision 解析
    await client.chat.postMessage({
      channel,
      text: `:hourglass_flowing_sand: \`${file.name ?? "image"}\` を解析中...`,
    });

    const imageBuffer = await downloadSlackFile(
      downloadUrl,
      process.env.SLACK_BOT_TOKEN as string
    );
    const analysis = await analyzeImage(imageBuffer, mimetype);

    await client.chat.postMessage({
      channel,
      text: `:framed_picture: \`${file.name ?? "image"}\` の解析結果:\n${analysis}`,
    });
  } catch (error) {
    logger.error("Failed to handle file_shared", error);
    try {
      const channel =
        event.channel_id ??
        (await client.files.info({ file: event.file_id })).file?.channels?.[0];
      if (channel) {
        await client.chat.postMessage({
          channel,
          text: `:warning: ファイル解析に失敗しました: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      }
    } catch {
      // 投稿先も特定できなければ握りつぶす
    }
  }
});

(async () => {
  await app.start();
  console.log(
    `⚡️ pattern-g-file-analysis is running (Socket Mode). Vision model=${OPENAI_VISION_MODEL} maxBytes=${MAX_FILE_SIZE_BYTES}`
  );
})();
