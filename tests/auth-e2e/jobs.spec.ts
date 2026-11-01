import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import postgres from "postgres";
import sharp from "sharp";
import { signIn, origin, area, cleaning } from "./helpers/worker-fixtures";
import { prepareJobWorkers, cleanupJobFixtures, privateJobPoint } from "./helpers/job-fixtures";
import { jobPost, nextStep, setTheme, assertPreviewPrivate, jobData } from "./helpers/job-actions";
import { jobPolicyChecks } from "./helpers/job-policy-checks";
const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
test.beforeEach(async () => {
  await cleanupJobFixtures(sql);
  await sql`delete from private.auth_rate_limits`;
});
test.afterEach(async () => {
  await cleanupJobFixtures(sql);
});
test.afterAll(async () => {
  await sql.end();
});
test("persistent request, real private photo, bounded matching and coarsened worker opportunities", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(300000);
  const workerContext = await browser.newContext({
    baseURL: origin,
    viewport: info.project.use.viewport,
  });
  const worker = await workerContext.newPage();
  await signIn(worker, "0820000003");
  const [native] = await sql`select id from auth.users where phone='27820000003'`;
  const fixtures = await prepareJobWorkers(sql, String(native!.id), info.project.name);
  await signIn(page, "0820000006");
  await page.goto("/app/client/jobs/new");
  await page.getByRole("button", { name: "Start request", exact: true }).click();
  await expect(page).toHaveURL(/app\/client\/jobs\/[a-f0-9-]{36}$/);
  const jobId = page.url().split("/").at(-1)!;
  expect((await worker.request.get("/api/v1/jobs/" + jobId)).status()).toBe(403);
  await page
    .getByRole("combobox", { name: "Service category", exact: true })
    .selectOption(cleaning);
  await nextStep(page, 2);
  await page.getByRole("textbox", { name: "Request title", exact: true }).fill(jobData.title);
  await page
    .getByRole("textbox", { name: "What needs doing?", exact: true })
    .fill(jobData.description);
  await setTheme(page, info.project.name === "mobile", "Dark");
  await expect(page.getByRole("textbox", { name: "Request title", exact: true })).toHaveValue(
    jobData.title,
  );
  await setTheme(page, info.project.name === "mobile", "System");
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect(page.getByRole("textbox", { name: "What needs doing?", exact: true })).toHaveValue(
    jobData.description,
  );
  const photo = await sharp({
    create: { width: 80, height: 80, channels: 3, background: "#466b59" },
  })
    .withExif({ IFD0: { ImageDescription: "M05_PRIVATE_GPS_METADATA" } })
    .jpeg()
    .toBuffer();
  const upload = (bytes: Buffer, key = crypto.randomUUID()) =>
    page.request.post("/api/v1/jobs/upload", {
      headers: { origin, "Idempotency-Key": key },
      multipart: {
        metadata: JSON.stringify({ jobId, consent: true }),
        file: { name: "fictional-work.jpg", mimeType: "image/jpeg", buffer: bytes },
      },
    });
  const eicar = Buffer.from(
    "WDVPIVAlQEFQWzRcUFpYNTQoUF4pN0NDKTd9JEVJQ0FSLVNUQU5EQVJELUFOVElWSVJVUy1URVNULUZJTEUhJEgrSCo=",
    "base64",
  );
  const unsafe = await upload(eicar);
  expect(unsafe.status()).toBe(422);
  expect((await unsafe.json()).error.message).toContain("safety check");
  expect(
    (
      await sql`select count(*)::int as count from private.job_assets where job_id=${jobId}::uuid`
    )[0]!.count,
  ).toBe(0);
  await page
    .locator("#main-content")
    .getByLabel("Choose a request photo", { exact: true })
    .setInputFiles({ name: "fictional-work.jpg", mimeType: "image/jpeg", buffer: photo });
  await page
    .getByRole("checkbox", {
      name: "I choose to share this photo with eligible invited workers.",
      exact: true,
    })
    .check();
  const [uploadResponse] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/api/v1/jobs/upload")),
    page.getByRole("button", { name: "Upload photo", exact: true }).click(),
  ]);
  expect(uploadResponse.status()).toBe(200);
  const photoId = String((await uploadResponse.json()).assetId);
  await expect(page.getByText("Photo checked and saved.", { exact: true })).toBeVisible();
  const downloaded = await page.request.get("/api/v1/jobs/media/" + photoId);
  expect(downloaded.status()).toBe(200);
  expect((await sharp(await downloaded.body()).metadata()).exif).toBeUndefined();
  expect((await worker.request.get("/api/v1/jobs/media/" + photoId)).status()).toBe(403);
  const key = crypto.randomUUID();
  const duplicates = await Promise.all([upload(photo, key), upload(photo, key)]);
  expect(duplicates.map((r) => r.status())).toEqual([200, 200]);
  const repeated = await Promise.all(duplicates.map((r) => r.json()));
  expect(repeated[0].assetId).toBe(repeated[1].assetId);
  expect(
    (
      await sql`select count(*)::int as count from private.audit_events where action='jobs.upload-stored' and resource_id=${repeated[0].assetId}::uuid`
    )[0]!.count,
  ).toBe(1);
  const fakePending: string[] = [];
  for (let i = 0; i < 6; i++) {
    const id = crypto.randomUUID();
    fakePending.push(id);
    await sql`insert into private.job_assets(id,job_id,owner_id,storage_path,sha256,byte_size,retain_until) select ${id}::uuid,j.id,j.client_id,${jobId + "/" + id + ".jpg"},${"e".repeat(64)},100,now()+interval '1 hour' from public.job_requests j where j.id=${jobId}::uuid`;
  }
  const tooMany = await upload(photo);
  expect(tooMany.status()).toBe(422);
  expect((await tooMany.json()).error.message).toContain("eight photos");
  await sql`delete from private.job_assets where id=any(${fakePending}::uuid[])`;
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByText("Draft saved. You can safely return to it from My requests.", { exact: true }),
  ).toBeVisible();
  await page.reload({ waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: "Step 2: Work details and photos", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Request title", exact: true })).toHaveValue(
    jobData.title,
  );
  await expect(page.locator(".job-photo-list img")).toHaveCount(2);
  const [removed] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/api/v1/jobs/remove-photo")),
    page.getByRole("button", { name: "Remove photo 2", exact: true }).click(),
  ]);
  expect(removed.status()).toBe(200);
  await expect(page.locator(".job-photo-list img")).toHaveCount(1);
  await page
    .getByRole("heading", { name: "Step 2: Work details and photos", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: `docs/evidence/screenshots/jobs-draft-${info.project.name}.png` });
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
      .violations,
  ).toEqual([]);
  await nextStep(page, 3);
  expect(await page.locator(".job-step").evaluate((n) => getComputedStyle(n).animationName)).toBe(
    "none",
  );
  await page
    .getByRole("combobox", { name: "When is help needed?", exact: true })
    .selectOption("scheduled");
  await page.getByRole("button", { name: "Add requested time window", exact: true }).click();
  const day = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  await page
    .getByRole("textbox", { name: "When can you respond about this request?", exact: true })
    .fill("After 17:00");
  await page
    .locator("#main-content")
    .getByLabel("Start time 1", { exact: true })
    .fill(day + "T10:00");
  await page
    .locator("#main-content")
    .getByLabel("End time 1", { exact: true })
    .fill(day + "T12:00");
  await nextStep(page, 4);
  await page
    .getByRole("textbox", { name: "Minimum budget (ZAR, optional)", exact: true })
    .fill("450");
  await page
    .getByRole("textbox", { name: "Maximum budget (ZAR, optional)", exact: true })
    .fill("750");
  await page.getByRole("button", { name: "Use this budget range", exact: true }).click();
  await nextStep(page, 5);
  await page.getByRole("combobox", { name: "Public job town", exact: true }).selectOption(area);
  await page
    .getByRole("textbox", { name: "Private street or rural directions", exact: true })
    .fill("JOB-PRIVATE-RURAL-42");
  await page
    .getByRole("combobox", { name: "Job province", exact: true })
    .selectOption("Mpumalanga");
  await page
    .getByRole("textbox", { name: "Private access notes", exact: true })
    .fill("JOB-PRIVATE-ACCESS-42");
  await page.getByRole("button", { name: "Use my location for this request", exact: true }).click();
  await expect(page.getByText(/Location was not shared/)).toBeVisible();
  await page
    .getByRole("textbox", { name: "Private job latitude", exact: true })
    .fill(String(privateJobPoint.latitude));
  await page
    .getByRole("textbox", { name: "Private job longitude", exact: true })
    .fill(String(privateJobPoint.longitude));
  await page.getByRole("button", { name: "Use this private point", exact: true }).click();
  await page
    .getByRole("checkbox", {
      name: "I choose to store this location privately with my job request.",
      exact: true,
    })
    .check();
  await nextStep(page, 6);
  await expect(page.getByText("JOB-PRIVATE-RURAL-42", { exact: true })).toBeVisible();
  expect(page.url()).not.toContain("-27.120987");
  const owner = await (await page.request.get("/api/v1/jobs/" + jobId)).json();
  expect(owner.data.budgetMin).toBe(45000);
  expect(owner.data.location.point).toEqual(privateJobPoint);
  await page.context().setOffline(true);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.locator(".job-wizard").getByRole("alert")).toContainText(
    "Connection interrupted",
  );
  await expect(page.getByText("JOB-PRIVATE-RURAL-42", { exact: true })).toBeVisible();
  await page.context().setOffline(false);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.locator(".job-wizard").getByRole("alert")).toHaveCount(0);
  await page
    .getByRole("checkbox", {
      name: "I choose to submit this request and send the bounded invitations described above.",
      exact: true,
    })
    .check();
  await page.getByRole("button", { name: "Submit request", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Invitations created", exact: true }),
  ).toBeVisible();
  const submitted = await (await page.request.get("/api/v1/jobs/" + jobId)).json();
  expect(submitted.invited).toBe(5);
  expect(submitted.waves).toBe(1);
  const [match] =
    await sql`select id,expires_at from public.job_matches where job_id=${jobId}::uuid and worker_id=${fixtures.workerId}::uuid`;
  expect(match).toBeTruthy();
  const preview = await worker.request.get("/api/v1/jobs/opportunity?matchId=" + match!.id);
  expect(preview.status()).toBe(200);
  assertPreviewPrivate(JSON.stringify(await preview.json()));
  await worker.goto("/app/worker/opportunities/" + match!.id);
  await expect(worker.getByRole("heading", { name: jobData.title, exact: true })).toBeVisible();
  assertPreviewPrivate(
    await (await worker.request.get("/app/worker/opportunities/" + match!.id)).text(),
  );
  expect((await worker.request.get("/api/v1/jobs/media/" + photoId)).status()).toBe(200);
  await worker.getByRole("heading", { name: jobData.title, exact: true }).scrollIntoViewIfNeeded();
  await worker.screenshot({
    path: `docs/evidence/screenshots/jobs-opportunity-${info.project.name}.png`,
  });
  expect(
    (await new AxeBuilder({ page: worker }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
      .violations,
  ).toEqual([]);
  expect(await worker.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  const marked = await jobPost(worker, "view", { matchId: String(match!.id) });
  expect(marked.status()).toBe(200);
  expect(
    (await sql`select expires_at from public.job_matches where id=${match!.id}::uuid`)[0]!
      .expires_at,
  ).toEqual(match!.expires_at);
  const slots = submitted.data.slots;
  const blocked = await jobPost(worker, "time-block", { start: slots[0].start, end: slots[0].end });
  expect(blocked.status()).toBe(200);
  expect(
    await (await worker.request.get("/api/v1/jobs/opportunity?matchId=" + match!.id)).json(),
  ).toBeNull();
  expect((await worker.request.get("/api/v1/jobs/media/" + photoId)).status()).toBe(403);
  const [block] =
    await sql`select id from private.worker_schedule_blocks where worker_id=${fixtures.workerId}::uuid`;
  expect((await jobPost(worker, "remove-time-block", { id: String(block!.id) })).status()).toBe(
    200,
  );
  expect((await worker.request.get("/api/v1/jobs/media/" + photoId)).status()).toBe(200);
  await sql`update public.worker_profiles set status='suspended' where id=${fixtures.workerId}::uuid`;
  expect(
    await (await worker.request.get("/api/v1/jobs/opportunity?matchId=" + match!.id)).json(),
  ).toBeNull();
  expect((await worker.request.get("/api/v1/jobs/media/" + photoId)).status()).toBe(403);
  await sql`update public.worker_profiles set status='approved' where id=${fixtures.workerId}::uuid`;
  await sql`select private.publish_worker_card(${fixtures.workerId}::uuid,${area}::uuid,${fixtures.name},'A fictional service scope for isolated matching acceptance.')`;
  expect((await worker.request.get("/api/v1/jobs/media/" + photoId)).status()).toBe(200);
  await sql`update private.job_assets set retain_until=now()-interval '1 second' where id=${photoId}::uuid`;
  expect((await page.request.get("/api/v1/jobs/media/" + photoId)).status()).toBe(403);
  expect((await worker.request.get("/api/v1/jobs/media/" + photoId)).status()).toBe(403);
  await worker.reload();
  await worker.getByRole("button", { name: "Decline invitation", exact: true }).click();
  await expect(worker).toHaveURL(/\/app\/worker\/opportunities$/);
  expect(
    (await sql`select status from public.job_matches where id=${match!.id}::uuid`)[0]!.status,
  ).toBe("declined");
  await jobPolicyChecks({
    sql,
    page,
    worker,
    workerId: fixtures.workerId,
    mainJobId: jobId,
    fixtureIds: fixtures.ids,
  });
  const cached = await page.evaluate(async () => {
    const paths = (
      await Promise.all(
        (await caches.keys()).map(async (name) =>
          (await (await caches.open(name)).keys()).map((r) => new URL(r.url).pathname),
        ),
      )
    ).flat();
    return paths.filter(
      (p) =>
        p.startsWith("/api/v1/jobs") ||
        p.startsWith("/app/client/jobs") ||
        p.startsWith("/app/worker/opportunities"),
    );
  });
  expect(cached).toEqual([]);
  await workerContext.close();
});
