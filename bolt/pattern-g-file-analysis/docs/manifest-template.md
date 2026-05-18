# Slack App 設定手順 — pattern-g-file-analysis

## 1. App を作成

[api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From an app manifest** → 開発用ワークスペース → 下を貼り付け。

```yaml
display_information:
  name: Pattern G — Image Analyzer
  description: 画像アップロードを AI で解析する Bot (ハンズオン教材)
  background_color: "#8a4d9f"
features:
  bot_user:
    display_name: image-analyzer
    always_online: true
oauth_config:
  scopes:
    bot:
      - files:read
      - channels:history
      - groups:history
      - chat:write
settings:
  event_subscriptions:
    bot_events:
      - file_shared
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
cd bolt/pattern-g-file-analysis
cp .env.example .env
$EDITOR .env

npm install
npm run dev
```

`⚡️ pattern-g-file-analysis is running (Socket Mode). Vision model=gpt-4o-mini maxBytes=5242880` と出れば OK。

## 4. 動作確認

1. Bot をテスト用パブリックチャンネルに招待
2. 適当なスクリーンショットや写真をドラッグ&ドロップでアップロード
3. 数秒〜十数秒後に解析結果が返る(写っているもの / 文字起こし / 気付き)

## 5. デプロイ(任意)

Socket Mode なので inbound port 不要。Vision API のコストに注意。
