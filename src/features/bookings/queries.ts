import "server-only";
import { database } from "@/lib/db/server";
import { lockActor } from "@/features/jobs/boundary";
import { quoteActor, lockJob } from "@/features/quotes/policy";
import { quoteProjection } from "@/features/quotes/queries";
import type { BookingView } from "@/features/quotes/types";
const iso = (v: unknown) => new Date(String(v)).toISOString();
export async function bookingList(worker = false) {
  const actor = await quoteActor(worker);
  return database().begin(async (sql) => {
    await lockActor(sql, actor, worker);
    const rows =
      await sql`select b.id,b.status,b.scheduled_start,b.scheduled_end,j.title,j.public_town from public.bookings b join public.job_requests j on j.id=b.job_id join public.worker_profiles w on w.id=b.worker_id where (${worker} and w.user_id=${actor.id}::uuid or not ${worker} and j.client_id=${actor.id}::uuid) and b.scheduled_start is not null order by b.created_at desc limit 100`;
    return rows.map((b) => ({
      id: String(b.id),
      title: String(b.title),
      town: String(b.public_town),
      status: String(b.status),
      startsAt: iso(b.scheduled_start),
      endsAt: iso(b.scheduled_end),
    }));
  });
}
export async function bookingDetail(id: string, worker = false): Promise<BookingView> {
  const actor = await quoteActor(worker);
  return database().begin(async (sql) => {
    await lockActor(sql, actor, worker);
    const [ref] = await sql`select job_id from public.bookings where id=${id}::uuid`;
    if (!ref) throw new Error("FORBIDDEN");
    const job = await lockJob(sql, String(ref.job_id), actor, worker);
    const [b] =
      await sql`select b.*,private.agreement_worker_eligible(b.job_id,b.worker_id,true) as eligible,private.worker_time_free(b.worker_id,b.scheduled_start,b.scheduled_end,b.id,null) as free from public.bookings b where b.id=${id}::uuid`;
    if (!b || (worker && b.worker_id !== job.match!.worker_id) || !b.scheduled_start)
      throw new Error("FORBIDDEN");
    const [q] = await sql`select * from public.quotes where id=${b.quote_id}::uuid`;
    const quote = await quoteProjection(sql, q!, false);
    const events =
      await sql`select id,event_type,from_status,to_status,payload,created_at from public.booking_events where booking_id=${id}::uuid order by created_at,id`;
    const future = Date.parse(iso(b.scheduled_start)) > Date.now();
    return {
      id,
      jobId: String(job.id),
      jobTitle: job.title,
      town: job.public_town,
      provider: quote.workerName,
      status: String(b.status),
      version: Number(b.version),
      worker,
      startsAt: iso(b.scheduled_start),
      endsAt: iso(b.scheduled_end),
      quote,
      canConfirm: worker && b.status === "pending_worker" && !!b.eligible && !!b.free && future,
      conflict: !b.free,
      eligible: !!b.eligible,
      canCancel: ["pending_worker", "confirmed"].includes(b.status),
      noShowAvailable: Date.now() >= Date.parse(iso(b.scheduled_start)) + 30 * 60000,
      events: events.map((e) => ({
        id: String(e.id),
        type: String(e.event_type),
        from: e.from_status ? String(e.from_status) : null,
        to: e.to_status ? String(e.to_status) : null,
        at: iso(e.created_at),
        reason: e.payload?.reason ? String(e.payload.reason) : null,
      })),
    };
  }) as Promise<BookingView>;
}
