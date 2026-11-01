import "server-only";
import { bookingSchema, cancelSchema } from "@/features/quotes/schema";
import { quoteCommand, lockJob, eligible, freeTime, notify } from "@/features/quotes/policy";
export async function bookingsCommand(
  action: string,
  input: unknown,
  key: string | null,
  worker: boolean,
) {
  const data = action === "cancel" ? cancelSchema.parse(input) : bookingSchema.parse(input);
  if (
    !["confirm", "decline", "cancel"].includes(action) ||
    ((action === "confirm" || action === "decline") && !worker)
  )
    throw new Error("INVALID");
  return quoteCommand("booking." + action, data, key, worker, async (sql, actor) => {
    const [ref] = await sql`select job_id from public.bookings where id=${data.bookingId}::uuid`;
    if (!ref) throw new Error("FORBIDDEN");
    const job = await lockJob(sql, String(ref.job_id), actor, worker);
    const [b] =
      await sql`select b.*,w.user_id as worker_user from public.bookings b join public.worker_profiles w on w.id=b.worker_id where b.id=${data.bookingId}::uuid for update of b`;
    if (!b || (worker && b.worker_id !== job.match!.worker_id)) throw new Error("FORBIDDEN");
    if (b.version !== data.expectedVersion || !["pending_worker", "confirmed"].includes(b.status))
      throw new Error("CONFLICT");
    if (action === "confirm") {
      if (b.status !== "pending_worker" || Date.parse(b.scheduled_start) <= Date.now())
        throw new Error("TIMING");
      await eligible(sql, String(job.id), String(b.worker_id));
      await freeTime(
        sql,
        String(b.worker_id),
        new Date(b.scheduled_start).toISOString(),
        new Date(b.scheduled_end).toISOString(),
        String(b.id),
      );
      await sql`update public.bookings set status='confirmed',version=version+1,updated_at=now() where id=${b.id}::uuid`;
      await sql`update public.job_requests set status='booked',version=version+1,updated_at=now() where id=${job.id}::uuid`;
    } else {
      if (action === "decline" && b.status !== "pending_worker") throw new Error("CONFLICT");
      const reason = "reason" in data ? data.reason : "provider_unavailable";
      if (reason === "no_show" && Date.now() < Date.parse(b.scheduled_start) + 30 * 60000)
        throw new Error("TIMING");
      await sql`update public.bookings set status=${action === "decline" ? "declined" : "cancelled"}::public.booking_status,cancelled_at=now(),version=version+1,updated_at=now() where id=${b.id}::uuid`;
      await sql`update public.job_requests set status='cancelled',version=version+1,updated_at=now() where id=${job.id}::uuid`;
      await sql`update private.inspection_access_grants set revoked_at=now() where job_id=${job.id}::uuid and revoked_at is null`;
    }
    const to = action === "confirm" ? "confirmed" : action === "decline" ? "declined" : "cancelled";
    await sql`insert into public.booking_events(booking_id,actor_id,event_type,from_status,to_status,payload) values (${b.id}::uuid,${actor.id}::uuid,${"booking_" + action},${b.status},${to},${sql.json({ reason: "reason" in data ? data.reason : null, participantReport: true, paymentAction: false })})`;
    const recipient = worker ? String(job.client_id) : String(b.worker_user);
    await notify(
      sql,
      recipient,
      "booking-" + to,
      String(b.id) + ":" + String(Number(b.version) + 1),
      "/app/" + (worker ? "client" : "worker") + "/bookings/" + b.id,
    );
    return {
      jobId: String(job.id),
      bookingId: String(b.id),
      version: Number(b.version) + 1,
      message:
        action === "confirm"
          ? "Booking confirmed. Exact-location access now requires a separate audited view."
          : "Appointment closed. No fee, refund or finding of fault was created. Start a new request to seek another appointment.",
    };
  });
}
