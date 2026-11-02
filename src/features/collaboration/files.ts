import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { database } from "@/lib/db/server";
import { allowAuthAttempt } from "@/features/auth/rate-limit";
import { lockActor } from "@/features/jobs/boundary";
import { workerStorage } from "@/features/workers/storage";
import { scanWorkerImage } from "@/features/workers/antivirus";
import { sanitizeImage } from "@/features/workers/images";
import { uploadSchema } from "@/features/messages/schema";
import { requireWorkflow, collaborationActor } from "./boundary";
import { COLLABORATION_BUCKET } from "./config";
import { uploadContext } from "./media-policy";
export async function uploadEvidence(input: unknown, file: File, key: string | null) {
  const config = requireWorkflow();
  key = z
    .string()
    .regex(/^[-a-zA-Z0-9_]{16,128}$/)
    .parse(key);
  const meta = uploadSchema.parse(input),
    actor = await collaborationActor();
  if (!(await allowAuthAttempt("workflow-upload", actor.id, 20, 60))) throw new Error("LIMITED");
  await database().begin(async (sql) => {
    await lockActor(sql, actor, "either");
    await uploadContext(sql, meta, actor);
  });
  if (file.size > 3145728) throw new Error("FILE");
  const raw = Buffer.from(await file.arrayBuffer());
  await scanWorkerImage(raw);
  const image = await sanitizeImage(raw, file.type),
    hash = createHash("sha256")
      .update(JSON.stringify({ action: "collaboration.upload", meta, sha: image.sha256 }))
      .digest("hex");
  const asset = await database().begin(async (sql) => {
    await sql`select pg_advisory_xact_lock(hashtextextended(${actor.id + ":" + key},2))`;
    await lockActor(sql, actor, "either");
    const c = await uploadContext(sql, meta, actor);
    const [prior] =
      await sql`select request_hash,response_json from private.command_idempotency where actor_id=${actor.id}::uuid and idempotency_key=${key}`;
    if (prior) {
      if (prior.request_hash !== hash) throw new Error("CONFLICT");
      const [found] =
        await sql`select * from private.collaboration_assets where id=${prior.response_json.assetId}::uuid and owner_id=${actor.id}::uuid and state in('pending','stored') and retain_until>clock_timestamp()`;
      if (!found) throw new Error("CONFLICT");
      return found;
    }
    const [count] =
      await sql`select count(*) filter(where job_id=${c.jobId}::uuid)::int as job,count(*) filter(where not attached)::int as drafts from private.collaboration_assets where owner_id=${actor.id}::uuid and state in('pending','stored')`;
    if (count!.job >= 80 || count!.drafts >= 20) throw new Error("FILE_LIMIT");
    const id = randomUUID(),
      path = actor.id + "/" + id + ".jpg";
    const [a] =
      await sql`insert into private.collaboration_assets(id,owner_id,job_id,conversation_id,booking_id,dispute_id,purpose,storage_path,sha256,byte_size,retain_until) values(${id}::uuid,${actor.id}::uuid,${c.jobId}::uuid,${c.conversationId}::uuid,${c.bookingId}::uuid,${c.disputeId}::uuid,${meta.purpose},${path},${image.sha256},${image.bytes.length},clock_timestamp()+${config.retentionDays}::integer*interval '1 day') returning *`;
    await sql`insert into private.command_idempotency(actor_id,idempotency_key,request_hash,status,response_json,expires_at) values(${actor.id}::uuid,${key},${hash},'in_progress',${sql.json({ assetId: id })},clock_timestamp()+interval '1 day')`;
    await sql`insert into private.audit_events(actor_id,actor_type,action,resource_kind,resource_id) values(${actor.id}::uuid,'user','workflow.upload-reserved','job_request',${c.jobId}::uuid)`;
    return a!;
  });
  if (asset.state !== "stored") {
    const storage = workerStorage().from(COLLABORATION_BUCKET);
    const upload = await storage.upload(String(asset.storage_path), image.bytes, {
      contentType: "image/jpeg",
      upsert: false,
      cacheControl: "0",
    });
    if (upload.error) {
      const prior = await storage.download(String(asset.storage_path));
      if (
        prior.error ||
        !prior.data ||
        createHash("sha256")
          .update(Buffer.from(await prior.data.arrayBuffer()))
          .digest("hex") !== image.sha256
      )
        throw new Error("UNAVAILABLE");
    }
    await database().begin(async (sql) => {
      await sql`select pg_advisory_xact_lock(hashtextextended(${actor.id + ":" + key},2))`;
      await lockActor(sql, actor, "either");
      await uploadContext(sql, meta, actor);
      const [a] =
        await sql`select state,retain_until>clock_timestamp() as retained from private.collaboration_assets where id=${asset.id}::uuid for update`;
      if (!a?.retained || !["pending", "stored"].includes(a.state)) throw new Error("CONFLICT");
      await sql`update private.collaboration_assets set state='stored' where id=${asset.id}::uuid`;
      await sql`update private.command_idempotency set status='completed' where actor_id=${actor.id}::uuid and idempotency_key=${key}`;
      await sql`insert into private.audit_events(actor_id,actor_type,action,resource_kind,resource_id) values(${actor.id}::uuid,'user','workflow.upload-stored','job_request',${asset.job_id}::uuid)`;
    });
  }
  return {
    assetId: String(asset.id),
    message: "Photo scanned, metadata removed and stored privately.",
  };
}
