import "server-only";
import { createHash } from "node:crypto";
import { database } from "@/lib/db/server";
import { getVerifiedIdentity } from "@/features/auth/service";
import { saveAddressSchema } from "./schema";
import { discoveryConfig } from "./config";
export async function saveAddress(input: unknown, key: string | null) {
  if (!discoveryConfig()) throw new Error("UNAVAILABLE");
  if (!key || !/^[-a-zA-Z0-9_]{16,128}$/.test(key)) throw new Error("INVALID");
  const actor = await getVerifiedIdentity();
  if (!actor) throw new Error("UNAUTHORIZED");
  const data = saveAddressSchema.parse(input),
    hash = createHash("sha256")
      .update(JSON.stringify({ action: "discovery.address", data }))
      .digest("hex");
  return database().begin(async (sql) => {
    await sql`select pg_advisory_xact_lock(hashtextextended(${actor.id + ":" + key},2))`;
    const session =
      await sql`select id from auth.sessions where id=${actor.sessionId}::uuid and user_id=${actor.id}::uuid and (not_after is null or not_after>now()) for share`;
    if (!session.length) throw new Error("UNAUTHORIZED");
    const accounts =
      await sql`select client_enabled,is_suspended from public.user_profiles where user_id=${actor.id}::uuid for update`;
    if (!accounts[0]?.client_enabled || accounts[0].is_suspended) throw new Error("FORBIDDEN");
    const prior =
      await sql`select request_hash,response_json from private.command_idempotency where actor_id=${actor.id}::uuid and idempotency_key=${key}`;
    if (prior[0]) {
      if (prior[0].request_hash !== hash) throw new Error("CONFLICT");
      return prior[0].response_json;
    }
    const count =
      await sql`select count(*)::int as count from private.client_addresses where owner_id=${actor.id}::uuid`;
    if (count[0]!.count >= 10) throw new Error("ADDRESS_LIMIT");
    const added =
      await sql`insert into private.client_addresses(owner_id,label,street_address,town,province,point) values (${actor.id}::uuid,${data.label},${data.street},${data.town},${data.province},extensions.st_setsrid(extensions.st_makepoint(${data.point.longitude},${data.point.latitude}),4326)::extensions.geography) returning id,label,town`;
    const result = {
      id: String(added[0]!.id),
      label: String(added[0]!.label),
      town: String(added[0]!.town),
    };
    await sql`insert into private.command_idempotency(actor_id,idempotency_key,request_hash,status,response_json,expires_at) values (${actor.id}::uuid,${key},${hash},'completed',${sql.json(result)},now()+interval '1 day')`;
    await sql`insert into private.audit_events(actor_id,actor_type,action,resource_kind,resource_id) values (${actor.id}::uuid,'user','discovery.address-saved','client_address',${result.id}::uuid)`;
    return result;
  });
}
