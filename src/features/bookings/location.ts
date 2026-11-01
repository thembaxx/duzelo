import "server-only";
import { locationSchema } from "@/features/quotes/schema";
import { quoteCommand, lockJob, eligible } from "@/features/quotes/policy";
import type { ExactLocation } from "@/features/quotes/types";
export async function exactLocation(input: unknown, key: string | null) {
  const data = locationSchema.parse(input);
  let result: ExactLocation | undefined;
  // The cache stores only an acknowledgement. Authorization and private projection
  // run inside the transaction BEFORE every replay, never from a cached address.
  await quoteCommand(
    "location",
    data,
    key,
    true,
    async () => ({ jobId: data.jobId }),
    async (sql, actor) => {
      const job = await lockJob(sql, data.jobId, actor, true);
      await eligible(sql, data.jobId, job.match!.worker_id, false);
      const confirmed =
        await sql`select id from public.bookings where job_id=${data.jobId}::uuid and worker_id=${job.match!.worker_id}::uuid and status='confirmed' and ${job.status}='booked'`;
      const [grant] =
        await sql`select expires_at from private.current_inspection_access(${data.jobId}::uuid,${job.match!.worker_id}::uuid)`;
      if (!confirmed.length && !grant) throw new Error("FORBIDDEN");
      const [location] =
        await sql`select service_address_snapshot,access_notes,extensions.st_x(exact_point::extensions.geometry) as longitude,extensions.st_y(exact_point::extensions.geometry) as latitude from private.job_locations where job_id=${data.jobId}::uuid`;
      if (!location) throw new Error("FORBIDDEN");
      const until = Math.min(
        Date.now() + 60000,
        confirmed.length ? Infinity : new Date(grant!.expires_at).getTime(),
      );
      result = {
        street: String(location.service_address_snapshot.street ?? ""),
        province: String(location.service_address_snapshot.province ?? ""),
        notes: String(location.access_notes ?? ""),
        point:
          location.latitude === null
            ? null
            : { latitude: Number(location.latitude), longitude: Number(location.longitude) },
        until: new Date(until).toISOString(),
        basis: confirmed.length ? "confirmed_booking" : "inspection",
      };
    },
  );
  // A slow transaction/commit must not return a view whose permission already ended.
  if (!result || Date.parse(result.until) <= Date.now()) throw new Error("FORBIDDEN");
  return result;
}
