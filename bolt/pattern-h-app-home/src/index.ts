/**
 * pattern-h-app-home / src/index.ts
 *
 * App Home に AI 日報フォームを表示し、提出するとAIで整形して
 * 指定チャンネルに投稿するアプリ。
 *
 * 動作概要:
 *   1. ユーザーが Bot のホームタブを開く → `app_home_opened` イベント
 *   2. `views.publish` でフォーム (Block Kit) を表示
 *   3. ユーザーが入力して「送信」ボタンを押す → `daily_report_submit` action
 *   4. body.view.state.values から 3 つの値を取り出し
 *   5. OpenAI で整形 → REPORT_CHANNEL_ID に投稿
 *   6. ホームタブを「送信済み」表示に差し替え
 */

import { App, LogLevel } from "@slack/bolt";
import OpenAI from "openai";
import * as dotenv from "dotenv";
import type { View } from "@slack/types";

dotenv.config();

const requiredEnv = [
  "SLACK_BOT_TOKEN",
  "SLACK_APP_TOKEN",
  "SLACK_SIGNING_SECRET",
  "OPENAI_API_KEY",
  "REPORT_CHANNEL_ID",
] as const;
for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const REPORT_CHANNEL_ID = process.env.REPORT_CHANNEL_ID as string;
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

/**
 * App Home に表示するフォーム View を組み立てる。
 *
 * Block Kit の input ブロックは `dispatch_action` を付けない限り、
 * ホームタブ上では「ボタンが押されるまで値が確定しない」状態。
 * 送信ボタンを押した瞬間に body.view.state.values で全入力が拾える。
 *
 * Block Kit Builder で見ながら作ると速い:
 *   https://app.slack.com/block-kit-builder
 */
function buildHomeView(notice?: string): View {
  const blocks: View["blocks"] = [
    {
      type: "header",
      text: { type: "plain_text", text: "📝 AI 日報フォーム" },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          "今日の作業内容を入力して `送信` を押すと、AI が整形して " +
          `<#${REPORT_CHANNEL_ID}> に投稿します。`,
      },
    },
    {
      type: "input",
      block_id: "today_block",
      label: { type: "plain_text", text: "今日やったこと" },
      element: {
        type: "plain_text_input",
        action_id: "today_input",
        multiline: true,
      },
    },
    {
      type: "input",
      block_id: "tomorrow_block",
      label: { type: "plain_text", text: "明日やること" },
      element: {
        type: "plain_text_input",
        action_id: "tomorrow_input",
        multiline: true,
      },
    },
    {
      type: "input",
      block_id: "feeling_block",
      label: { type: "plain_text", text: "所感・困りごと" },
      element: {
        type: "plain_text_input",
        action_id: "feeling_input",
        multiline: true,
      },
      optional: true,
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "送信" },
          style: "primary",
          action_id: "daily_report_submit",
        },
      ],
    },
  ];

  if (notice) {
    blocks.push({
      type: "context",
      elements: [{ type: "mrkdwn", text: notice }],
    });
  }

  return { type: "home", blocks };
}

// ----- ホームタブを開いた時 -----
app.event("app_home_opened", async ({ event, client, logger }) => {
  if (event.tab !== "home") return;
  try {
    await client.views.publish({
      user_id: event.user,
      view: buildHomeView(),
    });
  } catch (error) {
    logger.error("views.publish failed", error);
  }
});

// ----- 送信ボタン -----
app.action(
  "daily_report_submit",
  async ({ ack, body, client, logger }) => {
    await ack();

    // 型は BlockAction を想定。state.values は input block の値が入る。
    if (body.type !== "block_actions" || !("view" in body) || !body.view) {
      return;
    }

    try {
      // input ブロックの値を取り出す
      const values = body.view.state?.values ?? {};
      const today =
        values["today_block"]?.["today_input"]?.value?.trim() ?? "";
      const tomorrow =
        values["tomorrow_block"]?.["tomorrow_input"]?.value?.trim() ?? "";
      const feeling =
        values["feeling_block"]?.["feeling_input"]?.value?.trim() ?? "";

      if (!today && !tomorrow) {
        await client.views.publish({
          user_id: body.user.id,
          view: buildHomeView(
            ":warning: 「今日やったこと」と「明日やること」のどちらかは入力してください。"
          ),
        });
        return;
      }

      // AI 整形
      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "Slack 投稿用の日報を Slack mrkdwn で整形してください。" +
              "見出しは `*太字*` を使い、箇条書きは `- ` で。" +
              "投稿者は <@USER_ID> で記載されます。日本語で簡潔に。",
          },
          {
            role: "user",
            content:
              `# 投稿者\n<@${body.user.id}>\n\n` +
              `# 今日やったこと\n${today || "(未入力)"}\n\n` +
              `# 明日やること\n${tomorrow || "(未入力)"}\n\n` +
              `# 所感・困りごと\n${feeling || "(なし)"}\n`,
          },
        ],
      });

      const formatted =
        completion.choices[0]?.message?.content?.trim() ??
        ":warning: 整形に失敗しました。";

      // 指定チャンネルに投稿
      await client.chat.postMessage({
        channel: REPORT_CHANNEL_ID,
        text: formatted,
        unfurl_links: false,
      });

      // ホームタブを「送信済み」表示に差し替え
      await client.views.publish({
        user_id: body.user.id,
        view: buildHomeView(
          `:white_check_mark: <#${REPORT_CHANNEL_ID}> に日報を投稿しました。`
        ),
      });
    } catch (error) {
      logger.error("daily_report_submit failed", error);
      await client.views.publish({
        user_id: body.user.id,
        view: buildHomeView(
          `:warning: 投稿に失敗しました: ${
            error instanceof Error ? error.message : String(error)
          }`
        ),
      });
    }
  }
);

(async () => {
  await app.start();
  console.log(
    `⚡️ pattern-h-app-home is running (Socket Mode). report channel=${REPORT_CHANNEL_ID}`
  );
})();
