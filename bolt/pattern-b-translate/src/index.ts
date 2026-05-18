/**
 * pattern-b-translate / src/index.ts
 *
 * 国旗リアクション翻訳 Bot の完成版コード。
 *
 * 動作概要:
 *   1. メッセージに 🇺🇸 / 🇯🇵 / 🇫🇷 / 🇰🇷 / 🇨🇳 のいずれかが付くと
 *      `reaction_added` イベントを Socket Mode で受信
 *   2. その国旗に対応する言語に OpenAI で翻訳
 *   3. 同じスレッドに翻訳結果を返信
 *
 * ハンズオン向けの教材コードなので、Codex で生成しやすいよう
 * 「なぜこうしているか」コメントを多めに残しています。
 */

import { App, LogLevel } from "@slack/bolt";
import OpenAI from "openai";
import * as dotenv from "dotenv";

dotenv.config();

// ----- 環境変数 -----
// Slack 系のトークン (SLACK_BOT_TOKEN / SLACK_APP_TOKEN / SLACK_SIGNING_SECRET) は
// 当日のメインフロー (`slack run`) で Slack CLI が自動注入するため、起動時の
// 必須検証からは除外する。fallback で `npm run dev` を使う場合は .env.example
// のコメントアウト部分を有効化する。
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

// ----- 国旗 emoji → 言語マッピング -----
//
// Slack の reaction_added event は `reaction` フィールドに **short name** を返す。
// 国旗の short name はワークスペースの emoji セットに依存するが、
// 標準 Slack だと "us", "jp", "fr", "kr", "cn" もしくは "flag-XX" の両方が使える。
// 両方をマッピングに含めて取りこぼしを防ぐ。
//
// 翻訳先言語名は OpenAI 側に渡すので、自然な英語表記にしておく。
type LanguageInfo = { code: string; nameEn: string; nameJp: string };

const flagToLanguage: Record<string, LanguageInfo> = {
  us: { code: "en", nameEn: "English", nameJp: "英語" },
  "flag-us": { code: "en", nameEn: "English", nameJp: "英語" },
  jp: { code: "ja", nameEn: "Japanese", nameJp: "日本語" },
  "flag-jp": { code: "ja", nameEn: "Japanese", nameJp: "日本語" },
  fr: { code: "fr", nameEn: "French", nameJp: "フランス語" },
  "flag-fr": { code: "fr", nameEn: "French", nameJp: "フランス語" },
  kr: { code: "ko", nameEn: "Korean", nameJp: "韓国語" },
  "flag-kr": { code: "ko", nameEn: "Korean", nameJp: "韓国語" },
  cn: { code: "zh", nameEn: "Chinese (Simplified)", nameJp: "中国語" },
  "flag-cn": { code: "zh", nameEn: "Chinese (Simplified)", nameJp: "中国語" },
};

// ----- Bolt App 初期化 (Socket Mode) -----
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  logLevel: LOG_LEVEL,
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Bot 自身の user_id をキャッシュする。起動時に取得しておく。
// これがないと、Bot 自身がリアクションを付けたときに無限ループになる可能性がある。
let botUserId: string | undefined;

/**
 * OpenAI に翻訳させる。
 *
 * `temperature` は低め (0.2) にして、訳ブレを抑える。
 * system プロンプトで「補足は一切付けない」と縛り、Slack に貼ったときに
 * 翻訳結果だけがきれいに見えるようにする。
 */
async function translate(text: string, target: LanguageInfo): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          `You translate Slack messages into ${target.nameEn}. ` +
          "Return ONLY the translation. Do not add explanations, " +
          "quotation marks, or any preface. Preserve emojis and " +
          "user mentions (<@U...>) verbatim.",
      },
      { role: "user", content: text },
    ],
  });

  return (
    completion.choices[0]?.message?.content?.trim() ??
    "(翻訳の生成に失敗しました)"
  );
}

// ----- reaction_added イベントハンドラ -----
app.event("reaction_added", async ({ event, client, logger }) => {
  try {
    // ① bot 自身のリアクションは無視 (無限ループ防止)
    if (event.user === botUserId) {
      return;
    }

    // ② リアクション対象がメッセージでなければ無視 (ファイル等)
    if (event.item.type !== "message") {
      return;
    }

    // ③ 対応する言語マッピングが無ければ無視
    const lang = flagToLanguage[event.reaction];
    if (!lang) {
      return;
    }

    // ④ 該当メッセージとリアクション数を取得
    // `reactions.get` は全リアクションが付いたメッセージそのものを返す。
    // count > 1 ならすでに同じ国旗が付いていたので、最初の 1 件以外は翻訳しない
    // (受け入れ条件: 同じメッセージに同じ国旗が複数付いた場合は最初の 1 つだけ処理)
    const result = await client.reactions.get({
      channel: event.item.channel,
      timestamp: event.item.ts,
      full: true,
    });

    // result.message は MessageElement | undefined
    const message = result.message as
      | {
          text?: string;
          thread_ts?: string;
          reactions?: { name: string; count: number }[];
        }
      | undefined;

    if (!message) {
      logger.warn(`reactions.get returned no message for ${event.item.ts}`);
      return;
    }

    const reactionInfo = message.reactions?.find(
      (r) => r.name === event.reaction
    );
    if (reactionInfo && reactionInfo.count > 1) {
      logger.info(
        `Skipping duplicate reaction :${event.reaction}: on ${event.item.ts}`
      );
      return;
    }

    const sourceText = (message.text ?? "").trim();
    if (!sourceText) {
      logger.info(`Message ${event.item.ts} has no text to translate`);
      return;
    }

    // ⑤ 翻訳
    const translated = await translate(sourceText, lang);

    // ⑥ スレッドに返信
    //    thread_ts があれば既存スレッド、無ければそのメッセージ自身を親にする
    const threadTs = message.thread_ts ?? event.item.ts;

    await client.chat.postMessage({
      channel: event.item.channel,
      thread_ts: threadTs,
      text: `:flag-${lang.code === "ja" ? "jp" : lang.code === "ko" ? "kr" : lang.code === "zh" ? "cn" : lang.code}: ${lang.nameJp}訳:\n${translated}`,
    });
  } catch (error) {
    logger.error("Failed to handle reaction_added", error);
  }
});

// ----- 起動 -----
(async () => {
  // 起動時に bot 自身の user_id を取得してキャッシュ
  // (`reaction_added` ハンドラで自分の reaction を弾くために必要)
  await app.start();
  const auth = await app.client.auth.test({ token: process.env.SLACK_BOT_TOKEN });
  botUserId = auth.user_id;
  console.log(
    `⚡️ pattern-b-translate is running (Socket Mode). bot user_id=${botUserId}`
  );
})();
