import { expect, type Page } from "@playwright/test";
import type postgres from "postgres";
import { createSavedJob, jobPost } from "./job-actions";
import { agreementPost, agreementView, noPrecise } from "./agreement-actions";
import { agreementJob, quoteTerms, privateStreet, pastBookingFixture } from "./agreement-fixtures";
export async function inspectionChecks({
  sql,
  page,
  worker,
  workerId,
  ownerPhone,
  tag,
}: {
  sql: ReturnType<typeof postgres>;
  page: Page;
  worker: Page;
  workerId: string;
  ownerPhone: string;
  tag: string;
}) {
  const request = await createSavedJob(
    page,
    { ...agreementJob, title: "Fictional M06 inspection " + tag },
    "provider-" + workerId,
  );
  const sent = await jobPost(page, "submit", {
    jobId: request.jobId,
    expectedVersion: request.version,
    consent: true,
  });
  expect(sent.status()).toBe(200);
  expect((await sent.json()).invited).toBe(1);
  const terms = {
    ...quoteTerms(0.5),
    pricingType: "inspection_required" as const,
    items: [],
    travelFeeCents: 0,
    inspectionFeeCents: 15000,
    taxMode: "none" as const,
  };
  const draft = await agreementPost(worker, "save", {
    jobId: request.jobId,
    previousQuoteId: null,
    expectedVersion: 0,
    terms,
  });
  expect(draft.status()).toBe(200);
  const q = await draft.json();
  expect(
    (
      await agreementPost(worker, "publish", { quoteId: q.quoteId, expectedVersion: q.version })
    ).status(),
  ).toBe(200);
  let view = await agreementView(page, request.jobId);
  expect(view.offers[0].totalCents).toBeNull();
  expect(
    (
      await agreementPost(page, "accept", {
        quoteId: q.quoteId,
        expectedVersion: q.version,
        expectedJobVersion: view.jobVersion,
        consent: true,
      })
    ).status(),
  ).toBe(422);
  expect(
    (
      await agreementPost(page, "authorize-inspection", {
        quoteId: q.quoteId,
        expectedVersion: q.version,
        expectedJobVersion: view.jobVersion,
        consent: true,
        addressConsent: false,
        feeConsent: true,
      })
    ).status(),
  ).toBe(422);
  await page.goto("/app/client/jobs/" + request.jobId + "/quotes");
  const authorize = page.getByRole("button", { name: "Authorize inspection only", exact: true });
  await expect(authorize).toBeDisabled();
  for (const name of [
    "I choose this inspection proposal; a later priced quote needs my separate agreement.",
    "I authorize exact-location access from one hour before the visit until its end. I can revoke it.",
    "I agree to the disclosed inspection fee. No payment is collected by Duzelo.",
  ]) {
    await page.getByRole("checkbox", { name, exact: true }).focus();
    await page.keyboard.press("Space");
  }
  const [approved] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/api/v1/agreements/authorize-inspection")),
    authorize.click(),
  ]);
  expect(approved.status()).toBe(200);
  const grant = await approved.json();
  expect(
    (
      await agreementPost(worker, "location", {
        jobId: request.jobId,
        at: new Date(Date.now() + 86400000).toISOString(),
      })
    ).status(),
  ).toBe(422);
  await expect(
    page.getByRole("heading", { name: "Site visit authorized", exact: true }),
  ).toBeVisible();
  expect(
    (
      await sql`select count(*)::int as n from public.bookings where job_id=${request.jobId}::uuid`
    )[0]!.n,
  ).toBe(0);
  const key = crypto.randomUUID(),
    address = await agreementPost(worker, "location", { jobId: request.jobId }, key);
  expect(address.status()).toBe(200);
  expect((await address.json()).street).toBe(privateStreet);
  const idempotent =
    await sql`select response_json from private.command_idempotency where idempotency_key=${key}`;
  noPrecise(JSON.stringify(idempotent));
  await page.getByRole("button", { name: "Revoke inspection permission", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Inspection permission revoked", exact: true }),
  ).toBeVisible();
  expect((await agreementPost(worker, "location", { jobId: request.jobId }, key)).status()).toBe(
    403,
  );
  expect(
    (
      await sql`select revoked_at is not null as revoked from private.inspection_access_grants where id=${grant.grantId}::uuid`
    )[0]!.revoked,
  ).toBe(true);
  view = await agreementView(page, request.jobId);
  expect(
    (await agreementPost(page, "revoke-inspection", { grantId: grant.grantId })).status(),
  ).toBe(200);
  expect((await agreementView(page, request.jobId)).jobVersion).toBe(view.jobVersion);
  expect(
    (
      await sql`select count(*)::int as n from private.notification_outbox where template='inspection-revoked' and payload->>'reference'=${grant.grantId}`
    )[0]!.n,
  ).toBe(1);
  expect(
    (
      await agreementPost(page, "authorize-inspection", {
        quoteId: q.quoteId,
        expectedVersion: q.version,
        expectedJobVersion: view.jobVersion,
        consent: true,
        addressConsent: true,
        feeConsent: true,
      })
    ).status(),
  ).toBe(409);
  const priced = await agreementPost(worker, "save", {
    jobId: request.jobId,
    previousQuoteId: q.quoteId,
    expectedVersion: q.version,
    terms: quoteTerms(96),
  });
  expect(priced.status()).toBe(200);
  const next = await priced.json();
  expect(
    (
      await agreementPost(worker, "publish", {
        quoteId: next.quoteId,
        expectedVersion: next.version,
      })
    ).status(),
  ).toBe(200);
  await page.reload();
  const choose = page.getByRole("button", {
    name: "Choose quote and request booking",
    exact: true,
  });
  await expect(choose).toBeDisabled();
  await page
    .getByRole("checkbox", {
      name: "I have read this quote version, scope, exclusions, tax declaration and proposed time. The worker must still confirm.",
      exact: true,
    })
    .check();
  await choose.click();
  await expect(page).toHaveURL(/app\/client\/bookings\/[a-f0-9-]{36}$/);
  const bookingId = page.url().split("/").at(-1)!;
  await expect(
    page.getByRole("heading", {
      name: "Appointment status: awaiting worker confirmation",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("heading", {
      name: "Appointment status: awaiting worker confirmation",
      exact: true,
    })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: "docs/evidence/screenshots/booking-pending-" + tag + ".png" });
  noPrecise(await page.content());
  expect((await agreementPost(worker, "location", { jobId: request.jobId }, key)).status()).toBe(
    403,
  );
  await worker.goto("/app/worker/bookings/" + bookingId);
  const [declined] = await Promise.all([
    worker.waitForResponse((r) => r.url().includes("/api/v1/agreements/booking-decline")),
    worker.getByRole("button", { name: "Decline booking request", exact: true }).click(),
  ]);
  expect(declined.status()).toBe(200);
  await expect(
    worker.getByRole("heading", { name: "Appointment status: declined", exact: true }),
  ).toBeVisible();
  expect((await agreementView(page, request.jobId)).jobStatus).toBe("cancelled");
  const [owner] = await sql`select id from auth.users where phone=${ownerPhone}`;
  const past = await pastBookingFixture(sql, String(owner!.id), workerId);
  await page.goto("/app/client/bookings/" + past.bookingId);
  await page
    .getByRole("combobox", { name: "Cancellation reason", exact: true })
    .selectOption("no_show");
  await page
    .getByRole("checkbox", {
      name: "I choose to close this appointment and understand that this does not decide fault or payment.",
      exact: true,
    })
    .check();
  await page.getByRole("button", { name: "Cancel appointment", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Appointment status: cancelled", exact: true }),
  ).toBeVisible();
  const [event] =
    await sql`select payload from public.booking_events where booking_id=${past.bookingId}::uuid and event_type='booking_cancel'`;
  expect(event!.payload).toMatchObject({
    reason: "no_show",
    participantReport: true,
    paymentAction: false,
  });
  expect(
    (
      await sql`select count(*)::int as n from private.payment_intents where booking_id=${past.bookingId}::uuid`
    )[0]!.n,
  ).toBe(0);
}
