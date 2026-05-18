# Slack App 設定手順 — pattern-a-summarize

## 0. 前提

- 開発用 Slack ワークスペースに **App を作成・インストールできる権限** を持っていること
- 自分のチームの管理者に「OAuth でアプリインストール時に承認が必要」設定が入っている場合は、事前に承認権限を貰っておく

## 1. App を作成

下記の手順で進めます。

- [api.slack.com/apps](https://api.slack.com/apps) を開いて **Create New App**
- **From an app manifest** を選択
- ワークスペースを選んで、下の Manifest YAML を貼り付ける

```yaml
display_information:
  name: Pattern A — /summarize
  description: スレッドを要約する Slash Command (ハンズオン教材)
  background_color: "#3f4d8a"
features:
  bot_user:
    display_name: summarize-bot
    always_online: true
  slash_commands:
    - command: /summarize
      description: スレッドを要約して実行者にだけ返す
      usage_hint: "<thread_ts>"
      should_escape: false
oauth_config:
  scopes:
    bot:
      - commands
      - channels:history
      - groups:history
      - chat:write
settings:
  socket_mode_enabled: true
  org_deploy_enabled: false
  token_rotation_enabled: false
```

- 「Create」 → 「Install to Workspace」を実行

## 2. トークンを取得

| トークン名 | 取得場所 | `.env` のキー |
| --- | --- | --- |
| Bot User OAuth Token (`xoxb-...`) | OAuth & Permissions | `SLACK_BOT_TOKEN` |
| App-Level Token (`xapp-...`) | Basic Information → App-Level Tokens で **新規作成**（scope: `connections:write`） | `SLACK_APP_TOKEN` |
| Signing Secret | Basic Information → App Credentials | `SLACK_SIGNING_SECRET` |

> App-Level Token は最初は存在しないので「Generate Token and Scopes」から作成してください。

## 3. `.env` を埋める

```bash
cd bolt/pattern-a-summarize
cp .env.example .env
$EDITOR .env
```

## 4. 起動

```bash
npm install
npm run dev
# ⚡️ /summarize bolt app is running (Socket Mode) と出れば OK
```

Slack 側の任意のチャンネルにこのアプリを招待 (`/invite @summarize-bot`) してから、適当なスレッドの thread_ts を引数にして `/summarize <thread_ts>` を実行。

## 5. デプロイ（必要なら）

ハンズオンではローカル起動で十分ですが、常駐させたいなら Cloud Run / Fly.io / Railway などに Container として乗せれば動きます。Socket Mode なので **inbound port を公開する必要はありません**。
