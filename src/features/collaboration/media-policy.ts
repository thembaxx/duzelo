import "server-only";
import type { TransactionSql } from "postgres";
import type { Identity } from "@/features/auth/service";
import { requireThreadSend, threadContext } from "@/features/messages/policy";
import { workContext, activeWork } from "@/features/workflow/policy";
import { uploadSchema } from "@/features/messages/schema";
import type { z } from "zod";
import { auditGrant } from "@/features/workflow/audit-policy";
export async function uploadContext(
  sql: TransactionSql,
  meta: z.infer<typeof uploadSchema>,
  actor: Identity,
) {
  if (meta.purpose === "message") {
    const c = await requireThreadSend(sql, meta.conversationId, actor);
    return { jobId: c.job_id, conversationId: c.id, bookingId: null, disputeId: null };
  }
  if (meta.purpose === "completion") {
    const b = await workContext(sql, meta.bookingId, actor);
    if (b.client) throw new Error("FORBIDDEN");
    await activeWork(sql, b, ["in_progress"]);
    return { jobId: b.jobId, bookingId: b.id, conversationId: null, disputeId: null };
  }
  const [d] =
    await sql`select booking_id,status from public.disputes where id=${meta.disputeId}::uuid`;
  if (!d || !["open", "investigating", "awaiting_evidence"].includes(d.status))
    throw new Error("FORBIDDEN");
  const b = await workContext(sql, String(d.booking_id), actor);
  if (b.status !== "disputed") throw new Error("FORBIDDEN");
  return { jobId: b.jobId, bookingId: b.id, conversationId: null, disputeId: meta.disputeId };
}
export async function assetPermission(
  sql: TransactionSql,
  id: string,
  actor: Identity,
  grantId?: string,
) {
  const [a] =
    await sql`select * from private.collaboration_assets where id=${id}::uuid and state='stored' and retain_until>clock_timestamp() for update`;
  if (!a) throw new Error("FORBIDDEN");
  if (grantId) {
    const g = await auditGrant(sql, grantId, actor);
    if (
      !(
        (g.resource_kind === "booking" &&
          (g.resource_id === a.booking_id ||
            (g.conversation_id !== null && g.conversation_id === a.conversation_id))) ||
        (g.resource_kind === "conversation" && g.resource_id === a.conversation_id) ||
        (g.resource_kind === "dispute" &&
          (g.resource_id === a.dispute_id ||
            g.booking_id === a.booking_id ||
            g.conversation_id === a.conversation_id))
      )
    )
      throw new Error("FORBIDDEN");
    if (!a.attached) throw new Error("FORBIDDEN");
  } else if (a.purpose === "message") {
    const c = await threadContext(sql, String(a.conversation_id), actor);
    if (!c.canRead || (!a.attached && a.owner_id !== actor.id)) throw new Error("FORBIDDEN");
  } else {
    const b = await workContext(sql, String(a.booking_id), actor);
    if (a.purpose === "case") {
      if (a.owner_id !== actor.id) throw new Error("FORBIDDEN");
    } else if (!b.client) {
      await activeWork(sql, { ...b, disputed: false }, [
        "in_progress",
        "completion_pending",
        "disputed",
        "completed",
      ]);
    }
    if (!a.attached && a.owner_id !== actor.id) throw new Error("FORBIDDEN");
  }
  return {
    jobId: String(a.job_id),
    path: String(a.storage_path),
    expires: new Date(a.retain_until).getTime(),
  };
}
