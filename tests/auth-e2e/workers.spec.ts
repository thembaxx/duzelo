import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import postgres from "postgres";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import {
  signIn,
  mfa,
  post,
  upload,
  fillProfile,
  plumbing,
  origin,
} from "./helpers/worker-fixtures";
const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
const storage = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
}).storage;
test.beforeEach(async () => {
  await sql`delete from private.auth_rate_limits`;
});
test.afterAll(async () => {
  await sql.end();
});
test("worker evidence, MFA review, publication, category denials and retention are real", async ({
  browser,
  page: worker,
}, info) => {
  test.setTimeout(180000);
  const company = "Fictional " + info.project.name + " workshop";
  const image = await sharp({
    create: { width: 80, height: 80, channels: 3, background: "#466b59" },
  })
    .withExif({ IFD0: { ImageDescription: "PRIVATE GPS FIXTURE" } })
    .jpeg()
    .toBuffer();
  await signIn(worker, "0820000004");
  await fillProfile(worker, company);
  const [owner] =
    await sql`select w.id,w.user_id,a.revision from public.worker_profiles w join auth.users u on u.id=w.user_id join private.worker_applications a on a.worker_id=w.id where u.phone='27820000004'`;
  const workerId = String(owner!.id),
    ownerId = String(owner!.user_id),
    revision = Number(owner!.revision),
    slug = "provider-" + workerId;
  async function expectUnpublished() {
    const response = await guest.request.get("/workers/" + slug);
    const html = await response.text();
    // A streamed Next.js notFound() response may already have status 200.
    expect([200, 404]).toContain(response.status());
    expect(html).toContain("404 / PAGE NOT FOUND");
    expect(html).not.toContain(company);
    expect(
      (
        await sql`select count(*)::int as count from public.worker_cards where worker_id=${workerId}::uuid`
      )[0]!.count,
    ).toBe(0);
  }

  expect((await post(worker, "submit", { revision, consent: true })).status()).toBe(409);
  expect(
    (
      await post(worker, "publish", {
        workerId,
        revision,
        publicContentReviewed: true,
        confirmed: true,
      })
    ).status(),
  ).toBe(403);
  const bad = await upload(worker, "identity", Buffer.from("not a photo"));
  expect(bad.status()).toBe(422);
  // EICAR is a harmless antivirus test signature, never a real identity file.
  const eicar = Buffer.from(
    "WDVPIVAlQEFQWzRcUFpYNTQoUF4pN0NDKTd9JEVJQ0FSLVNUQU5EQVJELUFOVElWSVJVUy1URVNULUZJTEUhJEgrSCo=",
    "base64",
  );
  const unsafe = await upload(worker, "identity", eicar);
  expect(unsafe.status()).toBe(422);
  expect((await unsafe.json()).error.message).toContain("safety check");
  expect(
    (
      await sql`select count(*)::int as count from private.worker_assets where worker_id=${workerId}::uuid and application_revision=${revision}`
    )[0]!.count,
  ).toBe(0);
  await worker.screenshot({
    path: `docs/evidence/screenshots/worker-onboarding-${info.project.name}.png`,
  });
  expect(
    (await new AxeBuilder({ page: worker }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
      .violations,
  ).toEqual([]);
  await worker
    .getByLabel("Photo file")
    .setInputFiles({ name: "fixture-identity.jpg", mimeType: "image/jpeg", buffer: image });
  await worker.getByRole("checkbox", { name: /I have permission to provide this image/ }).check();
  const [uploaded] = await Promise.all([
    worker.waitForResponse((r) => r.url().endsWith("/api/v1/workers/upload")),
    worker.getByRole("button", { name: "Check and upload image" }).click(),
  ]);
  expect(uploaded.status()).toBe(200);
  await expect(worker.getByText("identity", { exact: true })).toBeVisible();
  for (const kind of ["business", "trade", "avatar"])
    expect((await upload(worker, kind, image, kind === "trade" ? plumbing : null)).status()).toBe(
      200,
    );
  const uploadKey = crypto.randomUUID();
  const parallel = await Promise.all([
    upload(worker, "portfolio", image, null, uploadKey),
    upload(worker, "portfolio", image, null, uploadKey),
  ]);
  expect(parallel.every((r) => r.status() === 200)).toBe(true);
  const assets =
    await sql`select id,kind,storage_path from private.worker_assets where worker_id=${workerId}::uuid and application_revision=${revision} and state='stored'`;
  expect(assets.length).toBe(5);
  const identity = assets.find((a) => a.kind === "identity")!,
    avatar = assets.find((a) => a.kind === "avatar")!;
  const ownedAccess = await post(worker, "document-access", { assetId: identity.id });
  expect(ownedAccess.status()).toBe(200);
  const ownedGrant = await ownedAccess.json();
  expect(Number(ownedGrant.expiresIn) <= 60).toBe(true);
  let downloaded;
  try {
    downloaded = await worker.request.get(ownedGrant.url);
  } catch {
    throw new Error("Authorized private image fetch failed; URL details redacted.");
  }
  expect(downloaded.status()).toBe(200);
  expect((await sharp(await downloaded.body()).metadata()).exif).toBeUndefined();
  const otherContext = await browser.newContext({
      baseURL: origin,
      viewport: { width: 390, height: 844 },
    }),
    other = await otherContext.newPage();
  await signIn(other, "0820000006");
  expect((await post(other, "document-access", { assetId: identity.id })).status()).toBe(403);
  const guestContext = await browser.newContext({
      baseURL: origin,
      viewport: info.project.use.viewport,
    }),
    guest = await guestContext.newPage();
  expect((await post(guest, "document-access", { assetId: identity.id })).status()).toBe(401);
  const direct = await guest.request.get(
    process.env.SUPABASE_URL +
      "/storage/v1/object/authenticated/worker-evidence/" +
      identity.storage_path,
    { headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY! } },
  );
  expect(direct.status() !== 200).toBe(true);
  expect((await guest.request.get("/api/v1/workers/media/" + identity.id)).status()).toBe(404);
  await worker.reload();
  await worker
    .getByRole("checkbox", { name: /My profile, service scope and evidence are accurate/ })
    .check();
  await worker.getByRole("button", { name: "Submit application for review" }).click();
  await expect(worker).toHaveURL(/worker\/verification/);
  await expectUnpublished();
  const adminContext = await browser.newContext({
      baseURL: origin,
      viewport: { width: 1440, height: 900 },
    }),
    admin = await adminContext.newPage();
  await signIn(admin, "0820000005", "client");
  const [reviewer] = await sql`select id from auth.users where phone='27820000005'`;
  const reviewerId = String(reviewer!.id);
  await sql`update auth.users set email='fictional-reviewer-five@example.invalid',email_confirmed_at=now() where id=${reviewerId}::uuid`;
  await sql`insert into private.admin_members(user_id,admin_role) values (${reviewerId}::uuid,'owner') on conflict(user_id) do update set active=true,admin_role='owner'`;
  expect((await post(admin, "document-access", { assetId: identity.id })).status()).toBe(403);
  await sql`delete from auth.mfa_factors where user_id=${reviewerId}::uuid`;
  await mfa(admin);
  await admin.goto("/admin/verifications");
  await admin.getByRole("link", { name: new RegExp(company) }).click();
  const adminHtml = await (await admin.request.get("/admin/verifications/" + workerId)).text();
  expect(
    ["-27.123456", "30.654321", "PRIVATE-REG-42"].every((value) => !adminHtml.includes(value)),
  ).toBe(true);
  const claims =
    await sql`select id,kind,category_id from private.worker_verifications where worker_id=${workerId}::uuid and application_revision=${revision}`;
  const expiry = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
  const decision = (verificationId: string, rev: number, outcome = "approved") => ({
    workerId,
    revision: rev,
    verificationId,
    decision: outcome,
    reason: "Fictional evidence inspected by the local test operator.",
    expiryDate: outcome === "approved" ? expiry : null,
    confirmed: true,
  });
  expect(
    (
      await post(admin, "publish", {
        workerId,
        revision,
        publicContentReviewed: true,
        confirmed: true,
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await post(
        admin,
        "decision",
        decision(String(claims.find((v) => v.kind === "identity")!.id), revision),
      )
    ).status(),
  ).toBe(409);
  await admin.screenshot({
    path: `docs/evidence/screenshots/worker-review-${info.project.name}.png`,
  });
  const [accessed] = await Promise.all([
    admin.waitForResponse((r) => r.url().endsWith("/api/v1/workers/document-access")),
    admin.getByRole("button", { name: "Request identity image", exact: true }).click(),
  ]);
  expect(accessed.status()).toBe(200);
  await expect(admin.getByRole("link", { name: /Open identity image/ })).toBeVisible();
  for (const asset of assets.filter((a) => a.kind !== "identity"))
    expect((await post(admin, "document-access", { assetId: asset.id })).status()).toBe(200);
  const identitySection = admin
    .locator(".worker-review-claim")
    .filter({ has: admin.getByRole("heading", { name: "identity", exact: true }) });
  await identitySection.getByLabel("Review decision").selectOption("approved");
  await identitySection
    .getByLabel("Reason shared with the worker")
    .fill("Fictional identity evidence was inspected by the operator.");
  await identitySection.getByLabel("Credential expiry or next review date").fill(expiry);
  await identitySection.getByRole("checkbox", { name: /I have inspected the evidence/ }).check();
  const [reviewed] = await Promise.all([
    admin.waitForResponse((r) => r.url().endsWith("/api/v1/workers/decision")),
    identitySection.getByRole("button", { name: "Record decision" }).click(),
  ]);
  expect(reviewed.status()).toBe(200);
  for (const v of claims.filter((v) => v.kind !== "identity"))
    expect((await post(admin, "decision", decision(String(v.id), revision))).status()).toBe(200);
  await admin.reload();
  await admin.getByRole("checkbox", { name: /I have checked the public text/ }).check();
  await admin.getByRole("checkbox", { name: /Publish only the eligible/ }).check();
  const [published] = await Promise.all([
    admin.waitForResponse((r) => r.url().endsWith("/api/v1/workers/publish")),
    admin.getByRole("button", { name: "Publish reviewed profile" }).click(),
  ]);
  expect(published.status()).toBe(200);
  await guest.goto("/workers/" + slug);
  await expect(guest.getByRole("heading", { name: company, exact: true })).toBeVisible();
  await expect(guest.getByText("Plumbing · Trade credential reviewed")).toBeVisible();
  const html = await (await guest.request.get("/workers/" + slug)).text();
  expect(
    [
      "-27.123456",
      "30.654321",
      "PRIVATE-REG-42",
      "27820000004",
      "storage_path",
      "PRIVATE GPS FIXTURE",
    ].every((value) => !html.includes(value)),
  ).toBe(true);
  expect((await guest.request.get("/workers/" + slug)).headers()["cache-control"]).toContain(
    "no-store",
  );
  expect((await guest.request.get("/api/v1/workers/media/" + identity.id)).status()).toBe(404);
  const publicImage = await guest.request.get("/api/v1/workers/media/" + avatar.id);
  expect(publicImage.status()).toBe(200);
  expect((await sharp(await publicImage.body()).metadata()).exif).toBeUndefined();
  await guest.screenshot({
    path: `docs/evidence/screenshots/worker-public-${info.project.name}.png`,
  });
  expect(
    (await new AxeBuilder({ page: guest }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
      .violations,
  ).toEqual([]);
  // Even an MFA-verified staff member may not approve their own worker claim.
  await sql`update auth.users set email='fictional-worker-four@example.invalid',email_confirmed_at=now() where id=${ownerId}::uuid`;
  await sql`insert into private.admin_members(user_id,admin_role) values (${ownerId}::uuid,'owner') on conflict(user_id) do update set active=true,admin_role='owner'`;
  await sql`delete from auth.mfa_factors where user_id=${ownerId}::uuid`;
  await mfa(worker);
  expect((await post(worker, "decision", decision(String(claims[0]!.id), revision))).status()).toBe(
    403,
  );
  expect(
    (
      await post(worker, "publish", {
        workerId,
        revision,
        publicContentReviewed: true,
        confirmed: true,
      })
    ).status(),
  ).toBe(403);
  await sql`delete from private.admin_members where user_id=${ownerId}::uuid`;
  await sql`update private.admin_members set admin_role='support' where user_id=${reviewerId}::uuid`;
  expect((await post(admin, "document-access", { assetId: identity.id })).status()).toBe(403);
  await sql`update private.admin_members set admin_role='owner' where user_id=${reviewerId}::uuid`;
  expect(
    (
      await post(admin, "publish", {
        workerId,
        revision,
        publicContentReviewed: true,
        confirmed: true,
      })
    ).status(),
  ).toBe(200);
  await sql`update public.user_profiles set is_suspended=true where user_id=${ownerId}::uuid`;
  await expectUnpublished();
  expect((await post(worker, "submit", { revision, consent: true })).status()).toBe(403);
  await sql`update public.user_profiles set is_suspended=false where user_id=${ownerId}::uuid`;
  expect(
    (
      await post(admin, "publish", {
        workerId,
        revision,
        publicContentReviewed: true,
        confirmed: true,
      })
    ).status(),
  ).toBe(200);
  await sql`update private.worker_assets set retain_until=now()+interval '10 seconds' where id=${identity.id}::uuid`;
  const finalLease = await post(admin, "document-access", { assetId: identity.id });
  expect(finalLease.status()).toBe(200);
  expect((await finalLease.json()).expiresIn).toBeLessThanOrEqual(10);
  await sql`update private.worker_assets set retain_until=now()-interval '1 second' where id=${identity.id}::uuid`;
  await expectUnpublished();
  expect(
    (
      await post(admin, "publish", {
        workerId,
        revision,
        publicContentReviewed: true,
        confirmed: true,
      })
    ).status(),
  ).toBe(409);
  const purgeKey = crypto.randomUUID();
  for (let i = 0; i < 2; i++)
    expect(
      (await post(admin, "purge-expired", { workerId, confirmed: true }, purgeKey)).status(),
    ).toBe(200);
  expect(
    (await sql`select state from private.worker_assets where id=${identity.id}::uuid`)[0]!.state,
  ).toBe("purged");
  const gone = await storage.from("worker-evidence").download(String(identity.storage_path));
  expect(Boolean(gone.error)).toBe(true);
  // Editing/resubmitting creates a new revision and never carries old approval.
  await worker.goto("/app/worker/onboarding?edit=1");
  await worker
    .getByLabel("About your work")
    .fill("A revised fictional service profile for review and resubmission.");
  await worker.getByRole("button", { name: "Save worker draft" }).click();
  await expect(worker.getByRole("heading", { name: "Evidence and photos" })).toBeVisible();
  const next = Number(
    (
      await sql`select revision from private.worker_applications where worker_id=${workerId}::uuid`
    )[0]!.revision,
  );
  expect(next).toBe(revision + 1);
  expect((await post(admin, "decision", decision(String(claims[0]!.id), revision))).status()).toBe(
    409,
  );
  for (const kind of ["identity", "business", "trade"])
    expect((await upload(worker, kind, image, kind === "trade" ? plumbing : null)).status()).toBe(
      200,
    );
  expect((await post(worker, "submit", { revision: next, consent: true })).status()).toBe(200);
  const nextClaims =
    await sql`select id,kind from private.worker_verifications where worker_id=${workerId}::uuid and application_revision=${next}`;
  const nextAssets =
    await sql`select id from private.worker_assets where worker_id=${workerId}::uuid and application_revision=${next} and state='stored'`;
  for (const asset of nextAssets)
    expect((await post(admin, "document-access", { assetId: asset.id })).status()).toBe(200);
  for (const v of nextClaims)
    expect(
      (
        await post(
          admin,
          "decision",
          decision(String(v.id), next, v.kind === "trade" ? "rejected" : "approved"),
        )
      ).status(),
    ).toBe(200);
  expect(
    (
      await post(admin, "publish", {
        workerId,
        revision: next,
        publicContentReviewed: true,
        confirmed: true,
      })
    ).status(),
  ).toBe(200);
  await guest.goto("/workers/" + slug);
  await expect(guest.getByRole("heading", { name: "Fictional starting clean" })).toBeVisible();
  await expect(guest.getByRole("heading", { name: "Fictional repair" })).toHaveCount(0);
  const change = decision(
    String(nextClaims.find((v) => v.kind === "identity")!.id),
    next,
    "needs_changes",
  );
  change.reason = "Provide a clearer fictional identity photo.";
  expect((await post(admin, "decision", change)).status()).toBe(200);
  await expectUnpublished();
  await worker.goto("/app/worker/verification");
  await expect(
    worker.getByText("Reviewer feedback: Provide a clearer fictional identity photo."),
  ).toBeVisible();
  expect(
    (
      await sql`select count(*)::int as count from private.worker_review_events where worker_id=${workerId}::uuid`
    )[0]!.count,
  ).toBeGreaterThanOrEqual(7);
  await adminContext.close();
  await otherContext.close();
  await guestContext.close();
});
