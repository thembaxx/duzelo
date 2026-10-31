import { z } from "zod";
export function moneyCents(value: string) {
  if (!/^\d{1,6}(?:\.\d{1,2})?$/.test(value)) throw new Error("INVALID");
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}
export function hasPublicContact(value: string) {
  return /@|https?:|www\.|\b(?:\+?27|0)[6-8][\s()-]*\d(?:[\s()-]*\d){7}\b|\b-?\d{1,3}\.\d{4,}\b/i.test(
    value,
  );
}
const publicText = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .refine(
      (v) => !hasPublicContact(v),
      "Keep contact details and exact locations out of public text.",
    );
const money = z.string().transform((v, ctx) => {
  try {
    return moneyCents(v);
  } catch {
    ctx.addIssue({ code: "custom", message: "Use a rand amount with at most two decimal places." });
    return z.NEVER;
  }
});
const service = z
  .object({
    categoryId: z.uuid(),
    title: publicText(3, 80),
    description: publicText(5, 350),
    pricing: z.enum(["fixed", "from", "quote"]),
    price: z.string().max(12),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.pricing === "quote") {
      if (v.price !== "")
        ctx.addIssue({ code: "custom", message: "Custom quotes have no advertised fixed price." });
    } else {
      try {
        if (moneyCents(v.price) < 1) throw new Error();
      } catch {
        ctx.addIssue({ code: "custom", message: "Enter a positive price." });
      }
    }
  });
export const workerDraftSchema = z
  .object({
    displayName: publicText(2, 80),
    bio: publicText(20, 600),
    kind: z.enum(["individual", "business"]),
    businessName: publicText(0, 80),
    registrationNumber: z.string().trim().max(60),
    areaId: z.uuid(),
    latitude: z.number().min(-35).max(-22),
    longitude: z.number().min(16).max(33),
    radiusKm: z.number().int().min(1).max(150),
    townIds: z.array(z.uuid()).min(1).max(20),
    travelFee: money,
    services: z.array(service).min(1).max(8),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.kind === "business" && v.businessName.length < 2)
      ctx.addIssue({ code: "custom", message: "Enter the business name." });
    if (v.kind === "individual" && (v.businessName || v.registrationNumber))
      ctx.addIssue({ code: "custom", message: "Business details require a business profile." });
  });
export type WorkerDraft = z.input<typeof workerDraftSchema>;
export const assetSchema = z
  .object({
    kind: z.enum(["identity", "business", "trade", "avatar", "portfolio"]),
    categoryId: z.uuid().nullable(),
    caption: publicText(0, 120),
    consent: z.literal(true),
  })
  .strict()
  .superRefine((v, ctx) => {
    if ((v.kind === "trade") !== Boolean(v.categoryId))
      ctx.addIssue({ code: "custom", message: "Trade evidence needs its service category." });
  });
export const submitSchema = z
  .object({ revision: z.number().int().positive(), consent: z.literal(true) })
  .strict();
export const decisionSchema = z
  .object({
    workerId: z.uuid(),
    verificationId: z.uuid(),
    revision: z.number().int().positive(),
    decision: z.enum(["approved", "rejected", "needs_changes"]),
    reason: z.string().trim().min(10).max(500),
    expiryDate: z.iso.date().nullable(),
    confirmed: z.literal(true),
  })
  .strict();
export const publishSchema = z
  .object({
    workerId: z.uuid(),
    revision: z.number().int().positive(),
    publicContentReviewed: z.literal(true),
    confirmed: z.literal(true),
  })
  .strict();
