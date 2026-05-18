# HINTS — pattern-f-approval

詰まったときに段階的に開封するヒント集。**先に自分で 5 分悩んでから**読んでください。

---

## ヒント 1: Datastore の型定義 + `Schema.types.*` の使い方

### つまずきがち

「Datastore のカラムって何を書けばいいの? `string` って書いていいの?」「TypeScript の `string` 型と Slack の `Schema.types.string` は何が違う?」

### 答え

Datastore のカラム型は **Slack の Schema トークン**で指定する。

```typescript
import { DefineDatastore, Schema } from "deno-slack-sdk/mod.ts";

export const RequestsDatastore = DefineDatastore({
  name: "requests_datastore",
  primary_key: "id",
  attributes: {
    id:         { type: Schema.types.string },          // 単なる文字列
    requester:  { type: Schema.slack.types.user_id },   // Slack User ID (U... で始まる)
    approver:   { type: Schema.slack.types.user_id },
    content:    { type: Schema.types.string },
    status:     { type: Schema.types.string },          // "pending"/"approved"/"rejected"
    created_at: { type: Schema.types.number },          // 数値 (Unix epoch ms)
  },
});
```

ポイント:

- `Schema.types.*` = 汎用プリミティブ (`string`, `number`, `integer`, `boolean`, `object`, `array`)
- `Schema.slack.types.*` = Slack ドメイン固有型 (`user_id`, `channel_id`, `timestamp`, `blocks` 等)
- TypeScript の型と違って **マニフェストとして送信される宣言**なので、Slack 側でバリデーションされる。User ID 型に "hello" は入らない。
- `status` のような enum 値は Datastore レベルでは `string` にしておき、**関数側で値を制限する**のが定石。`enum:` プロパティは `DefineType` (再利用型) 側でしか使えない。

⚠️ Datastore の **属性は put / update のたびに「上書き対象」になる** ことに注意:
`update` で 1 つの属性だけ書き換えたいときも、**他の属性も全部明示**しないと値が消える。
(更新前に `get` してきて、必要な値も含めて全部 `update` に渡す、というのが安全。)

---

## ヒント 2: Block Actions の `value` / `action_id` 受け渡し

### つまずきがち

「ボタンを押した時に、どの申請のボタンを押したのか分からない」「`addBlockActionsHandler` の `action` から何が取れる?」「`{{data.actions[0].value}}` ってどこに書く?」

### 答え

#### 送信側 (ボタンを置く)

```typescript
{
  type: "actions",
  block_id: "approval_buttons",
  elements: [
    {
      type: "button",
      text: { type: "plain_text", text: "承認する" },
      action_id: "approve_button",         // ← どのボタンかを識別
      value: request_id,                   // ← 「どのレコードについてか」を載せる
    },
    {
      type: "button",
      text: { type: "plain_text", text: "却下する" },
      action_id: "reject_button",
      value: request_id,                   // ← 同じ request_id を載せる
    },
  ],
},
```

`action_id` が「**どのボタンか**」、`value` が「**何に対するボタンか**」を表す。
これを使い分けると、複数のボタンで `value` を共通化できて構造がきれいになる。

#### 受け取り側 (`addBlockActionsHandler` の場合)

```typescript
.addBlockActionsHandler(
  ["approve_button", "reject_button"],  // action_id でフィルタ
  async ({ action, body, client }) => {
    const request_id = action.value as string;          // ← value はここ
    const decision = action.action_id === "approve_button"
      ? "approved"
      : "rejected";                                     // ← action_id はここ
    const reviewer = body.user.id;                      // ← 押したユーザー

    // ... 処理 ...
  },
)
```

#### 受け取り側 (Block Action Trigger の場合)

trigger 定義ファイルでは `{{data.actions[0].value}}` というテンプレート構文で取り出す:

```typescript
inputs: {
  request_id: { value: "{{data.actions[0].value}}" },
  decision:   { value: "{{data.actions[0].action_id}}" },
  reviewer:   { value: "{{data.user.id}}" },
},
```

両方の経路で **同じデータが取れる**ことを覚えておくと混乱しにくい。

---

## ヒント 3: 2 つの Workflow を 1 アプリで動かす (manifest 登録)

### つまずきがち

「workflow を 2 つ書いたら片方が `Workflow not found` になる」「片方の workflow しか呼ばれない」

### 答え

**全部 manifest に登録する**。これに尽きる。

```typescript
import SubmitRequestWorkflow from "./workflows/submit_request_workflow.ts";
import HandleDecisionWorkflow from "./workflows/handle_decision_workflow.ts";

export default Manifest({
  // ...
  functions: [
    SaveRequestFunction,
    SendApproverDmFunction,
    HandleDecisionFunction,   // ← どの workflow からも参照されるなら必須
  ],
  workflows: [
    SubmitRequestWorkflow,
    HandleDecisionWorkflow,   // ← 両方並べる
  ],
  datastores: [RequestsDatastore],
  // ...
});
```

ハマりやすい点:

- `workflows: [...]` に **1 つしか並べていない** → もう片方の workflow は登録されず、トリガから呼ぼうとしても `Workflow not found` になる。
- **どの workflow からも import されていない function** がある → manifest の `functions: [...]` にも忘れず追加する必要がある (TypeScript のツリーシェイクとは別の話)。
- workflow を追加・削除したあとは `slack run` を再起動するか、`slack deploy` で manifest を反映する。

確認方法:

```bash
slack manifest info     # 現在 Slack 側に登録されている manifest を確認
```

---

## ヒント 4: Block Action Trigger の filter (action_id でフィルタ)

### つまずきがち

「ボタンを 2 種類置いたら、関係ないボタンでも workflow が動いてしまう」「filter の書き方がわからない」

### 答え

`block_actions` 型の Trigger には `filter` プロパティが書ける。
DSL は CEL ライク。テンプレート構文 `{{data.actions[0].action_id}}` を使うのがポイント:

```typescript
const trigger = {
  type: "block_actions",
  name: "承認/却下ボタンの押下を捕捉",
  workflow: `#/workflows/${HandleDecisionWorkflow.definition.callback_id}`,
  inputs: {
    request_id: { value: "{{data.actions[0].value}}" },
    decision:   { value: "{{data.actions[0].action_id}}" },
    reviewer:   { value: "{{data.user.id}}" },
  },
  filter: {
    version: 1,
    root: {
      statement:
        '{{data.actions[0].action_id}} == "approve_button" || ' +
        '{{data.actions[0].action_id}} == "reject_button"',
    },
  },
};
```

注意:

- このパターンを使うときは、`send_approver_dm.ts` 側の `addBlockActionsHandler` と **二重に動いて競合する** ので、どちらかをコメントアウトすること。本教材の本筋は `addBlockActionsHandler` 側で完結させる方が学習しやすい (関数の境界がはっきりするため)。
- `block_actions` Trigger は `deno-slack-sdk` の `TriggerTypes` enum に明示的な値がない場合があるので、`type: "block_actions"` と文字列リテラルで書く。
- filter には `data.*` 経由で payload にアクセスできる。`{{data.user.id}}`, `{{data.channel.id}}`, `{{data.message.ts}}` あたりがよく使う変数。

---

## ヒント 5: `crypto.randomUUID()` の Deno での挙動

### つまずきがち

「Node.js だと `require("crypto").randomUUID()` だけど、Deno は何 import すればいい?」「ESM の import 文を書いたら `not found` と言われた」

### 答え

**何も import しない。**
Deno (および現代の Node.js 19+ / 主要ブラウザ) では `crypto` は **グローバルオブジェクト**として最初から提供されている。

```typescript
// ❌ いらない
// import { randomUUID } from "crypto";

// ✅ そのまま使える
const id = crypto.randomUUID();
// 例: "9e8b6f5e-2d1d-4b9e-8a3a-3f2c1d0e9a8b"
```

ポイント:

- `crypto.randomUUID()` は Web Crypto API の一部。Deno は Web 標準準拠なので、ブラウザのコードがほぼそのまま動く。
- 戻り値は文字列 (`string` 型)。UUID v4 (ランダム生成、衝突確率は実用上ゼロ)。
- ハンズオンのスケール (数百件以下) なら衝突を気にする必要はない。
- もし「もっと短い ID にしたい」なら、`crypto.getRandomValues(new Uint8Array(8))` で 8 バイト乱数を取り出して base36 で表現する、といった工夫も可能。ただし可読性とトレーサビリティを考えると UUID で十分。

参考: 関連する Deno 標準 API:

- `crypto.randomUUID()` — UUID v4 生成
- `crypto.getRandomValues(buffer)` — 任意長の乱数バイト列
- `crypto.subtle.digest(...)` — ハッシュ計算 (Workflow ではあまり使わない)

---

## おまけ: 「ボタンなし版」にしたい場合

承認/却下ボタン UI が複雑に感じたら、いったん**ボタンを取り除いて「承認者にメンション + コメントで yes/no」**のシンプル版に降ろすことができる。

その場合のアレンジ:

1. `send_approver_dm.ts` の `blocks` から `actions` ブロックを削除し、`section` のみにする
2. `addBlockActionsHandler` を丸ごと削除し、関数末尾を `return { outputs: { ... } };` で即終了させる
3. 代わりに `handle_decision_workflow.ts` を `slack workflow run` で**手動キック**することで決定を反映する (ハンズオンのデバッグ用としても便利)

これで Block Actions 周りの複雑さを切り離せるので、まずは「Datastore 操作」の感覚を掴むことに集中したい人向け。慣れたらボタンを足して本実装に戻すこと。
