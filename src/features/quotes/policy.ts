import "server-only";
import type { TransactionSql } from "postgres";
import type { Identity } from "@/features/auth/service";
import { jobActor, jobCommand } from "@/features/jobs/boundary";
import { quotesConfig } from "./config";
export function requireQuotes() {
  if (!quotesConfig()) throw new Error("UNAVAILABLE");
}
export async function quoteActor(worker = false) {
  requireQuotes();
  return jobActor(worker);
}
export interface JobContext {
  id: string;
  client_id: string;
  status: string;
  version: number;
  title: string;
  description: string;
  public_town: string;
  category_id: string;
  match: { id: string; worker_id: string; status: string; expires_at: string | null } | null;
}
export async function lockJob(
  sql: TransactionSql,
  id: string,
  actor: Identity,
  worker = false,
): Promise<JobContext> {
  const [job] =
    await sql`select id,client_id,status,version,title,description,public_town,category_id from public.job_requests where id=${id}::uuid for update`;
  if (!job) throw new Error("FORBIDDEN");
  if (worker) {
    const [match] =
      await sql`select m.id,m.worker_id,m.status,m.expires_at from public.job_matches m join public.worker_profiles w on w.id=m.worker_id where m.job_id=${id}::uuid and w.user_id=${actor.id}::uuid`;
    if (!match) throw new Error("FORBIDDEN");
    return {
      id: String(job.id),
      client_id: String(job.client_id),
      status: String(job.status),
      version: Number(job.version),
      title: String(job.title),
      description: String(job.description),
      public_town: String(job.public_town),
      category_id: String(job.category_id),
      match: {
        id: String(match.id),
        worker_id: String(match.worker_id),
        status: String(match.status),
        expires_at: match.expires_at ? new Date(match.expires_at).toISOString() : null,
      },
    };
  }
  if (job.client_id !== actor.id) throw new Error("FORBIDDEN");
  return {
    id: String(job.id),
    client_id: String(job.client_id),
    status: String(job.status),
    version: Number(job.version),
    title: String(job.title),
    description: String(job.description),
    public_town: String(job.public_town),
    category_id: String(job.category_id),
    match: null,
  };
}
export async function eligible(
  sql: TransactionSql,
  jobId: string,
  workerId: string,
  available = true,
) {
  const [row] =
    await sql`select private.agreement_worker_eligible(${jobId}::uuid,${workerId}::uuid,${available}) as allowed`;
  if (!row?.allowed) throw new Error("ELIGIBILITY");
}
export async function freeTime(
  sql: TransactionSql,
  workerId: string,
  start: string,
  end: string,
  booking: string | null = null,
  grant: string | null = null,
) {
  await sql`select pg_advisory_xact_lock(hashtextextended(${"duzelo.appointment:" + workerId},4))`;
  const [row] =
    await sql`select private.worker_time_free(${workerId}::uuid,${start}::timestamptz,${end}::timestamptz,${booking}::uuid,${grant}::uuid) as free`;
  if (!row?.free) throw new Error("SCHEDULE");
}
export async function notify(
  sql: TransactionSql,
  userId: string,
  kind: string,
  resource: string,
  href: string,
) {
  const key = kind + ":" + resource;
  const [row] =
    await sql`insert into private.notification_outbox(dedupe_key,user_id,channel,template,payload) values (${key},${userId}::uuid,'in_app',${kind},${sql.json({ reference: resource })}) on conflict(dedupe_key) do nothing returning id`;
  if (!row) return;
  const [recipient] =
    await sql`select in_app_notifications,not is_suspended as active from public.user_profiles where user_id=${userId}::uuid`;
  if (recipient?.in_app_notifications && recipient.active) {
    await sql`insert into public.notifications(user_id,kind,title,body,href,source_outbox_id) values (${userId}::uuid,${kind},'Your service request has an update','Open your private workspace to review the current status.',${href},${row.id}::uuid) on conflict(source_outbox_id) do nothing`;
    await sql`update private.notification_outbox set status='sent',attempts=1 where id=${row.id}::uuid`;
  } else
    await sql`update private.notification_outbox set status='dead_letter',attempts=1 where id=${row.id}::uuid`;
}
export async function quoteCommand<T extends Record<string, unknown>>(
  action: string,
  input: unknown,
  key: string | null,
  worker: boolean,
  run: (sql: TransactionSql, actor: Identity) => Promise<T>,
  beforeReplay?: (sql: TransactionSql, actor: Identity) => Promise<void>,
) {
  requireQuotes();
  return jobCommand("agreements." + action, input, key, worker, run, beforeReplay);
}
