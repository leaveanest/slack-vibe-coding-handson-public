import { DefineOAuth2Provider, Schema } from "deno-slack-sdk/mod.ts";

/**
 * GitHub OAuth2 Provider 定義
 *
 * Slack Platform の External Auth 機能を使って GitHub OAuth を扱う Provider。
 * `slack external-auth add-secret --provider github --secret <CLIENT_SECRET>` で
 * client secret を Slack 側に暗号化登録し、`slack external-auth add` で
 * 個別のユーザートークンを取得する。
 *
 * 参考: https://docs.slack.dev/tools/deno-slack-sdk/guides/integrating-with-services-requiring-external-authentication/
 */
export const GitHubProvider = DefineOAuth2Provider({
  provider_key: "github",
  provider_type: Schema.providers.oauth2.CUSTOM,
  options: {
    provider_name: "GitHub",
    authorization_url: "https://github.com/login/oauth/authorize",
    token_url: "https://github.com/login/oauth/access_token",
    // client_id は環境変数から (Deno.env.get は manifest 読み込み時に評価される)
    client_id: Deno.env.get("GITHUB_CLIENT_ID") ?? "",
    // PR の読み取りには public_repo スコープがあれば十分 (private repo を扱う場合は "repo")
    scope: ["public_repo"],
    // External Auth UI で「どの GitHub アカウントで接続したか」を表示するために必要
    identity_config: {
      url: "https://api.github.com/user",
      account_identifier: "$.login",
    },
  },
});
