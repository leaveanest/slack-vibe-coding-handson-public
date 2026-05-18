# HINTS — Pattern K (Custom Step for Workflow Builder)

詰まったら上から順番に読むと解決しやすい構成にしている。コピペで答えにたどり着けるよう、コマンド・コード片をそのまま載せている。

---

## Hint 1. デプロイしたのに WFB のステップ一覧に「AI で整形」が出てこない

WFB がカスタムステップを検出するのは **`slack deploy` が成功したアプリのみ**。さらにブラウザのキャッシュが頑固で、Slack Web/Desktop を **完全リロード** しないと反映されないことが多い。

確認手順:

1. `slack deploy` のログに `Successfully deployed` が出ているか
2. `slack function list` で `ai_format_step` が表示されるか

   ```bash
   slack function list
   ```

3. Slack Desktop アプリの場合は `Cmd + R` (macOS) / `Ctrl + R` (Win) で完全リロード
   - ブラウザ版なら **強制リロード** (`Cmd + Shift + R` / `Ctrl + Shift + R`)
4. それでも出ない場合は WFB を一度閉じて開き直す
5. ローカル実行 (`slack run`) では **WFB から見えない**。必ず `slack deploy` を使う

---

## Hint 2. Input / Output schema の型がうまく書けない

`DefineFunction` の `input_parameters.properties` 配下では Slack SDK の `Schema.types.*` を使う。文字列なら `Schema.types.string`。必須項目は **`required` 配列**で列挙する (`properties` 側に `required: true` ではなく、外側の `required: [...]`)。

```ts
input_parameters: {
  properties: {
    text: { type: Schema.types.string, title: "整形するテキスト" },
    format_style: { type: Schema.types.string, title: "整形スタイル" },
  },
  required: ["text", "format_style"],   // <- ここで必須を指定
},
```

`output_parameters` も同じ構造。`required` を入れ忘れると WFB 側で「次ステップに変数として渡せない」事故が起きる。

---

## Hint 3. `format_style` を WFB 上でドロップダウンにしたい

`Schema.types.string` の定義に **`enum`** を付け足すだけで OK。WFB がこれを認識して自動的にドロップダウン UI に切り替えてくれる。

```ts
format_style: {
  type: Schema.types.string,
  title: "整形スタイル",
  description: "出力スタイルを選択してください",
  enum: ["formal", "casual", "bullet", "summary"],
},
```

注意:

- `enum` の値は **WFB に文字列としてそのまま表示** される (現状ラベルと値を別にする仕組みは無い)
- 日本語にしたい場合は `enum: ["フォーマル", "カジュアル", ...]` にして関数本体の `SYSTEM_PROMPTS` のキーも合わせる

---

## Hint 4. WFB の UI に「変なフィールド名」が出る (例: `format_style` が英語のまま)

WFB は **入力フィールドのラベル** に以下を順番に使う:

1. `input_parameters.properties.<field>.title` (推奨)
2. なければ `description`
3. それも無ければ プロパティ名 (英字キーがそのまま出る)

`title` と `description` を **必ず両方** 入れるとユーザビリティが激変する。

```ts
text: {
  type: Schema.types.string,
  title: "整形するテキスト",                              // <- WFB ラベル
  description: "整形したいテキスト本文。変数も差し込み可", // <- WFB の補助テキスト
},
```

関数自体 (ステップ選択画面のカード) も同様に `DefineFunction` の **`title` / `description`** をしっかり書く。

```ts
export const AIFormatStepFunction = DefineFunction({
  callback_id: "ai_format_step",
  title: "AI で整形",                                                       // <- カード見出し
  description: "入力テキストを選んだスタイルで AI が整形します",            // <- カード説明
  ...
});
```

---

## Hint 5. `slack run` と `slack deploy` の使い分けが分からない

| コマンド | 動作 | WFB から見える? | 用途 |
| --- | --- | --- | --- |
| `slack run` | ローカル PC で Socket Mode 実行 | **見えない** | 自前 Workflow / Trigger のローカルデバッグ |
| `slack deploy` | Slack 側のクラウドにホスト | **見える** | WFB 公開 / 本番運用 |

Pattern K は **WFB から呼ばれる前提** なので必ず `slack deploy` を使う。`slack run` だと「ローカルが起動している間だけ動くアプリ」になり、WFB はそれを検出できない仕様。

デプロイ後の更新フロー:

```bash
# コードを書き換えたら
slack deploy        # 再デプロイ
# ↑ 既存ワークフローはそのまま残り、Custom Step の挙動だけ更新される
```

環境変数を変えたい場合:

```bash
slack env list
slack env add OPENAI_API_KEY sk-new-key   # 上書き
slack env remove OPENAI_MODEL             # 削除
```

`slack env` 系は **deploy 済みアプリにだけ効く** ことに注意 (ローカル `slack run` は `.env` ファイルを見る)。
