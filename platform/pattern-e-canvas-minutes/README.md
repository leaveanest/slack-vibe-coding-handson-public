# Pattern E: スレッドリアクション → Canvas 議事録

`:memo:` リアクションをメッセージに付けると、そのスレッド全体を AI が要約して Slack Canvas に保存し、生成された Canvas のリンクを元スレッドに返信するワークフローです。

> 想定時間: **30〜40 分**
> 難易度: ★★★☆☆
> 技術スタック: Deno / Slack Automations / `slack` CLI / OpenAI API

## お題

ミーティングが終わった直後の Slack スレッドにそのまま `:memo:` を付けるだけで、議事録の体裁 (日時 / 参加者 / 議題 / 決定事項 / アクションアイテム) に整った Canvas が自動生成され、元スレッドに「議事録できました」と Canvas リンクが返ってくる仕組みを作ります。

## できあがるもの

1. ユーザーが任意のメッセージ (親 or スレッド内のどれでも OK) に `:memo:` を付ける
2. Slack の Event Trigger が発火し、Custom Workflow が走る
3. `conversations.replies` でスレッド全体を取得
4. OpenAI に投げて議事録風 Markdown を生成
5. `canvases.create` で Canvas を作成
6. 元スレッドに Canvas へのリンクを bot が返信

## 触れる技術

- Custom Function (Deno) × 2: スレッド要約 + Canvas 作成
- Custom Workflow: 3 ステップ chain (`SummarizeThread` → `CreateCanvas` → `SendMessage`)
- Event Trigger: `reaction_added` + `filter` による絵文字限定
- Slack Web API: `conversations.replies`, `canvases.create`, `chat.postMessage`
- OpenAI Chat Completions API: 議事録テンプレート出力
- `outgoingDomains` による外部 API 通信

## セットアップ

### 1. 依存ツールの確認

[../../SETUP.md](../../SETUP.md) に従って `slack` CLI と Deno が動く状態にしておいてください。

```bash
slack --version
deno --version
slack auth list   # ワークスペースが登録されていれば OK
```

### 2. 環境変数

OpenAI API キーを Slack の Environment Variables に登録します。

```bash
cd platform/pattern-e-canvas-minutes
slack env add OPENAI_API_KEY sk-...           # 必須
slack env add OPENAI_MODEL gpt-4o-mini        # 任意（省略時は gpt-4o-mini）
```

ローカル `.env` でも動かせます:

```bash
cp .env.example .env
# .env を編集して OPENAI_API_KEY を入れる
```

### 3. 対象チャンネルの設定

`triggers/reaction_trigger.ts` の `channel_ids` を、ハンズオンで使うチャンネルの ID に書き換えてください。

```ts
channel_ids: ["C0123456789"],   // ← ここを書き換える
```

> チャンネル ID は Slack の チャンネル名右クリック → 「チャンネルの詳細を表示」 → 一番下に表示されています。

### 4. 起動

```bash
# ローカル実行（Socket Mode）
slack run

# 別ターミナルで Event Trigger を登録
slack trigger create --trigger-def triggers/reaction_trigger.ts
```

`slack run` 起動中のワークスペースで、対象チャンネルのメッセージに `:memo:` を付けると Workflow が走ります。

## 動かし方

1. 対象チャンネルに何人かでメッセージを投稿してスレッドを作る
2. 親メッセージか、もしくはスレッド内の任意の返信に `:memo:` を付ける
3. 数秒待つと bot がスレッドに `議事録できました :memo: <Canvasリンク>` と返信
4. リンクをクリックすると、`日時 / 参加者 / 議題 / 決定事項 / アクションアイテム` セクションが入った Canvas が開く

## ハマったら

`HINTS.md` に段階的なヒントがあります。Codex CLI に「pattern-e のスレッドリアクション → Canvas 議事録を作って」とお題を投げて、生成された差分を `functions/` `workflows/` `triggers/` の完成版と見比べながら埋めていくのがおすすめです。
