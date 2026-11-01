import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import postgres from "postgres";
import { signIn, origin, area } from "./helpers/worker-fixtures";
import { jobPost, createSavedJob, setTheme } from "./helpers/job-actions";
import {
  agreementPost,
  agreementView,
  noPrecise,
  savedQuote,
  publishQuote,
} from "./helpers/agreement-actions";
import {
  resetAgreementFixtures,
  agreementWorkers,
  agreementJob,
  quoteTerms,
  privateStreet,
  privateDescription,
} from "./helpers/agreement-fixtures";
import { inspectionChecks } from "./helpers/agreement-inspection-checks";
import { secondaryQuoteChecks } from "./helpers/agreement-policy-checks";
import type { QuoteView, BookingView } from "../../src/features/quotes/types";
const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
test.beforeEach(async () => {
  await resetAgreementFixtures(sql);
});
test.afterEach(async () => {
  await resetAgreementFixtures(sql);
});
test.afterAll(async () => {
  await sql.end();
});
test("real quotes, single booking, explicit confirmation and bounded inspection consent", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(300000);
  const ctx1 = await browser.newContext({ baseURL: origin, viewport: info.project.use.viewport }),
    ctx2 = await browser.newContext({ baseURL: origin, viewport: info.project.use.viewport });
  const one = await ctx1.newPage(),
    two = await ctx2.newPage();
  await signIn(one, "0820000008");
  await signIn(two, "0820000009");
  await signIn(page, "0820000007");
  const workers = await agreementWorkers(sql, info.project.name);
  expect(workers).toHaveLength(2);
  const w1 = workers[0]!,
    w2 = workers[1]!;
  const made = await createSavedJob(page, {
    ...agreementJob,
    title: agreementJob.title + " " + info.project.name,
  });
  const sent = await jobPost(page, "submit", {
    jobId: made.jobId,
    expectedVersion: made.version,
    consent: true,
  });
  expect(sent.status()).toBe(200);
  expect((await sent.json()).invited).toBe(5);
  const matches =
    await sql`select id,worker_id from public.job_matches where job_id=${made.jobId}::uuid and worker_id=any(${workers.map((w) => w.id)}::uuid[])`;
  expect(matches).toHaveLength(2);
  const matchOne = String(matches.find((m) => m.worker_id === w1.id)!.id),
    matchTwo = String(matches.find((m) => m.worker_id === w2.id)!.id);
  await one.goto("/app/worker/opportunities/" + matchOne);
  await one.getByRole("link", { name: "Prepare a quote", exact: true }).click();
  await expect(
    one.getByRole("heading", { name: "Build a clear quote", exact: true }),
  ).toBeVisible();
  const builder = one.getByRole("region", { name: "Quote builder", exact: true });
  const scope = "A fictional cleaning scope with clear labor and material assumptions.";
  await builder.getByRole("textbox", { name: "Scope and assumptions", exact: true }).fill(scope);
  await builder
    .getByRole("textbox", { name: "Exclusions", exact: true })
    .fill("No real visit, tax invoice or payment.");
  await builder
    .getByRole("textbox", { name: "Line 1 description", exact: true })
    .fill("Fictional cleaning labor");
  await builder.getByRole("textbox", { name: "Line 1 quantity", exact: true }).fill("1.50");
  await builder
    .getByRole("textbox", { name: "Line 1 unit price (ZAR)", exact: true })
    .fill("1.001");
  let invalidPosts = 0;
  const track = (r: { url(): string }) => {
    if (r.url().endsWith("/api/v1/agreements/save")) invalidPosts++;
  };
  one.on("request", track);
  await builder.getByRole("button", { name: "Save private quote version", exact: true }).click();
  expect(
    await builder
      .getByRole("textbox", { name: "Line 1 unit price (ZAR)", exact: true })
      .evaluate((e: HTMLInputElement) => e.validity.valid),
  ).toBe(false);
  expect(invalidPosts).toBe(0);
  one.off("request", track);
  await builder
    .getByRole("textbox", { name: "Line 1 unit price (ZAR)", exact: true })
    .fill("400.00");
  await builder.getByRole("button", { name: "Add line item", exact: true }).click();
  await builder
    .getByRole("textbox", { name: "Line 2 description", exact: true })
    .fill("Fictional supplies");
  await builder.getByRole("textbox", { name: "Line 2 quantity", exact: true }).fill("2");
  await builder
    .getByRole("textbox", { name: "Line 2 unit price (ZAR)", exact: true })
    .fill("25.00");
  await builder.getByRole("button", { name: "Remove line 1", exact: true }).click();
  await expect(
    builder.getByRole("textbox", { name: "Line 1 unit price (ZAR)", exact: true }),
  ).toHaveValue("25.00");
  await builder.getByRole("button", { name: "Add line item", exact: true }).click();
  await builder.getByRole("combobox", { name: "Line 2 kind", exact: true }).selectOption("labor");
  await builder
    .getByRole("textbox", { name: "Line 2 description", exact: true })
    .fill("Fictional cleaning labor");
  await builder.getByRole("textbox", { name: "Line 2 quantity", exact: true }).fill("1.50");
  await builder
    .getByRole("textbox", { name: "Line 2 unit price (ZAR)", exact: true })
    .fill("400.00");
  await builder.getByRole("textbox", { name: "Travel fee (ZAR)", exact: true }).fill("50.00");
  await builder
    .getByRole("combobox", { name: "Tax presentation", exact: true })
    .selectOption("vat_15_exclusive");
  await setTheme(one, info.project.name === "mobile", "Dark");
  await expect(
    builder.getByRole("textbox", { name: "Scope and assumptions", exact: true }),
  ).toHaveValue(scope);
  await setTheme(one, info.project.name === "mobile", "System");
  await one.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await expect(one.locator("html")).not.toHaveClass(/dark/);
  const draft = await savedQuote(one);
  expect(draft.version).toBe(1);
  let own = await agreementView(one, made.jobId, true);
  expect(own.latest.totalCents).toBe(80500);
  expect(own.latest.terms.items[0].description).toBe("Fictional supplies");
  expect((await agreementView(page, made.jobId)).offers).toHaveLength(0);
  await one.reload();
  await expect(
    one.getByRole("textbox", { name: "Scope and assumptions", exact: true }),
  ).toHaveValue(scope);
  await one
    .getByRole("textbox", { name: "Scope and assumptions", exact: true })
    .fill(scope + " Amendment, still private.");
  const amended = await savedQuote(one);
  expect(amended.version).toBe(2);
  await one
    .getByRole("heading", { name: "Prepare a new version", exact: true })
    .scrollIntoViewIfNeeded();
  await one.screenshot({
    path: "docs/evidence/screenshots/quotes-builder-" + info.project.name + ".png",
  });
  expect(
    (await new AxeBuilder({ page: one }).include(".quotes-page").analyze()).violations,
  ).toEqual([]);
  expect(await one.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await publishQuote(one, 2);
  await two.goto("/app/worker/opportunities/" + matchTwo);
  await expect(two.getByRole("link", { name: "Prepare a quote", exact: true })).toBeVisible();
  const otherDraft = await agreementPost(two, "save", {
    jobId: made.jobId,
    previousQuoteId: null,
    expectedVersion: 0,
    terms: quoteTerms(),
  });
  expect(otherDraft.status()).toBe(200);
  const other = await otherDraft.json();
  expect(
    (
      await agreementPost(two, "publish", {
        quoteId: other.quoteId,
        expectedVersion: other.version,
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await agreementPost(two, "publish", { quoteId: amended.quoteId, expectedVersion: 2 })
    ).status(),
  ).toBe(403);
  expect(
    (
      await agreementPost(one, "save", {
        jobId: made.jobId,
        previousQuoteId: draft.quoteId,
        expectedVersion: 1,
        terms: quoteTerms(),
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await agreementPost(one, "save", {
        jobId: made.jobId,
        previousQuoteId: amended.quoteId,
        expectedVersion: 2,
        terms: { ...quoteTerms(), totalCents: 1 },
      })
    ).status(),
  ).toBe(422);
  const foreign = await one.request.post("/api/v1/agreements/withdraw", {
    data: { quoteId: amended.quoteId, expectedVersion: 2 },
    headers: { origin: "https://attacker.invalid", "Idempotency-Key": crypto.randomUUID() },
  });
  expect(foreign.status()).toBe(403);
  await page.goto("/app/client/jobs/" + made.jobId);
  await page.getByRole("link", { name: "Review quote offers", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Choose with the details in view.", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("heading", { name: "Current sent offers", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "docs/evidence/screenshots/quotes-comparison-" + info.project.name + ".png",
  });
  noPrecise(await page.content());
  noPrecise(await one.content());
  expect((await new AxeBuilder({ page }).include(".quotes-page").analyze()).violations).toEqual([]);
  const view = await agreementView(page, made.jobId);
  const offers = view.offers as QuoteView[];
  expect(offers).toHaveLength(2);
  const keys = [crypto.randomUUID(), crypto.randomUUID()];
  const inputs = offers.map((q) => ({
    quoteId: q.id,
    expectedVersion: q.version,
    expectedJobVersion: view.jobVersion,
    consent: true,
  }));
  const accepted = await Promise.all(
    inputs.map((input, i) => agreementPost(page, "accept", input, keys[i]!)),
  );
  expect(accepted.map((r) => r.status()).sort()).toEqual([200, 409]);
  const win = accepted.findIndex((r) => r.status() === 200),
    chosen = offers[win]!,
    receipt = await accepted[win]!.json();
  const selected = chosen.id === amended.quoteId ? one : two,
    loser = selected === one ? two : one,
    selectedWorker = selected === one ? w1 : w2;
  expect((await agreementPost(page, "accept", inputs[win], keys[win]!)).status()).toBe(200);
  expect(
    (await sql`select count(*)::int as n from public.bookings where job_id=${made.jobId}::uuid`)[0]!
      .n,
  ).toBe(1);
  expect(
    (
      await sql`select count(*)::int as n from public.quotes where job_id=${made.jobId}::uuid and status='accepted'`
    )[0]!.n,
  ).toBe(1);
  expect(
    (
      await sql`select final_total_cents::integer as total from public.bookings where id=${receipt.bookingId}::uuid`
    )[0]!.total,
  ).toBe(chosen.totalCents);
  expect(
    (
      await sql`select count(*)::int as n from public.booking_events where booking_id=${receipt.bookingId}::uuid and event_type='booking_requested'`
    )[0]!.n,
  ).toBe(1);
  const lost = await agreementView(loser, made.jobId, true);
  expect(lost.bookingId).toBeNull();
  expect(lost.description).not.toContain(privateDescription);
  noPrecise(JSON.stringify(lost));
  expect(
    (
      await loser.request.get("/api/v1/agreements/booking?id=" + receipt.bookingId + "&mode=worker")
    ).status(),
  ).toBe(403);
  expect(
    (await one.request.get("/api/v1/agreements/job?jobId=" + made.jobId + "&mode=client")).status(),
  ).toBe(403);
  const addressKey = crypto.randomUUID();
  const guest = await browser.newContext({ baseURL: origin });
  expect((await guest.request.get("/api/v1/agreements/bookings?mode=client")).status()).toBe(401);
  await guest.close();
  expect(
    (await agreementPost(selected, "location", { jobId: made.jobId }, addressKey)).status(),
  ).toBe(403);
  expect(
    (
      await agreementPost(
        page,
        "booking-confirm",
        { bookingId: receipt.bookingId, expectedVersion: 1 },
        crypto.randomUUID(),
        true,
      )
    ).status(),
  ).toBe(403);
  await sql`update public.worker_profiles set status='suspended' where id=${selectedWorker.id}::uuid`;
  expect(
    (
      await agreementPost(
        selected,
        "booking-confirm",
        { bookingId: receipt.bookingId, expectedVersion: 1 },
        crypto.randomUUID(),
        true,
      )
    ).status(),
  ).toBe(403);
  await sql`update public.worker_profiles set status='approved' where id=${selectedWorker.id}::uuid`;
  await sql`select private.publish_worker_card(${selectedWorker.id}::uuid,${area}::uuid,${selectedWorker.name},'A fictional M06 service scope for isolated acceptance.')`;
  const block = await jobPost(selected, "time-block", {
    start: chosen.terms.startsAt,
    end: chosen.terms.endsAt,
  });
  expect(block.status()).toBe(200);
  await selected.goto("/app/worker/bookings/" + receipt.bookingId);
  await expect(
    selected.getByText(
      "A private schedule conflict currently prevents confirmation. Do not travel without confirmation.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    selected.getByRole("button", { name: "Confirm appointment", exact: true }),
  ).toBeDisabled();
  expect(
    (
      await agreementPost(
        selected,
        "booking-confirm",
        { bookingId: receipt.bookingId, expectedVersion: 1 },
        crypto.randomUUID(),
        true,
      )
    ).status(),
  ).toBe(409);
  const [blocked] =
    await sql`select id from private.worker_schedule_blocks where worker_id=${selectedWorker.id}::uuid and starts_at=${chosen.terms.startsAt}::timestamptz`;
  expect((await jobPost(selected, "remove-time-block", { id: String(blocked!.id) })).status()).toBe(
    200,
  );
  await selected.reload();
  await selected.getByRole("button", { name: "Confirm appointment", exact: true }).click();
  await expect(
    selected.getByRole("heading", { name: "Appointment status: confirmed", exact: true }),
  ).toBeVisible();
  const confirmed = (await (
    await selected.request.get(
      "/api/v1/agreements/booking?id=" + receipt.bookingId + "&mode=worker",
    )
  ).json()) as BookingView;
  noPrecise(JSON.stringify(confirmed));
  noPrecise(await selected.content());
  await selected
    .getByRole("heading", { name: "Appointment status: confirmed", exact: true })
    .scrollIntoViewIfNeeded();
  await selected.screenshot({
    path: "docs/evidence/screenshots/booking-confirmed-" + info.project.name + ".png",
  });
  expect(
    (await new AxeBuilder({ page: selected }).include(".booking-detail").analyze()).violations,
  ).toEqual([]);
  await selected.clock.install({ time: new Date() });
  await selected.getByRole("button", { name: "View authorized location", exact: true }).click();
  await expect(selected.getByText(privateStreet, { exact: true })).toBeVisible();
  await selected.clock.fastForward(61000);
  await expect(selected.getByText(privateStreet, { exact: true })).not.toBeVisible();
  await selected.clock.setSystemTime(new Date());
  const exact = await agreementPost(selected, "location", { jobId: made.jobId }, addressKey);
  expect(exact.status()).toBe(200);
  expect((await exact.json()).street).toBe(privateStreet);
  expect(exact.headers()["cache-control"]).toContain("no-store");
  const cached =
    await sql`select response_json from private.command_idempotency where actor_id=${selectedWorker.userId}::uuid and idempotency_key=${addressKey}`;
  noPrecise(JSON.stringify(cached));
  await secondaryQuoteChecks({
    sql,
    page,
    worker: selected,
    workerId: selectedWorker.id,
    mainJobId: made.jobId,
    bookingId: receipt.bookingId,
    terms: chosen.terms,
  });
  expect(
    (await agreementPost(selected, "location", { jobId: made.jobId }, addressKey)).status(),
  ).toBe(403);
  await inspectionChecks({
    sql,
    page,
    worker: one,
    workerId: w1.id,
    ownerPhone: "27820000007",
    tag: info.project.name,
  });
  const historical =
    await sql`select count(*)::int as n from private.notification_outbox where template like 'quote-%' or template like 'booking-%' or template like 'inspection-%'`;
  expect(historical[0]!.n).toBeGreaterThan(0);
  expect(
    (
      await sql`select count(*)::int as n from private.notification_outbox where channel<>'in_app' and (template like 'quote-%' or template like 'booking-%' or template like 'inspection-%')`
    )[0]!.n,
  ).toBe(0);
  const notices =
    await sql`select payload from private.notification_outbox where template like 'quote-%' or template like 'booking-%' or template like 'inspection-%'`;
  noPrecise(JSON.stringify(notices));
  const [owner] = await sql`select id from auth.users where phone='27820000007'`;
  await sql`update auth.sessions set not_after=now()-interval '1 second' where user_id=${owner!.id}::uuid`;
  expect((await page.request.get("/api/v1/agreements/bookings?mode=client")).status()).toBe(401);
  await ctx1.close();
  await ctx2.close();
});
