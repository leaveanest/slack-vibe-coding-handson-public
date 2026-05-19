# SETUP.md — 環境構築ガイド

このリポジトリのハンズオンを進めるための環境構築手順です。Mac / Windows どちらでも完走できるよう両方の手順を併記しています。

## 0. このドキュメントが終わると

- Codex App が動く（vibe coding の主役）
- Node.js / Deno / `slack` CLI が動く
- Slack 開発用ワークスペースに接続できる

所要時間: **約 20〜30 分**

---

## 1. 共通: アカウント・キー類

| 必要なもの | 取得方法 |
| --- | --- |
| Slack 開発用ワークスペース | 個人で無料の新規ワークスペースを作成（既存に入れない人向け） |
| OpenAI API キー | 当日配布 or 各自準備（[platform.openai.com](https://platform.openai.com/)） |
| GitHub アカウント | 既存があれば OK |

---

## 2. Mac セットアップ

### 2.1 Homebrew

```bash
# 入っていない人だけ
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2.2 Node.js 20+ / Deno / Slack CLI

```bash
# Node.js (nvm 推奨)
brew install nvm
mkdir -p ~/.nvm
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc
echo '[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"' >> ~/.zshrc
source ~/.zshrc
nvm install 20
nvm use 20

# Deno
brew install deno

# Slack CLI (公式インストーラは最新版を既定で入れる)
curl -fsSL https://downloads.slack-edge.com/slack-cli/install.sh | bash
slack version  # 動作確認

# 既に入っている場合は必要に応じて更新確認
slack upgrade
slack version
```

### 2.3 Codex App

1. <https://developers.openai.com/codex/app> から **macOS 用インストーラ** をダウンロード
2. ダウンロードした `.dmg` を開き、Codex.app を `/Applications` にドラッグ
3. Codex.app を起動し、初回のサインインを完了
4. 設定画面で **OpenAI API キー** を入力 (キーは当日配布)

> 既に Codex CLI を使い慣れている方は CLI のままでも OK。プロンプトの渡し方は同じです。

### 2.4 リポジトリ取得

```bash
git clone https://github.com/leaveanest/slack-vibe-coding-handson-public.git
cd slack-vibe-coding-handson-public
cp .env.example .env       # 必要に応じて編集
```

---

## 3. Windows セットアップ

> WSL2 (Ubuntu 22.04+) を強く推奨します。ネイティブ Windows でも可能ですが、シェルスクリプトの差異で詰まりがちです。

### 3.1 WSL2 + Ubuntu

PowerShell（管理者）で:

```powershell
wsl --install -d Ubuntu-22.04
```

再起動後、Ubuntu を起動してユーザー作成。以降のコマンドは **Ubuntu のターミナル** で実行。

### 3.2 Node.js 20+ / Deno / Slack CLI

```bash
# Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# Deno
curl -fsSL https://deno.land/install.sh | sh
echo 'export DENO_INSTALL="$HOME/.deno"' >> ~/.bashrc
echo 'export PATH="$DENO_INSTALL/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Slack CLI (公式インストーラは最新版を既定で入れる)
curl -fsSL https://downloads.slack-edge.com/slack-cli/install.sh | bash
slack version

# 既に入っている場合は必要に応じて更新確認
slack upgrade
slack version
```

### 3.3 Codex App

1. <https://developers.openai.com/codex/app> から **Windows 用インストーラ** をダウンロード
2. ダウンロードしたインストーラ (`.exe` / `.msi`) を実行し、ウィザードに従ってインストール
3. Codex App を起動し、初回のサインインを完了
4. 設定画面で **OpenAI API キー** を入力 (キーは当日配布)

> WSL2 で作業する場合も、Codex App は **Windows 側にインストール** して使ってください。生成したコードは WSL のリポジトリ側にコピー / ペーストする運用で OK です。既に Codex CLI に慣れている方は CLI のままでも構いません。

### 3.4 リポジトリ取得

```bash
git clone https://github.com/leaveanest/slack-vibe-coding-handson-public.git
cd slack-vibe-coding-handson-public
cp .env.example .env
```

---

## 4. Slack アプリ準備（Bolt 版 / Platform 版 共通）

> **方針:** Bolt 版・Platform 版とも `slack` CLI に統一しました。旧版の「Web UI で Manifest 貼り付け → Token を `.env` にコピー」手順は不要です。

### 4.1 `slack` CLI にログイン (初回 1 回だけ)

```bash
slack login           # ブラウザで認証
slack auth list       # ワークスペースが登録されたか確認
```

可能なら **Developer Program の sandbox を使うのを推奨**。会社ワークスペースで `slack install` すると管理者承認待ちになることがあるため。sandbox 発行方法は当日案内します。

### 4.2 パターンディレクトリで App を作成して起動

各パターンディレクトリには `manifest.json` (Bolt) または `manifest.ts` (Platform) が置いてあり、`slack` CLI がそれを読んで App を作成します。

```bash
# 例: Bolt の要約パターン
cd bolt/pattern-a-summarize
slack install         # manifest.json を Slack 側に登録 (App が作られる)
slack run             # Socket Mode で起動 (xoxb / xapp は CLI が自動で注入)
```

```bash
# 例: Platform の日報パターン
cd platform/pattern-d-daily-report
slack run             # 初回は manifest.ts を読んで自動で App 作成
slack deploy          # WFB に出す案 (pattern-k) のみ deploy が必須
```

### 4.3 `.env` に書くもの

`slack run` が `SLACK_BOT_TOKEN` (`xoxb`) と `SLACK_APP_TOKEN` (`xapp`) を **自動で環境変数に注入** するので、`.env` には **`OPENAI_API_KEY` だけ書けば OK**。

```env
OPENAI_API_KEY=sk-...
# OPENAI_MODEL=gpt-4o-mini  # 任意 (デフォルト gpt-4o-mini)
```

ハンズオン当日の API キーは主催者から配布します。

### 4.4 既存ワークスペース vs sandbox

| | 既存ワークスペース | sandbox (推奨) |
|---|---|---|
| `slack install` | 管理者承認が必要なことあり | 即時 OK |
| Bot の動作確認 | チームメンバーに見える (邪魔) | 自分しかいない (邪魔しない) |
| 同僚に見せる | できる | できない |

迷ったら sandbox。「同僚に見せたい」場合のみ既存ワークスペース。

---

## 6. Codex App セットアップ

インストール手順は OS ごとに §2.3 (Mac) / §3.3 (Windows) を参照してください。共通のポイントは以下:

- 起動後、設定画面で **OpenAI API キー** を入力 (キーは当日配布)
- Codex App でリポジトリのフォルダ (例: `bolt/pattern-a-summarize/`) を開いておくと、`AGENTS.md` などのコンテキストを良い感じに掴んでくれます

> Codex CLI 派の人だけ: シェルに `export OPENAI_API_KEY=sk-...` を書いて `codex` 対話モードでも同じプロンプトが使えます。GUI / CLI のどちらでも本ハンズオンは完走できます。

---

## 7. トラブルシューティング

| 症状 | 対処 |
| --- | --- |
| `slack: command not found` | §2.2 / §3.2 の公式インストーラを再実行、または PATH (`$HOME/.local/bin` など) を確認 |
| Codex App が起動しない | インストーラを再ダウンロードして上書きインストール / OS のアプリ権限設定を確認 (Mac はシステム設定 → プライバシーとセキュリティ) |
| `slack install` で「Approval required」 | 既存ワークスペースの管理者承認待ち。sandbox に切り替えるのが早い (§4.4) |
| `slack run` 起動時 "missing token" | `slack auth list` でログイン状態確認、`slack login` し直す |
| Bolt 側で `SLACK_BOT_TOKEN is not defined` | `npm run dev` で動かしていないか確認。`slack run` 経由なら自動注入される |
| Deno の `slack run` でエラー | `deno upgrade` で最新化 / `deno cache manifest.ts` で依存解決 |
| WSL から Slack に接続できない | WSL の DNS 問題。`/etc/resolv.conf` を `nameserver 8.8.8.8` に |

困ったときは Issue / Discussion or 当日メンターまで。
