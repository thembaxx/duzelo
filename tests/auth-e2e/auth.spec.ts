import { test, expect, type Page } from "@playwright/test";
import { createHmac } from "node:crypto";
import postgres from "postgres";
const origin = "http://127.0.0.1:3000";
const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
async function post(page: Page, action: string, data: unknown) {
  return page.request.post(`/api/v1/auth/${action}`, {
    data,
    headers: { origin, "Idempotency-Key": crypto.randomUUID() },
  });
}
async function signIn(page: Page, phone = "0820000001") {
  await page.goto("/auth/sign-in");
  await page.getByLabel("South African mobile number").fill(phone);
  await page.getByRole("button", { name: "Send verification code" }).click();
  await page.getByLabel("Six-digit verification code").fill("123456");
  const [verified] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/v1/auth/verify") && response.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Verify and continue" }).click(),
  ]);
  expect(
    verified.status(),
    "Native OTP verification must succeed before inspecting workspace",
  ).toBe(200);
  await expect(page).toHaveURL(/onboarding|app\//);
}
async function userId(phone = "27820000001") {
  return String((await sql`select id from auth.users where phone=${phone}`)[0]!.id);
}
function totp(secret: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of secret.toUpperCase().replace(/=+$/, ""))
    bits += alphabet.indexOf(char).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((byte) => Number.parseInt(byte, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const hash = createHmac("sha1", key).update(counter).digest();
  const offset = hash[19]! & 15;
  return ((hash.readUInt32BE(offset) & 0x7fffffff) % 1000000).toString().padStart(6, "0");
}
test.beforeEach(async () => {
  await sql`delete from private.auth_rate_limits`;
});
test.afterAll(async () => {
  await sql.end();
});

test("real local OTP, both modes, persistent settings, MFA and revoked sessions", async ({
  page,
  context,
}, info) => {
  await page.goto("/auth/sign-in");
  await page.screenshot({
    path: `docs/evidence/screenshots/auth-sign-in-${info.project.name}.png`,
  });
  await page.getByLabel("South African mobile number").fill("0820000001");
  await page.getByRole("button", { name: "Send verification code" }).click();
  await page.getByLabel("Six-digit verification code").fill("000000");
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await expect(page.locator(".form-error")).toContainText("could not be verified");
  expect((await post(page, "otp", { phone: "0820000001" })).status()).toBe(429);
  await page.getByLabel("Six-digit verification code").fill("123456");
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await expect(page).toHaveURL(/onboarding/);
  await expect(page.getByRole("heading", { name: "Make yourself at home." })).toBeVisible();
  {
    await page.getByLabel("Your display name").fill("Fictional neighbour");
    await page.getByLabel("Both", { exact: true }).check();
    await page.getByLabel("I am 18 or older.").check();
    await page.getByLabel(/I have read the preview terms/).check();
    const [saved] = await Promise.all([
      page.waitForResponse((response) => response.url().endsWith("/api/v1/auth/onboard")),
      page.getByRole("button", { name: "Save and continue" }).click(),
    ]);
    expect(saved.status(), "Onboarding command must persist before navigation").toBe(200);
  }
  await expect(page).toHaveURL(/app\/client/);
  const id = await userId();
  expect(
    (await sql`select status from public.worker_profiles where user_id=${id}::uuid`)[0]!.status,
  ).toBe("draft");
  expect(
    (
      await post(page, "preferences", {
        displayName: "Fake admin",
        emailNotifications: false,
        inAppNotifications: true,
        admin: true,
      })
    ).status(),
  ).toBe(422);
  await page.getByRole("link", { name: "Switch to worker" }).click();
  await expect(page.getByText(/Worker profile: draft/)).toBeVisible();
  await page.getByRole("link", { name: "Switch to client" }).click();
  await page.getByRole("link", { name: "Account settings" }).click();
  await page.getByLabel("Your display name").fill("Fictional updated neighbour");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByText("Preferences saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Your display name")).toHaveValue("Fictional updated neighbour");
  const authCookies = (await context.cookies()).filter((cookie) =>
    cookie.name.startsWith("duzelo-auth"),
  );
  expect(authCookies.every((cookie) => cookie.httpOnly && cookie.sameSite === "Lax")).toBe(true);
  // Expire only the SDK's cached expiry hint. The signed access/refresh tokens
  // remain untouched; native Auth must issue and persist the refreshed session.
  const joined = authCookies
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((cookie) => cookie.value)
    .join("");
  const cached = JSON.parse(Buffer.from(joined.replace(/^base64-/, ""), "base64url").toString());
  cached.expires_at = 0;
  const expiredHint = "base64-" + Buffer.from(JSON.stringify(cached)).toString("base64url");
  const chunked = authCookies.some((cookie) => cookie.name.endsWith(".0"));
  const chunkSize = authCookies[0]!.value.length;
  await context.clearCookies({ name: /^duzelo-auth/ });
  const replacements = [];
  for (let offset = 0, index = 0; offset < expiredHint.length; offset += chunkSize, index++)
    replacements.push({
      ...authCookies[0]!,
      name: chunked ? `duzelo-auth.${index}` : "duzelo-auth",
      value: expiredHint.slice(offset, offset + chunkSize),
    });
  await context.addCookies(replacements);
  const refresh = await page.goto("/app/client");
  await expect(
    page.getByRole("heading", { name: /Welcome, Fictional updated neighbour/ }),
  ).toBeVisible();
  expect(refresh?.headers()["cache-control"]).toContain("no-store");
  expect(
    (await context.cookies())
      .filter((cookie) => cookie.name.startsWith("duzelo-auth"))
      .map((cookie) => cookie.value)
      .join("") !== expiredHint,
  ).toBe(true);
  await page.goto("/admin?role=owner&aal=aal2");
  await expect(
    page.getByRole("heading", { name: "This workspace needs additional permission." }),
  ).toBeVisible();
  expect((await post(page, "mfa-enroll", {})).status()).toBe(403);
  // An approved local test operator grants membership directly, outside signup/UI.
  await sql`insert into private.admin_members(user_id,admin_role) values (${id}::uuid,'owner') on conflict(user_id) do update set active=true`;
  await page.goto("/admin");
  await expect(page).toHaveURL(/admin-mfa/);
  const factors = await sql`select id from auth.mfa_factors where user_id=${id}::uuid`;
  for (const factor of factors) await sql`delete from auth.mfa_factors where id=${factor.id}::uuid`;
  const enroll = await post(page, "mfa-enroll", {});
  expect(enroll.status()).toBe(200);
  const factor = await enroll.json();
  expect(
    (
      await post(page, "mfa-verify", { factorId: factor.factorId, code: totp(factor.secret) })
    ).status(),
  ).toBe(200);
  await page.goto("/admin");
  await expect(page.getByText("Administrator · MFA verified")).toBeVisible();
  await sql`delete from private.admin_members where user_id=${id}::uuid`;
  await sql`update public.user_profiles set is_suspended=true where user_id=${id}::uuid`;
  await page.goto("/app/client");
  await expect(page.getByRole("heading", { name: "This account is paused." })).toBeVisible();
  expect(
    (
      await post(page, "preferences", {
        displayName: "Cannot save",
        emailNotifications: false,
        inAppNotifications: true,
      })
    ).status(),
  ).toBe(403);
  await sql`update public.user_profiles set is_suspended=false where user_id=${id}::uuid`;
  await page.goto("/app/client");
  const previousCookies = await context.cookies();
  await page.getByRole("button", { name: "Sign out on all devices" }).click();
  await expect(page).toHaveURL(/auth\/sign-in/);
  // Replay a still-signed access token after server-side session revocation.
  await context.addCookies(previousCookies);
  await page.goto("/app/client");
  await expect(page.getByRole("heading", { name: "Welcome closer to home." })).toBeVisible();
  await context.clearCookies();
  const current = await userId();
  expect(current).toBe(id);
});

test("cross-origin requests, bounded verification, no signup authority escalation", async ({
  page,
}) => {
  await page.goto("/auth/sign-in");
  expect(
    (
      await page.request.post("/api/v1/auth/otp", {
        data: { phone: "0820000002" },
        headers: { origin: "https://attacker.example" },
      })
    ).status(),
  ).toBe(403);
  expect((await post(page, "otp", { phone: "0820000002", admin: true })).status()).toBe(422);
  await post(page, "otp", { phone: "0820000002" });
  for (let i = 0; i < 5; i++)
    expect((await post(page, "verify", { phone: "0820000002", code: "000000" })).status()).toBe(
      400,
    );
  expect((await post(page, "verify", { phone: "0820000002", code: "123456" })).status()).toBe(429);
  await sql`delete from private.auth_rate_limits`;
  await signIn(page, "0820000003");
  const id = await userId("27820000003");
  await sql`update auth.sessions set not_after=now()-interval '1 second' where user_id=${id}::uuid`;
  expect(
    (
      await post(page, "onboard", {
        displayName: "Fictional person",
        mode: "client",
        adultConsent: true,
        termsConsent: true,
        emailNotifications: false,
        inAppNotifications: true,
      })
    ).status(),
  ).toBe(401);
});
