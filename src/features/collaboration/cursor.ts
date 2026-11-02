import { z } from "zod";
const cursorSchema = z
  .object({
    at: z
      .string()
      .min(10)
      .max(64)
      .refine((v) => Number.isFinite(Date.parse(v))),
    id: z.guid(),
    kind: z.string().max(20).optional(),
  })
  .strict();
export type Cursor = z.infer<typeof cursorSchema>;
export function readCursor(value: string | undefined | null): Cursor | null {
  if (!value) return null;
  try {
    if (value.length > 256 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error();
    return cursorSchema.parse(JSON.parse(Buffer.from(value, "base64url").toString()));
  } catch {
    throw new Error("INVALID");
  }
}
export function writeCursor(at: string, id: string, kind?: string) {
  return Buffer.from(JSON.stringify({ at, id, ...(kind ? { kind } : {}) })).toString("base64url");
}
