---
対象: 参加者全員 (印刷して各机に配布 + 投影スライドの 1 枚として使用)
最終更新: 2026-05-18
イベント: 2026-05-19 Slack Community Tokyo (2 時間)
印刷スペック: A4 1 枚 / モノクロ可 / 当日配布 25 部
メインメッセージ: **「今なら、Vibe Coding で誰でも簡単に Slack アプリが作れる」**
関連: 採用 4 案 README
---

# Vibe Coding ハンズオン 早見表 — 5/19

> **今日のゴール: 30 分で動く Slack アプリを 1 個。**
> **今なら、Vibe Coding で誰でも簡単に Slack アプリが作れる。**

---

## :computer: Codex App 使い方 — 3 ステップ

1. **採用 4 案のどれかの `README.md` を Codex App にコピペ**
2. **「これを実装して」と日本語で書く** (英語不要)
3. **出てきたコードを保存** → ターミナルで `slack run`

> 💡 メンターのスタンス: **「コードを書かない」。Codex に投げる文を一緒に作る。**

---

## :wrench: `slack` CLI コマンド早見

| コマンド | 役割 |
|---|---|
| `slack login` | 初回のみ。ブラウザで認証 |
| `slack auth list` | 接続済みワークスペース確認 |
| `slack install` | manifest を Slack に登録 (App 作成) |
| `slack run` | Socket Mode で起動 (`xoxb` / `xapp` 自動注入) |
| `slack deploy` | **案 K のみ** Workflow Builder 用に本番デプロイ |

---

## :sparkles: 採用 4 案 (今日触れるパターン)

| ID | 案 | 種別 | パス |
|---|---|---|---|
| **A** | `/summarize` スレッド要約 | Bolt | `bolt/pattern-a-summarize/README.md` |
| **B** | 国旗リアクションで翻訳 | Bolt | `bolt/pattern-b-translate/README.md` |
| **D** | 日報フォーム → AI 整形 → 投稿 | Platform | `platform/pattern-d-daily-report/README.md` |
| **K** | Workflow Builder カスタムステップ | Platform | `platform/pattern-k-custom-step/README.md` |

> 迷ったら **案 A か案 B (Bolt)** が入りやすい。詰まったらメンターを呼ぶ。

---

## :art: Google Meet チャットの合言葉

> 5/19 当日は Google Meet のチャット欄でキーワードを投稿して状況共有。メンターがすぐ反応します。

| キーワード | 意味 |
|---|---|
| `READY` | アプリ起動できた |
| `WAIT` | Codex がコード書いてる最中 |
| `DONE` | 動いた / プロンプト書き換え完了 |
| `SOS` | 詰まった → メンター呼ぶ |
| `Q` | 共有したい発見・質問がある |

---

## :sos: 困った時の URL / リンク

| 用途 | リンク |
|---|---|
| アンケート (Google Forms) | QR コード → スライド or 受付机 |
| GitHub リポジトリ | `github.com/leaveanest/slack-vibe-coding-handson-public` |
| 各パターンのヒント | 各パターンディレクトリの `HINTS.md` (段階的ヒント、最後の手段) |
| 当日連絡 | Google Meet チャット欄 (`SOS` で呼ぶ / `Q` で質問) |
| Codex App | `developers.openai.com/codex/app` |

---

## :warning: 配布キーの注意

- **キーは今日限り** / **2026-05-20 18:00 に全て失効**
- **第三者に共有しない** (録画 / 画面共有時は映さない)
- 1 キー = **5 USD 上限** / モデルはデフォルトのまま (運営側で許可モデル設定済)
- 通らない時は運営に声をかけて予備キー即発行

---

> **今日触ったコードは持ち帰り OK。月曜日からあなたのチームで使ってください。**
> **6/8 AWTT 本番にメンター枠で参加歓迎。詳細は締めで案内。**
