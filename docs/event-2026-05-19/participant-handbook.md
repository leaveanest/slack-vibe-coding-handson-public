---
対象: 5/19 Slack Community Tokyo「Vibe Coding で Slack アプリ開発をマスター」参加者
最終更新: 2026-05-18
イベント: 2026-05-19 (火) 10:00–12:00 (2 時間)
位置づけ: **当日マスター資料。これ 1 ファイルだけ開けば完走できる。**
メインメッセージ: **「今なら、Vibe Coding で誰でも簡単に Slack アプリが作れる」**
関連 Linear: SLA-137
---

# 参加者ハンドブック — 5/19 Vibe Coding ハンズオン

> このページをスマホ or サブモニタに開きっぱなしにしておいてください。
> 当日は **これ 1 ファイル** で完走できるよう、必要な情報を全て詰め込んでいます。

## 運営記入欄 (当日朝までに埋まります)

| 項目 | 値 |
|---|---|
| 投影スライド URL | 【ここを埋める】 |
| Google Forms アンケート URL | 【ここを埋める】 |
| Google Forms QR コード | 投影スライド + Google Meet チャット欄に貼ります |
| Google Meet URL | 【ここを埋める】 |
| 主催側ハンズオン用チャット (Google Meet チャット欄) | Google Meet 内のチャット機能を使用します |
| 運営代表者 / 緊急連絡先 | 【ここを埋める】 |

---

## 1. ようこそ / 今日のメッセージ

### 今日伝えたいことは、ひとつだけ

> ### **今なら、Vibe Coding を使えば、誰でも簡単に Slack アプリを作れる**

プログラミング経験ゼロでも構いません。
**「こういうアプリが欲しい」と日本語で書くだけ** で、Codex App がコードを書いてくれます。

### 今日のゴール

> **30 分で動く Slack アプリを、皆さんの手元に 1 個。**

「コードを書ききった」を成功体験にする日ではありません。
「Codex に書いてもらって、自分のチーム流に **プロンプトを 1 行書き換えた**」を成功体験にする日です。

### なぜ「簡単」と言えるか (3 行)

1. Codex App は **日本語のプロンプトからコードを生成** します (英語不要)
2. リポジトリの `AGENTS.md` を Codex が自動で読み、Slack 固有のルール (Socket Mode / SDK バージョン等) を **勝手に守って** くれます
3. なので、参加者は **README をコピペして「これを実装して」と書くだけ**

> 💡 もう 1 回だけ繰り返します。**今なら、Vibe Coding で誰でも簡単に Slack アプリが作れます。**

---

## 2. タイムテーブル (参加者目線)

| 時間 | ブロック | 何をする | 個人のゴール |
|---|---|---|---|
| 10:00–10:10 | ① オープニング | 自己紹介 / メインメッセージ / vibe coding 概論 | 今日の世界観に乗る |
| 10:10–10:25 | ② 環境チェック + API キー受け取り | Codex App 起動 / OpenAI キーを設定画面に貼り付け / Slack workspace 接続確認 | **Codex App 起動 + キー登録完了** |
| 10:25–10:55 | ③ 第 1 ラウンド (30 分) | 採用 4 案 (A / B / D / K) から **1 つ** 選んで完走 | **採用 4 案から 1 つ完走** |
| 10:55–11:25 | ④ 第 2 ラウンド (30 分) | プロンプト書き換え or 別パターン | **プロンプト 1 行書き換えて出力が変わる体験** |
| 11:25–11:40 | ⑤ デモシェア + アンケート | 30 秒シェア + Google Forms 回答 | **Google Forms 回答完了** |
| 11:40–12:00 | ⑥ 締め + 6/8 AWTT 予告 + Q&A | 持ち帰りメッセージ / 自由記述アンケート | **月曜日から自社で何を作るかが言葉になる** |

> 各ブロックの **終了時刻** が大事です。腕時計や投影スライドの時刻表示で確認してください。

---

## 3. 事前準備チェック (来場時に確認)

下記が **全部チェック済み** で当日 10:00 を迎えられるのが理想です。
事前メール (5/18 夜配信) でも案内した内容のおさらいです。

### 3.1 ハード / アカウント

- [ ] **ノート PC** (電源アダプタ込み、充電 100% 推奨)
- [ ] **テザリングできるスマホ** (会場 Wi-Fi が詰まった時の保険)
- [ ] **GitHub アカウント** (既存のもので OK)

### 3.2 ソフトウェア (`SETUP.md` 参照)

- [ ] **Codex App** がインストール済み — <https://developers.openai.com/codex/app>
- [ ] **Node.js 20+** が動く — `node -v`
- [ ] **Deno 1.40+** が動く — `deno --version`
- [ ] **`slack` CLI** が動く — `slack --version`
- [ ] **`slack login` 完了済み** — `slack auth list` でワークスペースが見える

> Mac/Windows 別のセットアップ手順は [`SETUP.md`](../../SETUP.md) §2 (Mac) / §3 (Windows) に詳細あり。

### 3.3 Slack workspace (3 オプション)

ハンズオンでは **Slack アプリをインストールできる権限を持った workspace が 1 つ** 必要です。下から **当てはまる一番上のオプション** を選んでください。

#### オプション 1 (推奨): 自社 Slack で **アプリインストール権限** を持っている

- そのまま自社 workspace を使えます
- 自社に **dev / 検証 workspace** があれば本番より優先 (承認フローが軽い)
- 後述の `slack login` でその workspace を選択して終わり

#### オプション 2: 自分が **オーナー権限を持つ** Slack workspace がある

- 個人で作った workspace、コミュニティ workspace など
- そのまま使えます。`slack login` で選択

#### オプション 3 (当日でも 5 分で作成可): **Slack Developer Program のサンドボックス**

上記いずれも当日使えない場合、**Slack Developer Program のサンドボックス workspace を新規発行** できます。**5 分で完了**。詳細手順は §3.3.1 を参照。

- [ ] **上記 3 オプションのいずれかで workspace を確保している** (チェック必須)

#### 3.3.1 サンドボックス workspace 作成手順 (オプション 3 の詳細)

> **強く推奨: 5/18 夜のうちに作成** しておくと当日朝の混乱を回避できます。
> 当日朝でも 5 分で発行可能。発行待ち時間中に Codex App でのコード生成は並行で進められるので、時間はムダになりません。

1. ブラウザで <https://api.slack.com/developer-program> にアクセス
2. ページ上部の **「Join the program」** (または「Get Started」相当) ボタンをクリック
3. Slack アカウントでサインイン (既存の **個人 / 仕事用 Slack アカウントのどちらでも OK**)
   - Slack アカウント自体を持っていない場合は、その場で無料作成できます
4. **プロファイル情報** を最小限入力
   - 氏名 / 所属 / 開発目的のいずれかが聞かれます (5/19 のハンズオン参加でも問題ありません)
5. 登録完了後、ダッシュボードの **「Create a Sandbox」** (相当ボタン) をクリック
   - **Workspace name** と **Workspace URL** (サブドメイン) を入力
   - 例: `vibe-coding-handson-yourname` のような名前にすると区別しやすい
6. 数分以内に **「Open Workspace」** リンクが表示され、新しい workspace にアクセス可能になる
   - 自分が **Owner** として参加した状態の workspace ができあがります
7. ターミナルで `slack login` を実行
   - ブラウザが開き、認証コード入力後に **workspace 一覧** が表示されます
   - **作成した sandbox を選択** して接続完了
   - 確認: `slack auth list` で sandbox の workspace 名が表示されれば OK

> 💡 sandbox の workspace は **アプリのインストール / 管理者承認 / Workflow Builder の利用** がすべて自由にできるため、ハンズオン用途には最適です。
> 💡 sandbox は **本番 workspace と完全に分離** されているため、自社ポリシーに影響しません。

### 3.4 OpenAI API キー

- [ ] **当日 10:10–10:25 のフェーズで運営から配布** されます (各自で準備する必要はありません)
- [ ] 5 USD 上限・モデル制限・**本日 23:59 で破棄** の使い捨てキー
- [ ] **個人の OpenAI アカウントには紐づきません**。月曜日以降に試したい人は、各自で OpenAI のキーを取得してください
- [ ] 配布されたキーは **2 か所** に貼り付け:
  - 1. Codex App ログイン時 / 設定画面
  - 2. Slack アプリ用 `.env` の `OPENAI_API_KEY` (Codex が自動生成するファイル)

### 3.5 リポジトリ

- [ ] 手元に clone 済み:

  ```bash
  git clone https://github.com/leaveanest/slack-vibe-coding-handson-public.git
  cd slack-vibe-coding-handson-public
  ```

> 当日朝に「準備が間に合っていない」場合は、事前メールに返信するか Google Meet のチャット欄に連絡してください。フォロー枠を用意しています。

---

## 4. Codex App 使い方 3 ステップ

### :one: パターン README をコピーして Codex App に貼り付け

採用 4 案 (A / B / D / K) のうち、第 1 ラウンドで触る 1 つを選び、その `README.md` の **本文をまるごと** Codex App のチャット欄に貼り付けます。

### :two: 「これを実装して」と日本語で書く

貼り付けた README の下に、たった 1 行 (日本語で OK):

```text
これを実装して
```

これだけで Codex App はコードを生成し始めます。

### :three: 出てきたコードを保存 → `slack run` で起動

- Codex App が出力したファイル (`src/index.ts` や `functions/*.ts` 等) を、対応するパターンディレクトリに保存
- ターミナルで:

  ```bash
  cd bolt/pattern-a-summarize  # 自分の選んだパターン
  slack install                  # Bolt 案のみ初回必要
  slack run                      # Socket Mode で起動
  ```

> 💡 **これが今日の最大のコツ**: **コードを最初から自分で書かない**。
> README を Codex App に投げるだけで、Codex が `AGENTS.md` を読んでプロジェクトルールに従ってコードを書いてくれます。
>
> 💡 **詰まったら 5 分で諦めて Google Meet のチャット欄へ**。今日は「自分で頑張る」を成功体験にする日ではありません。「Codex に頑張ってもらう」を成功体験にする日です。

---

## 5. 採用 4 案ダイジェスト

> 第 1 ラウンドで **1 つだけ** 選んで完走を目指します。迷ったら **案 A or 案 B (Bolt)** が入りやすいです。

---

### 5.1 案 A: `/summarize` スレッド要約 (Bolt)

**お題 (3 行)**:
スレッドで `/summarize <thread_ts>` を実行すると、AI がそのスレッドを要約してエフェメラル (実行者だけに見える) で返してくれる Slash Command を作る。

| 項目 | 値 |
|---|---|
| **触る技術** | Slash Command / Socket Mode / OpenAI Chat Completions |
| **想定時間** | 30 分 |
| **ディレクトリ** | [`bolt/pattern-a-summarize/`](../../bolt/pattern-a-summarize/) |
| **詳細 README** | [`bolt/pattern-a-summarize/README.md`](../../bolt/pattern-a-summarize/README.md) |
| **ヒント (詰まったら)** | [`bolt/pattern-a-summarize/HINTS.md`](../../bolt/pattern-a-summarize/HINTS.md) |

**Codex App に渡すプロンプト例 (コピペ可)**:

```text
Slack の /summarize スレッド要約コマンドを実装したいです。
AGENTS.md と README.md を読んで、src/index.ts に実装してください。
スレッドのメッセージを OpenAI に投げて、エフェメラルで返信します。
slack install で App を作って slack run で起動できる構成にしてください。
```

**完成イメージ**:
適当なスレッドの thread_ts をコピーして `/summarize 1715000000.1234` と打つと、**実行者にだけ見える形** でスレッドの要約が返ってくる。

**起動コマンド**:

```bash
cd bolt/pattern-a-summarize
npm install
cp .env.example .env   # OPENAI_API_KEY だけ書く
slack install
slack run
```

**詰まったら**: [`HINTS.md`](../../bolt/pattern-a-summarize/HINTS.md) を Lv1 → Lv2 → Lv3 の順に読む。よくある詰まり: Scope 不足で `missing_scope` / `xoxb-` と `xapp-` の混同 / 3 秒応答漏れ。

---

### 5.2 案 B: 国旗リアクション翻訳 Bot (Bolt)

**お題 (3 行)**:
任意のメッセージに 🇺🇸 / 🇯🇵 / 🇫🇷 / 🇰🇷 / 🇨🇳 のリアクションを付けると、その言語に翻訳してスレッドに返信する Bot を作る。

| 項目 | 値 |
|---|---|
| **触る技術** | Events API (`reaction_added`) / Socket Mode / OpenAI |
| **想定時間** | 30 分 |
| **ディレクトリ** | [`bolt/pattern-b-translate/`](../../bolt/pattern-b-translate/) |
| **詳細 README** | [`bolt/pattern-b-translate/README.md`](../../bolt/pattern-b-translate/README.md) |
| **ヒント (詰まったら)** | [`bolt/pattern-b-translate/HINTS.md`](../../bolt/pattern-b-translate/HINTS.md) |

**Codex App に渡すプロンプト例 (コピペ可)**:

```text
Bolt for TypeScript で reaction_added イベントを受け、
国旗 emoji (us / jp / fr / kr / cn) を言語にマッピングして、
元メッセージを OpenAI で翻訳し chat.postMessage で同スレッドに返信する Bot を作ってください。
Bot 自身のリアクションは無視、同じ国旗が複数付いても最初の 1 つだけ処理。
AGENTS.md / README.md を読んで slack install / slack run で起動できる構成にしてください。
```

**完成イメージ**:
チャンネルの任意のメッセージに 🇺🇸 を付けると、英語訳がスレッドにポストされる。🇯🇵 なら日本語、🇨🇳 なら中国語。

**起動コマンド**:

```bash
cd bolt/pattern-b-translate
npm install
cp .env.example .env
slack install
slack run
```

**詰まったら**: 無限ループに注意 (Bot 自身のリアクションを除外する `event.user === botUserId` の判定が抜けると OpenAI コストが急騰する)。HINTS.md を参照。

---

### 5.3 案 D: 日報フォーム → AI 整形 → 投稿 (Platform)

**お題 (3 行)**:
チャンネルの "日報を書く" リンクをクリックするとフォームが開く。送信すると AI が Slack mrkdwn に整形して指定チャンネルに投稿する Slack Platform アプリ。

| 項目 | 値 |
|---|---|
| **触る技術** | Slack Platform / Deno SDK / Workflow / Custom Function / Link Trigger |
| **想定時間** | 30 分 |
| **ディレクトリ** | [`platform/pattern-d-daily-report/`](../../platform/pattern-d-daily-report/) |
| **詳細 README** | [`platform/pattern-d-daily-report/README.md`](../../platform/pattern-d-daily-report/README.md) |
| **ヒント (詰まったら)** | [`platform/pattern-d-daily-report/HINTS.md`](../../platform/pattern-d-daily-report/HINTS.md) |

**ワークフローの流れ**:

```text
[Link Trigger] → [OpenForm] → [Custom Function: OpenAI 整形] → [SendMessage]
```

**Codex App に渡すプロンプト例 (コピペ可)**:

```text
Slack Platform (Deno SDK 2.x) で日報投稿アプリを作ってください。
- Link Trigger を貼ったチャンネルから起動
- フォーム: today (必須) / tomorrow (必須) / feeling (任意) / channel (必須)
- OpenForm → Custom Function → SendMessage の 3 ステップワークフロー
- Custom Function は fetch で OpenAI Chat Completions を呼んで Slack mrkdwn 形式に整形して返す
- manifest の outgoingDomains に "api.openai.com" を入れる
AGENTS.md と README.md を読んでファイル構成も合わせてください。
```

**完成イメージ**:
チャンネルに貼った "日報を書く" ボタンをクリック → フォームに入力 → 送信すると、`:memo: <@USER> さんの日報` で始まる整った日報がチャンネルに投稿される。

**起動コマンド**:

```bash
cd platform/pattern-d-daily-report
cp .env.example .env             # OPENAI_API_KEY を書く
slack run                          # 別ターミナルで起動したまま
slack trigger create --trigger-def triggers/link_trigger.ts   # 別ターミナルで Link Trigger 発行
```

**詰まったら**: `manifest.ts` の `outgoingDomains` 抜けで OpenAI 呼び出しが失敗するのが頻出。HINTS.md の該当セクション参照。

---

### 5.4 案 K: Workflow Builder カスタムステップ (Platform)

> ⚠️ **案 K は元々 40 分案。30 分完走はやや背伸びの設計です。**
> **完走を優先したい方は 案 A / 案 B / 案 D を選んでください。**
> 「時間内に動けばラッキー、最悪は最後に運営側の完成版で動かす」前提のチャレンジ枠として挑戦したい方向け。

**お題 (3 行)**:
Workflow Builder (Slack 標準のノーコード UI) から呼び出せる **「AI で整形」カスタムステップ** を自作する。`slack deploy` すると、非エンジニアの同僚が WFB から自由にワークフローに組み込める。

| 項目 | 値 |
|---|---|
| **触る技術** | Slack Platform / Custom Step (Connector Function) / WFB 公開 / OpenAI |
| **想定時間** | **40 分目安** (チャレンジ枠) |
| **ディレクトリ** | [`platform/pattern-k-custom-step/`](../../platform/pattern-k-custom-step/) |
| **詳細 README** | [`platform/pattern-k-custom-step/README.md`](../../platform/pattern-k-custom-step/README.md) |
| **ヒント (詰まったら)** | [`platform/pattern-k-custom-step/HINTS.md`](../../platform/pattern-k-custom-step/HINTS.md) |

**Codex App に渡すプロンプト例 (コピペ可)**:

```text
Slack Automations (Deno SDK) で Workflow Builder 用のカスタムステップを作ってください。
- ステップ名: "AI で整形"
- Input: text (string, 必須) / format_style (enum: formal / casual / bullet / summary, 必須)
- Output: formatted_text (string)
- 内部処理: OpenAI Chat Completions を format_style 別の system prompt で呼ぶ
- slack deploy 後に WFB の Custom タブから見えるようにする
AGENTS.md / README.md を読んで manifest.ts と functions/ai_format_step.ts を実装してください。
```

**完成イメージ**:
Slack の Workflow Builder で `+ ステップを追加` → `Custom` タブを開くと、自作の **「AI で整形」** が出現。クリックして組み込めば、コードを触らない人もワークフローで AI を呼べる。

**起動コマンド**:

```bash
cd platform/pattern-k-custom-step
deno task check
slack deploy                                # ★ 案 K だけ slack run ではなく slack deploy が必須
slack env add OPENAI_API_KEY sk-xxxx
# あとは Slack の Workflow Builder 画面から組み込む
```

**詰まったら**: WFB に出てこない場合は **`slack run` ではなく `slack deploy` を打ったか** を確認。Custom Step は deploy 済みのものしか WFB には現れません。

---

## 6. Slack CLI コマンド早見

| コマンド | 用途 | 主に使う案 |
|---|---|---|
| `slack login` | 初回ログイン (ブラウザ認証、一度だけ) | 全案 |
| `slack auth list` | 接続中の workspace を確認 | 全案 |
| `slack install` | manifest を Slack 側に登録 (App 作成) | 案 A / 案 B (Bolt) |
| `slack run` | Socket Mode で起動 (Bot/App Token を自動注入、ホットリロード) | 案 A / 案 B / 案 D |
| `slack deploy` | Slack ホスティング側に公開 (Workflow Builder から見える状態にする) | **案 K のみ必須** |
| `slack env add KEY value` | デプロイ後の環境変数を Slack 側に登録 | 案 K (deploy 後) |
| `slack trigger create --trigger-def triggers/link_trigger.ts` | Link Trigger を発行 (フォームを開く URL を作る) | 案 D |

> 💡 `slack run` 中は `xoxb-` (Bot Token) と `xapp-` (App-Level Token) が **自動で環境変数に注入** されます。`.env` には **`OPENAI_API_KEY` だけ** 書けば OK。

---

## 7. 連絡 / スタンプ凡例

### 連絡手段

参加者間の連絡や運営への質問は、**Google Meet のチャット欄** で行います。

> ⚠️ **皆さんの workspace は皆さんのものです。** 主催側から皆さんの workspace に強制 join することはありません。

各自の Slack workspace 内で困った場合は、**メンターに直接** (Google Meet チャット or 物理巡回) で声をかけてください。

### 合言葉 (Google Meet チャット欄で使用)

| キーワード | 意味 |
|---|---|
| `READY` | アプリ起動できた |
| `WAIT` | Codex がコードを書いてくれている最中 (← 待ち中の人が一番多いのが普通) |
| `DONE` | 動いた / プロンプト書き換え完了 |
| `SOS` | 詰まった → メンター呼び |
| `Q` | 共有したい発見・質問がある |

> 💡 第 1 ラウンド 23 分時点で運営から Google Meet チャット欄に「いまどの状態?」の呼びかけがあります。
> **`WAIT` (Codex 待ち) が一番多いのが普通** なので、焦らずに。

---

## 8. アンケート (進行 ⑤ で実施)

### 配布タイミング

- **進行時刻 93 分頃 (11:33 目安)** に運営が QR コード + URL を共有します
- 投影スライドと **Google Meet のチャット欄** の両方に出ます

### URL / QR

| 項目 | 値 |
|---|---|
| アンケート URL (Google Forms) | 【ここを埋める】 |
| QR コード | 投影スライド + Google Meet チャット欄に貼ります |
| 所要時間 | **匿名・3 分** で終わる設計 |

### 聞いていること

- このパターン、**月曜日から自社で使いたい** ですか? (5 段階)
- プロンプトを書き換えて **自社流にカスタムしたい** ですか? (5 段階)
- **30 分で完走** できましたか? (3 択)
- このパターンの **デモ映え** はどうでしたか? (5 段階)
- (自由記述) 月曜日から自社で何を作ってみたいか / 改善希望

### 聞いていないこと

- ❌ Slack AI (スラボ) との **機能比較**
- ❌ 「機能として優れているか」
- ❌ 「実装は綺麗でしたか」

> 💡 今日の評価軸は **「カスタムしたくなったか」**。機能比較ではありません。

---

## 9. トラブルシューティング (よくある詰まり)

事前に頭に入れておくと当日サクッと自己解決できます。困ったらまずここを見て、それでもダメなら Google Meet チャット欄に「SOS」でメンター呼び。

### 9.1 Codex App が起動しない

→ インストーラを再ダウンロードして上書きインストール / OS のアプリ権限設定を確認 (Mac はシステム設定 → プライバシーとセキュリティ)
→ それでもダメなら、当日朝の Google Meet チャット欄での運営アナウンスで **ブラウザ版 Codex (<https://codex.openai.com>)** が代替として案内されるかもしれません

### 9.2 API キーが通らない

→ コピペし直し (前後の空白に注意)
→ 通らない場合は Google Meet チャット欄に「SOS」でメンターに連絡 → **予備キーを即発行** します (25 本中 5 本確保済み)

### 9.3 `slack login` が会社環境で詰まる

→ 会社 / 会場 Wi-Fi の認証プロキシが原因のことが多い
→ **スマホのテザリングに切り替えて** やり直す
→ `slack login` は一度通れば次回以降は不要

### 9.4 `slack: command not found`

→ SETUP.md §2.2 (Mac) / §3.2 (Windows) のインストール手順をもう一度
→ Mac: `brew install slackapi/slack/slack` の再実行 or PATH 確認
→ シェルを再起動 (新しいターミナルを開く)

### 9.5 `slack install` で「Approval required」

→ 自社の本番 workspace の管理者承認待ちになっている
→ **sandbox workspace に切り替える** のが一番早い (§3.3.1 の Slack Developer Program 手順を参照 / 5 分で発行 / 切り替え後は `slack login` で sandbox を選択し直す)

### 9.6 Bot がメッセージに反応しない

→ `slack run` のログを確認 (`⚡️ ... is running` が出ているか)
→ Bot を対象チャンネルに `/invite @your-bot` で招待したか
→ Scope 追加後は **再インストール (`slack install`)** が必要

### 9.7 OpenAI 応答が文字化け / 返ってこない

→ モデル名は **デフォルトのまま** に (運営が許可モデルを設定済)
→ プロンプトに極端に長いスレッド全文を入れていないか (トークン超過)
→ 切り分け: ターミナルで以下を打って API キー単体が生きているか確認

```bash
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"hello"}]}'
```

> 💡 `model` は `.env` または Codex 生成コード側でデフォルトが設定されています。手動指定不要。

### 9.8 案 K で WFB に Custom Step が出てこない

→ `slack run` ではなく **`slack deploy`** を打ったか確認
→ deploy 後に `slack env add OPENAI_API_KEY ...` で環境変数も登録したか
→ WFB の「Custom」タブを再読込

---

## 10. 締め: 月曜日から始める Vibe Coding

### 改めて、今日のメインメッセージ

> ### **今なら、Vibe Coding で誰でも簡単に Slack アプリが作れる**

今日 2 時間で実証していただいたのは、まさにこれです。
プログラミング経験ゼロの方でも、Codex App に日本語でお願いするだけで、30 分で動くアプリが手元に出来上がる。

### 月曜日から、自社で動かすには?

1. **リポジトリを社内に持ち帰り**:

   ```bash
   git clone https://github.com/leaveanest/slack-vibe-coding-handson-public.git
   ```

2. **社内 Slack workspace で App をインストール**:

   ```bash
   cd bolt/pattern-a-summarize  # 例
   slack install
   slack run
   ```

3. **OpenAI API キーを社内環境に登録** (個人 or 法人のキーを `.env` の `OPENAI_API_KEY` に)

これだけで、今日触ったアプリがそのままあなたのチームで動きます。

### プロンプトを 1 行書き換えるだけで、別の業務に転用できる

今日触ったコードの `system prompt` の部分を **1 行書き換える** だけで、用途は無限に広がります。

| 元のお題 | プロンプト 1 行書き換え例 |
|---|---|
| スレッド要約 | 「うちのチームの **週次定例の議事録テンプレ** に整形して」 |
| 日報整形 | 「日報を **ポジティブ表現** で書き換えて」 |
| 翻訳 | 「**社内用語集** に従ってカスタマー対応文に翻訳して」 |
| WFB カスタムステップ | 「**お客様への案内文** に整形して」 |

> **これが今日の最大の持ち帰り** です。コードが動いた瞬間ではなく、「プロンプトを変えたら **うちのチーム流** の出力になった」瞬間に、「あ、これ月曜日から使える」となります。

### 持ち帰りメッセージ (2 つだけ)

1. **今なら、Vibe Coding で誰でも簡単に Slack アプリが作れる** — 皆さんは今日それを実証しました
2. **月曜日から自社業務に持ち込める** — Codex App + OpenAI API キーがあれば、今日とまったく同じことが社内でできます

皆さんのチームの **「ちょっと面倒な毎週の作業」** を 1 つ思い出して、月曜日に Codex App に投げてみてください。30 分で動く何かが出来上がります。

---

## 付録 A. 関連リンク

| 用途 | URL |
|---|---|
| **リポジトリ** | <https://github.com/leaveanest/slack-vibe-coding-handson-public> |
| **Codex App** | <https://developers.openai.com/codex/app> |
| **Slack CLI** | <https://api.slack.com/automation/cli> |
| **環境構築ガイド (Mac/Win)** | [`SETUP.md`](../../SETUP.md) |
| **アンケート (Google Forms)** | 【ここを埋める】 |
| **6/8 AWTT のご案内** | 今日のフィードバックを反映した **ブラッシュアップ版** を 40 分でお届けします。今日参加された方は **メンター枠** で来てもらえると嬉しいです |
| **お問い合わせ / フィードバック** | Google Meet チャット欄または事前メールへの返信 |

---

## 付録 B. パターン 12 案の全体マップ

採用 4 案 (★) と、当日は使わないが参考実装として同じリポジトリに含まれている 8 案の一覧。
**当日体験後、自社に持ち帰って試したい方向け** です。

### Bolt 版 (Bolt for TypeScript / Socket Mode)

| ID | パターン | 概要 |
|---|---|---|
| **★ A** | [pattern-a-summarize](../../bolt/pattern-a-summarize/) | `/summarize` でスレッドを要約する Slash Command |
| **★ B** | [pattern-b-translate](../../bolt/pattern-b-translate/) | 国旗リアクションでメッセージを翻訳 |
| C | [pattern-c-mention](../../bolt/pattern-c-mention/) | `@mention` で AI が応答するボット |
| G | [pattern-g-file-analysis](../../bolt/pattern-g-file-analysis/) | アップロードされたファイルを解析 |
| H | [pattern-h-app-home](../../bolt/pattern-h-app-home/) | App Home タブで個人ダッシュボード |
| I | [pattern-i-keyword-watcher](../../bolt/pattern-i-keyword-watcher/) | 特定キーワードを監視してアラート |

### Platform 版 (Deno / Slack Automations)

| ID | パターン | 概要 |
|---|---|---|
| **★ D** | [pattern-d-daily-report](../../platform/pattern-d-daily-report/) | 日報をフォームで提出 → AI 整形 → チャンネル投稿 |
| E | [pattern-e-canvas-minutes](../../platform/pattern-e-canvas-minutes/) | 議事録を Canvas に自動生成 |
| F | [pattern-f-approval](../../platform/pattern-f-approval/) | 承認ワークフロー |
| J | [pattern-j-weekly-report](../../platform/pattern-j-weekly-report/) | 週次レポートを定期生成 |
| **★ K** | [pattern-k-custom-step](../../platform/pattern-k-custom-step/) | Workflow Builder 用のカスタムステップ |
| L | [pattern-l-external-auth](../../platform/pattern-l-external-auth/) | 外部 API への OAuth 連携 |

> 各パターンのディレクトリには `README.md` (お題) と `HINTS.md` (段階的ヒント) が揃っています。
> 採用 4 案と同じ要領で、**Codex App に README を投げる** だけで作れます。

---

> **最後にもう一度。**
>
> **今なら、Vibe Coding で誰でも簡単に Slack アプリが作れる。**
>
> 今日触ったコードは持ち帰り OK。**月曜日からあなたのチームで使ってください。**
