import "server-only";
import type { TransactionSql } from "postgres";
import type { Identity } from "@/features/auth/service";
export async function threadContext(sql: TransactionSql, id: string, actor: Identity) {
  const [ref] =
    await sql`select c.job_id from public.conversations c where c.id=${id}::uuid and c.worker_id is not null and exists(select 1 from public.conversation_members m where m.conversation_id=c.id and m.user_id=${actor.id}::uuid)`;
  if (!ref) throw new Error("FORBIDDEN");
  await sql`select id from public.job_requests where id=${ref.job_id}::uuid for update`;
  const [c] =
    await sql`select c.id,c.job_id,c.worker_id,c.last_sequence,j.client_id,j.title,j.public_town,j.status as job_status,w.user_id as worker_user,
 private.agreement_worker_eligible(j.id,w.id,false) and exists(select 1 from public.worker_cards card where card.worker_id=w.id and card.safe_until>clock_timestamp()) as eligible,
 exists(select 1 from private.user_blocks x where x.owner_id=${actor.id}::uuid and x.subject_id=case when j.client_id=${actor.id}::uuid then w.user_id else j.client_id end) as own_blocked,
 exists(select 1 from private.user_blocks x where (x.owner_id=j.client_id and x.subject_id=w.user_id) or(x.owner_id=w.user_id and x.subject_id=j.client_id)) as blocked,
 exists(select 1 from private.conversation_reports r join public.safety_reports s on s.id=r.report_id where r.conversation_id=c.id and s.status in('open','triaged')) as reported,
 exists(select 1 from public.job_matches m where m.job_id=j.id and m.worker_id=w.id and m.status='responded' and exists(select 1 from public.quotes q where q.job_id=j.id and q.worker_id=w.id and q.published_at>clock_timestamp()-interval '7 days')) as responding
 from public.conversations c join public.job_requests j on j.id=c.job_id join public.worker_profiles w on w.id=c.worker_id join public.user_profiles u on u.user_id=${actor.id}::uuid where c.id=${id}::uuid and ((j.client_id=u.user_id and u.client_enabled)or(w.user_id=u.user_id and u.worker_enabled)) for update of c`;
  if (!c) throw new Error("FORBIDDEN");
  const [booking] =
    await sql`select id,worker_id,status from public.bookings where job_id=${c.job_id}::uuid`;
  const client = c.client_id === actor.id;
  const selected = !!booking && booking.worker_id === c.worker_id;
  const relation = booking
    ? selected && !["declined", "cancelled"].includes(booking.status)
    : !!c.responding && ["open", "matching", "quoted"].includes(c.job_status);
  const closed = !relation || (!!booking && ["completed", "disputed"].includes(booking.status));
  const canRead = client || (!!c.eligible && relation && !c.blocked);
  return {
    id: String(c.id),
    job_id: String(c.job_id),
    worker_id: String(c.worker_id),
    client_id: String(c.client_id),
    worker_user: String(c.worker_user),
    public_town: String(c.public_town),
    last_sequence: Number(c.last_sequence),
    eligible: !!c.eligible,
    blocked: !!c.blocked,
    own_blocked: !!c.own_blocked,
    reported: !!c.reported,
    client,
    canRead,
    canSend: !!c.eligible && relation && !closed && !c.blocked && !c.reported,
    closed,
    bookingId: booking && (client || selected) ? String(booking.id) : null,
    title: client || (canRead && !closed) ? String(c.title) : "Previous job conversation",
  };
}
export async function requireThreadSend(sql: TransactionSql, id: string, actor: Identity) {
  const c = await threadContext(sql, id, actor);
  if (!c.canSend) throw new Error(c.blocked || c.reported ? "BLOCKED" : "FORBIDDEN");
  return c;
}
