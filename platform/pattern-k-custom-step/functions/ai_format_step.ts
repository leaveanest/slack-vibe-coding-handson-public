import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

/**
 * AI で整形 — Workflow Builder 向けカスタムステップ (Connector Function)
 *
 * Workflow Builder の UI ラベルは以下のフィールドから組み立てられる:
 * - `title` / `description`              ... ステップ選択画面のカード
 * - `input_parameters.properties.<x>.title` / `description`
 *                                         ... ステップ設定モーダル内のフィールドラベル
 *
 * `format_style` は `enum` を付けることで WFB 上でドロップダウンになる。
 */
export const AIFormatStepFunction = DefineFunction({
  callback_id: "ai_format_step",
  title: "AI で整形",
  description:
    "入力テキストを選択したスタイル (フォーマル/カジュアル/箇条書き/要約) で AI が整形します",
  source_file: "functions/ai_format_step.ts",
  input_parameters: {
    properties: {
      text: {
        type: Schema.types.string,
        title: "整形するテキスト",
        description:
          "整形したいテキスト本文。前ステップの変数を差し込むこともできます",
      },
      format_style: {
        type: Schema.types.string,
        title: "整形スタイル",
        description:
          "出力スタイルを選択してください (formal / casual / bullet / summary)",
        enum: ["formal", "casual", "bullet", "summary"],
      },
    },
    required: ["text", "format_style"],
  },
  output_parameters: {
    properties: {
      formatted_text: {
        type: Schema.types.string,
        title: "整形後テキスト",
        description: "AI が整形したテキスト。次のステップの入力に渡せます",
      },
    },
    required: ["formatted_text"],
  },
});

/**
 * `format_style` ごとに OpenAI に渡す system prompt を切り替える。
 * WFB の利用者 (非エンジニア) に「何をしてくれるか」を一意に伝えるため、
 * スタイルごとの仕様はここで固定する。
 */
const SYSTEM_PROMPTS: Record<string, string> = {
  formal:
    "あなたは日本語ビジネス文書のエディタです。入力テキストを、敬体 (です・ます調) のフォーマルな文章に書き換えてください。意味は変えず、誤字脱字も修正してください。出力は整形後の本文のみを返してください。",
  casual:
    "あなたは社内チャット向けの編集者です。入力テキストを、親しみやすいカジュアルな口調 (常体寄り、絵文字は使わない) に書き換えてください。意味は変えず、冗長な部分は短くしてください。出力は整形後の本文のみを返してください。",
  bullet:
    "あなたは構造化のプロです。入力テキストを、要点ごとの箇条書き (ハイフン `-` 始まり、最大 7 項目) に整理してください。重複は統合し、各項目は 1 行で簡潔に。出力は箇条書きのみを返してください。",
  summary:
    "あなたは要約のプロです。入力テキストを、3 文以内・最大 200 文字の日本語サマリに要約してください。固有名詞と数字は保持してください。出力は要約本文のみを返してください。",
};

export default SlackFunction(
  AIFormatStepFunction,
  async ({ inputs, env }) => {
    const apiKey = env["OPENAI_API_KEY"];
    if (!apiKey) {
      return {
        error:
          "OPENAI_API_KEY が未設定です。`slack env add OPENAI_API_KEY <key>` で登録してください。",
      };
    }

    const model = env["OPENAI_MODEL"] ?? "gpt-4o-mini";
    const systemPrompt = SYSTEM_PROMPTS[inputs.format_style];

    if (!systemPrompt) {
      // enum で防がれているが念のため
      return {
        error: `未知の format_style: ${inputs.format_style}`,
      };
    }

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: inputs.text },
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        return {
          error:
            `OpenAI API 呼び出しに失敗しました (HTTP ${response.status}): ${errorBody}`,
        };
      }

      const data = await response.json();
      const formatted = data?.choices?.[0]?.message?.content?.trim();

      if (!formatted) {
        return {
          error: "OpenAI API のレスポンスから整形結果を取得できませんでした",
        };
      }

      return {
        outputs: {
          formatted_text: formatted,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        error: `整形処理中にエラーが発生しました: ${message}`,
      };
    }
  },
);
