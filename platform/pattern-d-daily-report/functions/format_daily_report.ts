// ---------------------------------------------------------------------------
// Custom Function: format_daily_report
// ---------------------------------------------------------------------------
// 役割:
//   フォームで集めた「今日やったこと / 明日やること / 所感」を受け取り、
//   OpenAI Chat Completions API で Slack mrkdwn フォーマットの
//   "読みやすい日報" に整形した文字列を返す。
//
// 設計メモ:
//   * Custom Function は「定義」と「実装」を同じファイルにまとめても良いし、
//     definition.ts / mod.ts のように分けても良い。
//     教材として 1 ファイルで全体像を追えるほうが読みやすいので統合した。
//   * OpenAI SDK (npm:openai) ではなく Deno-native の fetch を使うことで、
//     "Slack Platform 上ではどんな npm 互換が動くのか" を意識せずに済む。
//     Slack Cloud のサンドボックスは fetch ベースの外部呼び出しが基本。
//   * env (OPENAI_API_KEY) は SlackFunction の引数で受け取る。
//     Deno.env.get() でも取れるが、env 経由のほうがテストでモックしやすく、
//     Slack Platform の公式お作法でもある。
// ---------------------------------------------------------------------------

import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

/** 関数の入出力スキーマ定義 (manifest にもこれを通じて反映される) */
export const FormatDailyReportFunction = DefineFunction({
  callback_id: "format_daily_report",
  title: "Format Daily Report",
  description: "OpenAI で日報を Slack mrkdwn に整形する",
  // ↓ Slack Platform は source_file を見て実装を解決する。
  //   ファイルパスはプロジェクトルート (manifest.ts のある場所) からの相対パス。
  source_file: "functions/format_daily_report.ts",
  input_parameters: {
    properties: {
      today: {
        type: Schema.types.string,
        description: "今日やったこと",
      },
      tomorrow: {
        type: Schema.types.string,
        description: "明日やること",
      },
      feeling: {
        type: Schema.types.string,
        description: "所感 (任意)",
      },
      author_id: {
        type: Schema.slack.types.user_id,
        description: "日報の起票者 (メンション表示用)",
      },
    },
    required: ["today", "tomorrow", "author_id"],
  },
  output_parameters: {
    properties: {
      formatted_message: {
        type: Schema.types.string,
        description: "Slack mrkdwn 形式の整形済み日報",
      },
    },
    required: ["formatted_message"],
  },
});

/**
 * OpenAI に投げるシステムプロンプト。
 * - Slack mrkdwn の主要記法 (*bold*, _italic_, `code`, > quote, - bullets) を明示。
 * - 余計な前置きを禁じ、本文だけを返すよう指示することで後段の SendMessage で
 *   そのまま `message` に渡せる形にする。
 */
const SYSTEM_PROMPT = `あなたは Slack に投稿する日報を整形するアシスタントです。
入力された "今日やったこと / 明日やること / 所感" を、Slack の mrkdwn 形式で
読みやすい日報にまとめてください。

Slack mrkdwn のルール:
- 太字は *text* (アスタリスク 1 個で囲む。Markdown と違うので注意)
- 箇条書きは行頭に "- " または "• "
- 引用は行頭に "> "
- 絵文字は :tada: のような Slack 記法

出力ルール:
- 前置き・後置き・コードフェンスは一切付けない。本文のみを返す。
- セクションは "*今日やったこと*" / "*明日やること*" / "*所感*" の 3 つ。
- 所感が空ならそのセクションごと省略する。
- 各箇条書きは 1 行 1 項目で簡潔に。
- 全体で 1500 文字以内に収める。`;

/** OpenAI Chat Completions のレスポンスの最小型 (我々が使う部分だけ) */
type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

export default SlackFunction(
  FormatDailyReportFunction,
  async ({ inputs, env }) => {
    const apiKey = env["OPENAI_API_KEY"];
    if (!apiKey) {
      // Slack Platform では `error` を返すとワークフローがそこで止まる。
      // ハンズオン中に env 未設定で詰まることが多いので、わかりやすいメッセージを返す。
      return {
        error:
          "OPENAI_API_KEY が設定されていません。`slack env add OPENAI_API_KEY <値>` で登録してください。",
      };
    }
    const model = env["OPENAI_MODEL"] ?? "gpt-4o-mini";

    // ユーザープロンプトは "純粋な入力" だけにまとめ、整形ルールはシステムに寄せる。
    const userPrompt = [
      `起票者: <@${inputs.author_id}>`,
      "",
      "## 今日やったこと",
      inputs.today,
      "",
      "## 明日やること",
      inputs.tomorrow,
      "",
      "## 所感",
      inputs.feeling ?? "(未記入)",
    ].join("\n");

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.4,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        return {
          error:
            `OpenAI API がエラーを返しました (status=${response.status}): ${text.slice(0, 300)}`,
        };
      }

      const data: ChatCompletionResponse = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) {
        return {
          error: `OpenAI からの応答が空でした: ${JSON.stringify(data).slice(0, 300)}`,
        };
      }

      // 起票者メンションは LLM が落としがちなので、先頭に強制的に付与する。
      // (Slack 側で <@USERID> 形式ならクリック可能なメンションになる)
      const header = `:memo: <@${inputs.author_id}> さんの日報`;
      const formatted = `${header}\n\n${content}`;

      return {
        outputs: { formatted_message: formatted },
      };
    } catch (e) {
      // fetch そのものが失敗 (DNS / outgoingDomains 未許可など) するパターン。
      const message = e instanceof Error ? e.message : String(e);
      return {
        error: `OpenAI 呼び出しで例外が発生しました: ${message}`,
      };
    }
  },
);
