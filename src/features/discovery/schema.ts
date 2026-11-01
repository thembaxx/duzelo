import { z } from "zod";
export const pointSchema = z
  .object({ longitude: z.number().min(16).max(33), latitude: z.number().min(-35).max(-22) })
  .strict();
export type Point = z.infer<typeof pointSchema>;
export const coarsePoint = (point: Point): Point => ({
  longitude: Math.round(point.longitude * 100) / 100,
  latitude: Math.round(point.latitude * 100) / 100,
});
export const locationSchema = z.union([
  z.object({ kind: z.literal("town"), id: z.guid() }).strict(),
  z.object({ kind: z.literal("coordinates"), point: pointSchema }).strict(),
  z.object({ kind: z.literal("saved"), id: z.guid() }).strict(),
]);
export type SearchLocation = z.infer<typeof locationSchema>;
export const searchSchema = z
  .object({
    location: locationSchema.nullable(),
    categoryId: z.guid().nullable(),
    radiusKm: z.number().int().min(5).max(150),
    available: z.boolean(),
    tradeReviewed: z.boolean(),
    sort: z.enum(["name", "distance"]),
    cursor: z.string().max(700).nullable(),
  })
  .strict();
export type SearchInput = z.infer<typeof searchSchema>;
export const geocodeSchema = z.object({ query: z.string().trim().min(3).max(160) }).strict();
export const provinces = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
] as const;
export const saveAddressSchema = z
  .object({
    label: z.string().trim().min(2).max(60),
    street: z.string().trim().min(3).max(160),
    town: z.string().trim().min(2).max(80),
    province: z.enum(provinces),
    point: pointSchema,
    consent: z.literal(true),
  })
  .strict();
