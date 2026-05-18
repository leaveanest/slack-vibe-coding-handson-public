# pattern-f-approval — 申請承認ワークフロー (Datastore 活用)

> Slack Platform (Deno SDK) で、Link Trigger + フォーム + Datastore + Block Actions を組み合わせた、軽量な「申請 → 承認/却下 → 結果通知」ワークフローを実装するパターン。

## 触れる技術

- Link Trigger (`TriggerTypes.Shortcut`)
- 組み込み関数 `Schema.slack.functions.OpenForm` でのフォーム入力
- カスタム関数 (`DefineFunction` + `SlackFunction`)
- **Datastore** (`DefineDatastore` / `client.apps.datastore.put` / `get` / `update`)
- **Block Actions** (`addBlockActionsHandler`) によるボタン押下処理
- `crypto.randomUUID()` (Deno 標準) での ID 採番
- 1 アプリに 2 つの Workflow を共存させる構成

## 想定時間

40 分前後 (Codex CLI で生成 → 動作確認 → ヒントを見ながら手直し)

## お題

リンクをクリックすると申請フォームが開き、入力した内容が Datastore に保存され、指定した承認者へ Block Actions ボタン (承認 / 却下) 付き DM が届く。ボタンが押されると Datastore のステータスが更新され、申請者へ DM で結果が通知される — そんな**軽量な申請承認 Bot** を作ってください。

### ユーザー体験

1. 申請者がチャンネルに貼られた Link Trigger のリンクをクリック
2. モーダルで「申請内容」と「承認者」を入力して送信
3. 承認者の DM に「承認する / 却下する」ボタン付きのメッセージが届く
4. 承認者がボタンを押すと、DM が「✅ 承認しました」or「❌ 却下しました」に書き換わる
5. 同時に申請者へ「あなたの申請は承認/却下されました」と DM が届く

## アーキテクチャ

```text
Link Trigger (Shortcut)
        │
        ▼
┌─────────────────────────────────────────────┐
│ Workflow ① submit_request_workflow         │
│                                             │
│   step 1: OpenForm (content + approver)     │
│   step 2: save_request                      │
│             ├ crypto.randomUUID()           │
│             └ apps.datastore.put            │
│   step 3: send_approver_dm                  │
│             ├ chat.postMessage (with btns)  │
│             └ completed:false  ⇣            │
│                                             │
│   ┌─────────────────────────────────────┐   │
│   │ addBlockActionsHandler              │   │
│   │   approve_button / reject_button    │   │
│   │   → applyDecision()                 │   │
│   │       ├ apps.datastore.update       │   │
│   │       └ chat.postMessage (申請者)   │   │
│   │   → functions.completeSuccess       │   │
│   └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘

Workflow ② handle_decision_workflow
   step 1: handle_decision (= 上と同じ applyDecision)
        └ 別ルートから決定を反映したい時用 (参考実装)
```

### Datastore スキーマ (`requests_datastore`)

| 属性 | 型 | 説明 |
| --- | --- | --- |
| `id`         | `Schema.types.string`         | UUID (primary key) |
| `requester`  | `Schema.slack.types.user_id`  | 申請者の User ID |
| `approver`   | `Schema.slack.types.user_id`  | 承認者の User ID |
| `content`    | `Schema.types.string`         | 申請内容 (本文) |
| `status`     | `Schema.types.string`         | `pending` / `approved` / `rejected` |
| `created_at` | `Schema.types.number`         | 作成時刻 (Unix epoch ms) |

## ファイル構成

```text
pattern-f-approval/
├── README.md                   ← このファイル
├── HINTS.md                    ← 段階的ヒント (詰まったら)
├── manifest.ts                 ← functions / workflows / datastores を全部登録
├── slack.json                  ← Slack CLI の hooks 設定
├── deno.json                   ← Deno のインポートマップ + tasks
├── .env.example                ← 環境変数のテンプレート
├── functions/
│   ├── save_request.ts         ← UUID 採番 + Datastore put
│   ├── send_approver_dm.ts     ← 承認者 DM 送信 + addBlockActionsHandler
│   └── handle_decision.ts      ← Datastore update + 申請者通知 (applyDecision helper も)
├── workflows/
│   ├── submit_request_workflow.ts
│   └── handle_decision_workflow.ts
├── triggers/
│   ├── link_trigger.ts
│   └── block_action_trigger.ts ← 参考実装 (本筋では使わない)
└── datastores/
    └── requests_datastore.ts
```

## セットアップ

### 1. 必要なツール

- [Deno](https://deno.com/) 1.40+
- [Slack CLI](https://docs.slack.dev/tools/slack-cli/) (`slack` コマンド)
- 開発用 Slack ワークスペース (有料プラン / Next-Gen platform が有効)

### 2. 環境変数 (任意)

```bash
cp .env.example .env
# LOG_LEVEL=info くらいしか書くことがない
```

### 3. 型チェック

```bash
deno task check
```

### 4. ローカル起動

```bash
slack run
```

初回は

- App をどのワークスペースにインストールするか
- どの Slack アカウントで動かすか
- Link Trigger を作成するか (y で OK)

を聞かれる。Link Trigger を作成すると `slack://...` 形式の URL が表示されるので、ワークスペースのチャンネルに貼っておく。

### 5. デプロイ (本番化)

```bash
slack deploy

# Link Trigger を本番アプリに対しても作成
slack trigger create --trigger-def triggers/link_trigger.ts
```

## 動作確認

1. Link Trigger の URL をクリック → モーダルが開く
2. 「申請内容」「承認者」を入力して `申請する` をクリック
3. 承認者の Slack の DM (App 名から) に通知が届く
4. `承認する` または `却下する` ボタンを押す
5. DM のメッセージが書き換わり、同時に申請者にも DM 通知が届く
6. Datastore に保存されたレコードを確認:

    ```bash
    slack datastore query '{"datastore": "requests_datastore"}'
    ```

## Datastore とワークスペースのスコープ

Slack Platform の Datastore は **SaaS スコープ**で提供されている。

- `slack deploy` 後は **インストール先のワークスペース (team) ごとにストレージが完全分離**される。
- 例: ワークスペース A にインストールしたアプリの Datastore は、同じアプリがワークスペース B にもインストールされていても **見えない / 書けない**。
- そのため、ハンズオンで `slack run` (ローカル) と `slack deploy` (本番) を切り替えると、別のストア領域を見ていることになる点に注意。
- 1 つの workspace 内では `apps.datastore.query` で横串検索できるが、項目数が増えるとページネーション (`cursor`) が必要になる。

## つまずきポイント

詰まったら [HINTS.md](./HINTS.md) を読むこと。5 段階のヒントを用意してある。
