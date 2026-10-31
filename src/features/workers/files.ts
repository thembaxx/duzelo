import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { database } from "@/lib/db/server";
import { getVerifiedIdentity } from "@/features/auth/service";
import { workerActor, lockWorker, command } from "./command-boundary";
import { assetSchema } from "./schema";
import { sanitizeImage } from "./images";
import { workerConfig, WORKER_BUCKET } from "./config";
import { workerStorage } from "./storage";
const keySchema = z.string().regex(/^[-a-zA-Z0-9_]{16,128}$/);
export async function uploadWorkerImage(input: unknown, file: File, key: string | null) {
  key = keySchema.parse(key);
  const config = workerConfig();
  if (!config) throw new Error("UNAVAILABLE");
  const actor = await workerActor();
  const meta = assetSchema.parse(input);
  const image = await sanitizeImage(Buffer.from(await file.arrayBuffer()), file.type);
  const hash = createHash("sha256")
    .update(JSON.stringify({ action: "worker.upload", meta, sha: image.sha256 }))
    .digest("hex");
  const asset = await database().begin(async (sql) => {
    await sql`select pg_advisory_xact_lock(hashtextextended(${actor.id + ":" + key},2))`;
    const worker = await lockWorker(sql, actor, null);
    if (worker.state !== "draft" || !worker.revision) throw new Error("CONFLICT");
    const prior =
      await sql`select request_hash,response_json from private.command_idempotency where actor_id=${actor.id}::uuid and idempotency_key=${key!}`;
    if (prior.length) {
      if (prior[0]!.request_hash !== hash) throw new Error("CONFLICT");
      const id = String(prior[0]!.response_json.assetId);
      const found =
        await sql`select * from private.worker_assets where id=${id}::uuid and worker_id=${worker.id}::uuid and application_revision=${worker.revision} and state in ('pending','stored')`;
      if (!found.length) throw new Error("CONFLICT");
      return found[0]!;
    }
    if (meta.kind === "business" && !worker.business_id) throw new Error("INVALID");
    if (meta.categoryId) {
      const categories =
        await sql`select id from public.worker_services where worker_id=${worker.id}::uuid and category_id=${meta.categoryId}::uuid and active`;
      if (!categories.length) throw new Error("INVALID");
    }
    const count =
      await sql`select count(*)::int as count from private.worker_assets where worker_id=${worker.id}::uuid and application_revision=${worker.revision} and state in ('pending','stored')`;
    const same =
      await sql`select count(*)::int as count from private.worker_assets where worker_id=${worker.id}::uuid and application_revision=${worker.revision} and kind=${meta.kind} and category_id is not distinct from ${meta.categoryId}::uuid and state in ('pending','stored')`;
    if (
      count[0]!.count >= 24 ||
      same[0]!.count >= (meta.kind === "avatar" ? 1 : meta.kind === "portfolio" ? 6 : 3)
    )
      throw new Error("FILE_LIMIT");
    const id = randomUUID(),
      path = worker.id + "/" + id + ".jpg";
    const added =
      await sql`insert into private.worker_assets(id,worker_id,application_revision,kind,category_id,storage_path,sha256,byte_size,caption,retain_until) values (${id}::uuid,${worker.id}::uuid,${worker.revision},${meta.kind},${meta.categoryId}::uuid,${path},${image.sha256},${image.bytes.length},${meta.caption},now()+${config.retentionDays}::integer*interval '1 day') returning *`;
    await sql`insert into private.command_idempotency(actor_id,idempotency_key,request_hash,status,response_json,expires_at) values (${actor.id}::uuid,${key!},${hash},'in_progress',${sql.json({ assetId: id })},now()+interval '1 day')`;
    await sql`insert into private.audit_events(actor_id,actor_type,action,resource_kind,resource_id) values (${actor.id}::uuid,'user','worker.upload-reserved','worker_asset',${id}::uuid)`;
    return added[0]!;
  });
  if (asset.state === "stored")
    return { message: "Image already stored.", assetId: String(asset.id) };
  const storage = workerStorage().from(WORKER_BUCKET);
  const uploaded = await storage.upload(String(asset.storage_path), image.bytes, {
    contentType: "image/jpeg",
    upsert: false,
    cacheControl: "0",
  });
  if (uploaded.error) {
    // Reconcile interruption after native Storage succeeded but before DB commit.
    const previous = await storage.download(String(asset.storage_path));
    if (
      previous.error ||
      !previous.data ||
      createHash("sha256")
        .update(Buffer.from(await previous.data.arrayBuffer()))
        .digest("hex") !== image.sha256
    )
      throw new Error("UNAVAILABLE");
  }
  await database().begin(async (sql) => {
    await sql`select pg_advisory_xact_lock(hashtextextended(${actor.id + ":" + key},2))`;
    const worker = await lockWorker(sql, actor, String(asset.worker_id));
    if (worker.revision !== asset.application_revision || worker.state !== "draft")
      throw new Error("CONFLICT");
    const rows =
      await sql`select state from private.worker_assets where id=${asset.id}::uuid for update`;
    if (rows[0]?.state === "stored") return;
    if (rows[0]?.state !== "pending") throw new Error("CONFLICT");
    await sql`update private.worker_assets set state='stored' where id=${asset.id}::uuid`;
    if (["identity", "business", "trade"].includes(meta.kind)) {
      const verified =
        await sql`insert into private.worker_verifications(worker_id,application_revision,kind,category_id,status) values (${worker.id}::uuid,${worker.revision},${meta.kind},${meta.categoryId}::uuid,'submitted') on conflict(worker_id,application_revision,kind,category_id) do update set status='submitted' returning id`;
      await sql`insert into private.verification_documents(verification_id,storage_path,content_type,asset_id) values (${verified[0]!.id}::uuid,${asset.storage_path},'image/jpeg',${asset.id}::uuid)`;
    }
    await sql`update private.command_idempotency set status='completed' where actor_id=${actor.id}::uuid and idempotency_key=${key!} and request_hash=${hash}`;
    await sql`insert into private.audit_events(actor_id,actor_type,action,resource_kind,resource_id) values (${actor.id}::uuid,'user','worker.upload-stored','worker_asset',${asset.id}::uuid)`;
  });
  return { message: "Image checked and stored privately.", assetId: String(asset.id) };
}
export async function documentAccess(input: unknown, key: string | null) {
  const { assetId } = z.object({ assetId: z.guid() }).strict().parse(input);
  const config = workerConfig();
  if (!config) throw new Error("UNAVAILABLE");
  const actor = await getVerifiedIdentity();
  if (!actor) throw new Error("UNAUTHORIZED");
  const assets =
    await database()`select a.worker_id,w.user_id from private.worker_assets a join public.worker_profiles w on w.id=a.worker_id where a.id=${assetId}::uuid`;
  if (!assets.length) throw new Error("FORBIDDEN");
  const staff = assets[0]!.user_id !== actor.id;
  const grant = await command(
    "document-access",
    { assetId },
    key,
    staff,
    String(assets[0]!.worker_id),
    async (sql, w, current) => {
      const files =
        await sql`select id from private.worker_assets where id=${assetId}::uuid and worker_id=${w.id}::uuid and state='stored' and retain_until>now()`;
      if (!files.length) throw new Error("FORBIDDEN");
      const deadline = await sql`select (extract(epoch from now())::bigint+60)::text as expires`;
      await sql`insert into private.audit_events(actor_id,actor_type,action,resource_kind,resource_id,metadata_redacted) values (${current.id}::uuid,'user','worker.document-access','worker_asset',${assetId}::uuid,${sql.json({ purpose: staff ? "verification" : "owner" })})`;
      return { assetId, expires: String(deadline[0]!.expires) };
    },
  );
  const remaining = Math.min(60, Number(grant.expires) - Math.ceil(Date.now() / 1000));
  if (remaining < 1) throw new Error("EXPIRED_ACCESS");
  const files =
    await database()`select storage_path from private.worker_assets where id=${assetId}::uuid and state='stored' and retain_until>now()`;
  if (!files.length) throw new Error("FORBIDDEN");
  const signed = await workerStorage()
    .from(WORKER_BUCKET)
    .createSignedUrl(String(files[0]!.storage_path), remaining, {
      download: "verification-image.jpg",
    });
  if (signed.error || !signed.data) throw new Error("UNAVAILABLE");
  if (new URL(signed.data.signedUrl).origin !== new URL(config.url).origin)
    throw new Error("UNAVAILABLE");
  return { url: signed.data.signedUrl, expiresIn: remaining };
}
export async function purgeExpired(input: unknown, key: string | null) {
  key = keySchema.parse(key);
  const { workerId } = z.object({ workerId: z.guid() }).strict().parse(input);
  const stageKey = createHash("sha256")
    .update("purge-stage:" + key)
    .digest("hex");
  const intent = await command(
    "purge-request",
    { workerId },
    stageKey,
    true,
    workerId,
    async (sql, w) => {
      const files =
        await sql`update private.worker_assets set state='purge_pending',public_approved=false where worker_id=${w.id}::uuid and (retain_until<=now() or (state='pending' and created_at<now()-interval '1 hour')) and state in ('stored','pending','purge_pending') returning id`;
      const ids = files.map((f) => String(f.id));
      if (ids.length)
        await sql`update private.worker_verifications v set status='expired' where exists(select 1 from private.verification_documents d where d.verification_id=v.id and d.asset_id=any(${sql.array(ids)}::uuid[]))`;
      return { ids: JSON.stringify(ids) };
    },
  );
  const ids = JSON.parse(intent.ids) as string[];
  if (!ids.length) return { message: "No expired files need removal." };
  const rows =
    await database()`select storage_path from private.worker_assets where id=any(${database().array(ids)}::uuid[]) and worker_id=${workerId}::uuid and state='purge_pending'`;
  if (rows.length) {
    const removed = await workerStorage()
      .from(WORKER_BUCKET)
      .remove(rows.map((r) => String(r.storage_path)));
    if (removed.error) throw new Error("UNAVAILABLE");
  }
  const doneKey = createHash("sha256")
    .update("purge-finish:" + key)
    .digest("hex");
  return command("purge-complete", { workerId, ids }, doneKey, true, workerId, async (sql, w) => {
    await sql`update private.worker_assets set state='purged' where worker_id=${w.id}::uuid and id=any(${sql.array(ids)}::uuid[]) and state='purge_pending'`;
    await sql`update private.verification_documents set deleted_at=now() where asset_id=any(${sql.array(ids)}::uuid[]) and deleted_at is null`;
    return { message: "Expired private files removed." };
  });
}
