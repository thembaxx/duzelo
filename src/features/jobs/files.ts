import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { database } from "@/lib/db/server";
import { workerStorage } from "@/features/workers/storage";
import { scanWorkerImage } from "@/features/workers/antivirus";
import { sanitizeImage } from "@/features/workers/images";
import { jobsConfig, JOB_BUCKET } from "./config";
import { jobActor, lockActor, ownerJob, jobCommand } from "./boundary";
import { assetSchema, removeSchema } from "./schema";
export async function uploadJobImage(input: unknown, file: File, key: string | null) {
  key = z
    .string()
    .regex(/^[-a-zA-Z0-9_]{16,128}$/)
    .parse(key);
  const data = assetSchema.parse(input),
    actor = await jobActor(),
    config = jobsConfig()!;
  const raw = Buffer.from(await file.arrayBuffer());
  await scanWorkerImage(raw);
  const image = await sanitizeImage(raw, file.type);
  const hash = createHash("sha256")
    .update(JSON.stringify({ action: "jobs.upload", data, sha: image.sha256 }))
    .digest("hex");
  const asset = await database().begin(async (sql) => {
    await sql`select pg_advisory_xact_lock(hashtextextended(${actor.id + ":" + key},2))`;
    await lockActor(sql, actor);
    const job = await ownerJob(sql, data.jobId, actor);
    if (job.status !== "draft") throw new Error("CONFLICT");
    const [prior] =
      await sql`select request_hash,response_json from private.command_idempotency where actor_id=${actor.id}::uuid and idempotency_key=${key}`;
    if (prior) {
      if (prior.request_hash !== hash) throw new Error("CONFLICT");
      const [found] =
        await sql`select * from private.job_assets where id=${prior.response_json.assetId}::uuid and job_id=${data.jobId}::uuid and owner_id=${actor.id}::uuid and state in ('pending','stored') and retain_until>now()`;
      if (!found) throw new Error("CONFLICT");
      return found;
    }
    const [count] =
      await sql`select count(*)::int as count from private.job_assets where job_id=${data.jobId}::uuid and state in ('pending','stored')`;
    if (count!.count >= 8) throw new Error("FILE_LIMIT");
    const id = randomUUID(),
      path = data.jobId + "/" + id + ".jpg";
    const [added] =
      await sql`insert into private.job_assets(id,job_id,owner_id,storage_path,sha256,byte_size,retain_until) values (${id}::uuid,${data.jobId}::uuid,${actor.id}::uuid,${path},${image.sha256},${image.bytes.length},now()+${config.jobRetentionDays}::int*interval '1 day') returning *`;
    await sql`insert into private.command_idempotency(actor_id,idempotency_key,request_hash,status,response_json,expires_at) values (${actor.id}::uuid,${key},${hash},'in_progress',${sql.json({ assetId: id })},now()+interval '1 day')`;
    await sql`insert into private.audit_events(actor_id,actor_type,action,resource_kind,resource_id) values (${actor.id}::uuid,'user','jobs.upload-reserved','job_asset',${id}::uuid)`;
    return added!;
  });
  if (asset.state === "stored")
    return { jobId: data.jobId, assetId: String(asset.id), message: "Photo already saved." };
  const storage = workerStorage().from(JOB_BUCKET);
  const result = await storage.upload(String(asset.storage_path), image.bytes, {
    contentType: "image/jpeg",
    upsert: false,
    cacheControl: "0",
  });
  if (result.error) {
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
    await lockActor(sql, actor);
    const job = await ownerJob(sql, data.jobId, actor);
    if (job.status !== "draft") throw new Error("CONFLICT");
    const [current] =
      await sql`select state,retain_until>now() as retained from private.job_assets where id=${asset.id}::uuid for update`;
    if (current?.state === "stored") return;
    if (current?.state !== "pending" || !current.retained) throw new Error("CONFLICT");
    await sql`update private.job_assets set state='stored' where id=${asset.id}::uuid`;
    await sql`update private.command_idempotency set status='completed' where actor_id=${actor.id}::uuid and idempotency_key=${key} and request_hash=${hash}`;
    await sql`insert into private.audit_events(actor_id,actor_type,action,resource_kind,resource_id) values (${actor.id}::uuid,'user','jobs.upload-stored','job_asset',${asset.id}::uuid)`;
  });
  return {
    jobId: data.jobId,
    assetId: String(asset.id),
    message: "Photo scanned, metadata removed and saved privately.",
  };
}
export async function removeJobImage(input: unknown, key: string | null) {
  const data = removeSchema.parse(input);
  await jobCommand("remove-photo", data, key, false, async (sql, actor) => {
    const job = await ownerJob(sql, data.jobId, actor);
    if (job.status !== "draft") throw new Error("CONFLICT");
    await sql`update private.job_assets set state='purge_pending' where id=${data.assetId}::uuid and job_id=${data.jobId}::uuid and owner_id=${actor.id}::uuid and state in ('pending','stored')`;
    return { jobId: data.jobId, assetId: data.assetId };
  });
  const actor = await jobActor();
  const [asset] =
    await database()`select storage_path from private.job_assets where id=${data.assetId}::uuid and job_id=${data.jobId}::uuid and owner_id=${actor.id}::uuid and state='purge_pending'`;
  if (asset) {
    const result = await workerStorage()
      .from(JOB_BUCKET)
      .remove([String(asset.storage_path)]);
    if (result.error) throw new Error("UNAVAILABLE");
  }
  const finishKey = createHash("sha256")
    .update("job-remove-finish:" + key)
    .digest("hex");
  return jobCommand("remove-photo-finish", data, finishKey, false, async (sql, current) => {
    await ownerJob(sql, data.jobId, current);
    await sql`update private.job_assets set state='purged' where id=${data.assetId}::uuid and job_id=${data.jobId}::uuid and owner_id=${current.id}::uuid and state='purge_pending'`;
    return { jobId: data.jobId, message: "Photo removed." };
  });
}
export async function jobImage(id: string) {
  z.guid().parse(id);
  const actor = await jobActor(false).catch(async (error) => {
    if (error instanceof Error && error.message === "FORBIDDEN") return jobActor(true);
    throw error;
  });
  const path = await database().begin(async (sql) => {
    // Dual-mode accounts can read an invitation while in either UI mode.
    await lockActor(sql, actor, !actor.profile?.client_enabled);
    const [asset] =
      await sql`select a.storage_path,a.owner_id,a.job_id from private.job_assets a where a.id=${id}::uuid and a.state='stored' and a.retain_until>now()`;
    if (!asset) throw new Error("FORBIDDEN");
    if (asset.owner_id !== actor.id) {
      const [allowed] =
        await sql`select m.id from public.job_matches m join public.worker_profiles w on w.id=m.worker_id join lateral private.job_candidates(m.job_id,w.id,true) candidate on candidate.worker_id=w.id where m.job_id=${asset.job_id}::uuid and w.user_id=${actor.id}::uuid and m.status in ('invited','viewed') and m.expires_at>now()`;
      if (!allowed) throw new Error("FORBIDDEN");
    }
    return String(asset.storage_path);
  });
  const result = await workerStorage().from(JOB_BUCKET).download(path);
  if (result.error || !result.data) throw new Error("UNAVAILABLE");
  return new Response(await result.data.arrayBuffer(), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": 'inline; filename="request-photo.jpg"',
    },
  });
}
