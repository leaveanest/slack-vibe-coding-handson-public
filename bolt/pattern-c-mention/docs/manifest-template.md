# Slack App 設定手順 — pattern-c-mention

## 1. App を作成

[api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From an app manifest** → 開発用ワークスペース選択 → 下を貼り付け。

```yaml
display_information:
  name: Pattern C — Channel Q&A Bot
  description: メンションでチャンネル履歴を踏まえて回答する Bot (ハンズオン教材)
  background_color: "#1e7c4c"
features:
  bot_user:
    display_name: qa-bot
    always_online: true
oauth_config:
  scopes:
    bot:
      - app_mentions:read
      - channels:history
      - groups:history
      - chat:write
settings:
  event_subscriptions:
    bot_events:
      - app_mention
  interactivity:
    is_enabled: false
  socket_mode_enabled: true
  org_deploy_enabled: false
  token_rotation_enabled: false
```

「Create」 → 「Install to Workspace」。

## 2. トークン取得

| トークン | 取得場所 | `.env` のキー |
| --- | --- | --- |
| Bot User OAuth Token (`xoxb-...`) | OAuth & Permissions | `SLACK_BOT_TOKEN` |
| App-Level Token (`xapp-...`) | Basic Information → App-Level Tokens (scope: `connections:write`) | `SLACK_APP_TOKEN` |
| Signing Secret | Basic Information → App Credentials | `SLACK_SIGNING_SECRET` |

## 3. 起動

```bash
cd bolt/pattern-c-mention
cp .env.example .env
$EDITOR .env

npm install
npm run dev
```

`⚡️ pattern-c-mention is running (Socket Mode). bot user_id=U... HISTORY_LIMIT=50` と出れば OK。

## 4. 動作確認

1. Bot を対象パブリックチャンネルに招待
2. 過去にいくつかメッセージを投稿しておく(回答の素材)
3. 同チャンネルで `@qa-bot 直近の議論を 3 行で要約して` を投稿
4. スレッドに回答が返る

## 5. デプロイ(任意)

Socket Mode なので inbound port 不要。Cloud Run / Fly.io / Railway に Container として乗せれば常駐可。
