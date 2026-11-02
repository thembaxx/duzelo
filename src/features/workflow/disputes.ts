import "server-only";
import { collaborationCommand } from "@/features/collaboration/boundary";
import { disputeInput, caseResponseInput } from "./schema";
import {
  workMutation,
  workContext,
  currentVersion,
  recordWork,
  supersedeProposals,
} from "./policy";
export async function disputeCommand(action: string, input: unknown, key: string | null) {
  if (action === "open") {
    const data = disputeInput.parse(input);
    return workMutation("case.open", data, key, async (sql, b, actor) => {
      currentVersion(b, data.expectedVersion);
      if (
        b.disputed ||
        !["confirmed", "in_progress", "completion_pending", "completed"].includes(b.status)
      )
        throw new Error("CONFLICT");
      const [d] =
        await sql`insert into public.disputes(booking_id,opened_by,reason,opened_from) values(${b.id}::uuid,${actor.id}::uuid,${data.reason},${b.status}::public.booking_status) returning id`;
      await supersedeProposals(sql, b.id);
      await sql`update private.completion_submissions set status='disputed',responded_by=${actor.id}::uuid,responded_at=clock_timestamp() where booking_id=${b.id}::uuid and status='pending'`;
      await sql`update private.collaboration_assets set held=true where attached and state='stored' and (booking_id=${b.id}::uuid or conversation_id in(select id from public.conversations where job_id=${b.jobId}::uuid and worker_id=${b.workerId}::uuid))`;
      return {
        ...(await recordWork(sql, b, actor, "dispute_opened", "disputed", String(d!.id))),
        disputeId: String(d!.id),
        message:
          "Service issue recorded for support. Completion is paused; no payment, refund or finding of fault was made.",
      };
    });
  }
  if (action === "respond") {
    const data = caseResponseInput.parse(input);
    return collaborationCommand(
      "case.respond",
      data,
      key,
      async (sql, actor) => {
        const [ref] =
          await sql`select booking_id from public.disputes where id=${data.disputeId}::uuid`;
        if (!ref) throw new Error("FORBIDDEN");
        const b = await workContext(sql, String(ref.booking_id), actor);
        const [d] =
          await sql`select id,version,status from public.disputes where id=${data.disputeId}::uuid for update`;
        if (
          !d ||
          d.version !== data.expectedVersion ||
          !["open", "investigating", "awaiting_evidence"].includes(d.status) ||
          b.status !== "disputed"
        )
          throw new Error("CONFLICT");
        for (const id of data.assetIds) {
          const [a] =
            await sql`select id from private.collaboration_assets where id=${id}::uuid and owner_id=${actor.id}::uuid and dispute_id=${d.id}::uuid and purpose='case' and state='stored' and not attached and retain_until>clock_timestamp() for update`;
          if (!a) throw new Error("FORBIDDEN");
        }
        const [entry] =
          await sql`insert into private.work_entries(booking_id,actor_id,kind,body,dispute_id) values(${b.id}::uuid,${actor.id}::uuid,'case_response',${data.body},${d.id}::uuid) returning id`;
        for (const id of data.assetIds)
          await sql`insert into private.entry_assets(entry_id,asset_id) values(${entry!.id}::uuid,${id}::uuid)`;
        await sql`update public.disputes set version=version+1 where id=${d.id}::uuid`;
        return {
          ...(await recordWork(
            sql,
            b,
            actor,
            "case_response_saved",
            "disputed",
            String(entry!.id),
          )),
          message:
            "Your response and evidence were saved for authorized support. They are not shared with the other participant.",
        };
      },
      async (sql, actor) => {
        const [d] =
          await sql`select booking_id from public.disputes where id=${data.disputeId}::uuid`;
        if (!d) throw new Error("FORBIDDEN");
        await workContext(sql, String(d.booking_id), actor);
      },
    );
  }
  throw new Error("INVALID");
}
