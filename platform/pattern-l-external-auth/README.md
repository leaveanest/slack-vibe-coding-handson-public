# pattern-l: External Auth で GitHub PR を要約

> **🚨 事前準備が必要です** — このパターンを動かす前に、**GitHub OAuth アプリを作成し、Client ID / Secret を `slack external-auth add-secret` で Slack に登録する**必要があります。手順は [`docs/github-oauth-setup.md`](./docs/github-oauth-setup.md) を必ず先に読んでください。準備せずに `slack run` しても External Auth の接続フローで詰まります。

## お題

Link Trigger で起動するワークフローを作って、

1. フォームを開いて GitHub PR の URL と投稿先チャンネルを入力させる
2. **External Auth (GitHub OAuth)** で取得した End-User のアクセストークンを使って GitHub REST API から PR 情報を取る
3. PR の title / body / コメント数 / changed files を OpenAI に渡して要約
4. 指定されたチャンネルに要約を投稿

を作る。pattern-l は教材中いちばん難易度が高い「外部サービス認証」を扱うパターン。

## 触れる技術 / 学習ポイント

- **External Auth (OAuth2) の Provider 定義** — `DefineOAuth2Provider` と `Schema.providers.oauth2.CUSTOM`
- **`slack external-auth` CLI の使い方** — `add-secret` (client_secret 登録) / `add` (End-User 接続)
- **`Schema.slack.types.oauth2` 型の input** — Workflow / Trigger / Function でトークン ID を引き回す
- **`client.apps.auth.external.get`** — トークン ID から実トークンへ引き換える
- **Custom Function 内での外部 API 呼び出し** — `outgoingDomains` の許可とトークン込みの fetch
- **Slack Function chain** — OpenForm → Custom Function → SendMessage

## 想定時間

- セットアップ込みで **40〜60 分**
- GitHub OAuth アプリの登録に 5〜10 分追加でかかる前提

## ファイル構成

```text
pattern-l-external-auth/
├── README.md
├── HINTS.md                          # 詰まりポイント 5 つの段階的ヒント
├── manifest.ts                       # external_auth_providers と outgoingDomains を登録
├── slack.json
├── deno.json
├── .env.example
├── functions/
│   └── summarize_github_pr.ts        # External Auth → GitHub API → OpenAI の本体
├── workflows/
│   └── pr_summary_workflow.ts        # OpenForm → summarize → SendMessage
├── triggers/
│   └── link_trigger.ts               # Link Trigger 定義
├── providers/
│   └── github_provider.ts            # GitHub OAuth2 Provider 定義
└── docs/
    └── github-oauth-setup.md         # GitHub OAuth アプリ作成手順
```

## 動かし方の流れ (概略)

```bash
# 1. 依存解決と型チェック (実機なしで進められる)
deno task check

# 2. ローカル開発開始 (Socket Mode)
slack run

# 3. (別ターミナル) GitHub Client Secret を Slack に登録
slack external-auth add-secret --provider github --secret <YOUR_CLIENT_SECRET>

# 4. End-User として GitHub に接続 (ブラウザが開く)
slack external-auth add
# → "github" を選択して接続

# 5. Link Trigger を作成 → Slack に貼って起動
slack trigger create --trigger-def triggers/link_trigger.ts
```

詳細な手順や詰まったときの対処は [`HINTS.md`](./HINTS.md) を参照。GitHub OAuth アプリの作り方は [`docs/github-oauth-setup.md`](./docs/github-oauth-setup.md)。

## 注意事項

- Slack Automations を使うので **有料プラン (Pro 以上)** が必要
- GitHub OAuth アプリの callback URL は固定で `https://oauth2.slack.com/external/auth/callback`
- `public_repo` スコープなので **public な PR のみ**要約可能 (private repo を扱う場合は scope を `repo` に変更)
- `.env` ファイルは絶対にコミットしない (`.env.example` のみリポジトリに含める)
