import { it, expect } from "vitest";
import {
  priceQuote,
  termsSchema,
  draftSchema,
  acceptSchema,
  inspectionSchema,
  validateTiming,
  quantityInput,
  type QuoteTerms,
} from "./schema";
const now = Date.parse("2026-11-01T08:00:00Z");
export const terms: QuoteTerms = {
  pricingType: "fixed",
  scope: "Replace the dripping kitchen tap.",
  exclusions: "Replacement fittings excluded.",
  items: [{ kind: "labor", description: "Labor", quantityHundredths: 150, unitPriceCents: 7500 }],
  travelFeeCents: 250,
  inspectionFeeCents: 0,
  taxMode: "vat_15_exclusive",
  startsAt: "2026-11-02T08:00:00Z",
  endsAt: "2026-11-02T10:00:00Z",
  validUntil: "2026-11-01T10:00:00Z",
};
it("calculates fractional quantities and exclusive tax in integer cents", () =>
  expect(priceQuote(terms)).toMatchObject({
    subtotalCents: 11250,
    taxCents: 1725,
    totalCents: 13225,
    lineTotals: [11250],
  }));
it("extracts included VAT without charging it twice", () =>
  expect(priceQuote({ ...terms, taxMode: "vat_15_inclusive" })).toMatchObject({
    taxCents: 1500,
    totalCents: 11500,
  }));
it("rounds each half-cent up before summing", () =>
  expect(
    priceQuote({
      ...terms,
      items: [{ ...terms.items[0]!, quantityHundredths: 150, unitPriceCents: 1 }],
      travelFeeCents: 0,
      taxMode: "none",
    }).totalCents,
  ).toBe(2));
it("keeps inspection fees separate from an unpriced work proposal", () =>
  expect(
    priceQuote({
      ...terms,
      pricingType: "inspection_required",
      items: [],
      travelFeeCents: 0,
      inspectionFeeCents: 15000,
      taxMode: "none",
    }),
  ).toMatchObject({ totalCents: null, subtotalCents: null, inspectionFeeCents: 15000 }));
it.each([
  { ...terms, inspectionFeeCents: 1 },
  { ...terms, items: [] },
  { ...terms, pricingType: "inspection_required" as const },
])("rejects mixed inspection/work pricing", (t) => expect(() => priceQuote(t)).toThrow("PRICE"));
it("bounds line quantity, cents and total without unsafe float multiplication", () => {
  expect(() =>
    priceQuote({
      ...terms,
      items: [{ ...terms.items[0]!, quantityHundredths: 100000, unitPriceCents: 100000000 }],
    }),
  ).toThrow("PRICE");
  expect(termsSchema.safeParse({ ...terms, travelFeeCents: 0.5 }).success).toBe(false);
  expect(
    termsSchema.safeParse({ ...terms, items: [{ ...terms.items[0]!, quantityHundredths: 0 }] })
      .success,
  ).toBe(false);
});
it.each([
  ["1", 100],
  ["1.25", 125],
  ["0,01", 1],
  ["1000", 100000],
])("parses decimal quantity %s exactly", (value, n) =>
  expect(quantityInput(String(value))).toBe(n),
);
it.each(["-1", "0", "1e2", "1.001", "1001", "NaN"])("rejects invalid quantity %s", (value) =>
  expect(() => quantityInput(value)).toThrow(),
);
it("rejects user-authored totals and actor authority", () => {
  expect(termsSchema.safeParse({ ...terms, totalCents: 1 }).success).toBe(false);
  expect(
    draftSchema.safeParse({
      jobId: crypto.randomUUID(),
      previousQuoteId: null,
      expectedVersion: 0,
      terms,
      actorId: crypto.randomUUID(),
    }).success,
  ).toBe(false);
  expect(
    acceptSchema.safeParse({
      quoteId: crypto.randomUUID(),
      expectedVersion: 1,
      expectedJobVersion: 1,
      consent: true,
      amountCents: 1,
    }).success,
  ).toBe(false);
});
it("requires distinct address and fee consent for an inspection", () => {
  const base = {
    quoteId: crypto.randomUUID(),
    expectedVersion: 1,
    expectedJobVersion: 1,
    consent: true,
  };
  expect(inspectionSchema.safeParse(base).success).toBe(false);
  expect(
    inspectionSchema.parse({ ...base, addressConsent: true, feeConsent: true }).feeConsent,
  ).toBe(true);
});
it("bounds expiry before the appointment and rejects expired windows", () => {
  expect(() => validateTiming(terms, now)).not.toThrow();
  expect(() => validateTiming({ ...terms, validUntil: "2026-11-02T11:00:00Z" }, now)).toThrow(
    "TIMING",
  );
  expect(() => validateTiming(terms, now + 3 * 86400000)).toThrow("TIMING");
  expect(() =>
    validateTiming(
      {
        ...terms,
        pricingType: "inspection_required",
        startsAt: "2026-11-10T08:00:00Z",
        endsAt: "2026-11-10T09:00:00Z",
      },
      now,
    ),
  ).toThrow("TIMING");
});
