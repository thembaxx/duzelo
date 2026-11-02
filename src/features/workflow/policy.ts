import "server-only";
import type { TransactionSql } from "postgres";
import type { Identity } from "@/features/auth/service";
import { eligible, notify } from "@/features/quotes/policy";
import { collaborationCommand } from "@/features/collaboration/boundary";
export async function workContext(sql: TransactionSql, id: string, actor: Identity) {
  const [ref] = await sql`select job_id from public.bookings where id=${id}::uuid`;
  if (!ref) throw new Error("FORBIDDEN");
  await sql`select id from public.job_requests where id=${ref.job_id}::uuid for update`;
  const [b] =
    await sql`select b.id,b.job_id,b.worker_id,b.status,b.version,b.scheduled_start,b.scheduled_end,b.final_total_cents,j.client_id,j.title,j.public_town,j.status as job_status,w.user_id as worker_user,exists(select 1 from private.user_blocks x where (x.owner_id=j.client_id and x.subject_id=w.user_id)or(x.owner_id=w.user_id and x.subject_id=j.client_id)) as blocked,exists(select 1 from public.disputes d where d.booking_id=b.id and d.status in('open','investigating','awaiting_evidence')) as disputed from public.bookings b join public.job_requests j on j.id=b.job_id join public.worker_profiles w on w.id=b.worker_id join public.user_profiles u on u.user_id=${actor.id}::uuid where b.id=${id}::uuid and ((j.client_id=u.user_id and u.client_enabled)or(w.user_id=u.user_id and u.worker_enabled)) for update of b`;
  if (!b || !b.scheduled_start || !b.scheduled_end) throw new Error("FORBIDDEN");
  return {
    id: String(b.id),
    jobId: String(b.job_id),
    workerId: String(b.worker_id),
    clientId: String(b.client_id),
    workerUser: String(b.worker_user),
    client: b.client_id === actor.id,
    status: String(b.status),
    version: Number(b.version),
    start: new Date(b.scheduled_start).toISOString(),
    end: new Date(b.scheduled_end).toISOString(),
    baseCents: Number(b.final_total_cents),
    blocked: !!b.blocked,
    disputed: !!b.disputed,
  };
}
export type WorkContext = Awaited<ReturnType<typeof workContext>>;
export function workMutation<T extends Record<string, unknown>>(
  action: string,
  input: { bookingId: string },
  key: string | null,
  run: (sql: TransactionSql, b: WorkContext, actor: Identity) => Promise<T>,
) {
  let context: WorkContext;
  return collaborationCommand(
    action,
    input,
    key,
    (sql, actor) => run(sql, context, actor),
    async (sql, actor) => {
      context = await workContext(sql, input.bookingId, actor);
    },
  );
}
export function currentVersion(b: WorkContext, version: number) {
  if (b.version !== version) throw new Error("CONFLICT");
}
export async function activeWork(sql: TransactionSql, b: WorkContext, statuses: string[]) {
  if (!statuses.includes(b.status) || b.disputed) throw new Error("CONFLICT");
  if (b.blocked) throw new Error("BLOCKED");
  await eligible(sql, b.jobId, b.workerId, false);
  const [card] =
    await sql`select worker_id from public.worker_cards where worker_id=${b.workerId}::uuid and safe_until>clock_timestamp()`;
  if (!card) throw new Error("ELIGIBILITY");
}
export async function recordWork(
  sql: TransactionSql,
  b: WorkContext,
  actor: Identity,
  type: string,
  status = b.status,
  reference?: string,
  window?: { start: string; end: string },
) {
  await sql`update public.bookings set status=${status}::public.booking_status,scheduled_start=coalesce(${window?.start ?? null}::timestamptz,scheduled_start),scheduled_end=coalesce(${window?.end ?? null}::timestamptz,scheduled_end),completion_requested_at=case when ${status}='completion_pending' and ${b.status}<>'completion_pending' then clock_timestamp() else completion_requested_at end,completion_confirmed_at=case when ${status}='completed' then clock_timestamp() else completion_confirmed_at end,version=version+1,updated_at=clock_timestamp() where id=${b.id}::uuid`;
  const jobStatus = status === "confirmed" ? "booked" : status;
  await sql`update public.job_requests set status=${jobStatus}::public.job_status,version=version+1,updated_at=clock_timestamp() where id=${b.jobId}::uuid`;
  await sql`insert into public.booking_events(booking_id,actor_id,event_type,from_status,to_status,payload) values(${b.id}::uuid,${actor.id}::uuid,${type},${b.status},${status},${sql.json({ reference: reference ?? null, participantReport: true, paymentAction: false })})`;
  await notify(
    sql,
    b.client ? b.workerUser : b.clientId,
    "workflow-" + type,
    b.id + ":" + (b.version + 1),
    "/app/" + (b.client ? "worker" : "client") + "/bookings/" + b.id,
  );
  return { jobId: b.jobId, bookingId: b.id, version: b.version + 1 };
}
export async function supersedeProposals(
  sql: TransactionSql,
  id: string,
  except: string | null = null,
) {
  await sql`update private.booking_reschedules set status='superseded' where booking_id=${id}::uuid and status='proposed' and id is distinct from ${except}::uuid`;
  await sql`update public.change_orders set status='superseded' where booking_id=${id}::uuid and status='proposed' and id is distinct from ${except}::uuid`;
}
export async function expireProposals(sql: TransactionSql, id: string) {
  await sql`update private.booking_reschedules set status='expired' where booking_id=${id}::uuid and status='proposed' and expires_at<=clock_timestamp()`;
  await sql`update public.change_orders set status='expired' where booking_id=${id}::uuid and status='proposed' and expires_at<=clock_timestamp()`;
}
