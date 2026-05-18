import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

/**
 * CreateCanvasFunction
 *
 * 受け取った Markdown を元に `canvases.create` で Canvas を作成し、
 * Canvas へのリンク (permalink) を返す。
 *
 * 後続の SendMessage ステップで元スレッドにこのリンクを投稿する。
 */
export const CreateCanvasFunction = DefineFunction({
  callback_id: "create_canvas",
  title: "Create Canvas",
  description: "Create a Slack canvas from markdown",
  source_file: "functions/create_canvas.ts",
  input_parameters: {
    properties: {
      title: {
        type: Schema.types.string,
        description: "Canvas のタイトル",
      },
      markdown: {
        type: Schema.types.string,
        description: "Canvas に書き込む Markdown 本文",
      },
    },
    required: ["title", "markdown"],
  },
  output_parameters: {
    properties: {
      canvas_id: {
        type: Schema.types.string,
        description: "作成された Canvas の ID",
      },
      canvas_url: {
        type: Schema.types.string,
        description: "Canvas へのリンク (Slack 内 URL)",
      },
    },
    required: ["canvas_id", "canvas_url"],
  },
});

export default SlackFunction(
  CreateCanvasFunction,
  async ({ inputs, client }) => {
    const { title, markdown } = inputs;

    // `canvases.create` を呼び出す。
    // deno-slack-api の client.canvases.create はそのまま Slack Web API の
    // canvases.create にマッピングされる。
    const resp = await client.canvases.create({
      title,
      document_content: {
        type: "markdown",
        markdown,
      },
    });

    if (!resp.ok || !resp.canvas_id) {
      return {
        error: `canvases.create failed: ${resp.error ?? "unknown error"}`,
      };
    }

    const canvasId = resp.canvas_id as string;
    // Canvas は Slack 内の `/docs/{canvas_id}` で開ける
    const canvasUrl = `slack://docs/${canvasId}`;

    return {
      outputs: {
        canvas_id: canvasId,
        canvas_url: canvasUrl,
      },
    };
  },
);
