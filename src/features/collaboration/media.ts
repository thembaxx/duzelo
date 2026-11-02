import "server-only";
import { z } from "zod";
import { database } from "@/lib/db/server";
import { getVerifiedIdentity } from "@/features/auth/service";
import { lockActor } from "@/features/jobs/boundary";
import { workerStorage } from "@/features/workers/storage";
import { accessSchema } from "@/features/messages/schema";
import {
  collaborationActor,
  collaborationCommand,
  staffActor,
  staffCommand,
  lockStaff,
  requireWorkflow,
} from "./boundary";
import { COLLABORATION_BUCKET } from "./config";
import { assetPermission } from "./media-policy";
import { signTicket, verifyTicket } from "./tickets";
export async function mediaAccess(input: unknown, key: string | null) {
  const data = accessSchema.parse(input),
    config = requireWorkflow();
  const run = async (
    sql: Parameters<Parameters<typeof collaborationCommand>[3]>[0],
    actor: Awaited<ReturnType<typeof collaborationActor>>,
  ) => {
    const a = await assetPermission(sql, data.assetId, actor, data.grantId);
    await sql`insert into private.audit_events(actor_id,actor_type,action,resource_kind,resource_id,metadata_redacted) values(${actor.id}::uuid,${data.grantId ? "admin" : "user"},'workflow.evidence-view','job_request',${a.jobId}::uuid,${sql.json({ assetId: data.assetId, grantId: data.grantId ?? null })})`;
    return {
      jobId: a.jobId,
      assetId: data.assetId,
      expires: Math.min(a.expires, Date.now() + config.ticketSeconds * 1000),
    };
  };
  const before = async (sql: Parameters<typeof run>[0], actor: Parameters<typeof run>[1]) => {
    await assetPermission(sql, data.assetId, actor, data.grantId);
  };
  const grant = data.grantId
    ? await staffCommand("media.access", data, key, run, before)
    : await collaborationCommand("media.access", data, key, run, before);
  const actor = data.grantId ? await staffActor() : await collaborationActor();
  if (grant.expires <= Date.now()) throw new Error("FORBIDDEN");
  return {
    ticket: signTicket(
      {
        assetId: grant.assetId,
        expires: grant.expires,
        actorId: actor.id,
        sessionId: actor.sessionId,
        ...(data.grantId ? { grantId: data.grantId } : {}),
      },
      config.secret,
    ),
    expiresAt: grant.expires,
  };
}
export async function evidenceImage(id: string, token: string | null) {
  z.guid().parse(id);
  const config = requireWorkflow(),
    actor = await getVerifiedIdentity();
  if (!actor) throw new Error("UNAUTHORIZED");
  const ticket = verifyTicket(token ?? "", config.secret, id, actor.id, actor.sessionId);
  const authorize = () =>
    database().begin(async (sql) => {
      if (ticket.grantId) await lockStaff(sql, actor);
      else await lockActor(sql, actor, "either");
      return assetPermission(sql, id, actor, ticket.grantId);
    });
  const asset = await authorize();
  const file = await workerStorage().from(COLLABORATION_BUCKET).download(asset.path);
  if (file.error || !file.data) throw new Error("UNAVAILABLE");
  const bytes = await file.data.arrayBuffer();
  await authorize();
  verifyTicket(token!, config.secret, id, actor.id, actor.sessionId);
  return new Response(bytes, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": 'inline; filename="work-evidence.jpg"',
      "Referrer-Policy": "no-referrer",
    },
  });
}
