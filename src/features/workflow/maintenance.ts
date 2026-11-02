import "server-only";
import { timingSafeEqual } from "node:crypto";
import { database } from "@/lib/db/server";
import { requireWorkflow } from "@/features/collaboration/boundary";
import { workerStorage } from "@/features/workers/storage";
import { COLLABORATION_BUCKET } from "@/features/collaboration/config";
import { notify } from "@/features/quotes/policy";
export function schedulerAuthorization(header: string | null) {
  const secret = requireWorkflow().schedulerSecret;
  if (!secret) throw new Error("UNAVAILABLE");
  const expected = Buffer.from("Bearer " + secret),
    supplied = Buffer.from(header ?? "");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied))
    throw new Error("FORBIDDEN");
}
export async function remindCompletions(limit: number) {
  return database().begin(async (sql) => {
    await sql`select pg_advisory_xact_lock(hashtextextended('duzelo.worker-publication',0))`;
    const rows =
      await sql`select s.id,s.booking_id,b.job_id,j.client_id,w.user_id from private.completion_submissions s join public.bookings b on b.id=s.booking_id join public.job_requests j on j.id=b.job_id join public.worker_profiles w on w.id=b.worker_id where s.status='pending' and s.support_due_at is null and s.review_due_at<=clock_timestamp() and b.status='completion_pending' order by s.review_due_at limit ${limit} for update of s,b,j skip locked`;
    const staff =
      await sql`select user_id from private.admin_members where active and admin_role in('owner','support')`;
    for (const r of rows) {
      await sql`update private.completion_submissions set support_due_at=clock_timestamp() where id=${r.id}::uuid`;
      await sql`update public.bookings set version=version+1,updated_at=clock_timestamp() where id=${r.booking_id}::uuid`;
      await sql`update public.job_requests set version=version+1,updated_at=clock_timestamp() where id=${r.job_id}::uuid`;
      await sql`insert into public.booking_events(booking_id,event_type,from_status,to_status,payload) values(${r.booking_id}::uuid,'completion_reminder','completion_pending','completion_pending',${sql.json({ paymentAction: false, acceptance: false, supportReviewDue: true })})`;
      for (const [user, path] of [
        [r.client_id, "/app/client/bookings/" + r.booking_id],
        [r.user_id, "/app/worker/bookings/" + r.booking_id],
        ...staff.map((s) => [s.user_id, "/admin/workflow"]),
      ])
        await notify(sql, String(user), "completion-review-due", r.id + ":" + user, String(path));
      await sql`insert into private.audit_events(actor_type,action,resource_kind,resource_id) values('system','workflow.completion-reminder','job_request',${r.job_id}::uuid)`;
    }
    return { processed: rows.length, acceptance: false, paymentAction: false };
  });
}
export async function cleanupEvidence(limit: number) {
  const assets = await database().begin(async (sql) => {
    await sql`select pg_advisory_xact_lock(hashtextextended('duzelo.worker-publication',0))`;
    return sql`update private.collaboration_assets set state='purge_pending' where id in(select id from private.collaboration_assets where not held and (state='purge_pending' or (state in('pending','stored','removed') and (retain_until<=clock_timestamp() or state='removed' or(state='pending' and created_at<clock_timestamp()-interval '1 hour')))) order by created_at limit ${limit} for update skip locked) returning id,job_id,storage_path`;
  });
  for (const a of assets) {
    const storage = workerStorage().from(COLLABORATION_BUCKET),
      removed = await storage.remove([String(a.storage_path)]);
    if (removed.error) {
      const check = await storage.download(String(a.storage_path));
      if (
        !check.error ||
        !("statusCode" in check.error) ||
        String(check.error.statusCode) !== "404"
      )
        throw new Error("UNAVAILABLE");
    }
    await database().begin(async (sql) => {
      await sql`update private.collaboration_assets set state='purged' where id=${a.id}::uuid and state='purge_pending' and not held`;
      await sql`insert into private.audit_events(actor_type,action,resource_kind,resource_id) values('system','workflow.evidence-purged','job_request',${a.job_id}::uuid)`;
    });
  }
  return { processed: assets.length };
}
