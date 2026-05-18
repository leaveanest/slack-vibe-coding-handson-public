/**
 * pattern-a-summarize / src/index.ts
 *
 * Slash Command `/summarize` の完成版コード。
 *
 * 動作概要:
 *   1. ユーザーが任意のスレッド内で `/summarize` を実行
 *   2. Bot が即座に ack（3 秒以内応答制約に対応）
 *   3. スレッドの全メッセージを `conversations.replies` で取得
 *   4. OpenAI に要約を依頼
 *   5. `chat.postEphemeral` で実行者にだけ要約を返す
 *
 * ハンズオン向けの教材コードなので、Codex で生成しやすいよう
 * 「なぜこうしているか」コメントを多めに残しています。
 */

import { App, LogLevel, SlashCommand, RespondFn } from "@slack/bolt";
import type { WebClient } from "@slack/web-api";
import OpenAI from "openai";
import * as dotenv from "dotenv";

dotenv.config();

// ----- 環境変数の読み込み（必須項目を最初に検証する） -----
//
// Slack 系のトークン (SLACK_BOT_TOKEN / SLACK_APP_TOKEN / SLACK_SIGNING_SECRET) は
// 当日のメインフロー (`slack run`) では Slack CLI が自動で環境変数に注入する
// ため、起動時の必須検証からは除外する。fallback の `npm run dev` で `.env`
// 経由で動かす場合は .env.example のコメントアウト部分を有効化する。
//
// このファイル単体で必須検証するのは OPENAI_API_KEY のみ。Slack トークン側は
// Bolt App コンストラクタが起動時に独自エラーで落とす。
const requiredEnv = ["OPENAI_API_KEY"] as const;
for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const LOG_LEVEL =
  (process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined) ??
  LogLevel.INFO;

// ----- Bolt App 初期化（Socket Mode） -----
// Socket Mode を有効にするとイベント受信用エンドポイントの公開（ngrok 等）が
// 不要になるので、ハンズオン環境では Socket Mode を強く推奨。
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  logLevel: LOG_LEVEL,
});

// ----- OpenAI クライアント -----
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * スレッドのメッセージ列を OpenAI で要約する。
 *
 * Slack の reply 構造は階層が浅い（thread_ts の下にフラットに並ぶ）ので、
 * 投稿者名と本文を結合した素朴な形に整形してから渡すのが扱いやすい。
 */
async function summarizeThread(
  client: WebClient,
  channelId: string,
  threadTs: string
): Promise<string> {
  const replies = await client.conversations.replies({
    channel: channelId,
    ts: threadTs,
    limit: 200,
  });

  const messages = replies.messages ?? [];
  if (messages.length === 0) {
    return "（スレッドに要約対象のメッセージが見つかりませんでした）";
  }

  // 投稿者名は user_id をそのまま使うと読みづらいので、users.info で
  // 表示名を引きたいところだが、ワークショップでは API 呼び出しを増やしたくないので
  // `user_id` のまま残し、要約結果の可読性は LLM 側に委ねる。
  const transcript = messages
    .map((m) => {
      // `user` は通常の人間ユーザー、`bot_id` は Bot 投稿。
      // username は MessageElement の型に含まれないケースがあるためフォールバックは
      // user → bot_id → "unknown" の順とする。
      const who = m.user ?? m.bot_id ?? "unknown";
      const text = (m.text ?? "").replace(/\s+/g, " ").trim();
      return `- ${who}: ${text}`;
    })
    .join("\n");

  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      {
        role: "system",
        content:
          "あなたは Slack スレッドを簡潔に要約する日本語アシスタントです。" +
          "重要な決定事項・宿題・未解決の論点を箇条書きで整理してください。",
      },
      {
        role: "user",
        content:
          "以下の Slack スレッドを要約してください。\n\n" +
          "出力フォーマット:\n" +
          "- TL;DR: 1〜2 行\n" +
          "- 決定事項:\n" +
          "- 宿題 / 未解決:\n\n" +
          `---\n${transcript}\n---`,
      },
    ],
    temperature: 0.3,
  });

  return (
    completion.choices[0]?.message?.content?.trim() ??
    "（要約の生成に失敗しました）"
  );
}

// ----- /summarize コマンドのハンドラ -----
app.command("/summarize", async ({ ack, command, client, respond, logger }) => {
  // ① Slack の 3 秒以内応答制約に応じる。
  //    重い処理（API 呼び出し）は ack の後ろにずらす。
  await ack();

  try {
    const channelId = command.channel_id;
    // ② Slash Command がスレッド内で実行されたかを判定する。
    //    Slack の仕様で thread_ts は command オブジェクトには含まれないため、
    //    `command.text` で空かどうかを見ても判定できない。
    //    かわりに `command.text` にユーザーがスレッド URL を貼ったケースは想定せず、
    //    「コマンド実行された会話内の最新スレッド」ではなく
    //    「実行された thread_ts」を取得する方法として `command.text` を活用する。
    //
    //    Slack の制約上、Slash Command にスレッド情報は自動では付与されない。
    //    ここでは「コマンドを実行した親メッセージの ts」を擬似的に
    //    `command.text` の引数として受け付ける形にする:
    //
    //      /summarize <thread_ts>
    //
    //    もし引数が無ければ、エフェメラルでヘルプを返す。
    const threadTs = parseThreadTs(command);
    if (!threadTs) {
      await respond({
        response_type: "ephemeral",
        text:
          ":bulb: 使い方: スレッドを開いて、`thread_ts` を引数に渡してください。\n" +
          "例: `/summarize 1715000000.123456`\n\n" +
          "*スレッドの ts はメッセージのリンクから取得できます* (`p1715000000123456` → `1715000000.123456`).",
      });
      return;
    }

    // ③ 「要約中…」のエフェメラルを先に出すと UX が良い。
    await respond({
      response_type: "ephemeral",
      text: ":hourglass_flowing_sand: スレッドを要約中…",
    });

    const summary = await summarizeThread(client, channelId, threadTs);

    // ④ 完成した要約は再度エフェメラルで送る。
    //    `chat.postEphemeral` だと実行者にのみ表示される。
    await client.chat.postEphemeral({
      channel: channelId,
      user: command.user_id,
      thread_ts: threadTs,
      text: `:memo: スレッド要約\n${summary}`,
    });
  } catch (error) {
    logger.error(error);
    await safeRespond(respond, {
      response_type: "ephemeral",
      text: `:warning: 要約に失敗しました: ${formatError(error)}`,
    });
  }
});

/**
 * `command.text` から thread_ts らしき値を取り出す。
 * 受け付ける形式:
 *   - `1715000000.123456` (生の ts)
 *   - `p1715000000123456` (Slack の permalink で使われる p 形式)
 */
function parseThreadTs(command: SlashCommand): string | undefined {
  const raw = command.text?.trim();
  if (!raw) return undefined;

  // 形式 1: 既に `1715000000.123456` 形式
  if (/^\d+\.\d+$/.test(raw)) {
    return raw;
  }
  // 形式 2: `p1715000000123456`
  const m = raw.match(/^p?(\d{10})(\d{6})$/);
  if (m) {
    return `${m[1]}.${m[2]}`;
  }
  return undefined;
}

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

async function safeRespond(
  respond: RespondFn,
  args: Parameters<RespondFn>[0]
): Promise<void> {
  try {
    await respond(args);
  } catch {
    // respond は 30 分以内なら何度でも呼べるが、それを超えると失敗する。
    // ハンズオンではエラーログに留めて握り潰して構わない。
  }
}

// ----- 起動 -----
(async () => {
  await app.start();
  console.log("⚡️ /summarize bolt app is running (Socket Mode)");
})();
