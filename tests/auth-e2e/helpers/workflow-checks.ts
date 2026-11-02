import { expect, type Page } from "@playwright/test";
import type postgres from "postgres";
import { workOk, workPost, workView, bookingData, workUpload } from "./workflow-actions";
import { pastBookingFixture } from "./agreement-fixtures";
import { origin, mfa } from "./worker-fixtures";
import sharp from "sharp";
export async function lifecycleChecks(
  sql: ReturnType<typeof postgres>,
  client: Page,
  worker: Page,
  other: Page,
  owner: string,
  workerId: string,
) {
  const b = await pastBookingFixture(sql, owner, workerId);
  let v = await workView(worker, b.bookingId);
  expect((await workPost(client, "work-start", bookingData(v))).status()).toBe(403);
  const started = await workOk(worker, "work-start", bookingData(v));
  expect(started.version).toBe(2);
  v = await workView(worker, b.bookingId);
  const bytes = await sharp({
    create: { width: 80, height: 60, channels: 3, background: "#8ead76" },
  })
    .jpeg()
    .withExif({ IFD0: { ImageDescription: "EXIF-PRIVATE-42" } })
    .toBuffer();
  const upload = await workUpload(worker, { purpose: "completion", bookingId: b.bookingId }, bytes);
  expect(upload.status(), await upload.text()).toBe(200);
  const a = await upload.json();
  await workOk(worker, "work-complete", {
    ...bookingData(v),
    summary: "Fictional work finished; the photo records the test result.",
    assetIds: [a.assetId],
  });
  v = await workView(client, b.bookingId);
  expect(v.status).toBe("completion_pending");
  expect(v.completions).toHaveLength(1);
  expect(
    (
      await workPost(other, "work-confirm-completion", {
        ...bookingData(v),
        completionId: v.completions[0]!.id,
      })
    ).status(),
  ).toBe(403);
  await workOk(client, "work-correction", {
    ...bookingData(v),
    completionId: v.completions[0]!.id,
    reason: "Please correct the unfinished fictional corner.",
  });
  v = await workView(worker, b.bookingId);
  expect(v.status).toBe("in_progress");
  await workOk(worker, "work-complete", {
    ...bookingData(v),
    summary: "The fictional corner has been corrected and the work is ready for review.",
    assetIds: [],
  });
  v = await workView(client, b.bookingId);
  expect(v.completions).toHaveLength(2);
  await workOk(client, "work-confirm-completion", {
    ...bookingData(v),
    completionId: v.completions[1]!.id,
  });
  v = await workView(client, b.bookingId);
  expect(v.status).toBe("completed");
  expect(v.completions[0]!.status).toBe("correction_requested");
  expect((await workPost(worker, "work-start", bookingData(v))).status()).toBe(409);
  return { booking: b, assetId: a.assetId as string };
}
export async function caseChecks(
  sql: ReturnType<typeof postgres>,
  client: Page,
  worker: Page,
  other: Page,
  admin: Page,
  owner: string,
  workerId: string,
  tag: string,
) {
  const b = await pastBookingFixture(sql, owner, workerId);
  let v = await workView(worker, b.bookingId);
  await workOk(worker, "work-start", bookingData(v));
  v = await workView(worker, b.bookingId);
  await workOk(worker, "work-complete", {
    ...bookingData(v),
    summary: "Fictional second task submitted with a detailed written explanation.",
    assetIds: [],
  });
  v = await workView(client, b.bookingId);
  const opened = await workOk(client, "case-open", {
    ...bookingData(v),
    reason: "Fictional service issue for an isolated support review.",
  });
  v = await workView(worker, b.bookingId);
  expect(v.status).toBe("disputed");
  expect(v.dispute!.reason).toBeNull();
  const bytes = await sharp({
    create: { width: 80, height: 60, channels: 3, background: "#b8a7cb" },
  })
    .jpeg()
    .toBuffer();
  const up = await workUpload(worker, { purpose: "case", disputeId: opened.disputeId }, bytes);
  expect(up.status(), await up.text()).toBe(200);
  const assetId = (await up.json()).assetId;
  await workOk(worker, "case-respond", {
    disputeId: opened.disputeId,
    expectedVersion: v.dispute!.version,
    body: "CASE-PRIVATE-42: fictional private explanation for support.",
    assetIds: [assetId],
    consent: true,
  });
  expect(JSON.stringify(await workView(client, b.bookingId))).not.toContain("CASE-PRIVATE-42");
  expect((await workPost(client, "media-access", { assetId })).status()).toBe(403);
  expect(
    (
      await workPost(other, "audit", {
        kind: "dispute",
        id: opened.disputeId,
        reason: "Unauthorized support audit attempt.",
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await workPost(admin, "audit", {
        kind: "dispute",
        id: opened.disputeId,
        reason: "Fictional service concern review.",
      })
    ).status(),
  ).toBe(403);
  await mfa(admin);
  expect(
    (
      await workPost(admin, "audit", { kind: "dispute", id: opened.disputeId, reason: "short" })
    ).status(),
  ).toBe(422);
  const grant = await workOk(admin, "audit", {
    kind: "dispute",
    id: opened.disputeId,
    reason: "Fictional service concern review.",
  });
  const audit = await admin.request.get("/api/v1/collaboration/audit?id=" + grant.grantId);
  expect(audit.status(), await audit.text()).toBe(200);
  expect(await audit.text()).toContain("CASE-PRIVATE-42");
  expect(
    (await other.request.get("/api/v1/collaboration/audit?id=" + grant.grantId)).status(),
  ).toBe(403);
  const ticket = await workOk(admin, "media-access", { assetId, grantId: grant.grantId });
  expect(
    (
      await admin.request.get("/api/v1/collaboration/media/" + assetId, {
        headers: { "X-Duzelo-Asset-Ticket": ticket.ticket },
      })
    ).status(),
  ).toBe(200);
  await admin.goto("/admin/workflow");
  await admin.getByLabel("Record reference").fill(opened.disputeId);
  await admin.getByLabel("Reason for access").fill("Review the fictional recorded work concern.");
  await admin.getByRole("button", { name: "Record reason and open audit", exact: true }).click();
  await expect(admin.getByRole("region", { name: "Authorized evidence audit" })).toBeVisible();
  await admin
    .getByRole("heading", { name: "Review the record with care.", exact: true })
    .scrollIntoViewIfNeeded();
  await admin.screenshot({ path: "docs/evidence/screenshots/audit-workflow-" + tag + ".png" });
  v = await workView(client, b.bookingId);
  await workOk(admin, "triage", {
    disputeId: opened.disputeId,
    expectedVersion: v.dispute!.version,
    status: "awaiting_evidence",
    note: "Please supply any remaining fictional evidence for this review.",
    reason: "Fictional follow-up evidence request.",
    consent: true,
  });
  v = await workView(client, b.bookingId);
  expect(v.dispute!.status).toBe("awaiting_evidence");
  expect(v.entries.some((e) => e.kind === "support_note")).toBe(true);
  expect(
    (
      await workPost(client, "work-confirm-completion", {
        ...bookingData(v),
        completionId: v.completions[0]!.id,
      })
    ).status(),
  ).toBe(409);
  await sql`update public.worker_profiles set status='suspended' where id=${workerId}::uuid`;
  const privateView = await workView(worker, b.bookingId);
  expect(privateView.entries.some((e) => e.body.includes("CASE-PRIVATE-42"))).toBe(true);
  expect((await workPost(worker, "media-access", { assetId })).status()).toBe(200);
  await sql`update public.worker_profiles set status='approved' where id=${workerId}::uuid`;
  return { booking: b, assetId };
}
