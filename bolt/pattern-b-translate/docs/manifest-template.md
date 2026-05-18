# Slack App 設定手順 — pattern-b-translate

## 1. App を作成

[api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From an app manifest** → 開発用ワークスペースを選択 → 下の YAML を貼り付け。

```yaml
display_information:
  name: Pattern B — Flag Translator
  description: 国旗リアクションでメッセージを翻訳する Bot (ハンズオン教材)
  background_color: "#1f6feb"
features:
  bot_user:
    display_name: translate-bot
    always_online: true
oauth_config:
  scopes:
    bot:
      - reactions:read
      - channels:history
      - groups:history
      - chat:write
settings:
  event_subscriptions:
    bot_events:
      - reaction_added
  interactivity:
    is_enabled: false
  socket_mode_enabled: true
  org_deploy_enabled: false
  token_rotation_enabled: false
```

「Create」 → 「Install to Workspace」。

## 2. トークンを取得

| トークン | 取得場所 | `.env` のキー |
| --- | --- | --- |
| Bot User OAuth Token (`xoxb-...`) | OAuth & Permissions | `SLACK_BOT_TOKEN` |
| App-Level Token (`xapp-...`) | Basic Information → App-Level Tokens (scope: `connections:write`) | `SLACK_APP_TOKEN` |
| Signing Secret | Basic Information → App Credentials | `SLACK_SIGNING_SECRET` |

## 3. `.env` を埋めて起動

```bash
cd bolt/pattern-b-translate
cp .env.example .env
$EDITOR .env

npm install
npm run dev
```

`pattern-b-translate is running (Socket Mode). bot user_id=U...` と出れば OK。

## 4. 動作確認

1. テスト用パブリックチャンネルに Bot を招待
   - `/invite @translate-bot`
2. 適当な日本語メッセージを投稿
   - 例: `今日の進捗を共有します。デプロイは明日の予定です。`
3. そのメッセージに 🇺🇸 リアクションを付ける
4. 数秒後にスレッドに英訳が返ってくる

## 5. デプロイ(任意)

Socket Mode なので inbound port 不要。Cloud Run / Fly.io / Railway などでコンテナとして起動するだけ。
