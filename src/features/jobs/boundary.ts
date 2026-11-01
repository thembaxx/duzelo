import "server-only";
import { createHash } from "node:crypto";
import type { TransactionSql } from "postgres";
import { database } from "@/lib/db/server";
import { getVerifiedIdentity, type Identity } from "@/features/auth/service";
import { jobsConfig } from "./config";
export async function jobActor(worker = false) {
  if (!jobsConfig()) throw new Error("UNAVAILABLE");
  const actor = await getVerifiedIdentity();
  if (!actor) throw new Error("UNAUTHORIZED");
  if (
    actor.profile?.is_suspended ||
    !(worker ? actor.profile?.worker_enabled : actor.profile?.client_enabled)
  )
    throw new Error("FORBIDDEN");
  return actor;
}
export async function lockActor(sql: TransactionSql, actor: Identity, worker = false) {
  // M02 suspension updates the account before taking the publication lock.
  // Avoid account row locks here so that lock order cannot deadlock.
  await sql`select pg_advisory_xact_lock(hashtextextended('duzelo.worker-publication',0))`;
  const session =
    await sql`select id from auth.sessions where id=${actor.sessionId}::uuid and user_id=${actor.id}::uuid and (not_after is null or not_after>now()) for share`;
  if (!session.length) throw new Error("UNAUTHORIZED");
  const [account] =
    await sql`select client_enabled,worker_enabled,is_suspended from public.user_profiles where user_id=${actor.id}::uuid`;
  if (
    !account ||
    account.is_suspended ||
    !(worker ? account.worker_enabled : account.client_enabled)
  )
    throw new Error("FORBIDDEN");
}
export async function jobCommand<T extends Record<string, unknown>>(
  action: string,
  input: unknown,
  key: string | null,
  worker: boolean,
  run: (sql: TransactionSql, actor: Identity) => Promise<T>,
): Promise<T> {
  if (!key || !/^[-a-zA-Z0-9_]{16,128}$/.test(key)) throw new Error("INVALID");
  const actor = await jobActor(worker);
  const hash = createHash("sha256")
    .update(JSON.stringify({ action: "jobs." + action, input }))
    .digest("hex");
  return database().begin(async (sql) => {
    await sql`select pg_advisory_xact_lock(hashtextextended(${actor.id + ":" + key},2))`;
    await lockActor(sql, actor, worker);
    const [prior] =
      await sql`select request_hash,status,response_json from private.command_idempotency where actor_id=${actor.id}::uuid and idempotency_key=${key}`;
    if (prior) {
      if (prior.request_hash !== hash || prior.status !== "completed") throw new Error("CONFLICT");
      return prior.response_json as T;
    }
    const result = await run(sql, actor);
    await sql`insert into private.command_idempotency(actor_id,idempotency_key,request_hash,status,response_json,expires_at) values (${actor.id}::uuid,${key},${hash},'completed',${sql.json(result)},now()+interval '1 day')`;
    await sql`insert into private.audit_events(actor_id,actor_type,action,resource_kind,resource_id) values (${actor.id}::uuid,'user',${"jobs." + action},'job_request',${typeof result.jobId === "string" ? result.jobId : null}::uuid)`;
    return result;
  }) as Promise<T>;
}
export async function ownerJob(sql: TransactionSql, jobId: string, actor: Identity) {
  const [job] =
    await sql`select * from public.job_requests where id=${jobId}::uuid and client_id=${actor.id}::uuid for update`;
  if (!job) throw new Error("FORBIDDEN");
  return job;
}
