import { z } from "zod";
export const openThreadSchema = z.object({ quoteId: z.guid() }).strict();
export const threadSchema = z.object({ conversationId: z.guid() }).strict();
export const sendSchema = threadSchema
  .extend({
    body: z.string().trim().min(1).max(4000),
    assetIds: z
      .array(z.guid())
      .max(4)
      .refine((v) => new Set(v.map((id) => id.toLowerCase())).size === v.length),
  })
  .strict();
export const reportSchema = threadSchema
  .extend({
    reason: z.string().trim().min(15).max(2000),
    messageId: z.guid().nullable(),
    block: z.boolean(),
    consent: z.literal(true),
  })
  .strict();
export const unblockSchema = threadSchema.extend({ consent: z.literal(true) }).strict();
export const uploadSchema = z.discriminatedUnion("purpose", [
  z.object({ purpose: z.literal("message"), conversationId: z.guid() }).strict(),
  z.object({ purpose: z.literal("completion"), bookingId: z.guid() }).strict(),
  z.object({ purpose: z.literal("case"), disputeId: z.guid() }).strict(),
]);
export const assetSchema = z.object({ assetId: z.guid() }).strict();
export const accessSchema = assetSchema.extend({ grantId: z.guid().optional() }).strict();
export type UploadTarget = z.infer<typeof uploadSchema>;
