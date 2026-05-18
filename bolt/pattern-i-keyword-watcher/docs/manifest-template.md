# Slack App 設定手順 — pattern-i-keyword-watcher

## 1. App を作成

[api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From an app manifest** → 開発用ワークスペース → 下を貼り付け。

```yaml
display_information:
  name: Pattern I — Keyword Watcher
  description: 監視キーワードを検知して文脈ごと DM 通知する Bot (ハンズオン教材)
  background_color: "#a14d1f"
features:
  bot_user:
    display_name: keyword-watcher
    always_online: true
oauth_config:
  scopes:
    bot:
      - channels:history
      - groups:history
      - chat:write
      - im:write
settings:
  event_subscriptions:
    bot_events:
      - message.channels
  interactivity:
    is_enabled: false
  socket_mode_enabled: true
  org_deploy_enabled: false
  token_rotation_enabled: false
```

> `message.channels` は **チャンネル内の全メッセージ** を Bot に届けるので、テスト用ワークスペースで動かしてください。本番チャンネルでは流量に注意。

「Create」 → 「Install to Workspace」。

## 2. トークン取得

| トークン | 取得場所 | `.env` のキー |
| --- | --- | --- |
| Bot User OAuth Token (`xoxb-...`) | OAuth & Permissions | `SLACK_BOT_TOKEN` |
| App-Level Token (`xapp-...`) | Basic Information → App-Level Tokens (scope: `connections:write`) | `SLACK_APP_TOKEN` |
| Signing Secret | Basic Information → App Credentials | `SLACK_SIGNING_SECRET` |

## 3. 監視設定

`.env` で以下を設定:

- `WATCH_KEYWORDS` — 監視するキーワードをカンマ区切り(例: `リリース,障害,緊急,deploy,outage`)
- `NOTIFY_USER_ID` — 通知先ユーザー ID(`U...` 形式)

ユーザー ID は Slack のプロフィール → 「⋮」 → 「メンバー ID をコピー」で取得できます。

## 4. 起動

```bash
cd bolt/pattern-i-keyword-watcher
cp .env.example .env
$EDITOR .env

npm install
npm run dev
```

ログに `keywords=リリース|障害|緊急|deploy|outage notify=U... bot=U...` が出れば OK。

## 5. 動作確認

1. Bot を監視対象チャンネルに `/invite`
2. そのチャンネルで「明日リリースします」のように投稿
3. `NOTIFY_USER_ID` の DM に通知が届く(ヒットしたキーワード、本文の引用、AI 要約)
