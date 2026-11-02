import "server-only";
import { collaborationCommand } from "@/features/collaboration/boundary";
import { lockJob, eligible, notify } from "@/features/quotes/policy";
import { openThreadSchema, sendSchema, reportSchema, unblockSchema } from "./schema";
import { threadContext, requireThreadSend } from "./policy";
export async function messageCommand(action: string, input: unknown, key: string | null) {
  if (action === "open") {
    const data = openThreadSchema.parse(input);
    return collaborationCommand("thread.open", data, key, async (sql, actor) => {
      const [q] =
        await sql`select q.id,q.job_id,q.worker_id,q.status,q.published_at,q.valid_until,j.client_id,w.user_id as worker_user from public.quotes q join public.job_requests j on j.id=q.job_id join public.worker_profiles w on w.id=q.worker_id where q.id=${data.quoteId}::uuid`;
      if (!q || !q.published_at || ![q.client_id, q.worker_user].includes(actor.id))
        throw new Error("FORBIDDEN");
      const job = await lockJob(sql, String(q.job_id), actor, q.client_id !== actor.id);
      await eligible(sql, String(q.job_id), String(q.worker_id), false);
      const [b] =
        await sql`select worker_id,status from public.bookings where job_id=${q.job_id}::uuid`;
      if (
        b
          ? b.worker_id !== q.worker_id ||
            ![
              "pending_worker",
              "confirmed",
              "in_progress",
              "completion_pending",
              "disputed",
              "completed",
            ].includes(b.status)
          : q.status !== "submitted" ||
            Date.parse(q.valid_until) <= Date.now() ||
            !["open", "matching", "quoted"].includes(job.status)
      )
        throw new Error("FORBIDDEN");
      const [thread] =
        await sql`insert into public.conversations(job_id,worker_id) values(${q.job_id}::uuid,${q.worker_id}::uuid) on conflict(job_id,worker_id) where worker_id is not null do update set worker_id=excluded.worker_id returning id`;
      for (const user of [q.client_id, q.worker_user])
        await sql`insert into public.conversation_members(conversation_id,user_id) values(${thread!.id}::uuid,${user}::uuid) on conflict do nothing`;
      return {
        jobId: String(q.job_id),
        conversationId: String(thread!.id),
        message: "Private job conversation opened.",
      };
    });
  }
  if (action === "send") {
    const data = sendSchema.parse(input);
    return collaborationCommand(
      "thread.send",
      data,
      key,
      async (sql, actor) => {
        const c = await requireThreadSend(sql, data.conversationId, actor);
        for (const id of data.assetIds) {
          const [asset] =
            await sql`select id from private.collaboration_assets where id=${id}::uuid and owner_id=${actor.id}::uuid and conversation_id=${c.id}::uuid and purpose='message' and state='stored' and not attached and retain_until>clock_timestamp() for update`;
          if (!asset) throw new Error("FORBIDDEN");
        }
        const [m] =
          await sql`insert into public.messages(conversation_id,sender_id,body) values(${c.id}::uuid,${actor.id}::uuid,${data.body}) returning id,sequence`;
        for (const id of data.assetIds)
          await sql`insert into private.message_assets(message_id,asset_id) values(${m!.id}::uuid,${id}::uuid)`;
        await notify(
          sql,
          String(c.client ? c.worker_user : c.client_id),
          "message-received",
          String(m!.id),
          "/app/inbox/" + c.id,
        );
        return {
          jobId: String(c.job_id),
          messageId: String(m!.id),
          sequence: Number(m!.sequence),
          message: "Message saved in this conversation.",
        };
      },
      async (sql, actor) => {
        await requireThreadSend(sql, data.conversationId, actor);
      },
    );
  }
  if (action === "report") {
    const data = reportSchema.parse(input);
    return collaborationCommand("thread.report", data, key, async (sql, actor) => {
      const c = await threadContext(sql, data.conversationId, actor);
      if (
        data.messageId &&
        !(
          await sql`select id from public.messages where id=${data.messageId}::uuid and conversation_id=${c.id}::uuid`
        ).length
      )
        throw new Error("FORBIDDEN");
      const other = String(c.client ? c.worker_user : c.client_id);
      const [r] =
        await sql`insert into public.safety_reports(reporter_id,subject_user_id,job_id,reason) values(${actor.id}::uuid,${other}::uuid,${c.job_id}::uuid,${data.reason}) returning id`;
      await sql`insert into private.conversation_reports(conversation_id,report_id,message_id) values(${c.id}::uuid,${r!.id}::uuid,${data.messageId}::uuid)`;
      if (data.block)
        await sql`insert into private.user_blocks(owner_id,subject_id) values(${actor.id}::uuid,${other}::uuid) on conflict do nothing`;
      await notify(sql, other, "message-paused", String(r!.id), "/app/inbox/" + c.id);
      return {
        jobId: String(c.job_id),
        reportId: String(r!.id),
        message:
          "Report saved for support review. Messages in this conversation are paused. For immediate danger, contact emergency services.",
      };
    });
  }
  if (action === "unblock") {
    const data = unblockSchema.parse(input);
    return collaborationCommand("thread.unblock", data, key, async (sql, actor) => {
      const c = await threadContext(sql, data.conversationId, actor);
      await sql`delete from private.user_blocks where owner_id=${actor.id}::uuid and subject_id=${String(c.client ? c.worker_user : c.client_id)}::uuid`;
      return {
        jobId: String(c.job_id),
        message: "Your block was removed. Any other block or pending report still pauses messages.",
      };
    });
  }
  throw new Error("INVALID");
}
