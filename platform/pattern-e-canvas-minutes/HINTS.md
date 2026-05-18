# HINTS — pattern-e-canvas-minutes

詰まりやすいポイントごとに **段階的ヒント** を用意しました。まずは自力で考え、どうしても進まないときに次のレベルを開いてください。

---

## ヒント 1: Event Trigger で「特定の絵文字」だけに反応させたい

`reaction_added` イベントは絵文字に関係なく全て飛んでくるので、自前で絞る必要があります。

<details><summary>レベル 1: どこで絞る?</summary>

Workflow 側で if 分岐するのではなく、**Trigger 定義の `filter` フィールド** で絞ります。こうすると不要なイベントで Workflow が起動しません。

</details>

<details><summary>レベル 2: filter の書き方</summary>

`filter.version` と `filter.root.statement` をセットで指定します。`statement` の中ではイベントデータを `{{data.xxx}}` で参照できます。

</details>

<details><summary>レベル 3: 完成形</summary>

```ts
event: {
  event_type: TriggerEventTypes.ReactionAdded,
  channel_ids: ["C0123456789"],
  filter: {
    version: 1,
    root: {
      statement: "{{data.reaction}} == memo",   // 「:memo:」のみ
    },
  },
},
```

絵文字名はコロン無し (`memo`)、文字列ではなくベア識別子で書きます。

</details>

---

## ヒント 2: Workflow がデプロイされない / 権限エラーになる

`slack run` 起動時、または Canvas 作成時に `missing_scope` が出るケース。

<details><summary>レベル 1: scope 不足の可能性</summary>

`manifest.ts` の `botScopes` が足りていないかも。 Canvas 作成には専用の scope が必要です。

</details>

<details><summary>レベル 2: 必要な scope 一覧</summary>

- `chat:write` ... メッセージ投稿
- `chat:write.public` ... bot が招待されていない public channel への投稿
- `channels:history` / `groups:history` ... `conversations.replies` でスレッドを読む
- `reactions:read` ... reaction_added イベントを受信
- `canvases:write` ... Canvas を作成・編集する **← 忘れがち**

</details>

<details><summary>レベル 3: 反映方法</summary>

`botScopes` を書き換えたら、`slack run` を **再起動** してください。Hot reload では scope 変更は反映されません。デプロイ済みなら `slack deploy` でアップデートし、`slack install` を求められた場合はアプリの再インストールが必要です。

</details>

---

## ヒント 3: 親メッセージに :memo: しても無反応 / スレッド内に :memo: したら別のスレッドが立つ

スレッドの ts (`thread_ts`) と単なるメッセージ ts (`message_ts`) を取り違えると、変な場所に返信されたりスレッド全体が取れなかったりします。

<details><summary>レベル 1: thread_ts と message_ts の違い</summary>

- 親メッセージ自体には `thread_ts` がありません (= 空文字)。`message_ts` がそのままスレッドの先頭です。
- スレッド内の返信には `thread_ts` = 親の ts、`message_ts` = その返信自身の ts。

`conversations.replies({ ts: ... })` に渡すべきはどちらの場合も **スレッドのルートの ts** = 「`thread_ts` があればそれ、無ければ `message_ts`」。

</details>

<details><summary>レベル 2: Trigger でどう渡す?</summary>

`TriggerContextData.Event.ReactionAdded.message_ts` を `thread_ts` として workflow に渡してしまうのが一番シンプルです。

Slack のイベントペイロード上、親メッセージへのリアクションでは `thread_ts` フィールドが提供されないため、`message_ts` をそのままスレッド ts として扱って問題ありません。スレッド内の返信に :memo: された場合も `message_ts` を使うとそのメッセージ単体だけが対象になりがちですが、本サンプルでは **「リアクションされたメッセージを起点に 1 つ下のスレッドをまとめる」** という割り切りでこの設計を採用しています。

</details>

<details><summary>レベル 3: もっと厳密にやるなら</summary>

Custom Function 内で先に `conversations.history` などを使って親メッセージかどうか調べ、`thread_ts || message_ts` を計算してから `conversations.replies` を呼ぶ実装にすると、スレッド内の任意の返信に :memo: されても常にルートから取れます。今回のハンズオンスコープでは省略しています。

</details>

---

## ヒント 4: Canvas は作成できたが、中身が空 / 表示が崩れる

`canvases.create` のレスポンスは `ok: true` なのに、Canvas を開くと空っぽ、または書式が変。

<details><summary>レベル 1: ペイロード形状を確認</summary>

`canvases.create` は `title` と `document_content` を取ります。`document_content` は **単なる string ではなく**、`{ type, markdown }` のオブジェクトです。

</details>

<details><summary>レベル 2: 正しい呼び方</summary>

```ts
await client.canvases.create({
  title: "議事録 2026-05-19",
  document_content: {
    type: "markdown",
    markdown: "## 日時\n2026-05-19 10:00 JST\n\n## 参加者\n..."
  },
});
```

`type` は現状 `"markdown"` のみサポート。

</details>

<details><summary>レベル 3: Markdown の書式</summary>

Canvas の Markdown は標準 Markdown + Slack 拡張 (チャンネル / ユーザーメンション) をサポートします。

- 改行は `\n`
- 見出しは H1〜H3 (`#`, `##`, `###`)
- ユーザーメンションは `<@U123...>` のまま残す
- バックスラッシュ・テンプレートリテラルで JSON に埋め込むときは改行のエスケープに注意

</details>

---

## ヒント 5: OpenAI の出力に「以下が議事録です:」とか説明文が混じる

そのまま Canvas に入れると、見出し構造が崩れたり余計なコードフェンスが付いてしまう問題。

<details><summary>レベル 1: 指示の出し方</summary>

system プロンプトで **「Markdown 本文のみ。前置きや説明文は一切含めない」** と明示します。「以下が〜です」「もちろんです」を弾くフレーズを入れる。

</details>

<details><summary>レベル 2: 構造を固定する</summary>

「必ず以下の見出し構成 (H2) を順番通りに含めてください」と書いて、見出し一覧をプロンプトに列挙する。LLM は構造化された雛形を渡された方が外れにくくなります。

```markdown
## 日時
## 参加者
## 議題
## 決定事項
## アクションアイテム
```

</details>

<details><summary>レベル 3: それでも混じる場合</summary>

ポストプロセスで以下を除去するのが最後の保険:

```ts
let md = json.choices[0].message.content.trim();
// 先頭のコードフェンスや「以下が議事録です:」を除去
md = md.replace(/^```(?:markdown)?\s*/i, "").replace(/```\s*$/i, "");
md = md.replace(/^.*議事録です[:：]\s*\n/i, "");
```

最低限 `trim()` だけは入れておきましょう。

</details>
