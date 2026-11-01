import { expect, type Page } from "@playwright/test";
import type postgres from "postgres";
import { jobData, jobPost, createSavedJob, assertPreviewPrivate } from "./job-actions";
import { area, origin } from "./worker-fixtures";
export async function jobPolicyChecks({
  sql,
  page,
  worker,
  workerId,
  mainJobId,
  fixtureIds,
}: {
  sql: ReturnType<typeof postgres>;
  page: Page;
  worker: Page;
  workerId: string;
  mainJobId: string;
  fixtureIds: string[];
}) {
  const native = await sql`select user_id from public.worker_profiles where id=${workerId}::uuid`;
  const owner = (
    await sql`select client_id from public.job_requests where id=${mainJobId}::uuid`
  )[0]!.client_id;
  expect(
    (
      await jobPost(page, "create", {
        workerSlug: null,
        categoryId: null,
        actorId: crypto.randomUUID(),
      })
    ).status(),
  ).toBe(422);
  expect(
    (
      await page.request.post("/api/v1/jobs/create", {
        data: { workerSlug: null, categoryId: null },
        headers: { origin: "https://attacker.invalid", "Idempotency-Key": crypto.randomUUID() },
      })
    ).status(),
  ).toBe(403);
  expect((await jobPost(worker, "dispatch", { jobId: mainJobId })).status()).toBe(403);
  expect((await jobPost(page, "dispatch", { jobId: mainJobId, force: true })).status()).toBe(422);
  expect((await jobPost(page, "dispatch", { jobId: mainJobId })).status()).toBe(409);
  await page.getByRole("button", { name: "Check next invitation wave", exact: true }).click();
  await expect(page.locator(".job-status").getByRole("alert")).toContainText("not due");
  for (const wave of [2, 3]) {
    await sql`update private.job_dispatch set next_wave_at=now()-interval '1 second' where job_id=${mainJobId}::uuid`;
    const results = await Promise.all([
      jobPost(page, "dispatch", { jobId: mainJobId }),
      jobPost(page, "dispatch", { jobId: mainJobId }),
    ]);
    expect(results.map((r) => r.status()).sort()).toEqual([200, 409]);
    expect(
      (
        await sql`select count(*)::int as count from public.job_matches where job_id=${mainJobId}::uuid`
      )[0]!.count,
    ).toBe(wave * 5);
  }
  expect((await jobPost(page, "dispatch", { jobId: mainJobId })).status()).toBe(409);
  const first = await sql`select worker_id from public.job_matches where job_id=${mainJobId}::uuid`;
  const second = await createSavedJob(page, {
    ...jobData,
    title: "Fictional M05 concurrent open request",
  });
  const key = crypto.randomUUID(),
    input = { jobId: second.jobId, expectedVersion: second.version, consent: true };
  const duplicates = await Promise.all([
    jobPost(page, "submit", input, key),
    jobPost(page, "submit", input, key),
  ]);
  expect(duplicates.map((r) => r.status())).toEqual([200, 200]);
  const rows =
    await sql`select worker_id,id from public.job_matches where job_id=${second.jobId}::uuid`;
  expect(rows).toHaveLength(5);
  const prior = new Set(first.map((r) => String(r.worker_id)));
  expect(rows.filter((r) => prior.has(String(r.worker_id))).length).toBeLessThanOrEqual(1);
  expect((await jobPost(page, "submit", input)).status()).toBe(200);
  expect(
    (
      await sql`select count(*)::int as count from public.job_matches where job_id=${second.jobId}::uuid`
    )[0]!.count,
  ).toBe(5);
  expect((await jobPost(page, "submit", { ...input, expectedVersion: 999 }, key)).status()).toBe(
    409,
  );
  const payload =
    await sql`select channel,payload from private.notification_outbox where template='job-invitation' and payload->>'jobId' in (${mainJobId},${String(second.jobId)})`;
  expect(payload).toHaveLength(20);
  expect(payload.every((p) => p.channel === "in_app")).toBe(true);
  assertPreviewPrivate(JSON.stringify(payload));
  expect(
    (
      await sql`select count(*)::int as count from public.notifications n join private.notification_outbox o on o.id=n.source_outbox_id where o.payload->>'jobId'=${String(second.jobId)}`
    )[0]!.count,
  ).toBe(5);
  await page.goto("/workers/provider-" + workerId);
  await page.getByRole("link", { name: "Start a direct service request", exact: true }).click();
  await page.getByRole("button", { name: "Start request", exact: true }).click();
  await expect(page).toHaveURL(/app\/client\/jobs\/[a-f0-9-]{36}$/);
  const directId = page.url().split("/").at(-1)!;
  const direct = await (await page.request.get("/api/v1/jobs/" + directId)).json();
  const saved = await jobPost(page, "save", {
    jobId: directId,
    expectedVersion: direct.version,
    step: 5,
    data: jobData,
  });
  expect(saved.status()).toBe(200);
  expect(
    (
      await jobPost(page, "submit", {
        jobId: directId,
        expectedVersion: (await saved.json()).version,
        consent: true,
      })
    ).status(),
  ).toBe(200);
  const directRows =
    await sql`select worker_id,id from public.job_matches where job_id=${directId}::uuid`;
  expect(directRows).toHaveLength(1);
  expect(String(directRows[0]!.worker_id)).toBe(workerId);
  expect((await jobPost(page, "dispatch", { jobId: directId })).status()).toBe(409);
  await worker.goto("/app/worker/opportunities/" + directRows[0]!.id);
  await worker
    .getByRole("button", { name: "Block requests from this client", exact: true })
    .click();
  await expect(worker).toHaveURL(/\/app\/worker\/opportunities$/);
  expect(
    await (
      await worker.request.get("/api/v1/jobs/opportunity?matchId=" + directRows[0]!.id)
    ).json(),
  ).toBeNull();
  await worker
    .locator("#main-content")
    .getByText("Opportunity preferences, time blocks and blocked clients", { exact: true })
    .click();
  await worker.getByRole("button", { name: "Unblock this client", exact: true }).click();
  await expect(worker.getByText("No clients are blocked.", { exact: true })).toBeVisible();
  await worker
    .getByRole("checkbox", { name: "I explicitly accept urgent requests.", exact: true })
    .check();
  await worker
    .getByRole("combobox", { name: "Maximum invitations per day", exact: true })
    .selectOption("12");
  const [preferenceResponse] = await Promise.all([
    worker.waitForResponse(
      (response) =>
        response.url().endsWith("/api/v1/jobs/preferences") &&
        response.request().method() === "POST",
    ),
    worker.getByRole("button", { name: "Save opportunity preferences", exact: true }).click(),
  ]);
  expect(preferenceResponse.request().postDataJSON().urgentReady).toBe(true);
  expect(preferenceResponse.status()).toBe(200);
  await expect(worker.getByText("Preferences saved.", { exact: true })).toBeVisible();
  expect(
    (
      await sql`select urgent_ready from private.worker_match_settings where worker_id=${workerId}::uuid`
    )[0]!.urgent_ready,
  ).toBe(true);
  const remote = crypto.randomUUID();
  await sql`insert into public.service_areas(id,slug,label,centroid,active) values (${remote}::uuid,${"m05-remote-" + remote},${"Fictional M05 remote " + remote.slice(0, 6)},extensions.st_setsrid(extensions.st_makepoint(32,-24),4326)::extensions.geography,true)`;
  const approximate = await createSavedJob(page, {
    ...jobData,
    title: "Fictional M05 unknown rural address",
    location: {
      kind: "manual",
      areaId: remote,
      street: "",
      province: "",
      notes: "",
      point: null,
      townOnly: true,
      consent: true,
    },
  });
  const empty = await jobPost(page, "submit", {
    jobId: approximate.jobId,
    expectedVersion: approximate.version,
    consent: true,
  });
  expect(empty.status()).toBe(200);
  expect((await empty.json()).invited).toBe(0);
  const approximateRead = await (
    await page.request.get("/api/v1/jobs/" + approximate.jobId)
  ).json();
  expect(approximateRead.approximate).toBe(true);
  expect(approximateRead.data.location.point).toBeNull();
  await page.goto("/app/client/jobs/" + approximate.jobId);
  await expect(
    page.getByRole("heading", { name: "No eligible workers found", exact: true }),
  ).toBeVisible();
  // Advance only the isolated history fixture, never accept a client-supplied
  // dispatch time. This tests a later urgent window without wall-clock sleeps.
  await sql`update public.job_matches set dispatched_at=now()-interval '2 hours' where worker_id=${workerId}::uuid`;
  const urgent = await createSavedJob(
    page,
    { ...jobData, title: "Fictional M05 urgent request", urgency: "urgent", slots: [] },
    "provider-" + workerId,
  );
  const urgentInput = { jobId: urgent.jobId, expectedVersion: urgent.version, consent: true };
  let urgentSent = await jobPost(page, "submit", urgentInput);
  const minute = (Date.now() + 7200000) % 86400000;
  if (minute > 86400000 - 900000) {
    expect(urgentSent.status()).toBe(422);
    const adjusted = await jobPost(page, "save", {
      jobId: urgent.jobId,
      expectedVersion: urgent.version,
      step: 5,
      data: jobData,
    });
    expect(adjusted.status()).toBe(200);
    urgentSent = await jobPost(page, "submit", {
      ...urgentInput,
      expectedVersion: (await adjusted.json()).version,
    });
  }
  expect(urgentSent.status()).toBe(200);
  expect((await urgentSent.json()).invited).toBe(1);
  const extra = await createSavedJob(page, { ...jobData, title: "Fictional M05 quota check" });
  const limited = await jobPost(page, "submit", {
    jobId: extra.jobId,
    expectedVersion: extra.version,
    consent: true,
  });
  expect(limited.status()).toBe(429);
  expect(limited.headers()["retry-after"]).toBe("86400");
  const otherAddress = await jobPost(page, "save", {
    jobId: extra.jobId,
    expectedVersion: extra.version,
    step: 5,
    data: { ...jobData, location: { kind: "saved", id: "90000000-0000-0000-0000-000000000001" } },
  });
  expect(otherAddress.status()).toBe(403);
  expect(
    (
      await jobPost(page, "save", {
        jobId: extra.jobId,
        expectedVersion: extra.version,
        step: 5,
        data: {
          ...jobData,
          location: {
            ...jobData.location,
            kind: "manual",
            point: { latitude: 90, longitude: 180 },
          },
        },
      })
    ).status(),
  ).toBe(422);
  expect(
    (
      await jobPost(page, "save", {
        jobId: extra.jobId,
        expectedVersion: extra.version - 1,
        step: 5,
        data: jobData,
      })
    ).status(),
  ).toBe(409);
  const [secondMatch] =
    await sql`select id from public.job_matches where job_id=${second.jobId}::uuid and worker_id=${workerId}::uuid`;
  expect(secondMatch).toBeTruthy();
  await sql`update public.job_matches set expires_at=now()-interval '1 second' where id=${secondMatch!.id}::uuid`;
  expect(
    await (await worker.request.get("/api/v1/jobs/opportunity?matchId=" + secondMatch!.id)).json(),
  ).toBeNull();
  expect((await jobPost(worker, "view", { matchId: String(secondMatch!.id) })).status()).toBe(403);
  await sql`update private.job_dispatch set expires_at=now()-interval '1 second' where job_id=${second.jobId}::uuid`;
  expect((await (await page.request.get("/api/v1/jobs/" + second.jobId)).json()).status).toBe(
    "expired",
  );
  expect((await jobPost(page, "dispatch", { jobId: second.jobId })).status()).toBe(200);
  const replayKey = crypto.randomUUID();
  expect((await jobPost(page, "cancel", { jobId: urgent.jobId }, replayKey)).status()).toBe(200);
  expect(
    (
      await sql`select count(*)::int as count from public.job_matches where job_id=${urgent.jobId}::uuid and status='invited'`
    )[0]!.count,
  ).toBe(0);
  expect(
    (
      await sql`select count(*)::int as count from public.job_matches where job_id=${mainJobId}::uuid and worker_id<>all(${fixtureIds}::uuid[])`
    )[0]!.count,
  ).toBe(0);
  await page.goto("/app/client/jobs/" + mainJobId);
  await expect(
    page.getByRole("heading", { name: "Invitations created", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("heading", { name: "Invitations created", exact: true })
    .scrollIntoViewIfNeeded();
  const mobile = (await page.viewportSize())!.width < 768;
  await page.screenshot({
    path: `docs/evidence/screenshots/jobs-submitted-${mobile ? "mobile" : "desktop"}.png`,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await sql`update auth.sessions set not_after=now()-interval '1 second' where user_id=${owner}::uuid`;
  expect((await jobPost(page, "cancel", { jobId: urgent.jobId }, replayKey)).status()).toBe(401);
  expect((await page.request.get("/api/v1/jobs/" + mainJobId)).status()).toBe(401);
  expect(
    (
      await sql`select count(*)::int as count from private.notification_outbox where channel<>'in_app' and template='job-invitation'`
    )[0]!.count,
  ).toBe(0);
  expect(String(native[0]!.user_id)).not.toBe(String(owner));
}
