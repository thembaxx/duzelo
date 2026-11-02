import "server-only";
import { assetSchema } from "@/features/messages/schema";
import { threadContext } from "@/features/messages/policy";
import { workContext } from "@/features/workflow/policy";
import { collaborationCommand } from "./boundary";
export async function removeEvidence(input: unknown, key: string | null) {
  const data = assetSchema.parse(input);
  return collaborationCommand("media.remove", data, key, async (sql, actor) => {
    const [a] =
      await sql`select * from private.collaboration_assets where id=${data.assetId}::uuid and owner_id=${actor.id}::uuid and not attached for update`;
    if (!a) throw new Error("FORBIDDEN");
    if (a.conversation_id) await threadContext(sql, String(a.conversation_id), actor);
    else await workContext(sql, String(a.booking_id), actor);
    await sql`update private.collaboration_assets set state='removed' where id=${a.id}::uuid and state in('pending','stored')`;
    return {
      jobId: String(a.job_id),
      assetId: data.assetId,
      message:
        "Unsent photo withdrawn. Private bytes are queued for the retention cleanup operator.",
    };
  });
}
