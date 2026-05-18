import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

/**
 * summarize_week
 *
 * 対象チャンネル (source_channel) の過去 1 週間の `conversations.history` を取得し、
 * Bot メッセージ (`bot_id` 付きまたは `user` 無し) を除外したうえで OpenAI に投げて
 * 「TL;DR / トピック別ハイライト / アクションアイテム」形式の週次サマリを生成する
 * Custom Function。
 *
 * 重要ポイント:
 *  - `conversations.history` の `oldest` は **Unix epoch 秒** (ミリ秒ではない)
 *  - 1 回の呼び出し上限は 1000 件 / has_more が true の間 cursor で追う
 *  - Bot 投稿はノイズになるので除外
 *  - LLM 出力は必ず「期間: X 〜 Y, 件数: N」を冒頭に含むようプロンプトで強制
 */
export const SummarizeWeekFunction = DefineFunction({
  callback_id: "summarize_week",
  title: "Summarize last 7 days of a channel",
  description: "対象チャンネルの過去 1 週間のメッセージを要約します",
  source_file: "functions/summarize_week.ts",
  input_parameters: {
    properties: {
      source_channel: {
        type: Schema.slack.types.channel_id,
        description: "要約対象のチャンネル",
      },
    },
    required: ["source_channel"],
  },
  output_parameters: {
    properties: {
      summary: {
        type: Schema.types.string,
        description: "週次サマリ本文 (Slack mrkdwn)",
      },
      message_count: {
        type: Schema.types.integer,
        description: "対象期間中の (Bot を除く) メッセージ件数",
      },
      period_start: {
        type: Schema.types.string,
        description: "期間開始 (JST, YYYY-MM-DD HH:mm)",
      },
      period_end: {
        type: Schema.types.string,
        description: "期間終了 (JST, YYYY-MM-DD HH:mm)",
      },
    },
    required: ["summary", "message_count", "period_start", "period_end"],
  },
});

// ---- ヘルパ -----------------------------------------------------------------

/** Unix epoch 秒 → "YYYY-MM-DD HH:mm" (Asia/Tokyo) */
function formatJst(unixSec: number): string {
  const d = new Date(unixSec * 1000);
  // Intl で Asia/Tokyo にフォーマット
  const fmt = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(d).reduce<Record<string, string>>(
    (acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    },
    {},
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

/** Bot 投稿らしき message を弾く */
// deno-lint-ignore no-explicit-any
function isHumanMessage(m: any): boolean {
  if (!m) return false;
  // bot_id が付いている = Bot 投稿
  if (m.bot_id) return false;
  // subtype が付いている (channel_join / message_changed / file_share 等) は除外
  if (m.subtype) return false;
  // user フィールドが無い (= 通常メッセージでない) ものは除外
  if (!m.user) return false;
  // 本文が空ならスキップ
  if (typeof m.text !== "string" || m.text.trim().length === 0) return false;
  return true;
}

// ---- 本体 -------------------------------------------------------------------

export default SlackFunction(
  SummarizeWeekFunction,
  async ({ inputs, client, env }) => {
    const nowSec = Math.floor(Date.now() / 1000);
    const oldestSec = nowSec - 7 * 24 * 60 * 60; // 7 日前 (Unix epoch 秒)

    // 1. conversations.history をページネーションしながら全部取る
    // deno-lint-ignore no-explicit-any
    const allMessages: any[] = [];
    let cursor: string | undefined = undefined;
    let pageCount = 0;
    const MAX_PAGES = 20; // 安全弁: 最大 20 ページ (= 最大 20,000 件)

    do {
      const resp = await client.conversations.history({
        channel: inputs.source_channel,
        oldest: String(oldestSec), // Slack API は文字列の Unix epoch 秒を受け付ける
        latest: String(nowSec),
        inclusive: false,
        limit: 1000,
        cursor,
      });

      if (!resp.ok) {
        const error =
          `conversations.history に失敗しました: ${resp.error ?? "unknown"}`;
        console.error(error, resp);
        return { error };
      }

      // deno-lint-ignore no-explicit-any
      const messages = (resp.messages ?? []) as any[];
      allMessages.push(...messages);

      cursor = resp.response_metadata?.next_cursor || undefined;
      pageCount += 1;
      if (pageCount >= MAX_PAGES) {
        console.warn(
          `MAX_PAGES (${MAX_PAGES}) に到達したのでページネーションを打ち切ります`,
        );
        break;
      }
    } while (cursor);

    // 2. Bot / system メッセージを除去
    const humanMessages = allMessages.filter(isHumanMessage);
    const messageCount = humanMessages.length;
    const periodStart = formatJst(oldestSec);
    const periodEnd = formatJst(nowSec);

    // 3. メッセージが 0 件ならそのまま返す
    if (messageCount === 0) {
      return {
        outputs: {
          summary:
            `*期間*: ${periodStart} 〜 ${periodEnd} (JST)\n*件数*: 0\n\n対象期間にユーザー投稿はありませんでした。`,
          message_count: 0,
          period_start: periodStart,
          period_end: periodEnd,
        },
      };
    }

    // 4. OpenAI に投げる用にメッセージを連結 (古い順)
    // Slack の history は新しい順で返ってくるので reverse
    const messagesForLLM = humanMessages
      .slice()
      .reverse()
      .map((m) => {
        const ts = formatJst(Math.floor(Number(m.ts)));
        const user = m.user ?? "unknown";
        const text = String(m.text ?? "").replace(/\s+/g, " ").slice(0, 800);
        return `[${ts}] <@${user}> ${text}`;
      })
      .join("\n");

    // 5. OpenAI Chat Completions
    const apiKey = env["OPENAI_API_KEY"];
    if (!apiKey) {
      return {
        error:
          "OPENAI_API_KEY が未設定です。`slack env add OPENAI_API_KEY ...` で登録してください。",
      };
    }
    const model = env["OPENAI_MODEL"] ?? "gpt-4o-mini";

    const systemPrompt = [
      "あなたは Slack チャンネルの週次サマリを作る編集者です。",
      "出力は Slack mrkdwn 形式の日本語で、必ず以下の構成にしてください。",
      "",
      "1 行目: `*期間*: <period_start> 〜 <period_end> (JST)  *件数*: <N>`",
      "2 行目: 空行",
      "3 行目以降:",
      "*TL;DR*",
      "- 3〜5 個の箇条書きで、その週の最重要事項を要約",
      "",
      "*トピック別ハイライト*",
      "- トピック名: 内容を 1〜2 行で",
      "- (関連する人物には <@USERID> 形式の言及を保持してよい)",
      "",
      "*アクションアイテム*",
      "- [ ] 誰が / 何を / いつまでに (推測可能な範囲で)",
      "",
      "ハルシネーション禁止。情報源に無いことは書かない。",
    ].join("\n");

    const userPrompt = [
      `period_start: ${periodStart}`,
      `period_end: ${periodEnd}`,
      `N: ${messageCount}`,
      "",
      "---- messages (oldest first) ----",
      messagesForLLM,
    ].join("\n");

    let summary: string;
    try {
      const openaiResp = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            temperature: 0.3,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          }),
        },
      );

      if (!openaiResp.ok) {
        const body = await openaiResp.text();
        return {
          error:
            `OpenAI API がエラーを返しました: ${openaiResp.status} ${body.slice(0, 300)}`,
        };
      }

      const json = await openaiResp.json();
      summary = json?.choices?.[0]?.message?.content?.trim() ?? "";
      if (!summary) {
        return { error: "OpenAI からのレスポンスが空でした" };
      }
    } catch (e) {
      return { error: `OpenAI 呼び出し中に例外: ${(e as Error).message}` };
    }

    return {
      outputs: {
        summary,
        message_count: messageCount,
        period_start: periodStart,
        period_end: periodEnd,
      },
    };
  },
);
