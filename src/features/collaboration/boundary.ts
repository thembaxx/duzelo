import "server-only";
import { createHash } from "node:crypto";
import type { TransactionSql } from "postgres";
import { database } from "@/lib/db/server";
import { getVerifiedIdentity, type Identity } from "@/features/auth/service";
import { allowAuthAttempt } from "@/features/auth/rate-limit";
import { jobActor, jobCommand } from "@/features/jobs/boundary";
import { workflowConfig } from "./config";
export function requireWorkflow() {
  const config = workflowConfig();
  if (!config) throw new Error("UNAVAILABLE");
  return config;
}
export async function collaborationActor() {
  requireWorkflow();
  return jobActor("either");
}
export function collaborationCommand<T extends Record<string, unknown>>(
  action: string,
  input: unknown,
  key: string | null,
  run: (sql: TransactionSql, actor: Identity) => Promise<T>,
  beforeReplay?: (sql: TransactionSql, actor: Identity) => Promise<void>,
) {
  requireWorkflow();
  return jobCommand("collaboration." + action, input, key, "either", run, beforeReplay);
}
export async function staffActor() {
  requireWorkflow();
  const actor = await getVerifiedIdentity();
  if (!actor) throw new Error("UNAUTHORIZED");
  if (
    !actor.aal2 ||
    actor.profile?.is_suspended ||
    !["owner", "support"].includes(actor.adminRole ?? "")
  )
    throw new Error("FORBIDDEN");
  return actor;
}
export async function lockStaff(sql: TransactionSql, actor: Identity) {
  await sql`select pg_advisory_xact_lock(hashtextextended('duzelo.worker-publication',0))`;
  const [session] =
    await sql`select id from auth.sessions where id=${actor.sessionId}::uuid and user_id=${actor.id}::uuid and (not_after is null or not_after>clock_timestamp()) for share`;
  if (!session) throw new Error("UNAUTHORIZED");
  const [role] =
    await sql`select m.admin_role from private.admin_members m join public.user_profiles u on u.user_id=m.user_id where m.user_id=${actor.id}::uuid and m.active and m.admin_role in ('owner','support') and not u.is_suspended`;
  const factors =
    await sql`select id from auth.mfa_factors where user_id=${actor.id}::uuid and status='verified' for share`;
  if (!actor.aal2 || !role || !factors.length) throw new Error("FORBIDDEN");
}
export async function staffCommand<T extends Record<string, unknown>>(
  action: string,
  input: unknown,
  key: string | null,
  run: (sql: TransactionSql, actor: Identity) => Promise<T>,
  beforeReplay?: (sql: TransactionSql, actor: Identity) => Promise<void>,
) {
  if (!key || !/^[-a-zA-Z0-9_]{16,128}$/.test(key)) throw new Error("INVALID");
  const actor = await staffActor();
  if (!(await allowAuthAttempt("workflow-admin", actor.id, 30, 60))) throw new Error("LIMITED");
  const hash = createHash("sha256").update(JSON.stringify({ action, input })).digest("hex");
  return database().begin(async (sql) => {
    await sql`select pg_advisory_xact_lock(hashtextextended(${actor.id + ":" + key},2))`;
    await lockStaff(sql, actor);
    await beforeReplay?.(sql, actor);
    const [prior] =
      await sql`select request_hash,status,response_json from private.command_idempotency where actor_id=${actor.id}::uuid and idempotency_key=${key}`;
    if (prior) {
      if (prior.request_hash !== hash || prior.status !== "completed") throw new Error("CONFLICT");
      return prior.response_json as T;
    }
    const result = await run(sql, actor);
    await sql`insert into private.command_idempotency(actor_id,idempotency_key,request_hash,status,response_json,expires_at) values(${actor.id}::uuid,${key},${hash},'completed',${sql.json(result)},clock_timestamp()+interval '1 day')`;
    await sql`insert into private.audit_events(actor_id,actor_type,action,resource_kind,resource_id) values(${actor.id}::uuid,'admin',${"workflow." + action},'job_request',${typeof result.jobId === "string" ? result.jobId : null}::uuid)`;
    return result;
  }) as Promise<T>;
}
