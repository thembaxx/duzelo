import { expect, type Page } from "@playwright/test";
import type postgres from "postgres";
import { createHash } from "node:crypto";
import { workOk, workPost, workView } from "./workflow-actions";
export async function uploadRetryChecks(page: Page, bytes: Buffer) {
  let attempts = 0,
    sends = 0,
    release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const count = (r: { url(): string }) => {
    if (r.url().endsWith("/api/v1/collaboration/thread-send")) sends++;
  };
  page.on("request", count);
  await page.route("**/api/v1/collaboration/upload", async (route) => {
    attempts++;
    if (attempts === 1) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: { message: "Temporary test interruption." } }),
      });
      return;
    }
    await gate;
    await route.continue();
  });
  try {
    await page
      .getByRole("textbox", { name: "Message", exact: true })
      .fill("This retry photo belongs to this explicit message.");
    await page
      .getByLabel(/Private evidence photo/)
      .setInputFiles({ name: "fixture.jpg", mimeType: "image/jpeg", buffer: bytes });
    await expect(
      page.getByRole("button", { name: "Retry photo upload", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Retry photo upload", exact: true }).click();
    await expect(page.getByRole("button", { name: "Send message", exact: true })).toBeDisabled();
    expect(sends).toBe(0);
    release();
    await expect(
      page.getByText("1 photos ready to attach. Unsent photos expire with retention.", {
        exact: true,
      }),
    ).toBeVisible();
    const [sent] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith("/api/v1/collaboration/thread-send")),
      page.getByRole("button", { name: "Send message", exact: true }).click(),
    ]);
    expect(sent.status()).toBe(200);
    expect(sends).toBe(1);
  } finally {
    release();
    await page.unroute("**/api/v1/collaboration/upload");
    page.off("request", count);
  }
}
export async function auditReplayChecks(
  sql: ReturnType<typeof postgres>,
  admin: Page,
  grantId: string,
  caseId: string,
  jobId: string,
  foreignAssetId: string,
) {
  expect(
    (await workPost(admin, "media-access", { assetId: foreignAssetId, grantId })).status(),
  ).toBe(403);
  const [actor] =
    await sql`select actor_id,session_id from private.workflow_access_grants where id=${grantId}::uuid`;
  const expired = crypto.randomUUID(),
    key = crypto.randomUUID(),
    input = { kind: "dispute", id: caseId, reason: "Explicit historical expired audit fixture." },
    expiresAt = Date.now() - 1000;
  await sql`insert into private.workflow_access_grants(id,actor_id,session_id,resource_kind,resource_id,reason,expires_at,created_at) values(${expired}::uuid,${actor!.actor_id}::uuid,${actor!.session_id}::uuid,'dispute',${caseId}::uuid,${input.reason},clock_timestamp()-interval '1 second',clock_timestamp()-interval '10 minutes')`;
  const hash = createHash("sha256")
    .update(JSON.stringify({ action: "audit.open", input }))
    .digest("hex");
  await sql`insert into private.command_idempotency(actor_id,idempotency_key,request_hash,status,response_json,expires_at) values(${actor!.actor_id}::uuid,${key},${hash},'completed',${sql.json({ grantId: expired, jobId, expiresAt })},clock_timestamp()+interval '1 day')`;
  const replay = await workPost(admin, "audit", input, key);
  expect(replay.status(), await replay.text()).toBe(409);
  expect((await replay.json()).error.code).toBe("EXPIRED_AUDIT");
  expect((await workOk(admin, "audit", input)).grantId).not.toBe(expired);
}
export async function historyChecks(
  sql: ReturnType<typeof postgres>,
  client: Page,
  bookingId: string,
  workerUser: string,
) {
  await sql`insert into private.work_entries(booking_id,actor_id,kind,body,public_to_parties,created_at) select ${bookingId}::uuid,${workerUser}::uuid,'progress','Restored synthetic historical progress '||n,true,clock_timestamp()-interval '1 day'+n*interval '1 second' from generate_series(1,201)n`;
  const view = await workView(client, bookingId);
  expect(view.entries).toHaveLength(200);
  expect(view.entries.some((e) => e.kind === "support_note")).toBe(true);
  expect(view.nextEntries).toBeTruthy();
  const earlier = await client.request.get(
    "/api/v1/collaboration/workflow?id=" +
      bookingId +
      "&entryCursor=" +
      encodeURIComponent(view.nextEntries!),
  );
  expect(earlier.status()).toBe(200);
  expect((await earlier.json()).entries.length).toBeGreaterThan(0);
  await client.goto("/app/client/bookings/" + bookingId);
  await client.getByRole("button", { name: "Load earlier work history", exact: true }).click();
  await expect(
    client.getByText("Restored synthetic historical progress 1", { exact: true }),
  ).toBeVisible();
}
export async function auditSelectionChecks(admin: Page, caseId: string, otherBooking: string) {
  let held = false,
    release!: () => void,
    captured!: () => void;
  const gate = new Promise<void>((r) => (release = r)),
    ready = new Promise<void>((r) => (captured = r));
  const pattern = /\/api\/v1\/collaboration\/audit\?/;
  await admin.route(pattern, async (route) => {
    if (held) {
      await route.continue();
      return;
    }
    held = true;
    const response = await route.fetch();
    captured();
    await gate;
    await route.fulfill({ response });
  });
  try {
    await admin.getByLabel("Record type").selectOption("dispute");
    await admin.getByLabel("Record reference").fill(caseId);
    await admin.getByLabel("Reason for access").fill("Review the first synthetic case selection.");
    await admin.getByRole("button", { name: "Record reason and open audit", exact: true }).click();
    await ready;
    await admin.getByLabel("Record type").selectOption("booking");
    await admin.getByLabel("Record reference").fill(otherBooking);
    await admin
      .getByLabel("Reason for access")
      .fill("Review a different synthetic completed booking.");
    await admin.getByRole("button", { name: "Record reason and open audit", exact: true }).click();
    const region = admin.getByRole("region", { name: "Authorized evidence audit" });
    await expect(region).toBeVisible();
    await expect(region).not.toContainText("CASE-PRIVATE-42");
    const received = admin.waitForResponse((r) => pattern.test(r.url()));
    release();
    await received;
    await admin.evaluate(
      () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
    );
    await expect(region).not.toContainText("CASE-PRIVATE-42");
  } finally {
    release();
    await admin.unroute(pattern);
  }
}
