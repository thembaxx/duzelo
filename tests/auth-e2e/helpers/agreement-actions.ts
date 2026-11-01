import { expect, type Page } from "@playwright/test";
import { origin } from "./worker-fixtures";
import { privateStreet, privateNotes } from "./agreement-fixtures";
export const agreementPost = (
  page: Page,
  action: string,
  data: unknown,
  key = crypto.randomUUID(),
  worker?: boolean,
) =>
  page.request.post(
    "/api/v1/agreements/" +
      action +
      (worker === undefined ? "" : "?mode=" + (worker ? "worker" : "client")),
    { data, headers: { origin, "Idempotency-Key": key } },
  );
export async function agreementView(page: Page, job: string, worker = false) {
  const response = await page.request.get(
    "/api/v1/agreements/job?jobId=" + job + "&mode=" + (worker ? "worker" : "client"),
  );
  expect(response.status()).toBe(200);
  return response.json();
}
export function noPrecise(text: string) {
  for (const value of [
    privateStreet,
    privateNotes,
    "-27.120987",
    "30.650987",
    "-27.123456",
    "30.654321",
    "service_address_snapshot",
    "storage_path",
    "base_point",
    "match_score",
  ])
    expect(text).not.toContain(value);
}
export async function savedQuote(page: Page) {
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/api/v1/agreements/save")),
    page.getByRole("button", { name: "Save private quote version", exact: true }).click(),
  ]);
  expect(response.status()).toBe(200);
  const q = await response.json();
  await expect(
    page.getByRole("button", { name: "Send quote version " + q.version, exact: true }),
  ).toBeVisible();
  return q as { jobId: string; quoteId: string; version: number };
}
export async function publishQuote(page: Page, version: number) {
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/api/v1/agreements/publish")),
    page.getByRole("button", { name: "Send quote version " + version, exact: true }).click(),
  ]);
  expect(response.status()).toBe(200);
  return response.json();
}
