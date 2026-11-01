import { expect, type Page } from "@playwright/test";
import { createHmac } from "node:crypto";
export const origin = "http://127.0.0.1:3000";
export const plumbing = "20000000-0000-0000-0000-000000000001",
  cleaning = "20000000-0000-0000-0000-000000000002",
  area = "40000000-0000-0000-0000-000000000001";
export async function post(page: Page, action: string, data: unknown, key = crypto.randomUUID()) {
  return page.request.post("/api/v1/workers/" + action, {
    data,
    headers: { origin, "Idempotency-Key": key },
  });
}
export async function authPost(page: Page, action: string, data: unknown) {
  return page.request.post("/api/v1/auth/" + action, {
    data,
    headers: { origin, "Idempotency-Key": crypto.randomUUID() },
  });
}
export async function signIn(page: Page, phone: string, mode: "client" | "both" = "both") {
  await page.goto("/auth/sign-in");
  await page.getByLabel("South African mobile number").fill(phone);
  await page.getByRole("button", { name: "Send verification code" }).click();
  await page.getByLabel("Six-digit verification code").fill("123456");
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/api/v1/auth/verify")),
    page.getByRole("button", { name: "Verify and continue" }).click(),
  ]);
  expect(response.status(), "Native fixture phone login").toBe(200);
  await expect(page.getByRole("heading", { name: "Make yourself at home." })).toBeVisible();
  await page.getByLabel("Your display name").fill("Fictional account " + phone.slice(-1));
  await page
    .getByRole("radio", { name: mode === "both" ? "Both" : "Find help", exact: true })
    .check();
  await page.getByLabel("I am 18 or older.").check();
  await page.getByLabel(/I have read the preview terms/).check();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/app\/client/);
}
export function totp(secret: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of secret.toUpperCase().replace(/=+$/, ""))
    bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((byte) => Number.parseInt(byte, 2))),
    counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac("sha1", key).update(counter).digest(),
    offset = digest[19]! & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).toString().padStart(6, "0");
}
export async function mfa(page: Page) {
  const enrolled = await authPost(page, "mfa-enroll", {});
  expect(enrolled.status()).toBe(200);
  const factor = await enrolled.json();
  const result = await authPost(page, "mfa-verify", {
    factorId: factor.factorId,
    code: totp(factor.secret),
  });
  expect(result.status()).toBe(200);
}
export async function upload(
  page: Page,
  kind: string,
  bytes: Buffer,
  categoryId: string | null = null,
  key = crypto.randomUUID(),
  mime = "image/jpeg",
) {
  return page.request.post("/api/v1/workers/upload", {
    headers: { origin, "Idempotency-Key": key },
    multipart: {
      metadata: JSON.stringify({
        kind,
        categoryId,
        caption: ["avatar", "portfolio"].includes(kind) ? "Fictional sample image" : "",
        consent: true,
      }),
      file: { name: "fixture-image.jpg", mimeType: mime, buffer: bytes },
    },
  });
}
export async function fillProfile(page: Page, name: string) {
  await page.goto("/app/worker/onboarding?edit=1");
  await page.getByLabel("Public display name").fill("Fictional individual");
  await page
    .getByLabel("About your work")
    .fill("Fictional service scopes for an isolated application test.");
  await page.getByLabel("Business owner", { exact: true }).check();
  await page.getByLabel("Business public name").fill(name);
  await page
    .getByLabel("Business registration number (private, if applicable)")
    .fill("PRIVATE-REG-42");
  while (await page.getByRole("button", { name: /Remove service/ }).count())
    await page
      .getByRole("button", { name: /Remove service/ })
      .last()
      .click();
  for (let i = 0; i < 3; i++) {
    if (i) await page.getByRole("button", { name: "Add another service" }).click();
    const row = page.getByRole("group", { name: "Service " + (i + 1), exact: true });
    await row
      .getByRole("combobox", { name: "Category", exact: true })
      .selectOption(i === 0 ? plumbing : cleaning);
    await row
      .getByLabel("Service title")
      .fill(["Fictional repair", "Fictional starting clean", "Fictional custom clean"][i]!);
    await row.getByLabel("What is included?").fill("A bounded fictional service scope for review.");
    await row
      .getByRole("combobox", { name: "Pricing", exact: true })
      .selectOption(["fixed", "from", "quote"][i]!);
    if (i < 2) await row.getByLabel("Price in rand").fill(i === 0 ? "250.00" : "180.00");
  }
  await page.getByRole("combobox", { name: "Public town", exact: true }).selectOption(area);
  await page.getByLabel("Private latitude").fill("-27.123456");
  await page.getByLabel("Private longitude").fill("30.654321");
  await page.context().grantPermissions([], { origin });
  await page.getByRole("button", { name: "Use my location for my private base" }).click();
  await expect(
    page.getByText("Location was not shared. Enter your coordinates manually."),
  ).toBeVisible();
  await expect(page.getByLabel("Private latitude")).toHaveValue("-27.123456");
  await page.getByLabel("Travel radius in kilometres").fill("30");
  await page.getByRole("checkbox", { name: "Synthetic test area", exact: true }).check();
  await page.getByLabel("Possible travel fee in rand").fill("40.00");
  const [saved] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/api/v1/workers/profile")),
    page.getByRole("button", { name: "Save worker draft" }).click(),
  ]);
  expect(saved.status(), "Worker profile must persist").toBe(200);
  await expect(page.getByRole("heading", { name: "Evidence and photos" })).toBeVisible();
}
