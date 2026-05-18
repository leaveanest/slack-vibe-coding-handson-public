# Slack App 設定手順 — pattern-h-app-home

## 1. App を作成

[api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From an app manifest** → 開発用ワークスペース → 下を貼り付け。

```yaml
display_information:
  name: Pattern H — Daily Report
  description: App Home から AI が整形した日報を投稿する Bot (ハンズオン教材)
  background_color: "#0b6e4f"
features:
  app_home:
    home_tab_enabled: true
    messages_tab_enabled: false
    messages_tab_read_only_enabled: false
  bot_user:
    display_name: daily-report
    always_online: true
oauth_config:
  scopes:
    bot:
      - chat:write
settings:
  event_subscriptions:
    bot_events:
      - app_home_opened
  interactivity:
    is_enabled: true
  socket_mode_enabled: true
  org_deploy_enabled: false
  token_rotation_enabled: false
```

> `interactivity.is_enabled: true` を入れないとボタン押下が来ません。

「Create」 → 「Install to Workspace」。

## 2. トークン取得

| トークン | 取得場所 | `.env` のキー |
| --- | --- | --- |
| Bot User OAuth Token (`xoxb-...`) | OAuth & Permissions | `SLACK_BOT_TOKEN` |
| App-Level Token (`xapp-...`) | Basic Information → App-Level Tokens (scope: `connections:write`) | `SLACK_APP_TOKEN` |
| Signing Secret | Basic Information → App Credentials | `SLACK_SIGNING_SECRET` |

## 3. 投稿先チャンネル ID

投稿させたいチャンネルで「リンクをコピー」 → URL 末尾の `C0123ABCD` 形式の文字列を `REPORT_CHANNEL_ID` に設定。
Bot をそのチャンネルに招待しておく(`/invite @daily-report`)。

## 4. 起動

```bash
cd bolt/pattern-h-app-home
cp .env.example .env
$EDITOR .env

npm install
npm run dev
```

## 5. 動作確認

1. Slack 左サイドバーから Bot 名を開く
2. 上部の「ホーム」タブ
3. 3 つの入力欄が表示される
4. 入力して「送信」 → 指定チャンネルに整形された日報が投稿される
5. ホームタブが「✅ 投稿しました」表示に変わる
