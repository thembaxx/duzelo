import "server-only";
import { z } from "zod";
import { database } from "@/lib/db/server";
import { staffActor, lockStaff, staffCommand } from "@/features/collaboration/boundary";
import { auditInput, triageInput } from "./schema";
import { auditGrant, auditResource } from "./audit-policy";
import { workProjection } from "./queries";
import { notify } from "@/features/quotes/policy";
export async function auditQueue() {
  const actor = await staffActor();
  return database().begin(async (sql) => {
    await lockStaff(sql, actor);
    const rows =
      await sql`select d.id,'dispute' as kind,d.status,d.created_at from public.disputes d join public.bookings b on b.id=d.booking_id join public.job_requests j on j.id=b.job_id join public.worker_profiles w on w.id=b.worker_id where d.status in('open','investigating','awaiting_evidence') and j.client_id<>${actor.id}::uuid and w.user_id<>${actor.id}::uuid union all select b.id,'booking',b.status::text,s.support_due_at from private.completion_submissions s join public.bookings b on b.id=s.booking_id join public.job_requests j on j.id=b.job_id join public.worker_profiles w on w.id=b.worker_id where s.status='pending' and s.support_due_at is not null and j.client_id<>${actor.id}::uuid and w.user_id<>${actor.id}::uuid union all select c.id,'conversation',s.status,s.created_at from private.conversation_reports r join public.safety_reports s on s.id=r.report_id join public.conversations c on c.id=r.conversation_id join public.job_requests j on j.id=c.job_id join public.worker_profiles w on w.id=c.worker_id where s.status in('open','triaged') and j.client_id<>${actor.id}::uuid and w.user_id<>${actor.id}::uuid order by created_at desc limit 50`;
    return rows.map((r) => ({
      id: String(r.id),
      kind: String(r.kind),
      status: String(r.status),
      at: new Date(r.created_at).toISOString(),
    }));
  });
}
export async function openAudit(input: unknown, key: string | null) {
  const data = auditInput.parse(input);
  return staffCommand(
    "audit.open",
    data,
    key,
    async (sql, actor) => {
      const r = await auditResource(sql, data.kind, data.id, actor);
      const [g] =
        await sql`insert into private.workflow_access_grants(actor_id,session_id,resource_kind,resource_id,reason,expires_at) values(${actor.id}::uuid,${actor.sessionId}::uuid,${data.kind},${data.id}::uuid,${data.reason},clock_timestamp()+interval '5 minutes') returning id`;
      return { grantId: String(g!.id), jobId: String(r.job_id) };
    },
    async (sql, actor) => {
      await auditResource(sql, data.kind, data.id, actor);
    },
  );
}
export async function auditView(id: string, before = 0) {
  z.guid().parse(id);
  const actor = await staffActor();
  return database().begin(async (sql) => {
    const g = await auditGrant(sql, id, actor);
    let workflow = null;
    if (g.booking_id && g.resource_kind !== "conversation") {
      // Build only the minimal workflow projection after the staff grant check.
      const [b] =
        await sql`select b.id,b.job_id,b.worker_id,b.status,b.version,b.scheduled_start,b.scheduled_end,b.final_total_cents,j.client_id,w.user_id from public.bookings b join public.job_requests j on j.id=b.job_id join public.worker_profiles w on w.id=b.worker_id where b.id=${g.booking_id}::uuid`;
      if (b?.scheduled_start && b.scheduled_end)
        workflow = await workProjection(
          sql,
          {
            id: String(b.id),
            jobId: String(b.job_id),
            workerId: String(b.worker_id),
            clientId: String(b.client_id),
            workerUser: String(b.user_id),
            client: false,
            status: String(b.status),
            version: Number(b.version),
            start: new Date(b.scheduled_start).toISOString(),
            end: new Date(b.scheduled_end).toISOString(),
            baseCents: Number(b.final_total_cents),
            blocked: false,
            disputed: b.status === "disputed",
          },
          actor,
          true,
        );
    }
    const messages = g.conversation_id
      ? await sql`select m.id,m.sequence,m.body,m.deleted_at,m.sent_at from public.messages m where conversation_id=${g.conversation_id}::uuid and (${before}::bigint=0 or sequence<${before}::bigint) order by sequence desc limit 31`
      : [];
    const assets = g.conversation_id
      ? await sql`select a.id,a.state='stored' and a.retain_until>clock_timestamp() as available from private.collaboration_assets a where a.conversation_id=${g.conversation_id}::uuid and a.attached`
      : [];
    const reports = g.conversation_id
      ? await sql`select s.id,s.reason,s.status from private.conversation_reports r join public.safety_reports s on s.id=r.report_id where r.conversation_id=${g.conversation_id}::uuid order by s.created_at desc limit 50`
      : [];
    await auditGrant(sql, id, actor);
    return {
      grantId: id,
      expiresAt: g.expiresAt,
      workflow,
      hasMore: messages.length > 30,
      next: messages.length ? Number(messages[Math.min(messages.length, 30) - 1]!.sequence) : 0,
      messages: messages
        .slice(0, 30)
        .reverse()
        .map((m) => ({
          id: String(m.id),
          sequence: Number(m.sequence),
          body: m.deleted_at ? "Removed message" : String(m.body),
          at: new Date(m.sent_at).toISOString(),
        })),
      assets: assets.map((a) => ({ id: String(a.id), available: !!a.available })),
      reports: reports.map((r) => ({
        id: String(r.id),
        reason: String(r.reason),
        status: String(r.status),
      })),
    };
  });
}
export async function triageDispute(input: unknown, key: string | null) {
  const data = triageInput.parse(input);
  return staffCommand(
    "case.triage",
    data,
    key,
    async (sql, actor) => {
      const r = await auditResource(sql, "dispute", data.disputeId, actor);
      await sql`select id from public.job_requests where id=${r.job_id}::uuid for update`;
      const [d] =
        await sql`select id,status,version,booking_id from public.disputes where id=${data.disputeId}::uuid for update`;
      if (
        !d ||
        d.version !== data.expectedVersion ||
        !["open", "investigating", "awaiting_evidence"].includes(d.status)
      )
        throw new Error("CONFLICT");
      await sql`update public.disputes set status=${data.status},version=version+1 where id=${d.id}::uuid`;
      await sql`insert into private.work_entries(booking_id,actor_id,kind,body,dispute_id,public_to_parties) values(${d.booking_id}::uuid,${actor.id}::uuid,'support_note',${data.note},${d.id}::uuid,true)`;
      await sql`insert into private.audit_events(actor_id,actor_type,action,resource_kind,resource_id,metadata_redacted) values(${actor.id}::uuid,'admin','workflow.case-triage-reason','job_request',${r.job_id}::uuid,${sql.json({ reason: data.reason })})`;
      for (const [user, mode] of [
        [r.client_id, "client"],
        [r.worker_user, "worker"],
      ])
        await notify(
          sql,
          String(user),
          "case-support-update",
          d.id + ":" + (d.version + 1) + ":" + user,
          "/app/" + mode + "/bookings/" + d.booking_id,
        );
      return {
        jobId: String(r.job_id),
        message:
          "Support status and shared note saved. No resolution or financial action was made.",
      };
    },
    async (sql, actor) => {
      await auditResource(sql, "dispute", data.disputeId, actor);
    },
  );
}
