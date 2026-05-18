import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

/**
 * GitHub PR を要約する Custom Function
 *
 * 入力:
 *   - pr_url: 要約対象の PR URL (https://github.com/{owner}/{repo}/pull/{number})
 *   - channel: 投稿先チャンネル (後段 SendMessage 用に通過させる)
 *   - github_access_token_id: External Auth で取得した GitHub アクセストークンの ID
 *
 * 処理:
 *   1. client.apps.auth.external.get で実際の GitHub トークンを取得
 *   2. PR URL を owner/repo/number にパース
 *   3. GitHub REST API で PR 情報を取得 (title, body, comments, changed_files)
 *   4. OpenAI で要約を生成
 *
 * 出力:
 *   - summary, pr_title, pr_url
 */
export const SummarizeGitHubPRDefinition = DefineFunction({
  callback_id: "summarize_github_pr",
  title: "GitHub PR を要約",
  description: "GitHub の Pull Request 情報を取得して OpenAI で要約する",
  source_file: "functions/summarize_github_pr.ts",
  input_parameters: {
    properties: {
      pr_url: {
        type: Schema.types.string,
        description: "要約対象 GitHub PR の URL",
      },
      channel: {
        type: Schema.slack.types.channel_id,
        description: "投稿先チャンネル",
      },
      github_access_token_id: {
        // ここがポイント: oauth2 型で受け取り、後段の API 呼び出し時に
        // client.apps.auth.external.get で実トークンに引き換える
        type: Schema.slack.types.oauth2,
        oauth2_provider_key: "github",
      },
    },
    required: ["pr_url", "channel", "github_access_token_id"],
  },
  output_parameters: {
    properties: {
      summary: {
        type: Schema.types.string,
        description: "OpenAI が生成した PR 要約",
      },
      pr_title: {
        type: Schema.types.string,
        description: "PR タイトル",
      },
      pr_url: {
        type: Schema.types.string,
        description: "元の PR URL (チャンネル投稿時のリンク用)",
      },
      channel: {
        type: Schema.slack.types.channel_id,
        description: "投稿先チャンネル",
      },
    },
    required: ["summary", "pr_title", "pr_url", "channel"],
  },
});

/**
 * PR URL を owner / repo / number に分解するユーティリティ。
 *
 * 受け付ける形式:
 *   https://github.com/{owner}/{repo}/pull/{number}
 *   (末尾の `/files` や `#discussion_r123` などのフラグメントは無視する)
 */
export function parsePRUrl(
  url: string,
): { owner: string; repo: string; number: number } | null {
  try {
    const u = new URL(url);
    if (u.hostname !== "github.com") return null;
    // pathname 例: /slackapi/deno-slack-sdk/pull/123
    const parts = u.pathname.split("/").filter((p) => p.length > 0);
    if (parts.length < 4) return null;
    const [owner, repo, pullKeyword, numberStr] = parts;
    if (pullKeyword !== "pull") return null;
    const number = Number.parseInt(numberStr, 10);
    if (Number.isNaN(number)) return null;
    return { owner, repo, number };
  } catch {
    return null;
  }
}

export default SlackFunction(
  SummarizeGitHubPRDefinition,
  async ({ inputs, client }) => {
    // 1. External Auth から実際の GitHub アクセストークンを取得
    const tokenResp = await client.apps.auth.external.get({
      external_token_id: inputs.github_access_token_id,
    });
    if (!tokenResp.ok || !tokenResp.external_token) {
      return {
        error:
          `GitHub アクセストークンの取得に失敗しました: ${tokenResp.error ?? "unknown"}`,
      };
    }
    const githubToken = tokenResp.external_token as string;

    // 2. PR URL をパース
    const parsed = parsePRUrl(inputs.pr_url);
    if (!parsed) {
      return {
        error:
          `PR URL の形式が不正です: ${inputs.pr_url} (期待形式: https://github.com/{owner}/{repo}/pull/{number})`,
      };
    }
    const { owner, repo, number } = parsed;

    // 3. GitHub REST API で PR 情報を取得
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`;
    const ghResp = await fetch(apiUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${githubToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "slack-deno-pattern-l",
      },
    });
    if (!ghResp.ok) {
      const text = await ghResp.text();
      return {
        error:
          `GitHub API 呼び出しに失敗 (status=${ghResp.status}): ${text.slice(0, 300)}`,
      };
    }
    const pr = await ghResp.json() as {
      title: string;
      body: string | null;
      comments: number;
      review_comments: number;
      changed_files: number;
      additions: number;
      deletions: number;
      html_url: string;
      user?: { login?: string };
    };

    // 4. OpenAI で要約を生成
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return { error: "OPENAI_API_KEY が設定されていません" };
    }
    const model = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";

    // body は長くなることがあるので適度に切り詰める (LLM への入力コスト対策)
    const truncatedBody = (pr.body ?? "(本文なし)").slice(0, 4000);
    const userPrompt = [
      `以下は GitHub Pull Request の情報です。日本語で 3〜5 行に要約してください。`,
      `要約は「目的 / 変更内容 / レビュー観点」を含めてください。`,
      ``,
      `タイトル: ${pr.title}`,
      `作成者: ${pr.user?.login ?? "unknown"}`,
      `変更ファイル数: ${pr.changed_files} (+${pr.additions} / -${pr.deletions})`,
      `コメント数: ${pr.comments + pr.review_comments}`,
      `URL: ${pr.html_url}`,
      ``,
      `--- 本文 ---`,
      truncatedBody,
    ].join("\n");

    const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "あなたはソフトウェアエンジニアの作業を助けるアシスタントです。Pull Request を簡潔に要約します。",
          },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });
    if (!openaiResp.ok) {
      const text = await openaiResp.text();
      return {
        error:
          `OpenAI API 呼び出しに失敗 (status=${openaiResp.status}): ${text.slice(0, 300)}`,
      };
    }
    const openaiJson = await openaiResp.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const summary = openaiJson.choices?.[0]?.message?.content?.trim() ??
      "(要約を生成できませんでした)";

    return {
      outputs: {
        summary,
        pr_title: pr.title,
        pr_url: pr.html_url,
        channel: inputs.channel,
      },
    };
  },
);
