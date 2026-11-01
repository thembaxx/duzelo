import { z } from "zod";
import { pointSchema, provinces } from "@/features/discovery/schema";
export const slotSchema = z
  .object({ start: z.iso.datetime({ offset: true }), end: z.iso.datetime({ offset: true }) })
  .strict();
export const locationSchema = z.union([
  z.object({ kind: z.literal("saved"), id: z.guid() }).strict(),
  z
    .object({
      kind: z.literal("manual"),
      areaId: z.guid().nullable(),
      street: z.string().trim().max(160),
      province: z.enum(provinces).or(z.literal("")),
      notes: z.string().trim().max(500),
      point: pointSchema.nullable(),
      townOnly: z.boolean(),
      consent: z.boolean(),
    })
    .strict(),
]);
export const draftSchema = z
  .object({
    categoryId: z.guid().nullable(),
    title: z.string().trim().max(140),
    description: z.string().trim().max(4000),
    urgency: z.enum(["urgent", "scheduled", "flexible"]),
    slots: z.array(slotSchema).max(3),
    contactWindow: z.string().trim().max(200),
    budgetMin: z.number().int().min(0).max(100_000_000).nullable(),
    budgetMax: z.number().int().min(0).max(100_000_000).nullable(),
    location: locationSchema.nullable(),
  })
  .strict();
export type DraftData = z.infer<typeof draftSchema>;
export type JobLocation = z.infer<typeof locationSchema>;
export const emptyDraft: DraftData = {
  categoryId: null,
  title: "",
  description: "",
  urgency: "flexible",
  slots: [],
  contactWindow: "",
  budgetMin: null,
  budgetMax: null,
  location: null,
};
export const createSchema = z
  .object({
    workerSlug: z
      .string()
      .regex(/^provider-[a-f0-9-]{36}$/)
      .nullable(),
    categoryId: z.guid().nullable(),
  })
  .strict();
export const idSchema = z.object({ jobId: z.guid() }).strict();
export const saveSchema = idSchema
  .extend({
    expectedVersion: z.number().int().positive(),
    step: z.number().int().min(0).max(5),
    data: draftSchema,
  })
  .strict();
export const submitSchema = idSchema
  .extend({ expectedVersion: z.number().int().positive(), consent: z.literal(true) })
  .strict();
export const matchSchema = z.object({ matchId: z.guid() }).strict();
export const preferenceSchema = z
  .object({ urgentReady: z.boolean(), dailyLimit: z.number().int().min(1).max(12) })
  .strict();
export const blockSchema = z
  .object({ jobId: z.guid(), workerId: z.guid(), blocked: z.boolean() })
  .strict();
export const workerBlockSchema = z.object({ matchId: z.guid(), blocked: z.boolean() }).strict();
export const timeBlockSchema = z
  .object({ start: z.iso.datetime({ offset: true }), end: z.iso.datetime({ offset: true }) })
  .strict();
export const assetSchema = z.object({ jobId: z.guid(), consent: z.literal(true) }).strict();
export const removeSchema = z.object({ jobId: z.guid(), assetId: z.guid() }).strict();
export function randToCents(value: string): number | null {
  if (!value.trim()) return null;
  const found = /^(\d{1,7})(?:[.,](\d{1,2}))?$/.exec(value.trim());
  if (!found) throw new Error("INVALID");
  const cents = Number(found[1]) * 100 + Number((found[2] ?? "").padEnd(2, "0"));
  if (cents > 100_000_000) throw new Error("INVALID");
  return cents;
}
export function readyToSubmit(data: DraftData, now = Date.now()): DraftData {
  if (
    !data.categoryId ||
    data.title.length < 5 ||
    data.description.length < 15 ||
    (data.budgetMin !== null && data.budgetMax !== null && data.budgetMin > data.budgetMax) ||
    !data.location
  )
    throw new Error("INCOMPLETE");
  if (
    data.location.kind === "manual" &&
    (!data.location.areaId ||
      !data.location.consent ||
      (!data.location.point && !data.location.townOnly) ||
      (data.location.point && (!data.location.street || !data.location.province)))
  )
    throw new Error("INCOMPLETE");
  let slots = data.slots;
  if (data.urgency === "scheduled" && !slots.length) throw new Error("TIMING");
  if (data.urgency === "urgent" && !slots.length) {
    const dayEnd = Math.floor((now + 7200000) / 86400000) * 86400000 + 86400000 - 7200000;
    const end = Math.min(now + 7200000, dayEnd);
    if (end - now < 900000) throw new Error("TIMING");
    slots = [{ start: new Date(now).toISOString(), end: new Date(end).toISOString() }];
  }
  for (const slot of slots) {
    const start = Date.parse(slot.start),
      end = Date.parse(slot.end);
    if (
      start < now - 60000 ||
      start > now + 90 * 86400000 ||
      end <= start ||
      end <= now ||
      end - start > 86400000 ||
      (data.urgency === "urgent" &&
        (start > now + 86400000 ||
          Math.floor((end - 1 + 7200000) / 86400000) !== Math.floor((now + 7200000) / 86400000)))
    )
      throw new Error("TIMING");
  }
  return { ...data, slots };
}
