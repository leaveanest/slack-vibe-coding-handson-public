import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

/**
 * SummarizeThreadFunction
 *
 * 指定されたスレッド (channel + thread_ts) のメッセージを `conversations.replies`
 * で取得し、OpenAI に投げて議事録風 Markdown に整形する。
 *
 * 出力は議事録風の Markdown 文字列で、後続の CreateCanvasFunction にそのまま渡す。
 */
export const SummarizeThreadFunction = DefineFunction({
  callback_id: "summarize_thread",
  title: "Summarize Thread",
  description: "Fetch a thread and turn it into minutes-style Markdown",
  source_file: "functions/summarize_thread.ts",
  input_parameters: {
    properties: {
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "リアクションが付いたメッセージのチャンネル",
      },
      thread_ts: {
        type: Schema.types.string,
        description: "スレッドのルートメッセージ ts",
      },
    },
    required: ["channel_id", "thread_ts"],
  },
  output_parameters: {
    properties: {
      title: {
        type: Schema.types.string,
        description: "議事録のタイトル",
      },
      markdown: {
        type: Schema.types.string,
        description: "議事録本文 (Markdown)",
      },
    },
    required: ["title", "markdown"],
  },
});

type SlackMessage = {
  ts: string;
  user?: string;
  bot_id?: string;
  text?: string;
};

export default SlackFunction(
  SummarizeThreadFunction,
  async ({ inputs, client, env }) => {
    const { channel_id, thread_ts } = inputs;

    // --- 1. スレッド全体を取得 ---
    const replies = await client.conversations.replies({
      channel: channel_id,
      ts: thread_ts,
      limit: 200,
    });

    if (!replies.ok) {
      return { error: `conversations.replies failed: ${replies.error}` };
    }

    const messages = (replies.messages ?? []) as SlackMessage[];
    if (messages.length === 0) {
      return { error: "対象スレッドにメッセージが見つかりませんでした" };
    }

    // 人間が読みやすい形に整形（bot のメッセージは除外）
    const transcript = messages
      .filter((m) => !m.bot_id)
      .map((m) => {
        const who = m.user ? `<@${m.user}>` : "unknown";
        return `${who}: ${m.text ?? ""}`;
      })
      .join("\n");

    // --- 2. OpenAI で要約 ---
    const apiKey = env["OPENAI_API_KEY"];
    if (!apiKey) {
      return {
        error:
          "OPENAI_API_KEY が設定されていません。`slack env add OPENAI_API_KEY ...` を実行してください",
      };
    }
    const model = env["OPENAI_MODEL"] || "gpt-4o-mini";

    const now = new Date().toISOString();
    const systemPrompt = [
      "あなたは熟練の議事録ライターです。",
      "渡された Slack スレッドの会話を読み、議事録として Markdown を生成してください。",
      "必ず以下の見出し構成 (H2) を順番通りに含めてください:",
      "## 日時",
      "## 参加者",
      "## 議題",
      "## 決定事項",
      "## アクションアイテム",
      "出力は Markdown 本文のみ。前置きや「以下が議事録です」などの説明文は一切含めないこと。",
      "Slack のメンション記法 (<@U123>) はそのまま残してよい。",
    ].join("\n");

    const userPrompt = [
      `日時の参考値: ${now}`,
      "",
      "--- スレッド本文ここから ---",
      transcript,
      "--- スレッド本文ここまで ---",
    ].join("\n");

    const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!openaiResp.ok) {
      const errText = await openaiResp.text();
      return {
        error: `OpenAI API error (${openaiResp.status}): ${errText}`,
      };
    }

    const json = await openaiResp.json();
    const markdown: string = json?.choices?.[0]?.message?.content?.trim() ?? "";
    if (!markdown) {
      return { error: "OpenAI から有効な要約が得られませんでした" };
    }

    // --- 3. タイトルを生成（先頭メッセージ + 日付） ---
    const firstLine = (messages[0]?.text ?? "").split("\n")[0]?.slice(0, 40) ||
      "Slack スレッド";
    const dateLabel = now.slice(0, 10);
    const title = `議事録 (${dateLabel}) - ${firstLine}`;

    return {
      outputs: {
        title,
        markdown,
      },
    };
  },
);
