# HINTS - pattern-l 詰まりポイント集

External Auth は Slack Platform 機能のなかでも最も「初見殺し」が多いところ。詰まったらここを順に確認する。

---

## 1. External Auth Provider が登録できない / Schema が厳しい

**症状**:

- `slack deploy` や `slack run` で `manifest validation error` が出る
- `DefineOAuth2Provider` のオプションが赤線になる / 型エラー

**チェックポイント**:

- `provider_type` は必ず `Schema.providers.oauth2.CUSTOM` を指定 (Google / Salesforce などビルトインを使わない場合)
- `options.scope` は **配列** で渡す (`["public_repo"]`)。`scopes` ではなく `scope` なので注意
- `identity_config` は省略不可。GitHub なら `url: "https://api.github.com/user"` と `account_identifier: "$.login"` を指定する
- `client_id` は **string 型**。`Deno.env.get("GITHUB_CLIENT_ID")!` のように non-null アサーションが必要 (空文字を許容しないなら `?? ""` でもよい)
- `manifest.ts` 側で `externalAuthProviders: [GitHubProvider]` の **配列に入れて登録** することを忘れない

**最終確認**:

```bash
deno task check
# → エラーなしになれば OK
```

---

## 2. `slack external-auth add` で GitHub に接続できない / callback URL の指定

**症状**:

- ブラウザが開いて GitHub に飛ぶが、`redirect_uri_mismatch` で失敗
- 「The redirect_uri MUST match the registered callback URL for this application」

**原因と対処**:

- GitHub 側 OAuth App の **Authorization callback URL** は固定で以下にする必要がある:

  ```text
  https://oauth2.slack.com/external/auth/callback
  ```

- 自分のアプリの URL ではなく **Slack 公式の固定 URL** であることが最大の落とし穴
- 一度 OAuth App を登録した後でも、Settings > Developer settings > OAuth Apps の編集画面でいつでも変更可能

**コマンドの順序**:

1. **先に** `slack external-auth add-secret --provider github --secret <CLIENT_SECRET>` で client_secret を Slack に保存
2. **その後** `slack external-auth add` を実行して provider を選択
3. ブラウザが開くので GitHub にログインして Authorize
4. Slack に「Connected」と出ればOK

**メモ**: `add-secret` を忘れて先に `add` をやると「No secret found for provider」エラーが出る。

---

## 3. Trigger inputs で `Schema.slack.types.oauth2` のトークン ID をどう渡すか

**症状**:

- Trigger 作成 (`slack trigger create`) で「`github_access_token_id` is required」と言われる
- Trigger の inputs に値を書こうとして「何を書けばいいか分からない」

**ポイント**:

- `Schema.slack.types.oauth2` はトークンの値そのものではなく **トークンの ID** を扱う型
- End-User パターン (`credential_source: "END_USER"` 相当) の場合は、トリガー起動時に **Slack の UI でユーザーが選択** する仕組みなので、コード上は `customizable: true` を指定してプレースホルダにしておく
- Developer Token を使う場合は workflow step 側で `credential_source: "DEVELOPER"` を明示する書き方もある (今回はユーザーごとに違うトークンを使う End-User パターン)

**実装例 (本パターンの `triggers/link_trigger.ts`)**:

```typescript
inputs: {
  interactivity: { value: TriggerContextData.Shortcut.interactivity },
  github_access_token_id: { customizable: true },
}
```

**CLI でのトリガー作成**:

```bash
slack trigger create --trigger-def triggers/link_trigger.ts
```

作成後、生成されたショートカット URL を Slack のチャンネルに貼ると、初回起動時に「どの GitHub アカウントを使うか」を聞かれる。

---

## 4. `client.apps.auth.external.get` の戻り値の扱い

**症状**:

- `tokenResp.external_token` を使おうとしたら型エラー / undefined
- API は成功しているのに `token.ok` だけ見て安心していたら token が取れていない

**正しい使い方**:

```typescript
const tokenResp = await client.apps.auth.external.get({
  external_token_id: inputs.github_access_token_id,
});
if (!tokenResp.ok || !tokenResp.external_token) {
  return { error: `failed: ${tokenResp.error ?? "unknown"}` };
}
const token = tokenResp.external_token as string;
```

- `tokenResp.ok` が true でも `external_token` が undefined になるケースがある (接続が切れている等)
- 戻り値の型が緩いので **`as string` で narrow** するか、明示的に `if (!tokenResp.external_token) return ...` する
- `force_refresh: true` を渡すと強制的にリフレッシュトークンで再取得できる (期限切れデバッグ時に有用)

---

## 5. GitHub PR URL のパースとエラーハンドリング

**症状**:

- ユーザーが PR URL を貼り間違えた / `https://github.com/foo/bar/issues/1` のように pull じゃない URL を入れる
- パース後に owner / repo が空文字で GitHub API が `404`

**対処パターン**:

```typescript
function parsePRUrl(url: string) {
  try {
    const u = new URL(url);
    if (u.hostname !== "github.com") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 4) return null;
    const [owner, repo, pullKeyword, numberStr] = parts;
    if (pullKeyword !== "pull") return null;
    const number = Number.parseInt(numberStr, 10);
    if (Number.isNaN(number)) return null;
    return { owner, repo, number };
  } catch {
    return null;
  }
}
```

**チェックリスト**:

- `new URL(url)` を try/catch で囲む (不正な URL で例外を投げる)
- `hostname === "github.com"` を確認 (`gitlab.com` を弾く)
- `parts[2] === "pull"` を確認 (`issues` / `commits` / `tree` を弾く)
- 数字パースは `Number.parseInt` + `Number.isNaN` チェック (`parseInt("foo", 10)` は NaN を返す)
- パース失敗時は **Function の戻り値で `error` プロパティ** を返す (例外を throw すると workflow が落ちて UX が悪い)

**GitHub API のエラー対処**:

- `404`: PR が存在しない / 認可スコープ不足 (private repo を `public_repo` スコープで叩こうとした)
- `403`: rate limit (認証ありなら 5000 req/h)
- `422`: バリデーションエラー

GitHub のレスポンス本文には Markdown で詳細が入っているので、`response.text()` を `error` に含めるとデバッグが楽になる。
