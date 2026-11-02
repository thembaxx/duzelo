import "server-only";
import {
  rescheduleInput,
  scopeInput,
  decisionInput,
  agreementTotal,
  proposalTiming,
} from "./schema";
import {
  workMutation,
  currentVersion,
  activeWork,
  recordWork,
  expireProposals,
  supersedeProposals,
} from "./policy";
import { freeTime } from "@/features/quotes/policy";
export async function proposalCommand(action: string, input: unknown, key: string | null) {
  if (action === "reschedule" || action === "scope") {
    const data = action === "reschedule" ? rescheduleInput.parse(input) : scopeInput.parse(input);
    return workMutation("proposal." + action, data, key, async (sql, b, actor) => {
      currentVersion(b, data.expectedVersion);
      await activeWork(sql, b, ["confirmed", "in_progress"]);
      await expireProposals(sql, b.id);
      if (
        (
          await sql`select id from private.booking_reschedules where booking_id=${b.id}::uuid and status='proposed' union all select id from public.change_orders where booking_id=${b.id}::uuid and status='proposed'`
        ).length
      )
        throw new Error("CONFLICT");
      const expiry = Date.parse(data.expiresAt);
      if (expiry < Date.now() + 60000 || expiry > Date.now() + 7 * 86400000)
        throw new Error("TIMING");
      let id: string;
      if ("startsAt" in data) {
        proposalTiming(data.startsAt, data.endsAt, data.expiresAt);
        const [r] =
          await sql`insert into private.booking_reschedules(booking_id,proposed_by,base_version,starts_at,ends_at,expires_at) values(${b.id}::uuid,${actor.id}::uuid,${b.version + 1},${data.startsAt}::timestamptz,${data.endsAt}::timestamptz,${data.expiresAt}::timestamptz) returning id`;
        id = String(r!.id);
      } else {
        const deltas =
          await sql`select delta_cents from public.change_orders where booking_id=${b.id}::uuid and status='accepted'`;
        agreementTotal(b.baseCents, [...deltas.map((d) => Number(d.delta_cents)), data.deltaCents]);
        const [r] =
          await sql`insert into public.change_orders(booking_id,requested_by,scope_change,delta_cents,base_version,expires_at) values(${b.id}::uuid,${actor.id}::uuid,${data.scope},${data.deltaCents},${b.version + 1},${data.expiresAt}::timestamptz) returning id`;
        id = String(r!.id);
      }
      return {
        ...(await recordWork(sql, b, actor, action + "_proposed", b.status, id)),
        proposalId: id,
        message:
          "Proposal saved. The current agreement stays in place until the other party explicitly accepts.",
      };
    });
  }
  if (action === "decide") {
    const data = decisionInput.parse(input);
    return workMutation("proposal.decide", data, key, async (sql, b, actor) => {
      currentVersion(b, data.expectedVersion);
      if (!["confirmed", "in_progress"].includes(b.status) || b.disputed)
        throw new Error("CONFLICT");
      const [p] =
        data.kind === "reschedule"
          ? await sql`select id,proposed_by as author,base_version,starts_at,ends_at,expires_at,status from private.booking_reschedules where id=${data.proposalId}::uuid and booking_id=${b.id}::uuid for update`
          : await sql`select id,requested_by as author,base_version,scope_change,delta_cents,expires_at,status from public.change_orders where id=${data.proposalId}::uuid and booking_id=${b.id}::uuid for update`;
      if (
        !p ||
        p.status !== "proposed" ||
        (data.decision === "accept" && p.base_version !== b.version) ||
        !p.expires_at ||
        Date.parse(p.expires_at) <= Date.now()
      )
        throw new Error("CONFLICT");
      if ((data.decision === "withdraw") !== (p.author === actor.id)) throw new Error("FORBIDDEN");
      const status =
        data.decision === "accept"
          ? "accepted"
          : data.decision === "reject"
            ? "rejected"
            : "withdrawn";
      if (data.decision === "accept") {
        await activeWork(sql, b, ["confirmed", "in_progress"]);
        if (data.kind === "reschedule") {
          if (Date.parse(p.starts_at) <= Date.now()) throw new Error("TIMING");
          await freeTime(
            sql,
            b.workerId,
            new Date(p.starts_at).toISOString(),
            new Date(p.ends_at).toISOString(),
            b.id,
          );
        } else {
          const deltas =
            await sql`select delta_cents from public.change_orders where booking_id=${b.id}::uuid and status='accepted'`;
          agreementTotal(b.baseCents, [
            ...deltas.map((d) => Number(d.delta_cents)),
            Number(p.delta_cents),
          ]);
        }
      }
      if (data.kind === "reschedule")
        await sql`update private.booking_reschedules set status=${status},decided_by=${actor.id}::uuid,decided_at=clock_timestamp(),applied_version=${data.decision === "accept" ? b.version + 1 : null} where id=${p.id}::uuid`;
      else
        await sql`update public.change_orders set status=${status},decided_by=${actor.id}::uuid,decided_at=clock_timestamp(),accepted_at=case when ${data.decision}='accept' then clock_timestamp() else null end,applied_version=${data.decision === "accept" ? b.version + 1 : null} where id=${p.id}::uuid`;
      await supersedeProposals(sql, b.id, String(p.id));
      const window =
        data.decision === "accept" && data.kind === "reschedule"
          ? { start: new Date(p.starts_at).toISOString(), end: new Date(p.ends_at).toISOString() }
          : undefined;
      return {
        ...(await recordWork(
          sql,
          b,
          actor,
          data.kind + "_" + status,
          b.status,
          String(p.id),
          window,
        )),
        message:
          data.decision === "accept"
            ? "The accepted change was recorded. The original quote stays immutable and no payment was collected."
            : "Decision saved. The prior agreement remains in place.",
      };
    });
  }
  throw new Error("INVALID");
}
