import { expect, type Page } from "@playwright/test";
import type postgres from "postgres";
import { cleaning } from "./worker-fixtures";
import { workOk } from "./workflow-actions";
export async function paginationChecks(
  sql: ReturnType<typeof postgres>,
  client: Page,
  admin: Page,
  owner: string,
  workerUser: string,
  workerId: string,
  conversationId: string,
) {
  // Explicit restored, cancelled histories: no fake invitations or service actions.
  const conversations =
    await sql`with jobs as(insert into public.job_requests(client_id,category_id,title,description,public_town,urgency,status,created_at) select ${owner}::uuid,${cleaning}::uuid,'Restored synthetic history '||n,'Historical metadata for bounded inbox acceptance.','Synthetic test area','flexible','cancelled',clock_timestamp()-interval '2 days'+n*interval '1 second' from generate_series(1,51)n returning id,created_at) insert into public.conversations(job_id,worker_id,created_at) select id,${workerId}::uuid,created_at from jobs returning id,job_id,created_at`;
  const ids = conversations.map((c) => String(c.id));
  await sql`insert into public.conversation_members(conversation_id,user_id) select id,${owner}::uuid from public.conversations where id=any(${ids}::uuid[]) union all select id,${workerUser}::uuid from public.conversations where id=any(${ids}::uuid[])`;
  const first = await client.request.get("/api/v1/collaboration/inbox"),
    page = await first.json();
  expect(first.status()).toBe(200);
  expect(page.threads).toHaveLength(50);
  expect(page.nextCursor).toBeTruthy();
  const second = await client.request.get(
      "/api/v1/collaboration/inbox?cursor=" + encodeURIComponent(page.nextCursor),
    ),
    older = await second.json();
  expect(second.status()).toBe(200);
  expect(older.threads.length).toBeGreaterThan(0);
  expect(
    older.threads.every(
      (t: { id: string }) => !page.threads.some((p: { id: string }) => p.id === t.id),
    ),
  ).toBe(true);
  await client.goto("/app/inbox");
  await client.getByRole("link", { name: "Older conversations", exact: true }).click();
  await expect(
    client.getByRole("link", { name: "Latest conversations", exact: true }),
  ).toBeVisible();
  // Seed distinct historical concerns and repeated reports for one thread.
  for (const c of conversations) {
    const [r] =
      await sql`insert into public.safety_reports(reporter_id,subject_user_id,job_id,reason,created_at) values(${owner}::uuid,${workerUser}::uuid,${c.job_id}::uuid,'Restored synthetic conversation concern.',${c.created_at}) returning id`;
    await sql`insert into private.conversation_reports(conversation_id,report_id) values(${c.id}::uuid,${r!.id}::uuid)`;
  }
  const [job] = await sql`select job_id from public.conversations where id=${conversationId}::uuid`;
  const reports =
    await sql`insert into public.safety_reports(reporter_id,subject_user_id,job_id,reason,created_at) select ${owner}::uuid,${workerUser}::uuid,${job!.job_id}::uuid,'Restored synthetic repeated concern '||n,clock_timestamp()-n*interval '1 microsecond' from generate_series(1,53)n returning id`;
  for (const r of reports)
    await sql`insert into private.conversation_reports(conversation_id,report_id) values(${conversationId}::uuid,${r.id}::uuid)`;
  const queueResponse = await admin.request.get("/api/v1/collaboration/queue"),
    queue = await queueResponse.json();
  expect(queueResponse.status(), await queueResponse.text()).toBe(200);
  expect(queue.items.filter((r: { id: string }) => r.id === conversationId)).toHaveLength(1);
  expect(queue.items).toHaveLength(50);
  expect(queue.nextCursor).toBeTruthy();
  const nextQueue = await admin.request.get(
    "/api/v1/collaboration/queue?cursor=" + encodeURIComponent(queue.nextCursor),
  );
  expect(nextQueue.status()).toBe(200);
  expect((await nextQueue.json()).items.length).toBeGreaterThan(0);
  const grant = await workOk(admin, "audit", {
    kind: "conversation",
    id: conversationId,
    reason: "Review all historical synthetic conversation concerns.",
  });
  const auditResponse = await admin.request.get("/api/v1/collaboration/audit?id=" + grant.grantId),
    audit = await auditResponse.json();
  expect(auditResponse.status()).toBe(200);
  expect(audit.reports).toHaveLength(50);
  expect(audit.nextReports).toBeTruthy();
  expect(audit.assets.length).toBeLessThanOrEqual(120);
  const moreReports = await admin.request.get(
    "/api/v1/collaboration/audit?id=" +
      grant.grantId +
      "&reportCursor=" +
      encodeURIComponent(audit.nextReports),
  );
  expect(moreReports.status()).toBe(200);
  expect((await moreReports.json()).reports.length).toBeGreaterThan(0);
}
