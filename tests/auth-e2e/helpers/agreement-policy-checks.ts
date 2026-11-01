import { expect, type Page } from "@playwright/test";
import type postgres from "postgres";
import type { QuoteTerms } from "../../../src/features/quotes/schema";
import { createSavedJob, jobPost } from "./job-actions";
import { agreementPost, agreementView } from "./agreement-actions";
import { agreementJob, quoteTerms, expiredQuoteFixture } from "./agreement-fixtures";
export async function secondaryQuoteChecks({
  sql,
  page,
  worker,
  workerId,
  mainJobId,
  bookingId,
  terms,
}: {
  sql: ReturnType<typeof postgres>;
  page: Page;
  worker: Page;
  workerId: string;
  mainJobId: string;
  bookingId: string;
  terms: QuoteTerms;
}) {
  const clash = await createSavedJob(
    page,
    { ...agreementJob, title: "Fictional M06 conflicting quote" },
    "provider-" + workerId,
  );
  const submitted = await jobPost(page, "submit", {
    jobId: clash.jobId,
    expectedVersion: clash.version,
    consent: true,
  });
  expect(submitted.status()).toBe(200);
  expect((await submitted.json()).invited).toBe(1);
  const first = await agreementPost(worker, "save", {
    jobId: clash.jobId,
    previousQuoteId: null,
    expectedVersion: 0,
    terms,
  });
  expect(first.status()).toBe(200);
  const q1 = await first.json();
  expect(
    (
      await agreementPost(worker, "publish", { quoteId: q1.quoteId, expectedVersion: q1.version })
    ).status(),
  ).toBe(409);
  const next = await agreementPost(worker, "save", {
    jobId: clash.jobId,
    previousQuoteId: q1.quoteId,
    expectedVersion: q1.version,
    terms: quoteTerms(72),
  });
  expect(next.status()).toBe(200);
  const q2 = await next.json();
  expect(
    (
      await agreementPost(worker, "publish", { quoteId: q2.quoteId, expectedVersion: q2.version })
    ).status(),
  ).toBe(200);
  await worker.goto("/app/worker/quotes?job=" + clash.jobId);
  const [withdrawn] = await Promise.all([
    worker.waitForResponse((r) => r.url().endsWith("/api/v1/agreements/withdraw")),
    worker.getByRole("button", { name: "Withdraw version 2", exact: true }).click(),
  ]);
  expect(withdrawn.status()).toBe(200);
  await expect(
    worker
      .getByRole("article", { name: /^Quote version 2 from/ })
      .getByText(/Version 2 · withdrawn/),
  ).toBeVisible();
  const expired = await expiredQuoteFixture(sql, clash.jobId, workerId, 3),
    view = await agreementView(page, clash.jobId);
  expect(
    (
      await agreementPost(page, "accept", {
        quoteId: expired,
        expectedVersion: 3,
        expectedJobVersion: view.jobVersion,
        consent: true,
      })
    ).status(),
  ).toBe(409);
  await page.goto("/app/client/jobs/" + clash.jobId + "/quotes");
  await page
    .getByRole("checkbox", {
      name: "I choose to decline these offers and close this request.",
      exact: true,
    })
    .check();
  const [closed] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/api/v1/agreements/cancel-request")),
    page.getByRole("button", { name: "Decline offers and close request", exact: true }).click(),
  ]);
  expect(closed.status()).toBe(200);
  expect((await agreementView(page, clash.jobId)).jobStatus).toBe("cancelled");
  await page.goto("/app/client/bookings/" + bookingId);
  const b = await (
    await page.request.get("/api/v1/agreements/booking?id=" + bookingId + "&mode=client")
  ).json();
  expect(b.status).toBe("confirmed");
  expect(
    (
      await agreementPost(
        page,
        "booking-cancel",
        { bookingId, expectedVersion: b.version, reason: "no_show" },
        crypto.randomUUID(),
        false,
      )
    ).status(),
  ).toBe(422);
  await page
    .getByRole("checkbox", {
      name: "I choose to close this appointment and understand that this does not decide fault or payment.",
      exact: true,
    })
    .check();
  const [cancelled] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/v1/agreements/booking-cancel")),
    page.getByRole("button", { name: "Cancel appointment", exact: true }).click(),
  ]);
  expect(cancelled.status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "Appointment status: cancelled", exact: true }),
  ).toBeVisible();
  expect(
    (
      await sql`select count(*)::int as n from public.quotes where job_id=${mainJobId}::uuid and status='accepted'`
    )[0]!.n,
  ).toBe(1);
  expect(
    (
      await sql`select count(*)::int as n from private.payment_intents where booking_id=${bookingId}::uuid`
    )[0]!.n,
  ).toBe(0);
}
