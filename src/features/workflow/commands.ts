import "server-only";
import { requireWorkflow } from "@/features/collaboration/boundary";
import {
  consentInput,
  progressInput,
  completionInput,
  responseInput,
  correctionInput,
} from "./schema";
import { workMutation, currentVersion, activeWork, recordWork, expireProposals } from "./policy";
export async function workCommand(action: string, input: unknown, key: string | null) {
  if (action === "start") {
    const data = consentInput.parse(input);
    return workMutation("work.start", data, key, async (sql, b, actor) => {
      currentVersion(b, data.expectedVersion);
      if (b.client) throw new Error("FORBIDDEN");
      await activeWork(sql, b, ["confirmed"]);
      if (Date.parse(b.start) > Date.now()) throw new Error("TIMING");
      await expireProposals(sql, b.id);
      const pending =
        await sql`select id from private.booking_reschedules where booking_id=${b.id}::uuid and status='proposed' union all select id from public.change_orders where booking_id=${b.id}::uuid and status='proposed'`;
      if (pending.length) throw new Error("CONFLICT");
      return {
        ...(await recordWork(sql, b, actor, "work_started", "in_progress")),
        message: "Your work-start report was saved. This does not confirm payment.",
      };
    });
  }
  if (action === "progress") {
    const data = progressInput.parse(input);
    return workMutation("work.progress", data, key, async (sql, b, actor) => {
      currentVersion(b, data.expectedVersion);
      if (b.client) throw new Error("FORBIDDEN");
      await activeWork(sql, b, ["confirmed", "in_progress"]);
      const [entry] =
        await sql`insert into private.work_entries(booking_id,actor_id,kind,body,public_to_parties) values(${b.id}::uuid,${actor.id}::uuid,'progress',${data.kind + ": " + data.body},true) returning id`;
      return {
        ...(await recordWork(sql, b, actor, "work_progress", b.status, String(entry!.id))),
        message: "Progress update saved as your report. No live location is collected.",
      };
    });
  }
  if (action === "complete") {
    const data = completionInput.parse(input);
    return workMutation("work.complete", data, key, async (sql, b, actor) => {
      currentVersion(b, data.expectedVersion);
      if (b.client) throw new Error("FORBIDDEN");
      await activeWork(sql, b, ["in_progress"]);
      await expireProposals(sql, b.id);
      if (
        (
          await sql`select id from private.booking_reschedules where booking_id=${b.id}::uuid and status='proposed' union all select id from public.change_orders where booking_id=${b.id}::uuid and status='proposed'`
        ).length
      )
        throw new Error("CONFLICT");
      for (const id of data.assetIds) {
        const [a] =
          await sql`select id from private.collaboration_assets where id=${id}::uuid and owner_id=${actor.id}::uuid and booking_id=${b.id}::uuid and purpose='completion' and state='stored' and not attached and retain_until>clock_timestamp() for update`;
        if (!a) throw new Error("FORBIDDEN");
      }
      const config = requireWorkflow();
      const [s] =
        await sql`insert into private.completion_submissions(booking_id,round,submitted_by,summary,review_due_at) values(${b.id}::uuid,(select coalesce(max(round),0)+1 from private.completion_submissions where booking_id=${b.id}::uuid),${actor.id}::uuid,${data.summary},clock_timestamp()+${config.reviewHours}::integer*interval '1 hour') returning id`;
      for (const id of data.assetIds)
        await sql`insert into private.completion_assets(completion_id,asset_id) values(${s!.id}::uuid,${id}::uuid)`;
      return {
        ...(await recordWork(
          sql,
          b,
          actor,
          "completion_submitted",
          "completion_pending",
          String(s!.id),
        )),
        completionId: String(s!.id),
        message:
          "Completion evidence saved for the client. The reminder window never implies acceptance or releases payment.",
      };
    });
  }
  if (action === "confirm-completion" || action === "correction") {
    const data =
      action === "correction" ? correctionInput.parse(input) : responseInput.parse(input);
    return workMutation("work." + action, data, key, async (sql, b, actor) => {
      currentVersion(b, data.expectedVersion);
      if (!b.client) throw new Error("FORBIDDEN");
      if (b.status !== "completion_pending" || b.disputed) throw new Error("CONFLICT");
      const [s] =
        await sql`select id from private.completion_submissions where id=${data.completionId}::uuid and booking_id=${b.id}::uuid and status='pending' for update`;
      if (!s) throw new Error("CONFLICT");
      const correctionReason =
        "reason" in data && typeof data.reason === "string" ? data.reason : null;
      const correction = correctionReason !== null;
      await sql`update private.completion_submissions set status=${correction ? "correction_requested" : "confirmed"},responded_by=${actor.id}::uuid,responded_at=clock_timestamp() where id=${s.id}::uuid`;
      if (correction)
        await sql`insert into private.work_entries(booking_id,actor_id,kind,body,completion_id,public_to_parties) values(${b.id}::uuid,${actor.id}::uuid,'correction',${correctionReason},${s.id}::uuid,true)`;
      return {
        ...(await recordWork(
          sql,
          b,
          actor,
          correction ? "correction_requested" : "completion_confirmed",
          correction ? "in_progress" : "completed",
          String(s.id),
        )),
        message: correction
          ? "Correction request saved. Previous evidence remains in the history."
          : "Your explicit confirmation was recorded. Payment and dispute rights remain separate.",
      };
    });
  }
  throw new Error("INVALID");
}
