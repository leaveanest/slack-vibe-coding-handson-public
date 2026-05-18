# GitHub OAuth アプリ作成手順

pattern-l を動かすために必要な「事前準備」の手順。所要時間 5〜10 分。

## ゴール

- GitHub に OAuth App を登録する
- Client ID と Client Secret を取得する
- それを `.env` に書く / `slack external-auth add-secret` で Slack に登録する

## 手順

### 1. GitHub Developer Settings を開く

1. GitHub にログイン
2. 右上のアバター > **Settings** をクリック
3. 左サイドバー最下部の **Developer settings** をクリック
4. 左サイドバーの **OAuth Apps** を選択
5. **New OAuth App** ボタンをクリック

直リンクで開きたければ: <https://github.com/settings/applications/new>

### 2. OAuth App の登録フォームを埋める

入力欄は以下の通り:

| フィールド | 入力値 |
| --- | --- |
| **Application name** | `slack-pattern-l-external-auth` (任意の名前でOK) |
| **Homepage URL** | `https://slack.com` (任意。あとから変更可) |
| **Application description** | `Slack Automation pattern-l - GitHub PR summarizer` (省略可) |
| **Authorization callback URL** | `https://oauth2.slack.com/external/auth/callback` ← **これは固定値。間違えると後で詰まる** |

> **重要**: Authorization callback URL は **必ず** `https://oauth2.slack.com/external/auth/callback` を指定すること。自分のアプリの URL を入れるのではなく、Slack 公式の OAuth コールバック URL を使う。これが External Auth の最大の落とし穴。

Enable Device Flow のチェックは **不要** (オフのまま)。

**Register application** ボタンを押すと OAuth App が作成される。

### 3. Client ID をコピー

作成された OAuth App の詳細ページが開く。

- **Client ID** が表示されているのでコピー (例: `Iv1.a1b2c3d4e5f6g7h8`)
- これを `.env` の `GITHUB_CLIENT_ID` に貼り付ける

### 4. Client Secret を生成

同じページの下のほうに **Client secrets** セクションがある。

1. **Generate a new client secret** ボタンをクリック (二要素認証が要求されるかも)
2. 生成された Client Secret が **一度だけ表示される** ので必ずコピーする
   - 例: `abcdef0123456789abcdef0123456789abcdef01`
   - **このページを離れると二度と見られないので注意**。失くしたら再生成する
3. これを `.env` の `GITHUB_CLIENT_SECRET` に貼り付ける

### 5. Slack 側に Client Secret を登録

```bash
cd platform/pattern-l-external-auth
slack external-auth add-secret --provider github --secret <ここに先ほどコピーしたシークレット>
```

成功すると `External authentication secret added!` と表示される。

> **メモ**: `provider github` の `github` は `providers/github_provider.ts` の `provider_key` と一致している必要がある。

### 6. End-User として接続

```bash
slack external-auth add
```

- プロンプトで `github` を選ぶ
- ブラウザが開いて GitHub の Authorize 画面が表示される
- **Authorize** をクリックすると Slack に戻ってくる
- ターミナルに `Successfully linked to github` のようなメッセージが出れば完了

これで Slack 側に End-User のトークンが保存され、`client.apps.auth.external.get` で取得できるようになる。

## トラブルシューティング

### `redirect_uri_mismatch` が出る

- callback URL が違う。GitHub の OAuth App 編集画面で `https://oauth2.slack.com/external/auth/callback` に修正

### `add-secret` で「Provider not found」

- `manifest.ts` に `externalAuthProviders: [GitHubProvider]` が登録されていない
- `slack deploy` (もしくは `slack run` で manifest 同期) を一度実行する必要がある場合がある

### トークンが期限切れになった

- GitHub の OAuth App のトークンは長寿命なので普通は期限切れにならない
- 万一切れた場合は `slack external-auth remove` で削除してから `slack external-auth add` で再接続する
- Function 内で強制リフレッシュしたい場合は `client.apps.auth.external.get({ external_token_id, force_refresh: true })`

### Client Secret を失くした

- GitHub の OAuth App 編集画面で **Generate a new client secret** を押せば新しいシークレットが作れる (古いシークレットは無効化可能)
- 新しいシークレットを取得したら必ず `slack external-auth add-secret` で再登録する
