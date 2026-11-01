import { expect, type Page } from "@playwright/test";
import type { DraftData } from "../../../src/features/jobs/schema";
import { area, cleaning, origin } from "./worker-fixtures";
import { privateJobPoint } from "./job-fixtures";
export const jobData: DraftData = {
  categoryId: cleaning,
  title: "Fictional M05 cleaning request",
  description: "A fictional room needs a careful clean for this isolated test.",
  urgency: "flexible",
  slots: [],
  contactWindow: "After 17:00",
  budgetMin: 45000,
  budgetMax: 75000,
  location: {
    kind: "manual",
    areaId: area,
    street: "JOB-PRIVATE-RURAL-42",
    province: "Mpumalanga",
    notes: "JOB-PRIVATE-ACCESS-42",
    point: privateJobPoint,
    townOnly: false,
    consent: true,
  },
};
export const jobPost = (page: Page, action: string, data: unknown, key = crypto.randomUUID()) =>
  page.request.post("/api/v1/jobs/" + action, {
    data,
    headers: { origin, "Idempotency-Key": key },
  });
export async function createSavedJob(
  page: Page,
  data: DraftData = jobData,
  workerSlug: string | null = null,
) {
  const made = await jobPost(page, "create", { workerSlug, categoryId: data.categoryId });
  expect(made.status()).toBe(200);
  const job = await made.json();
  const saved = await jobPost(page, "save", {
    jobId: job.jobId,
    expectedVersion: job.version,
    step: 5,
    data,
  });
  expect(saved.status()).toBe(200);
  return { ...job, version: (await saved.json()).version };
}
export async function nextStep(page: Page, step: number) {
  const [saved] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/api/v1/jobs/save")),
    page.getByRole("button", { name: "Save and continue", exact: true }).click(),
  ]);
  expect(saved.status()).toBe(200);
  const heading = page.getByRole("heading", { name: new RegExp("^Step " + step + ":") });
  await expect(heading).toBeVisible();
  await expect(heading).toBeFocused();
}
export async function setTheme(page: Page, mobile: boolean, theme: "Light" | "Dark" | "System") {
  if (mobile) await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page
    .getByRole("button", { name: theme + " theme", exact: true })
    .first()
    .click();
  if (mobile) await page.getByRole("button", { name: "Close menu", exact: true }).click();
}
export function assertPreviewPrivate(text: string) {
  for (const value of [
    "JOB-PRIVATE-RURAL-42",
    "JOB-PRIVATE-ACCESS-42",
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
