# HINTS.md — pattern-d-daily-report 詰まりポイント集

このパターンで Codex / 自作中によく詰まる 5 点を、**段階的ヒント** にしてあります。
答えをすぐ見るのではなく、ヒント 1 → 2 → 3 と順に試してみてください。

---

## 詰まりポイント 1: `manifest.ts` の構造がよくわからない

> "Manifest に何を書けば動くのか" がわからない / 関数や WF を増やしたら動かなくなった。

<details>
<summary>ヒント 1 (考え方)</summary>

Manifest は **アプリの目次** です。新しく作った Custom Function / Workflow / Trigger は、
全部この目次に登録しないと Slack 側に存在しない扱いになります。
"作っただけ" では動きません。
</details>

<details>
<summary>ヒント 2 (チェックリスト)</summary>

- [ ] `functions: [...]` に作った Custom Function を入れた？
- [ ] `workflows: [...]` に作った Workflow を入れた？
- [ ] 外部 API (OpenAI 等) を叩くなら `outgoingDomains: ["api.openai.com"]` を入れた？
- [ ] `botScopes` に `chat:write` と `chat:write.public` が入っている？

</details>

<details>
<summary>ヒント 3 (正解の形)</summary>

```ts
import { Manifest } from "deno-slack-sdk/mod.ts";
import { FormatDailyReportFunction } from "./functions/format_daily_report.ts";
import DailyReportWorkflow from "./workflows/daily_report_workflow.ts";

export default Manifest({
  name: "pattern-d-daily-report",
  description: "...",
  icon: "assets/default_new_app_icon.png",
  functions: [FormatDailyReportFunction],   // ← 関数を登録
  workflows: [DailyReportWorkflow],          // ← WF を登録
  outgoingDomains: ["api.openai.com"],       // ← 外部 fetch 先
  botScopes: ["commands", "chat:write", "chat:write.public"],
});
```

</details>

---

## 詰まりポイント 2: Custom Function の入出力 (`DefineFunction`) を間違えている

> `inputs.today` を参照したいのに型エラー / ワークフローから値が渡ってこない。

<details>
<summary>ヒント 1 (考え方)</summary>

`DefineFunction` の `input_parameters` と `output_parameters` は **TS の型** と **ランタイムバリデータ** の両方を兼ねています。
ここに宣言したものだけが、ワークフロー側から渡せて、ハンドラ内で `inputs.xxx` として使えます。
</details>

<details>
<summary>ヒント 2 (典型ミス)</summary>

- `required` の配列に必須キーを入れ忘れている → ワークフロー側で渡し漏れても気づかない
- `properties` の中で `type: Schema.types.string` を文字列リテラル `"string"` で書いてしまっている
- 出力の `properties` を空にして実装側で `outputs: { ... }` を返している → TS エラー

</details>

<details>
<summary>ヒント 3 (正解の形)</summary>

```ts
export const FormatDailyReportFunction = DefineFunction({
  callback_id: "format_daily_report",
  title: "Format Daily Report",
  source_file: "functions/format_daily_report.ts",   // ← パス必須
  input_parameters: {
    properties: {
      today:     { type: Schema.types.string },
      tomorrow:  { type: Schema.types.string },
      feeling:   { type: Schema.types.string },
      author_id: { type: Schema.slack.types.user_id },
    },
    required: ["today", "tomorrow", "author_id"],     // ← feeling は任意
  },
  output_parameters: {
    properties: {
      formatted_message: { type: Schema.types.string },
    },
    required: ["formatted_message"],
  },
});
```

</details>

---

## 詰まりポイント 3: OpenAI に `fetch` したら "Network request not allowed" で落ちる

> Custom Function から `fetch("https://api.openai.com/...")` を叩くと、ローカルでは動くのに `slack deploy` 後だけ失敗する。

<details>
<summary>ヒント 1 (考え方)</summary>

Slack Cloud のサンドボックスは **manifest で許可していないドメインへの外部通信をブロック** します。
"manifest にホワイトリストする" 必要があります。
</details>

<details>
<summary>ヒント 2 (どこに書く？)</summary>

`manifest.ts` の `outgoingDomains` 配列に **ホスト名だけ** (`https://` やパスは不要) を入れます。
スキームを入れたり、`/v1/chat/completions` まで書くと無効です。
</details>

<details>
<summary>ヒント 3 (正解の形)</summary>

```ts
export default Manifest({
  // ...
  outgoingDomains: ["api.openai.com"],   // ← これ
});
```

それでも落ちる場合は `slack deploy` をもう一度走らせて、最新マニフェストを反映してください。
ローカル `slack run` 中なら再起動 (Ctrl+C → `slack run`) で取り込まれます。
</details>

---

## 詰まりポイント 4: `OPENAI_API_KEY` が読めない / undefined になる

> ハンドラ内で `Deno.env.get("OPENAI_API_KEY")` したら undefined。あるいは `slack deploy` 後だけ undefined。

<details>
<summary>ヒント 1 (考え方)</summary>

Slack Platform の Custom Function では、`Deno.env.get()` ではなく **SlackFunction のハンドラ引数 `env`** から
取るのが公式お作法です。ローカル (`slack run`) では `.env` が、本番 (`slack deploy`) では `slack env add` で
登録した値が、それぞれ `env` 経由で渡ってきます。
</details>

<details>
<summary>ヒント 2 (チェックリスト)</summary>

- [ ] ローカル: プロジェクト直下に `.env` がある？ (`.env.example` をコピーして編集した？)
- [ ] 本番: `slack env add OPENAI_API_KEY sk-...` を実行した？
- [ ] ハンドラの引数で `env` を分割代入している？

</details>

<details>
<summary>ヒント 3 (正解の形)</summary>

```ts
export default SlackFunction(
  FormatDailyReportFunction,
  async ({ inputs, env }) => {              // ← env を受け取る
    const apiKey = env["OPENAI_API_KEY"];   // ← Deno.env.get() ではない
    if (!apiKey) return { error: "OPENAI_API_KEY 未設定" };
    // ...
  },
);
```

</details>

---

## 詰まりポイント 5: Link Trigger を登録しても、貼っても、ボタンが出ない

> `slack trigger create` 自体は成功しているのに、Slack に URL を貼っても Link Trigger のボタンが出てこない / クリックしてもフォームが開かない。

<details>
<summary>ヒント 1 (考え方)</summary>

Link Trigger は "ワークスペース固有の URL" です。次のいずれかが原因のことが多いです:

1. `slack run` が止まっている (= バックエンドが動いていない)
2. 別ワークスペースで作った URL を貼っている
3. ワークフロー側で `interactivity` を受け取っていなくて、フォームが開けない

</details>

<details>
<summary>ヒント 2 (チェックリスト)</summary>

- [ ] `slack run` が起動したまま？ (Ctrl+C で落ちていない？)
- [ ] `slack auth list` で確認したワークスペースと、URL を貼ったワークスペースは同じ？
- [ ] `triggers/link_trigger.ts` で `interactivity: { value: TriggerContextData.Shortcut.interactivity }` を渡している？
- [ ] ワークフロー側の `input_parameters` に `interactivity: { type: Schema.slack.types.interactivity }` がある？
- [ ] manifest にそのワークフローを `workflows: [...]` で登録した？

</details>

<details>
<summary>ヒント 3 (正解の形)</summary>

```ts
// triggers/link_trigger.ts
const trigger: Trigger<typeof DailyReportWorkflow.definition> = {
  type: TriggerTypes.Shortcut,                              // Link Trigger は Shortcut 型扱い
  name: "日報を書く",
  workflow: `#/workflows/${DailyReportWorkflow.definition.callback_id}`,
  inputs: {
    interactivity: { value: TriggerContextData.Shortcut.interactivity }, // ← 必須
    channel:       { value: TriggerContextData.Shortcut.channel_id },
    user:          { value: TriggerContextData.Shortcut.user_id },
  },
};
```

それでもダメなら、トリガーを作り直すと直ることが多いです:

```bash
slack trigger list                # ID を確認
slack trigger delete --trigger-id <ID>
slack trigger create --trigger-def triggers/link_trigger.ts
```

</details>

---

## それでも解決しない場合

1. ターミナルの `slack run` ログをよく見る (赤いエラーは大体 manifest / outgoingDomains / scope の問題)
2. `deno check manifest.ts` で型エラーを潰す
3. ワークショップの SETUP.md / メンターに相談
