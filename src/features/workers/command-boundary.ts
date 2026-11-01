import "server-only";
import { createHash } from "node:crypto";
import type { TransactionSql } from "postgres";
import { database } from "@/lib/db/server";
import { getVerifiedIdentity, type Identity } from "@/features/auth/service";
import { workerConfig } from "./config";
export type Result = Record<string, string | number | boolean | null>;
export type LockedWorker = {
  id: string;
  user_id: string;
  status: string;
  business_id: string | null;
  revision: number | null;
  state: string | null;
  draft_json: unknown;
  area_id: string | null;
};
export async function workerActor(staff = false) {
  if (!workerConfig()) throw new Error("UNAVAILABLE");
  const actor = await getVerifiedIdentity();
  if (!actor) throw new Error("UNAUTHORIZED");
  if (actor.profile?.is_suspended) throw new Error("FORBIDDEN");
  if (
    staff
      ? !actor.aal2 || !["owner", "verification"].includes(actor.adminRole ?? "")
      : !actor.profile?.worker_enabled
  )
    throw new Error("FORBIDDEN");
  return actor;
}
export async function lockWorker(
  sql: TransactionSql,
  actor: Identity,
  workerId: string | null,
  staff = false,
  targetPolicy: "active" | "retention" = "active",
) {
  // This is the same serialization point used by M01 publication/revocation.
  // Do not lock user_profiles here: M02 updates that row before its invalidator.
  await sql`select pg_advisory_xact_lock(hashtextextended('duzelo.worker-publication',0))`;
  const session =
    await sql`select id from auth.sessions where id=${actor.sessionId}::uuid and user_id=${actor.id}::uuid and (not_after is null or not_after>now()) for share`;
  const account =
    await sql`select worker_enabled,is_suspended from public.user_profiles where user_id=${actor.id}::uuid`;
  if (!session.length) throw new Error("UNAUTHORIZED");
  if (!account.length || account[0]!.is_suspended) throw new Error("FORBIDDEN");
  if (staff) {
    const roles =
      await sql`select admin_role from private.admin_members where user_id=${actor.id}::uuid and active and admin_role in ('owner','verification')`;
    const factors =
      await sql`select id from auth.mfa_factors where user_id=${actor.id}::uuid and status='verified' for share`;
    if (!actor.aal2 || !roles.length || !factors.length) throw new Error("FORBIDDEN");
  } else if (!account[0]!.worker_enabled) throw new Error("FORBIDDEN");
  const rows = workerId
    ? await sql`select w.*,a.revision,a.state,a.draft_json,a.area_id from public.worker_profiles w left join private.worker_applications a on a.worker_id=w.id where w.id=${workerId}::uuid for update of w`
    : await sql`select w.*,a.revision,a.state,a.draft_json,a.area_id from public.worker_profiles w left join private.worker_applications a on a.worker_id=w.id where w.user_id=${actor.id}::uuid for update of w`;
  const worker = rows[0] as LockedWorker | undefined;
  if (
    !worker ||
    (staff
      ? worker.user_id === actor.id
      : worker.user_id !== actor.id || worker.status === "suspended")
  )
    throw new Error("FORBIDDEN");
  if (staff) {
    const owner =
      await sql`select is_suspended from public.user_profiles where user_id=${worker.user_id}::uuid`;
    if (
      !owner.length ||
      (targetPolicy === "active" && (worker.status === "suspended" || owner[0]!.is_suspended))
    )
      throw new Error("FORBIDDEN");
  }
  return worker;
}
export async function command<T extends Result>(
  action: string,
  input: unknown,
  key: string | null,
  staff: boolean,
  target: string | null,
  run: (sql: TransactionSql, worker: LockedWorker, actor: Identity) => Promise<T>,
  targetPolicy: "active" | "retention" = "active",
) {
  if (!key || !/^[-a-zA-Z0-9_]{16,128}$/.test(key)) throw new Error("INVALID");
  const actor = await workerActor(staff);
  const hash = createHash("sha256").update(JSON.stringify({ action, input })).digest("hex");
  return database().begin(async (sql) => {
    await sql`select pg_advisory_xact_lock(hashtextextended(${actor.id + ":" + key},2))`;
    const worker = await lockWorker(sql, actor, target, staff, targetPolicy);
    const prior =
      await sql`select request_hash,status,response_json from private.command_idempotency where actor_id=${actor.id}::uuid and idempotency_key=${key}`;
    if (prior.length) {
      if (prior[0]!.request_hash !== hash) throw new Error("CONFLICT");
      if (prior[0]!.status === "completed") return prior[0]!.response_json as T;
      throw new Error("CONFLICT");
    }
    const result = await run(sql, worker, actor);
    await sql`insert into private.command_idempotency(actor_id,idempotency_key,request_hash,status,response_json,expires_at) values (${actor.id}::uuid,${key},${hash},'completed',${sql.json(result)},now()+interval '1 day')`;
    await sql`insert into private.audit_events(actor_id,actor_type,action,resource_kind,resource_id) values (${actor.id}::uuid,'user',${"worker." + action},'worker_profile',${worker.id}::uuid)`;
    return result;
  });
}
