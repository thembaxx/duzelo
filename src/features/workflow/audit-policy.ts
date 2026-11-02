import "server-only";
import type { TransactionSql } from "postgres";
import type { Identity } from "@/features/auth/service";
import { lockStaff } from "@/features/collaboration/boundary";
export async function auditResource(
  sql: TransactionSql,
  kind: string,
  id: string,
  actor: Identity,
) {
  const rows =
    kind === "conversation"
      ? await sql`select c.job_id,c.id as conversation_id,b.id as booking_id,j.client_id,w.user_id as worker_user from public.conversations c join public.job_requests j on j.id=c.job_id join public.worker_profiles w on w.id=c.worker_id left join public.bookings b on b.job_id=c.job_id and b.worker_id=c.worker_id where c.id=${id}::uuid`
      : kind === "dispute"
        ? await sql`select b.job_id,b.id as booking_id,c.id as conversation_id,j.client_id,w.user_id as worker_user from public.disputes d join public.bookings b on b.id=d.booking_id join public.job_requests j on j.id=b.job_id join public.worker_profiles w on w.id=b.worker_id left join public.conversations c on c.job_id=b.job_id and c.worker_id=b.worker_id where d.id=${id}::uuid`
        : await sql`select b.job_id,b.id as booking_id,c.id as conversation_id,j.client_id,w.user_id as worker_user from public.bookings b join public.job_requests j on j.id=b.job_id join public.worker_profiles w on w.id=b.worker_id left join public.conversations c on c.job_id=b.job_id and c.worker_id=b.worker_id where b.id=${id}::uuid`;
  const r = rows[0];
  if (!r || [r.client_id, r.worker_user].includes(actor.id)) throw new Error("FORBIDDEN");
  return {
    job_id: String(r.job_id),
    booking_id: r.booking_id ? String(r.booking_id) : null,
    conversation_id: r.conversation_id ? String(r.conversation_id) : null,
    client_id: String(r.client_id),
    worker_user: String(r.worker_user),
  };
}
export async function auditGrant(sql: TransactionSql, id: string, actor: Identity) {
  await lockStaff(sql, actor);
  const [g] =
    await sql`select resource_kind,resource_id from private.workflow_access_grants where id=${id}::uuid and actor_id=${actor.id}::uuid and session_id=${actor.sessionId}::uuid and expires_at>clock_timestamp()`;
  if (!g) throw new Error("FORBIDDEN");
  const r = await auditResource(sql, String(g.resource_kind), String(g.resource_id), actor);
  return { ...r, resource_kind: String(g.resource_kind), resource_id: String(g.resource_id) };
}
