import { expect, type Page } from "@playwright/test";
import { origin } from "./worker-fixtures";
import type { WorkflowView } from "../../../src/features/workflow/types";
export const workPost = (page: Page, action: string, data: unknown, key = crypto.randomUUID()) =>
  page.request.post("/api/v1/collaboration/" + action, {
    data,
    headers: { origin, "Idempotency-Key": key },
  });
export async function workView(page: Page, id: string): Promise<WorkflowView> {
  const r = await page.request.get("/api/v1/collaboration/workflow?id=" + id);
  expect(r.status(), await r.text()).toBe(200);
  return r.json();
}
export async function workOk(page: Page, action: string, data: unknown, key = crypto.randomUUID()) {
  const r = await workPost(page, action, data, key);
  expect(r.status(), await r.text()).toBe(200);
  return r.json();
}
export async function workUpload(
  page: Page,
  meta: unknown,
  bytes: Buffer,
  mime = "image/jpeg",
  key = crypto.randomUUID(),
) {
  return page.request.post("/api/v1/collaboration/upload", {
    headers: { origin, "Idempotency-Key": key },
    multipart: {
      meta: JSON.stringify(meta),
      file: { name: "private-photo.jpg", mimeType: mime, buffer: bytes },
    },
  });
}
export const bookingData = (view: WorkflowView) => ({
  bookingId: view.id,
  expectedVersion: view.version,
  consent: true,
});
