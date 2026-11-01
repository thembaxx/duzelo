import { z } from "zod";
export const cents = z.number().int().min(0).max(100_000_000);
export const itemSchema = z
  .object({
    kind: z.enum(["labor", "materials"]),
    description: z.string().trim().min(2).max(160),
    quantityHundredths: z.number().int().min(1).max(100_000),
    unitPriceCents: cents,
  })
  .strict();
export const termsSchema = z
  .object({
    pricingType: z.enum(["fixed", "estimate", "inspection_required"]),
    scope: z.string().trim().min(15).max(2000),
    exclusions: z.string().trim().max(1000),
    items: z.array(itemSchema).max(20),
    travelFeeCents: cents,
    inspectionFeeCents: cents,
    taxMode: z.enum(["none", "vat_15_exclusive", "vat_15_inclusive"]),
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z.iso.datetime({ offset: true }),
    validUntil: z.iso.datetime({ offset: true }),
  })
  .strict();
export type QuoteTerms = z.infer<typeof termsSchema>;
export const draftSchema = z
  .object({
    jobId: z.guid(),
    previousQuoteId: z.guid().nullable(),
    expectedVersion: z.number().int().min(0),
    terms: termsSchema,
  })
  .strict();
export const quoteSchema = z
  .object({ quoteId: z.guid(), expectedVersion: z.number().int().positive() })
  .strict();
export const acceptSchema = quoteSchema
  .extend({ expectedJobVersion: z.number().int().positive(), consent: z.literal(true) })
  .strict();
export const inspectionSchema = acceptSchema
  .extend({ addressConsent: z.literal(true), feeConsent: z.literal(true) })
  .strict();
export const revokeSchema = z.object({ grantId: z.guid() }).strict();
export const bookingSchema = z
  .object({ bookingId: z.guid(), expectedVersion: z.number().int().positive() })
  .strict();
export const cancelSchema = bookingSchema
  .extend({
    reason: z.enum(["plans_changed", "provider_unavailable", "client_unavailable", "no_show"]),
  })
  .strict();
export const locationSchema = z.object({ jobId: z.guid() }).strict();
const rounded = (n: bigint, d: bigint) => (n + d / 2n) / d;
export function priceQuote(input: QuoteTerms) {
  const t = termsSchema.parse(input);
  if (t.pricingType === "inspection_required") {
    if (t.items.length || t.travelFeeCents || t.taxMode !== "none") throw new Error("PRICE");
    return {
      subtotalCents: null,
      taxCents: 0,
      totalCents: null,
      inspectionFeeCents: t.inspectionFeeCents,
      lineTotals: [] as number[],
    };
  }
  if (!t.items.length || t.inspectionFeeCents) throw new Error("PRICE");
  const lines = t.items.map((i) =>
    rounded(BigInt(i.quantityHundredths) * BigInt(i.unitPriceCents), 100n),
  );
  const subtotal = lines.reduce((n, i) => n + i, 0n),
    base = subtotal + BigInt(t.travelFeeCents);
  const tax =
    t.taxMode === "none" ? 0n : rounded(base * 15n, t.taxMode === "vat_15_exclusive" ? 100n : 115n);
  const total = base + (t.taxMode === "vat_15_exclusive" ? tax : 0n);
  if (total > 100_000_000n) throw new Error("PRICE");
  return {
    subtotalCents: Number(subtotal),
    taxCents: Number(tax),
    totalCents: Number(total),
    inspectionFeeCents: 0,
    lineTotals: lines.map(Number),
  };
}
export function validateTiming(t: QuoteTerms, now = Date.now()) {
  const start = Date.parse(t.startsAt),
    end = Date.parse(t.endsAt),
    expiry = Date.parse(t.validUntil);
  if (
    start < now + 60000 ||
    start > now + 90 * 86400000 ||
    end <= start ||
    end - start > 86400000 ||
    expiry < now + 60000 ||
    expiry > Math.min(start, now + 7 * 86400000)
  )
    throw new Error("TIMING");
  if (
    t.pricingType === "inspection_required" &&
    (start > now + 7 * 86400000 || end - start > 8 * 3600000)
  )
    throw new Error("TIMING");
}
export function quantityInput(value: string) {
  if (!/^\d{1,4}(?:[.,]\d{1,2})?$/.test(value)) throw new Error("PRICE");
  const [whole, fraction = ""] = value.replace(",", ".").split(".");
  const n = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (n < 1 || n > 100000) throw new Error("PRICE");
  return n;
}
