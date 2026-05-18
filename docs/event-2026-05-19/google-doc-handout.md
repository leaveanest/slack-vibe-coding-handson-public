---
対象: 5/19 Slack Community Tokyo 参加者 (Google Doc 化して配布する原稿)
最終更新: 2026-05-18
イベント: 2026-05-19 (火) 10:00–12:00 / Slack Community Tokyo
形式: **Google Doc にコピペして URL 配布する想定の md 原稿**
メインメッセージ: **「今なら、Vibe Coding で誰でも簡単に Slack アプリが作れる」**
関連: [`participant-handbook.md`](./participant-handbook.md) (詳細版) / [`cheat-sheet.md`](./cheat-sheet.md) (印刷用 A4 1 枚)
関連 Linear: SLA-141
---

# Vibe Coding ハンズオン — 当日配布資料 (4 コース版)

> **このページの使い方:** Google Doc 化して URL を Google Meet のチャット欄またはメールで配布します。
> 当日は **このページの上から順に読んで進めれば 30 分で動く Slack アプリが手元に残ります**。

---

## 0. 当日リンク早見 (運営記入欄)

| 項目 | 値 |
|---|---|
| GitHub リポジトリ (今日のソース) | <https://github.com/leaveanest/slack-vibe-coding-handson-public> |
| ZIP ダウンロード (リポジトリ全体) | <https://github.com/leaveanest/slack-vibe-coding-handson-public/archive/refs/heads/main.zip> |
| Codex App (要 OpenAI ログイン) | <https://developers.openai.com/codex/app> |
| Slack CLI ドキュメント | <https://docs.slack.dev/tools/slack-cli/> |
| アンケート (Google Forms) | 【当日朝、運営が記入】 |
| Google Meet URL | **【当日朝、運営が記入】** |

---

## 1. 今日のゴール (1 分で読む)

> **30 分で動く Slack アプリを、皆さんの手元に 1 個。**

- コードはほぼ書きません。書くのは **「日本語のプロンプト」** だけ
- Codex App がコードを生成 → ターミナルで `slack run` → 自分の Slack で動く
- 完成後、**プロンプトを 1 行書き換えて出力が変わる** ところまで体験すれば成功

---

## 2. 事前準備チェック (10:00 まで)

開始までに **全てチェック済み** であることを確認してください。詳細手順は [`SETUP.md`](https://github.com/leaveanest/slack-vibe-coding-handson-public/blob/main/SETUP.md) 参照。

- [ ] **Codex App** がインストール済み (Mac: `.dmg` / Windows: `.exe`)
- [ ] **Node.js 20+** が動く — ターミナルで `node -v`
- [ ] **Deno 1.40+** が動く — `deno --version`
- [ ] **`slack` CLI** が動く — `slack --version`
- [ ] **`slack login` 完了** — `slack auth list` で workspace が見える
- [ ] **持参 Slack workspace** がある (sandbox 推奨、自社 dev 環境でも可)

---

## 3. リポジトリ ZIP ダウンロード手順 (Git 不要)

> 当日は **`git clone` を使わず、ZIP をそのまま展開する手順** を推奨します。
> ターミナル操作が少ない方が Codex App での vibe coding に集中できます。

### 3.1 ブラウザから ZIP をダウンロード

1. ブラウザで <https://github.com/leaveanest/slack-vibe-coding-handson-public> を開く
2. 緑色の **`<> Code`** ボタンをクリック
3. メニューの **`Download ZIP`** をクリック
   - **直リンク (1 クリックで保存):** <https://github.com/leaveanest/slack-vibe-coding-handson-public/archive/refs/heads/main.zip>
4. ダウンロードフォルダに `slack-vibe-coding-handson-public-main.zip` が保存される

### 3.2 ZIP を展開

| OS | 手順 |
|---|---|
| Mac | `Finder` でダウンロードフォルダを開き ZIP をダブルクリック → 同じ階層に `slack-vibe-coding-handson-public-main` フォルダが出来る |
| Windows | エクスプローラーで右クリック → **すべて展開** → 展開先を指定 (デフォルトのままで OK) |

### 3.3 フォルダの中身を確認

展開したフォルダの中に以下があるはずです:

```text
slack-vibe-coding-handson-public-main/
├── README.md
├── SETUP.md             ← セットアップ詳細
├── AGENTS.md            ← Codex App が自動で読むプロジェクトルール
├── CLAUDE.md
├── bolt/                ← Bolt 案 (案 A / B など)
│   ├── pattern-a-summarize/
│   └── pattern-b-translate/
├── platform/            ← Platform 案 (案 D / K など)
│   ├── pattern-d-daily-report/
│   └── pattern-k-custom-step/
└── docs/                ← 運営資料 (参加者用は handbook と当ファイル)
```

### 3.4 ターミナルでフォルダに移動

```bash
# Mac / Linux
cd ~/Downloads/slack-vibe-coding-handson-public-main

# Windows (PowerShell)
cd $HOME\Downloads\slack-vibe-coding-handson-public-main
```

> 💡 **チームに持ち帰る人** は `git clone https://github.com/leaveanest/slack-vibe-coding-handson-public.git` の方が後で `git pull` できて便利です。当日のスピード重視なら ZIP で OK。

---

## 4. Codex App 起動 + API キー登録

### 4.1 Codex App を開く

1. インストール済みの **Codex App** を起動
2. OpenAI アカウントでログイン (社内 SSO / 個人アカウントどちらでも OK)
3. メイン画面 (チャット風 UI) が出ることを確認

### 4.2 OpenAI API キーを登録

> **当日 10:10–10:25 のフェーズで運営から個別 DM (1Password 共有 URL) で配布** されます。
> 配布元は **Slack DM またはメール返信**。Google Meet のチャットには **絶対に貼られません** (公開チャットに API キーが流出するため)。
> **本日 23:59 で破棄される使い捨てキー** です。

1. Codex App の **Settings → API Keys → OpenAI** を開く
2. 配布された `sk-xxxx...` を貼り付け → 保存
3. 続いて、**Slack アプリ用にも `.env` に同じキーを入れます** (各パターンの手順で出てくる)

   ```bash
   # 例: 案 A の場合
   cd bolt/pattern-a-summarize
   cp .env.example .env
   # エディタで .env を開いて OPENAI_API_KEY=sk-xxxx... を貼り付け
   ```

> ⚠️ **キー本体を Google Meet の画面共有 / 録画 / チャット欄に絶対映さないでください。**

---

## 5. 採用 4 コース ── お題 + Codex プロンプト + 完成後の動かし方

> **重要:** 「触れる技術」「想定時間」「ファイル構成」「動作確認チェックリスト」は **各コースの README に全部書いてあります**。
> Codex App には **README の URL を貼って「これを実装して」と書くだけ** で OK。

### 5.1 コース選択ガイド

| 迷ったら | 推奨コース |
|---|---|
| プログラミング初心者 / 最短で動かしたい | **案 A** (Bolt / Slash Command) |
| AI 翻訳系に興味がある | **案 B** (Bolt / リアクション) |
| Slack ワークフロー / フォームを触ったことがある | **案 D** (Platform / Link Trigger) |
| 非エンジニアにも展開したい | **案 K** (Platform / Workflow Builder) |

> **第 1 ラウンド (10:25–10:55) で 1 コース完走 → 第 2 ラウンド (10:55–11:25) で別コース or プロンプト書き換え** が当日の理想ペース。

---

### 5.2 案 A — `/summarize` スレッド要約コマンド (Bolt)

- **入口 UX:** Slash Command (`/summarize <thread_ts>`)
- **想定時間:** 30〜40 分
- **READMEへのリンク:** <https://github.com/leaveanest/slack-vibe-coding-handson-public/blob/main/bolt/pattern-a-summarize/README.md>
- **完成版コード:** <https://github.com/leaveanest/slack-vibe-coding-handson-public/blob/main/bolt/pattern-a-summarize/src/index.ts>
- **詰まったとき (HINTS):** <https://github.com/leaveanest/slack-vibe-coding-handson-public/blob/main/bolt/pattern-a-summarize/HINTS.md>

#### Codex App に投げるプロンプト例

```text
https://github.com/leaveanest/slack-vibe-coding-handson-public/blob/main/bolt/pattern-a-summarize/README.md
の README を読んで、Bolt for TypeScript で /summarize <thread_ts> Slash Command を
実装してください。

要件:
- slack install で App を作って slack run で起動できる構成にする (Socket Mode)
- conversations.replies でスレッドを取得して、OpenAI Chat Completions で要約する
- 結果は chat.postEphemeral で実行者にだけ返す
- Slack の 3 秒応答制約 (ack 先行 + 後追い投稿) を守る
- AGENTS.md のルールに従ってください
```

#### 動かし方 (要約)

```bash
cd bolt/pattern-a-summarize
npm install
cp .env.example .env       # OPENAI_API_KEY を埋める
slack install              # manifest を Slack 側に登録
slack run                  # Socket Mode で起動
```

Slack で `/invite @summarize-bot` してから、スレッドのリンクから `thread_ts` を取り出して:

```text
/summarize 1715000000.1234
```

→ エフェメラルで要約が返れば成功。

#### プロンプト書き換えで遊ぶ

`src/index.ts` の system prompt を **「うちの会議体ルール = 決定事項 / 宿題 / 次回」** のように書き換えると、出力が一気にチーム流に変わります。

---

### 5.3 案 B — 国旗リアクション翻訳 Bot (Bolt)

- **入口 UX:** リアクション (`reaction_added` イベント)
- **想定時間:** 30〜35 分
- **READMEへのリンク:** <https://github.com/leaveanest/slack-vibe-coding-handson-public/blob/main/bolt/pattern-b-translate/README.md>
- **完成版コード:** <https://github.com/leaveanest/slack-vibe-coding-handson-public/blob/main/bolt/pattern-b-translate/src/index.ts>
- **詰まったとき (HINTS):** <https://github.com/leaveanest/slack-vibe-coding-handson-public/blob/main/bolt/pattern-b-translate/HINTS.md>

#### Codex App に投げるプロンプト例

```text
https://github.com/leaveanest/slack-vibe-coding-handson-public/blob/main/bolt/pattern-b-translate/README.md
の README を読んで、Bolt for TypeScript で reaction_added イベントを受ける
翻訳 Bot を実装してください。

要件:
- 国旗 emoji 名 (us, jp, fr, kr, cn) を言語にマッピング
- reactions.get で取った元メッセージを OpenAI で翻訳
- chat.postMessage で同じスレッドに返信
- Bot 自身のリアクションは無視 (無限ループ防止)
- 同じ国旗が複数付いても最初の 1 つだけ処理
- slack install で App を作って slack run で起動できる構成にする
- AGENTS.md のルールに従ってください
```

#### 動かし方 (要約)

```bash
cd bolt/pattern-b-translate
npm install
cp .env.example .env
slack install
slack run
```

`/invite @translate-bot` してから、適当なメッセージに 🇺🇸 を付けると、スレッドに英訳が返ってきます。

#### プロンプト書き換えで遊ぶ

`src/index.ts` の system prompt を **「ビジネス文書調」「カジュアル翻訳」「Z 世代スラング多め」** などに書き換えると、翻訳トーンを一発でチーム流にできます。

---

### 5.4 案 D — 日報フォーム → AI 整形 → 投稿 (Platform / Deno SDK)

- **入口 UX:** Link Trigger → OpenForm
- **想定時間:** 30〜35 分
- **READMEへのリンク:** <https://github.com/leaveanest/slack-vibe-coding-handson-public/blob/main/platform/pattern-d-daily-report/README.md>
- **Custom Function:** <https://github.com/leaveanest/slack-vibe-coding-handson-public/blob/main/platform/pattern-d-daily-report/functions/format_daily_report.ts>
- **Workflow:** <https://github.com/leaveanest/slack-vibe-coding-handson-public/blob/main/platform/pattern-d-daily-report/workflows/daily_report_workflow.ts>
- **詰まったとき (HINTS):** <https://github.com/leaveanest/slack-vibe-coding-handson-public/blob/main/platform/pattern-d-daily-report/HINTS.md>

#### Codex App に投げるプロンプト例

```text
https://github.com/leaveanest/slack-vibe-coding-handson-public/blob/main/platform/pattern-d-daily-report/README.md
の README を読んで、Slack Platform (Deno SDK 2.x) で日報投稿アプリを実装してください。

要件:
- Link Trigger でチャンネルから起動
- フォーム: today (長文必須) / tomorrow (長文必須) / feeling (長文任意) / channel (channel_id 必須)
- OpenForm → Custom Function (OpenAI で Slack mrkdwn に整形) → SendMessage の 3 ステップ Workflow
- slack run でローカル起動、slack trigger create で Link Trigger を登録
- AGENTS.md のルールに従ってください
```

#### 動かし方 (要約)

```bash
cd platform/pattern-d-daily-report
cp .env.example .env       # OPENAI_API_KEY を埋める
slack run                  # 初回は workspace 選択あり
# 別ターミナルで
slack trigger create --trigger-def triggers/link_trigger.ts
# → 発行された URL を Slack のチャンネルに貼る
```

チャンネルに貼った URL が **「日報を書く」ボタン** になります。クリック → フォーム入力 → 整形済み日報がチャンネルに投稿されます。

#### プロンプト書き換えで遊ぶ

`functions/format_daily_report.ts` の system prompt を **「KPT (Keep / Problem / Try) で整形」「議事録風」** などに書き換えると、業務フォーマットを一気にチーム専用にできます。

---

### 5.5 案 K — Workflow Builder 用カスタムステップ (Platform / Deno SDK)

> **このコースだけ `slack deploy` が必須** です (`slack run` では Workflow Builder に表示されません)。

- **入口 UX:** Workflow Builder の **「ステップを追加 → Custom → AI で整形」**
- **想定時間:** 35〜40 分
- **READMEへのリンク:** <https://github.com/leaveanest/slack-vibe-coding-handson-public/blob/main/platform/pattern-k-custom-step/README.md>
- **Custom Step 本体:** <https://github.com/leaveanest/slack-vibe-coding-handson-public/blob/main/platform/pattern-k-custom-step/functions/ai_format_step.ts>
- **非エンジニア向け WFB ガイド:** <https://github.com/leaveanest/slack-vibe-coding-handson-public/blob/main/platform/pattern-k-custom-step/docs/workflow-builder-usage.md>
- **詰まったとき (HINTS):** <https://github.com/leaveanest/slack-vibe-coding-handson-public/blob/main/platform/pattern-k-custom-step/HINTS.md>

#### Codex App に投げるプロンプト例

```text
https://github.com/leaveanest/slack-vibe-coding-handson-public/blob/main/platform/pattern-k-custom-step/README.md
の README を読んで、Slack Workflow Builder から呼べる「AI で整形」カスタムステップを
Slack Platform (Deno SDK 2.x) で実装してください。

要件:
- Input: text (string, 必須) / format_style (enum: formal, casual, bullet, summary, 必須)
- Output: formatted_text (string)
- 内部処理: OpenAI Chat Completions API を format_style ごとの system prompt で呼ぶ
- manifest.ts の functions に AIFormatStepFunction を登録 (workflows は空でよい)
- slack deploy で本番デプロイ → WFB の Custom セクションに出現することを確認
- AGENTS.md のルールに従ってください
```

#### 動かし方 (要約)

```bash
cd platform/pattern-k-custom-step
deno task check
slack deploy                                       # ← run ではなく deploy
slack env add OPENAI_API_KEY sk-xxxxxxxxxxxxxxxx   # 本番側に env を登録
```

その後 Slack で:

1. 左下「その他 (More)」→ **Automations** → **Workflow Builder**
2. **New Workflow** → トリガー (Link trigger 推奨) を選ぶ
3. **+ ステップを追加** → **Custom** タブ → **`AI で整形`** をクリック
4. `整形するテキスト` / `整形スタイル` を埋めて、次のステップ (例: メッセージ送信) に `formatted_text` を差し込む
5. **Publish** → ワークフローを実行

#### プロンプト書き換えで遊ぶ

`functions/ai_format_step.ts` の **`format_style` の enum 値と対応する system prompt** を増やすと、WFB から **チーム独自の整形スタイル** を選べるようになります。「役員報告調」「Slack 砕け話し言葉」など。

---

## 6. 詰まったときの導線 (運営からのお願い)

### 6.1 まず 3 分自分で試す

- 該当パターンの `HINTS.md` を上から順に開く (段階的ヒントになっています)
- Codex App に **エラーメッセージをそのまま貼って「これを直して」** と書く

### 6.2 それでも詰まったら運営を呼ぶ (5 分以上は粘らない)

| 詰まり方 | 呼び方 |
|---|---|
| Codex App が動かない / OpenAI キーがエラー | Google Meet のチャットに「SOS」+ 状況を投稿 |
| `slack install` / `slack run` が通らない | 同上、症状を 1 行添えて投稿 |
| Slack 側の権限エラー (`missing_scope` 等) | `manifest.json` のスコープと照合 → 運営呼ぶ |
| Workflow Builder にカスタムステップが出ない (案 K) | `slack deploy` 済みか確認 → 出てなければ運営呼ぶ |

> 💡 **詰まった = 失敗ではなく、面白い学びの素材** です。むしろ呼んでください。

### 6.3 「自分のチームで使えそう」が見えてきたら

- ⑤ デモシェア (11:25–11:40) で **30 秒** だけ「何を作った / 何に使えそうか」を話してください
- **Google Meet のチャット欄に作ったもの 1 行を投稿** でも OK (顔出し / 声出し不要)
- アンケート (Google Forms) に **「月曜日から自社業務に持ち込みたいパターン」** を書いて完了

---

## 7. 持ち帰りメッセージ (これだけ覚えて帰ってください)

1. **30 分で動く Slack アプリは作れる** — Codex App が書いてくれる
2. **プロンプト次第で用途は無限** — チームのルールを 1 行で反映できる
3. **配布キーは本日 23:59 で破棄** — 月曜以降は個人の OpenAI キーを取得してください
4. **6/8 AWTT 本番では同じ内容を 40 分にギュッと圧縮した「ブラッシュアップ版」** をやります — メンター枠歓迎

---

## 8. 当日触らなかった 8 案 (家で続きを試したい人へ)

リポジトリには採用 4 案以外に **8 案の参考実装** があります。同じく `README.md` を Codex App に貼るだけで動かせます。

| ID | パターン | 種別 |
|---|---|---|
| C | メンション質問 Bot (履歴踏まえる) | Bolt |
| G | ファイル投稿 AI 解析 Bot (Vision) | Bolt |
| H | App Home AI 日報フォーム | Bolt |
| I | キーワード見守り Bot (DM 通知) | Bolt |
| E | スレッドリアクション → Canvas 議事録 | Platform |
| F | 申請承認 Workflow (Datastore) | Platform |
| J | Scheduled Trigger 週報自動生成 | Platform |
| L | External Auth で GitHub PR 要約 | Platform |

各パターンは `bolt/` または `platform/` ディレクトリ配下に同じ構造で配置されています。

---

> **質問・感想は Google Meet のチャット欄まで。**
> **今日触ったコードは持ち帰り OK。月曜日からあなたのチームで使ってください。**
