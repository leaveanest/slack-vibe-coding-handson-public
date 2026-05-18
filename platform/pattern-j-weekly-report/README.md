# pattern-j: Scheduled Trigger 週報自動生成

毎週金曜 18:00 (Asia/Tokyo) に、対象チャンネルの過去 1 週間の履歴を AI 要約し、指定チャンネルへ自動投稿する Workflow を作ります。
**Scheduled Trigger** を主役にしたパターンで、「サーバーレスで定期実行する」体験ができます。

## お題

> 「毎週金曜の終業前に、`#dev` チャンネルでその週に何が起きたかを `#weekly-report` にまとめて投稿してほしい」

これを **Slack Platform (Deno SDK) の Scheduled Trigger だけ** で実現します。
24 時間稼働するサーバーも、cron job も、別ホスティングも要りません。manifest と trigger を `slack deploy` するだけです。

## 触れる技術

| トピック | 内容 |
|---|---|
| Scheduled Trigger | `frequency.type = "weekly"` / `on_days: ["Friday"]` / `timezone: "Asia/Tokyo"` |
| Custom Function | `conversations.history` を `oldest` 指定でページネーション取得 |
| Slack Web API | `oldest` は **Unix epoch 秒** (ミリ秒ではない) |
| 外部 API 連携 | `outgoingDomains` に `api.openai.com` を追加して LLM で要約 |
| Built-in Step | `Schema.slack.functions.SendMessage` で投稿先チャンネルに送信 |
| Bot 投稿フィルタ | `bot_id` / `subtype` / `user` を見て人間メッセージのみ抽出 |

## ファイル構成

```text
pattern-j-weekly-report/
├── README.md                       # このファイル
├── HINTS.md                        # 詰まりポイントと動作確認の小技
├── manifest.ts                     # outgoingDomains: api.openai.com
├── slack.json
├── deno.json
├── .env.example                    # OPENAI_API_KEY / OPENAI_MODEL
├── functions/
│   └── summarize_week.ts           # conversations.history + OpenAI
├── workflows/
│   └── weekly_report_workflow.ts   # summarize → SendMessage
├── triggers/
│   └── scheduled_trigger.ts        # 毎週金曜 18:00 Asia/Tokyo
└── docs/
    └── bolt-comparison.md          # Bolt 版で組むとどうなるか
```

## 想定時間

30 〜 35 分

| Step | 内容 | 目安 |
|---|---|---|
| 1 | `slack create` してこのテンプレを適用 | 3 分 |
| 2 | `triggers/scheduled_trigger.ts` のチャンネル ID を自分のに置き換え | 2 分 |
| 3 | `.env.example` を見て `slack env add OPENAI_API_KEY ...` | 3 分 |
| 4 | `slack deploy` | 3 分 |
| 5 | `slack trigger create --trigger-def triggers/scheduled_trigger.ts` | 2 分 |
| 6 | (動作確認用に) 一時的に「毎分」へ書き換えてリトリガー → ログ確認 → 戻す | 15 分 |
| 7 | bolt-comparison.md を読む | 5 分 |

## クイックスタート

```bash
# 1) 依存解決 + 型チェック
deno task check

# 2) ローカル実行 (Socket Mode)
#    → manifest と function を develop ワークスペースに反映
slack run

# 3) 別タブで OpenAI のキーを登録 (deploy 後でも OK)
slack env add OPENAI_API_KEY sk-xxxxx
slack env add OPENAI_MODEL gpt-4o-mini

# 4) 本番デプロイ
slack deploy

# 5) Scheduled Trigger を Slack 側に登録
slack trigger create --trigger-def triggers/scheduled_trigger.ts
```

Scheduled Trigger は一度作ると Slack 側で永続的にスケジュールされ続けます。
削除したい時は:

```bash
slack trigger list
slack trigger delete --trigger-id Ft0XXXXXXXXX
```

## 仕様メモ

- **Scheduled Trigger 発火タイミング**: `schedule.frequency.type = "weekly"` + `on_days: ["Friday"]` + `repeats_every: 1` + `timezone: "Asia/Tokyo"` で `start_time` から毎週同じ曜日・同じ時刻に発火します。`start_time` には次の金曜 18:00 JST に相当する UTC を入れます (実装上は trigger ファイル内で計算)。
- **対象期間**: 関数内で `now - 7 * 86400` を Unix epoch 秒で計算し、`oldest` に渡します。
- **Bot 除外**: `bot_id` 付き、`subtype` 付き、`user` 無しのメッセージは弾きます (HINTS.md #5)。
- **メタ情報**: 要約冒頭に「期間: X 〜 Y, 件数: N」を出すよう LLM プロンプトで強制しています。

## 関連ドキュメント

- Slack: [Creating scheduled triggers](https://docs.slack.dev/tools/deno-slack-sdk/guides/creating-scheduled-triggers)
- Slack: [conversations.history](https://docs.slack.dev/reference/methods/conversations.history)
- 本リポジトリ内: `docs/bolt-comparison.md` (Bolt で同じことをするとどうなるか)

つまずいたら → `HINTS.md`。
