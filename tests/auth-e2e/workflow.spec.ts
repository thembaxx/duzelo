import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import postgres from "postgres";
import sharp from "sharp";
import { signIn, origin, area } from "./helpers/worker-fixtures";
import { jobPost, createSavedJob, setTheme } from "./helpers/job-actions";
import {
  agreementPost,
  agreementView,
  noPrecise,
  agreementWidths,
} from "./helpers/agreement-actions";
import {
  resetAgreementFixtures,
  agreementWorkers,
  agreementJob,
  quoteTerms,
  pastBookingFixture,
} from "./helpers/agreement-fixtures";
import { workPost, workOk, workView, bookingData, workUpload } from "./helpers/workflow-actions";
import { maintenanceChecks } from "./helpers/workflow-maintenance";
import { lifecycleChecks, caseChecks } from "./helpers/workflow-checks";
const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
test.beforeEach(async () => {
  await sql`update public.bookings set status='cancelled' where job_id in(select id from public.job_requests where client_id in(select id from auth.users where phone='27820000007')) and status in('in_progress','completion_pending')`;
  await resetAgreementFixtures(sql);
});
test.afterEach(async () => {
  await resetAgreementFixtures(sql);
});
test.afterAll(async () => {
  await sql.end();
});
test("job conversations, agreed changes, completion evidence and support audit persist securely", async ({
  page: client,
  browser,
}, info) => {
  test.setTimeout(480000);
  const contexts = await Promise.all(
      [0, 1, 2].map(() =>
        browser.newContext({ baseURL: origin, viewport: info.project.use.viewport }),
      ),
    ),
    [worker, other, admin] = await Promise.all(contexts.map((c) => c.newPage()));
  await signIn(worker!, "0820000008");
  await signIn(other!, "0820000009");
  await signIn(client, "0820000007");
  await signIn(admin!, "0820000002", "client");
  const [owner] = await sql`select id from auth.users where phone='27820000007'`,
    [reviewer] = await sql`select id from auth.users where phone='27820000002'`;
  await sql`insert into private.admin_members(user_id,admin_role) values(${reviewer!.id}::uuid,'owner') on conflict(user_id) do update set active=true,admin_role='owner'`;
  await sql`delete from auth.mfa_factors where user_id=${reviewer!.id}::uuid`;
  await sql`update auth.users set email='fictional-m07-admin@example.invalid',email_confirmed_at=now() where id=${reviewer!.id}::uuid`;
  const workers = await agreementWorkers(sql, info.project.name),
    w = workers[0]!;
  const made = await createSavedJob(client, {
    ...agreementJob,
    title: "Fictional M07 cleaning " + info.project.name,
  });
  expect(
    (
      await jobPost(client, "submit", {
        jobId: made.jobId,
        expectedVersion: made.version,
        consent: true,
      })
    ).status(),
  ).toBe(200);
  const saved = await agreementPost(worker!, "save", {
    jobId: made.jobId,
    previousQuoteId: null,
    expectedVersion: 0,
    terms: quoteTerms(),
  });
  expect(saved.status(), await saved.text()).toBe(200);
  const q = await saved.json();
  expect(
    (
      await agreementPost(worker!, "publish", { quoteId: q.quoteId, expectedVersion: q.version })
    ).status(),
  ).toBe(200);
  const thread = await workOk(client, "thread-open", { quoteId: q.quoteId }),
    cid = thread.conversationId as string;
  expect((await workOk(worker!, "thread-open", { quoteId: q.quoteId })).conversationId).toBe(cid);
  expect((await other!.request.get("/api/v1/collaboration/thread?id=" + cid)).status()).toBe(403);
  expect(
    (
      await workPost(other!, "thread-send", {
        conversationId: cid,
        body: "Unauthorized",
        assetIds: [],
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await workPost(client, "thread-send", {
        conversationId: cid,
        body: "Forged sender",
        assetIds: [],
        senderId: w.userId,
      })
    ).status(),
  ).toBe(422);
  await sql`update public.user_profiles set client_enabled=false where user_id=${w.userId}::uuid`;
  expect((await worker!.request.get("/api/v1/collaboration/inbox")).status()).toBe(200);
  await workOk(worker!, "thread-send", {
    conversationId: cid,
    body: "Hello from the invited provider.",
    assetIds: [],
  });
  await client.goto("/app/inbox/" + cid);
  await client
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("A keyboard message with the work details.");
  await client.context().setOffline(true);
  await client.getByRole("button", { name: "Send message", exact: true }).focus();
  await client.keyboard.press("Enter");
  await expect(
    client.getByRole("alert").filter({ hasText: "Connection interrupted" }),
  ).toBeVisible();
  await client.context().setOffline(false);
  await client.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(client.getByRole("status").filter({ hasText: "Message saved." })).toBeVisible();
  const key = crypto.randomUUID(),
    message = { conversationId: cid, body: "Idempotent saved message.", assetIds: [] };
  const first = await workOk(client, "thread-send", message, key),
    retry = await workOk(client, "thread-send", message, key);
  expect(retry.messageId).toBe(first.messageId);
  for (let i = 0; i < 32; i++)
    await workOk(i % 2 ? client : worker!, "thread-send", {
      conversationId: cid,
      body: "Ordered synthetic message " + i,
      assetIds: [],
    });
  const latest = await client.request.get("/api/v1/collaboration/thread?id=" + cid),
    lv = await latest.json();
  expect(lv.page.messages).toHaveLength(30);
  expect(lv.page.hasMore).toBe(true);
  const earlier = await client.request.get(
      "/api/v1/collaboration/thread?id=" + cid + "&before=" + lv.page.next,
    ),
    old = await earlier.json();
  expect(old.page.messages.length).toBeGreaterThan(0);
  expect(old.page.messages.at(-1).sequence).toBeLessThan(lv.page.messages[0].sequence);
  const bytes = await sharp({
    create: { width: 80, height: 80, channels: 3, background: "#8fa483" },
  })
    .jpeg()
    .withExif({ IFD0: { ImageDescription: "EXIF-PRIVATE-42" } })
    .toBuffer();
  const unsafe = await workUpload(
    client,
    { purpose: "message", conversationId: cid },
    Buffer.from(
      "WDVPIVAlQEFQWzRcUFpYNTQoUF4pN0NDKTd9JEVJQ0FSLVNUQU5EQVJELUFOVElWSVJVUy1URVNULUZJTEUhJEgrSCo=",
      "base64",
    ),
  );
  expect(unsafe.status()).toBe(422);
  expect((await unsafe.json()).error.code).toBe("UNSAFE");
  const up = await workUpload(client, { purpose: "message", conversationId: cid }, bytes);
  expect(up.status(), await up.text()).toBe(200);
  const assetId = (await up.json()).assetId;
  await workOk(client, "thread-send", {
    conversationId: cid,
    body: "A scanned fictional work photo.",
    assetIds: [assetId],
  });
  const grant = await workOk(worker!, "media-access", { assetId });
  const media = await worker!.request.get("/api/v1/collaboration/media/" + assetId, {
    headers: { "X-Duzelo-Asset-Ticket": grant.ticket },
  });
  expect(media.status()).toBe(200);
  expect(media.headers()["cache-control"]).toContain("no-store");
  expect((await sharp(await media.body()).metadata()).exif).toBeUndefined();
  expect(
    (
      await other!.request.get("/api/v1/collaboration/media/" + assetId, {
        headers: { "X-Duzelo-Asset-Ticket": grant.ticket },
      })
    ).status(),
  ).toBe(403);
  await new Promise((r) => setTimeout(r, 3200));
  expect(
    (
      await worker!.request.get("/api/v1/collaboration/media/" + assetId, {
        headers: { "X-Duzelo-Asset-Ticket": grant.ticket },
      })
    ).status(),
  ).toBe(403);
  await client.reload();
  await client.getByRole("button", { name: "Load earlier messages", exact: true }).click();
  await expect(client.getByText("Hello from the invited provider.", { exact: true })).toBeVisible();
  await setTheme(client, info.project.name === "mobile", "Dark");
  expect(
    (await new AxeBuilder({ page: client }).include(".conversation").analyze()).violations,
  ).toEqual([]);
  await setTheme(client, info.project.name === "mobile", "Light");
  await client.emulateMedia({ reducedMotion: "reduce" });
  await agreementWidths(client);
  await client
    .getByRole("heading", { name: "Fictional M07 cleaning " + info.project.name, exact: true })
    .scrollIntoViewIfNeeded();
  await client.screenshot({
    path: "docs/evidence/screenshots/chat-thread-" + info.project.name + ".png",
  });
  noPrecise(await client.content());
  let view = await agreementView(client, made.jobId);
  const accepted = await agreementPost(client, "accept", {
    quoteId: q.quoteId,
    expectedVersion: q.version,
    expectedJobVersion: view.jobVersion,
    consent: true,
  });
  expect(accepted.status(), await accepted.text()).toBe(200);
  const booking = await accepted.json();
  expect(
    (
      await agreementPost(
        worker!,
        "booking-confirm",
        { bookingId: booking.bookingId, expectedVersion: 1 },
        crypto.randomUUID(),
        true,
      )
    ).status(),
  ).toBe(200);
  let b = await workView(worker!, booking.bookingId);
  expect((await workPost(worker!, "work-start", bookingData(b))).status()).toBe(422);
  const expiry = new Date(Date.now() + 1800000).toISOString(),
    t = quoteTerms(72);
  let proposal = await workOk(client, "proposal-reschedule", {
    ...bookingData(b),
    startsAt: t.startsAt,
    endsAt: t.endsAt,
    expiresAt: expiry,
  });
  b = await workView(client, b.id);
  expect(
    (
      await workPost(client, "proposal-decide", {
        ...bookingData(b),
        proposalId: proposal.proposalId,
        kind: "reschedule",
        decision: "accept",
      })
    ).status(),
  ).toBe(403);
  await workOk(worker!, "proposal-decide", {
    ...bookingData(b),
    proposalId: proposal.proposalId,
    kind: "reschedule",
    decision: "reject",
  });
  b = await workView(client, b.id);
  expect(b.start).not.toBe(t.startsAt);
  proposal = await workOk(client, "proposal-reschedule", {
    ...bookingData(b),
    startsAt: t.startsAt,
    endsAt: t.endsAt,
    expiresAt: expiry,
  });
  b = await workView(worker!, b.id);
  await workOk(worker!, "proposal-decide", {
    ...bookingData(b),
    proposalId: proposal.proposalId,
    kind: "reschedule",
    decision: "accept",
  });
  b = await workView(worker!, b.id);
  expect(b.start).toBe(t.startsAt);
  proposal = await workOk(worker!, "proposal-scope", {
    ...bookingData(b),
    scope: "An additional fictional cleaning scope.",
    deltaCents: 2500,
    expiresAt: expiry,
  });
  b = await workView(client, b.id);
  await workOk(client, "proposal-decide", {
    ...bookingData(b),
    proposalId: proposal.proposalId,
    kind: "scope",
    decision: "accept",
  });
  b = await workView(client, b.id);
  expect(b.totalCents).toBe(b.baseCents + 2500);
  await client.goto("/app/client/bookings/" + b.id);
  expect(
    (await new AxeBuilder({ page: client }).include(".work-panel").analyze()).violations,
  ).toEqual([]);
  await agreementWidths(client);
  await client
    .getByRole("heading", { name: "Keep each step clear.", exact: true })
    .scrollIntoViewIfNeeded();
  await client.screenshot({
    path: "docs/evidence/screenshots/workflow-agreement-" + info.project.name + ".png",
  });
  const ticket = await workOk(worker!, "media-access", { assetId });
  await workOk(client, "thread-report", {
    conversationId: cid,
    reason: "A fictional conversation concern for support review.",
    messageId: null,
    block: true,
    consent: true,
  });
  expect(
    (
      await workPost(worker!, "thread-send", {
        conversationId: cid,
        body: "Blocked message.",
        assetIds: [],
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await worker!.request.get("/api/v1/collaboration/media/" + assetId, {
        headers: { "X-Duzelo-Asset-Ticket": ticket.ticket },
      })
    ).status(),
  ).toBe(403);
  await workOk(client, "thread-unblock", { conversationId: cid, consent: true });
  expect(
    (
      await workPost(worker!, "thread-send", {
        conversationId: cid,
        body: "Report still pending.",
        assetIds: [],
      })
    ).status(),
  ).toBe(403);
  await sql`update public.bookings set status='cancelled' where id=${b.id}::uuid`;
  await sql`update public.job_requests set status='cancelled' where id=${made.jobId}::uuid`;
  const completed = await lifecycleChecks(sql, client, worker!, other!, String(owner!.id), w.id);
  await caseChecks(
    sql,
    client,
    worker!,
    other!,
    admin!,
    String(owner!.id),
    w.id,
    info.project.name,
  );
  await maintenanceChecks(sql, client, String(owner!.id), w.id, completed.assetId);
  const [delivery] =
    await sql`select count(n.id)::int as linked,count(*) filter(where n.id is null)::int as missing from private.notification_outbox o left join public.notifications n on n.source_outbox_id=o.id and n.user_id=o.user_id where o.status='sent' and (o.template='message-received' or o.template like 'workflow-%' or o.template='case-support-update')`;
  expect(delivery!.linked).toBeGreaterThan(10);
  expect(delivery!.missing).toBe(0);
  expect(
    (
      await sql`select count(*)::int as n from private.payment_intents where booking_id in(select id from public.bookings where job_id=${made.jobId}::uuid)`
    )[0]!.n,
  ).toBe(0);
  await sql`update public.user_profiles set client_enabled=true where user_id=${w.userId}::uuid`;
  for (const c of contexts) await c.close();
});
