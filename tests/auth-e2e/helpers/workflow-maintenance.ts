import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type postgres from "postgres";
import { pastBookingFixture } from "./agreement-fixtures";
import { workView } from "./workflow-actions";
export async function maintenanceChecks(
  sql: ReturnType<typeof postgres>,
  client: Page,
  owner: string,
  workerId: string,
  expiredAssetId: string,
) {
  const b = await pastBookingFixture(sql, owner, workerId);
  await sql`update public.bookings set status='in_progress' where id=${b.bookingId}::uuid`;
  await sql`insert into private.completion_submissions(booking_id,round,submitted_by,summary,submitted_at,review_due_at) select ${b.bookingId}::uuid,1,user_id,'Explicitly historical overdue completion fixture.',clock_timestamp()-interval '2 hours',clock_timestamp()-interval '1 hour' from public.worker_profiles where id=${workerId}::uuid`;
  await sql`update public.bookings set status='completion_pending' where id=${b.bookingId}::uuid`;
  await sql`update public.job_requests set status='completion_pending' where id=${b.jobId}::uuid`;
  expect((await client.request.post("/api/internal/workflow/reminders")).status()).toBe(403);
  const headers = { Authorization: "Bearer " + process.env.WORKFLOW_SCHEDULER_SECRET };
  const result = await client.request.post("/api/internal/workflow/reminders?limit=50", {
    headers,
  });
  expect(result.status(), await result.text()).toBe(200);
  expect((await result.json()).processed).toBeGreaterThan(0);
  const view = await workView(client, b.bookingId);
  expect(view.status).toBe("completion_pending");
  expect(view.completions[0]!.supportDue).not.toBeNull();
  const count =
    await sql`select count(*)::int as n from public.booking_events where booking_id=${b.bookingId}::uuid and event_type='completion_reminder'`;
  expect(count[0]!.n).toBe(1);
  const repeat = await client.request.post("/api/internal/workflow/reminders?limit=50", {
    headers,
  });
  expect(repeat.status()).toBe(200);
  expect((await repeat.json()).processed).toBe(0);
  expect(
    (
      await sql`select count(*)::int as n from private.payment_intents where booking_id=${b.bookingId}::uuid`
    )[0]!.n,
  ).toBe(0);
  await sql`update public.bookings set status='cancelled' where id=${b.bookingId}::uuid`;
  // Native cleanup removes actual expired bytes, while case-held objects remain stored.
  const [held] =
    await sql`select id,state from private.collaboration_assets where owner_id in(select id from auth.users where phone='27820000008') and held and state='stored' limit 1`;
  const [expired] =
    await sql`select storage_path from private.collaboration_assets where id=${expiredAssetId}::uuid and state='stored' and not held`;
  expect(expired).toBeDefined();
  const storage = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).storage.from("chat-attachments");
  expect((await storage.download(String(expired!.storage_path))).error).toBeNull();
  // Restore a retention-expired fixture; never add a controllable server clock.
  await sql`update private.collaboration_assets set retain_until=clock_timestamp()-interval '1 second' where id=${expiredAssetId}::uuid`;
  const cleaned = await client.request.post("/api/internal/workflow/cleanup?limit=50", { headers });
  expect(cleaned.status(), await cleaned.text()).toBe(200);
  expect(
    (await sql`select state from private.collaboration_assets where id=${expiredAssetId}::uuid`)[0]!
      .state,
  ).toBe("purged");
  expect((await storage.download(String(expired!.storage_path))).error).not.toBeNull();
  if (held)
    expect(
      (await sql`select state from private.collaboration_assets where id=${held.id}::uuid`)[0]!
        .state,
    ).toBe("stored");
}
