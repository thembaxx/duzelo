import { z } from "zod";
export const bookingInput = z
  .object({ bookingId: z.guid(), expectedVersion: z.number().int().positive() })
  .strict();
export const consentInput = bookingInput.extend({ consent: z.literal(true) }).strict();
export const progressInput = bookingInput
  .extend({
    kind: z.enum(["on_my_way", "arrived", "work_update"]),
    body: z.string().trim().min(2).max(2000),
  })
  .strict();
const assets = z
  .array(z.guid())
  .max(8)
  .refine((v) => new Set(v.map((id) => id.toLowerCase())).size === v.length);
export const completionInput = consentInput
  .extend({ summary: z.string().trim().min(15).max(4000), assetIds: assets })
  .strict()
  .refine((v) => v.assetIds.length > 0 || v.summary.length >= 30, {
    message: "Provide a photo or a detailed explanation.",
  });
export const responseInput = consentInput.extend({ completionId: z.guid() }).strict();
export const correctionInput = responseInput
  .extend({ reason: z.string().trim().min(15).max(2000) })
  .strict();
export const rescheduleInput = consentInput
  .extend({
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z.iso.datetime({ offset: true }),
    expiresAt: z.iso.datetime({ offset: true }),
  })
  .strict();
export const scopeInput = consentInput
  .extend({
    scope: z.string().trim().min(15).max(2000),
    deltaCents: z.number().int().min(-100_000_000).max(100_000_000),
    expiresAt: z.iso.datetime({ offset: true }),
  })
  .strict();
export const decisionInput = consentInput
  .extend({
    proposalId: z.guid(),
    kind: z.enum(["reschedule", "scope"]),
    decision: z.enum(["accept", "reject", "withdraw"]),
  })
  .strict();
export const disputeInput = consentInput
  .extend({ reason: z.string().trim().min(15).max(2000) })
  .strict();
export const caseResponseInput = z
  .object({
    disputeId: z.guid(),
    expectedVersion: z.number().int().positive(),
    body: z.string().trim().min(15).max(4000),
    assetIds: assets,
    consent: z.literal(true),
  })
  .strict();
export const auditInput = z
  .object({
    kind: z.enum(["booking", "conversation", "dispute"]),
    id: z.guid(),
    reason: z.string().trim().min(10).max(500),
  })
  .strict();
export const triageInput = z
  .object({
    disputeId: z.guid(),
    expectedVersion: z.number().int().positive(),
    status: z.enum(["investigating", "awaiting_evidence"]),
    note: z.string().trim().min(15).max(2000),
    reason: z.string().trim().min(10).max(500),
    consent: z.literal(true),
  })
  .strict();
export function agreementTotal(base: number, deltas: number[]) {
  if (!Number.isSafeInteger(base) || base < 0 || base > 100_000_000) throw new Error("PRICE");
  const total = deltas.reduce((n, d) => {
    if (!Number.isSafeInteger(d)) throw new Error("PRICE");
    return n + BigInt(d);
  }, BigInt(base));
  if (total < 0n || total > 100_000_000n) throw new Error("PRICE");
  return Number(total);
}
export function proposalTiming(start: string, end: string, expires: string, now = Date.now()) {
  const s = Date.parse(start),
    e = Date.parse(end),
    x = Date.parse(expires);
  if (
    ![s, e, x].every(Number.isFinite) ||
    s < now + 60000 ||
    s > now + 90 * 86400000 ||
    e <= s ||
    e - s > 86400000 ||
    x < now + 60000 ||
    x > Math.min(s, now + 7 * 86400000)
  )
    throw new Error("TIMING");
}
