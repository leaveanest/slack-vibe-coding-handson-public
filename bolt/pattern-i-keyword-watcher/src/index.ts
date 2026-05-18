/**
 * pattern-i-keyword-watcher / src/index.ts
 *
 * 特定キーワードが投稿されたら、AI が前後の文脈を要約して DM 通知する Bot。
 *
 * 動作概要:
 *   1. `message.channels` イベントで Bot が招待されたチャンネルのメッセージを観測
 *   2. WATCH_KEYWORDS (カンマ区切り) のいずれかを大文字小文字無視で含むかチェック
 *   3. 該当した場合、`conversations.history` で直前 CONTEXT_BEFORE 件を取得
 *   4. ヒットメッセージ + 文脈を OpenAI に投げて要約
 *   5. NOTIFY_USER_ID 宛に DM (chat.postMessage with channel=user_id)
 *
 * MVP の制約:
 *   - キーワード/通知先は環境変数で固定 (動的設定はスコープ外)
 *   - Bot 自身のメッセージは無視
 *   - スレッド内メッセージ (thread_ts あり) は対象外
 *   - 1 メッセージ 1 通知 (dedup 用に処理済み Set を保持)
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
  "WATCH_KEYWORDS",
  "NOTIFY_USER_ID",
] as const;
for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const NOTIFY_USER_ID = process.env.NOTIFY_USER_ID as string;
const CONTEXT_BEFORE = Number(process.env.CONTEXT_BEFORE ?? "5");
const LOG_LEVEL =
  (process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined) ??
  LogLevel.INFO;

// キーワードは事前に小文字化しておくと毎メッセージ毎の比較が安い。
const WATCH_KEYWORDS = (process.env.WATCH_KEYWORDS as string)
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  logLevel: LOG_LEVEL,
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let botUserId: string | undefined;
// 1 メッセージ 1 通知 (プロセス内で重複イベントを弾く)
const processed = new Set<string>();

function matchedKeywords(text: string): string[] {
  const lower = text.toLowerCase();
  return WATCH_KEYWORDS.filter((kw) => lower.includes(kw));
}

async function summarizeWithContext(
  hitMessage: string,
  hitUser: string,
  context: { user?: string; text?: string }[]
): Promise<string> {
  const contextText = context
    .map((m) => `- ${m.user ?? "unknown"}: ${(m.text ?? "").replace(/\s+/g, " ")}`)
    .join("\n");

  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content:
          "あなたは Slack の見守りアシスタントです。" +
          "ヒットしたメッセージと直前の文脈を踏まえ、" +
          "「何が起きたか / 重要度 / 次に取るべきアクション」を日本語で簡潔にまとめてください。",
      },
      {
        role: "user",
        content:
          `# ヒットしたメッセージ\n<@${hitUser}>: ${hitMessage}\n\n` +
          `# 直前の文脈 (古い→新しい)\n${contextText || "(なし)"}\n`,
      },
    ],
  });

  return (
    completion.choices[0]?.message?.content?.trim() ??
    "(要約に失敗しました)"
  );
}

app.event("message", async ({ event, client, logger }) => {
  try {
    // message.channels イベントは様々なサブタイプを含むので絞り込み。
    // 通常の人間からのメッセージは subtype が undefined。
    if ("subtype" in event && event.subtype) return;

    // 必要フィールドの存在チェック (型ガード)
    if (
      !("text" in event) ||
      !event.text ||
      !("user" in event) ||
      !event.user ||
      !("ts" in event) ||
      !event.ts ||
      !("channel" in event) ||
      !event.channel
    ) {
      return;
    }

    // Bot 自身は無視
    if (event.user === botUserId) return;

    // スレッド内は MVP では対象外
    if ("thread_ts" in event && event.thread_ts && event.thread_ts !== event.ts) {
      return;
    }

    // 重複イベント弾き
    const dedupKey = `${event.channel}:${event.ts}`;
    if (processed.has(dedupKey)) return;

    // キーワード判定
    const hits = matchedKeywords(event.text);
    if (hits.length === 0) return;

    processed.add(dedupKey);

    logger.info(
      `Keyword hit in <#${event.channel}> by <@${event.user}>: ${hits.join(", ")}`
    );

    // 直前 N 件を取得 (ヒットメッセージ自体を含めない)
    const history = await client.conversations.history({
      channel: event.channel,
      latest: event.ts,
      inclusive: false,
      limit: CONTEXT_BEFORE,
    });
    const context =
      (history.messages?.reverse() as { user?: string; text?: string }[]) ?? [];

    const summary = await summarizeWithContext(event.text, event.user, context);

    // NOTIFY_USER_ID に DM
    // chat.postMessage は channel に user_id を渡せば DM になる
    await client.chat.postMessage({
      channel: NOTIFY_USER_ID,
      text:
        `:bell: *キーワード見守り通知* (\`${hits.join(", ")}\`)\n` +
        `<#${event.channel}> での投稿:\n` +
        `> ${event.text.replace(/\n/g, "\n> ")}\n\n` +
        `*AI 要約*\n${summary}`,
    });
  } catch (error) {
    logger.error("Failed to handle message event", error);
  }
});

(async () => {
  await app.start();
  const auth = await app.client.auth.test({ token: process.env.SLACK_BOT_TOKEN });
  botUserId = auth.user_id;
  console.log(
    `⚡️ pattern-i-keyword-watcher is running (Socket Mode). ` +
      `keywords=${WATCH_KEYWORDS.join("|")} notify=${NOTIFY_USER_ID} bot=${botUserId}`
  );
})();
