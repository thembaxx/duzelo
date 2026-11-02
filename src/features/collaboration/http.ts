import "server-only";
import { ZodError } from "zod";
import { json, assertMutationOrigin } from "@/lib/security/http";
export function collaborationError(error: unknown) {
  let code =
    error instanceof ZodError ? "INVALID" : error instanceof Error ? error.message : "DATABASE";
  if (error && typeof error === "object" && "code" in error) {
    if (error.code === "23P01") code = "SCHEDULE";
    if (error.code === "23505") code = "CONFLICT";
    if (
      process.env.AUTH_MODE === "local" &&
      process.env.AUTH_DIAGNOSTICS === "true" &&
      /^[A-Z0-9]{5}$/.test(String(error.code))
    )
      console.info("Local workflow database rejection", { code: String(error.code) });
  }
  const errors: Record<string, [number, string]> = {
    UNAVAILABLE: [503, "Messaging and work progress are not open yet."],
    DATABASE: [503, "This workspace is temporarily unavailable. Try again later."],
    UNAUTHORIZED: [401, "Your session has ended. Sign in again."],
    FORBIDDEN: [
      403,
      "This conversation, work record or evidence is not available to this account.",
    ],
    INVALID: [
      422,
      "Check the fields. Sender identities, statuses and calculated totals cannot be supplied.",
    ],
    CONFLICT: [
      409,
      "This record changed or a proposal is still pending. Refresh the saved record before trying again.",
    ],
    EXPIRED_AUDIT: [409, "This audit request expired. Open a new audit request with a reason."],
    TIMING: [
      422,
      "Choose a future valid time. Work can only start at or after the agreed appointment start.",
    ],
    SCHEDULE: [
      409,
      "The proposed appointment conflicts with another reservation or unavailable time.",
    ],
    ELIGIBILITY: [
      403,
      "Current approval, category, coverage or safety checks do not permit this action.",
    ],
    BLOCKED: [403, "Messages are paused because of a block or a report awaiting support review."],
    PRICE: [422, "The agreed adjustment must keep the ZAR total between zero and R1 million."],
    FILE: [422, "Choose a JPEG or PNG image no larger than 3 MiB."],
    FILE_LIMIT: [
      429,
      "This work record has reached its photo limit. Remove an unused upload or contact support.",
    ],
    UNSAFE: [422, "This file did not pass the malware check."],
    SCANNER: [503, "The safety scanner is unavailable. No photo was accepted."],
    LIMITED: [429, "Please wait a minute before trying again."],
  };
  const [status, message] = errors[code] ?? errors.DATABASE!;
  const response = json({ error: { code: errors[code] ? code : "DATABASE", message } }, status);
  if (status === 429) response.headers.set("Retry-After", "60");
  return response;
}
export async function limitedUpload(request: Request) {
  assertMutationOrigin(request);
  const type = request.headers.get("content-type") ?? "";
  if (!type.startsWith("multipart/form-data;")) throw new Error("INVALID");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("INVALID");
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 3 * 1024 * 1024 + 32768) {
      await reader.cancel();
      throw new Error("FILE");
    }
    parts.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  const form = await new Response(bytes, { headers: { "Content-Type": type } }).formData();
  const keys = [...form.keys()];
  const meta = form.get("meta"),
    file = form.get("file");
  if (
    keys.length !== 2 ||
    keys.filter((k) => k === "meta").length !== 1 ||
    !(file instanceof File) ||
    typeof meta !== "string" ||
    meta.length > 4096 ||
    !file.size ||
    file.size > 3 * 1024 * 1024
  )
    throw new Error("INVALID");
  try {
    return { input: JSON.parse(meta) as unknown, file };
  } catch {
    throw new Error("INVALID");
  }
}
