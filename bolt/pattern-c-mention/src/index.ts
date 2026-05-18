/**
 * pattern-c-mention / src/index.ts
 *
 * メンションされたら、そのチャンネルの直近履歴を踏まえて回答するBot。
 *
 * 動作概要:
 *   1. `@bot 〇〇について教えて` でメンション → `app_mention` イベント受信
 *   2. `conversations.history` で同チャンネルの直近 N 件を取得
 *   3. メンション部分 (<@U...>) を質問テキストから除去
 *   4. 履歴をコンテキスト、メンション内容を質問として OpenAI に渡す
 *   5. 回答をスレッドに投稿
 *
 * トークン爆発を防ぐため履歴件数は `HISTORY_LIMIT` で固定上限。
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

const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const HISTORY_LIMIT = Number(process.env.HISTORY_LIMIT ?? "50");
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

// 起動時に bot 自身の user_id をキャッシュ。
// 履歴から bot 自身の発言を除く + 自分宛のメンションを質問テキストから除くのに使う。
let botUserId: string | undefined;

/**
 * メンション本文から `<@UXXXX>` 形式の自己メンションを取り除く。
 * 副次的に複数連続スペースは 1 つに圧縮する。
 */
function stripMention(text: string, botId: string | undefined): string {
  const stripped = botId
    ? text.replace(new RegExp(`<@${botId}>`, "g"), "")
    : text.replace(/<@[^>]+>/g, "");
  return stripped.replace(/\s+/g, " ").trim();
}

/**
 * Slack の履歴をコンテキスト用文字列に整形する。
 * 古い順に並べた方が LLM が時系列を理解しやすい。
 */
function formatHistory(
  messages: { user?: string; bot_id?: string; text?: string }[],
  botId: string | undefined
): string {
  // history は新しい→古い順なので逆順にする
  const ordered = [...messages].reverse();
  return ordered
    .filter((m) => {
      // bot 自身の発言 (この bot による発言) は除外
      if (m.user && botId && m.user === botId) return false;
      return Boolean(m.text);
    })
    .map((m) => {
      const who = m.user ?? m.bot_id ?? "unknown";
      const text = (m.text ?? "").replace(/\s+/g, " ").trim();
      return `- ${who}: ${text}`;
    })
    .join("\n");
}

async function answerWithContext(
  question: string,
  history: string
): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0.4,
    messages: [
      {
        role: "system",
        content:
          "あなたは Slack チャンネルのアシスタントです。" +
          "直近のチャンネル履歴をコンテキストとして、ユーザーの質問に簡潔に日本語で答えます。" +
          "履歴に答えがあれば必ず引用し、無ければ「履歴では確認できませんでした」と前置きしてから一般論を述べてください。",
      },
      {
        role: "user",
        content:
          `# 直近のチャンネル履歴 (古い→新しい順)\n${history || "(履歴なし)"}\n\n` +
          `# 質問\n${question}`,
      },
    ],
  });

  return (
    completion.choices[0]?.message?.content?.trim() ??
    "(回答の生成に失敗しました)"
  );
}

app.event("app_mention", async ({ event, client, logger }) => {
  try {
    const channelId = event.channel;

    // メンション本文から `<@U...>` を取り除いて質問テキストを得る
    const question = stripMention(event.text ?? "", botUserId);
    if (!question) {
      await client.chat.postMessage({
        channel: channelId,
        thread_ts: event.thread_ts ?? event.ts,
        text: ":bulb: 質問内容を一緒に書いてください (例: `@bot 直近の議論を要約して`)",
      });
      return;
    }

    // 直近のチャンネル履歴を取得
    // `latest=event.ts` で「メンションされた瞬間より過去」を切る
    const result = await client.conversations.history({
      channel: channelId,
      limit: HISTORY_LIMIT,
      latest: event.ts,
      inclusive: false,
    });

    const historyMessages =
      (result.messages as { user?: string; bot_id?: string; text?: string }[]) ??
      [];
    const formatted = formatHistory(historyMessages, botUserId);

    const answer = await answerWithContext(question, formatted);

    // 回答はスレッドに投稿 (元メッセージが thread にあるならそのスレッド、なければ自分が起点)
    const threadTs = event.thread_ts ?? event.ts;
    await client.chat.postMessage({
      channel: channelId,
      thread_ts: threadTs,
      text: answer,
    });
  } catch (error) {
    logger.error("Failed to handle app_mention", error);
    try {
      await client.chat.postMessage({
        channel: event.channel,
        thread_ts: event.thread_ts ?? event.ts,
        text: `:warning: 回答中にエラーが発生しました: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    } catch {
      // post 失敗は握りつぶし
    }
  }
});

(async () => {
  await app.start();
  const auth = await app.client.auth.test({ token: process.env.SLACK_BOT_TOKEN });
  botUserId = auth.user_id;
  console.log(
    `⚡️ pattern-c-mention is running (Socket Mode). bot user_id=${botUserId} HISTORY_LIMIT=${HISTORY_LIMIT}`
  );
})();
