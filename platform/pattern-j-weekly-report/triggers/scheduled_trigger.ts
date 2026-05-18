import { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerTypes } from "deno-slack-api/mod.ts";
import WeeklyReportWorkflow from "../workflows/weekly_report_workflow.ts";

/**
 * Scheduled Trigger: 毎週金曜 18:00 (Asia/Tokyo) で発火する週次レポートトリガー
 *
 * - frequency.type:    "weekly"
 * - on_days:           ["Friday"]
 * - repeats_every:     1 (毎週)
 * - timezone:          "Asia/Tokyo"  ★忘れると UTC で動くので注意
 * - start_time:        次の金曜 18:00 JST (= 09:00 UTC)
 *
 * inputs:
 *  - source_channel:   要約対象 (実ワークスペースの ID に差し替えてください)
 *  - dest_channel:     投稿先   (実ワークスペースの ID に差し替えてください)
 *
 * 登録コマンド:
 *   slack trigger create --trigger-def triggers/scheduled_trigger.ts
 */

/** 次に来る "金曜 18:00 JST" の ISO 文字列を返す。
 *  start_time は「未来」でなければ Slack に拒否されるので、過ぎていたら 1 週ずらす。
 */
function nextFridayAt18JstIso(): string {
  // JST 18:00 == UTC 09:00
  const now = new Date();
  const candidate = new Date(now);
  // UTC ベースで「金曜 09:00:00 UTC」に合わせる
  const dayUtc = candidate.getUTCDay(); // 0=Sun, 5=Fri
  const daysUntilFri = (5 - dayUtc + 7) % 7;
  candidate.setUTCDate(candidate.getUTCDate() + daysUntilFri);
  candidate.setUTCHours(9, 0, 0, 0); // 09:00 UTC = 18:00 JST
  if (candidate.getTime() <= now.getTime()) {
    candidate.setUTCDate(candidate.getUTCDate() + 7);
  }
  return candidate.toISOString();
}

const trigger: Trigger<typeof WeeklyReportWorkflow.definition> = {
  type: TriggerTypes.Scheduled,
  name: "Weekly Report (Fri 18:00 JST)",
  description: "毎週金曜 18:00 JST に週次レポートを生成・投稿します",
  workflow: `#/workflows/${WeeklyReportWorkflow.definition.callback_id}`,
  inputs: {
    // TODO: 自分のワークスペースのチャンネル ID に差し替える
    source_channel: { value: "C0123456789" }, // 要約対象
    dest_channel: { value: "C0123456789" }, // 投稿先 (同じでも別でも OK)
  },
  schedule: {
    start_time: nextFridayAt18JstIso(),
    timezone: "Asia/Tokyo",
    frequency: {
      type: "weekly",
      on_days: ["Friday"],
      repeats_every: 1,
    },
  },
};

export default trigger;
