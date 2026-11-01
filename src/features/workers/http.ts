import "server-only";
import { ZodError } from "zod";
import { json, assertMutationOrigin } from "@/lib/security/http";
import { allowAuthAttempt } from "@/features/auth/rate-limit";
import { workerActor } from "./command-boundary";
import { MAX_IMAGE_BYTES } from "./images";
export function workerError(error: unknown) {
  const code =
    error instanceof ZodError ? "INVALID" : error instanceof Error ? error.message : "UNAVAILABLE";
  const errors: Record<string, [number, string]> = {
    UNAUTHORIZED: [401, "Your session has ended. Sign in again."],
    FORBIDDEN: [403, "This action is not available to this account."],
    CONFLICT: [
      409,
      "This application changed or the request key was already used. Reload before trying again.",
    ],
    INVALID: [422, "Check the form and try again."],
    FILE: [
      422,
      "Use a valid JPEG or PNG photo, at least 32 pixels across and no larger than 3 MB.",
    ],
    UNSAFE: [422, "This image could not pass the file safety check. Use a clean image."],
    SCANNER: [503, "Image safety checking is unavailable. No image was accepted; try again later."],
    FILE_LIMIT: [422, "This application has reached its image limit."],
    LIMITED: [429, "Please wait before uploading another image."],
    INCOMPLETE: [409, "Required evidence or review is incomplete."],
    REVIEW_REQUIRED: [
      409,
      "Open and inspect every relevant image before recording approval or publication.",
    ],
    EXPIRED_ACCESS: [410, "This access link has expired. Request a new one."],
    NOT_FOUND: [404, "This item is not available."],
    UNAVAILABLE: [503, "Worker profiles are not available. Please try again later."],
  };
  if (
    process.env.AUTH_MODE === "local" &&
    process.env.AUTH_DIAGNOSTICS === "true" &&
    error &&
    typeof error === "object" &&
    "code" in error &&
    /^[0-9A-Z]{5}$/.test(String(error.code))
  )
    console.info("Local worker database rejection", {
      code: String(error.code),
      constraint: "constraint_name" in error ? String(error.constraint_name) : undefined,
    });
  const [status, message] = errors[code] ?? errors.UNAVAILABLE!;
  const response = json({ error: { message } }, status);
  if (status === 429) response.headers.set("Retry-After", "60");
  return response;
}
export async function readImage(
  request: Request,
  authorize: () => Promise<{ id: string }> = workerActor,
) {
  assertMutationOrigin(request);
  const actor = await authorize();
  if (!(await allowAuthAttempt("worker-upload", actor.id, 12, 60))) throw new Error("LIMITED");
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data;"))
    throw new Error("INVALID");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("FILE");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  for (;;) {
    const item = await reader.read();
    if (item.done) break;
    bytes += item.value.byteLength;
    if (bytes > MAX_IMAGE_BYTES + 65536) {
      await reader.cancel();
      throw new Error("FILE");
    }
    chunks.push(item.value);
  }
  const form = await new Response(Buffer.concat(chunks), {
    headers: { "content-type": request.headers.get("content-type")! },
  }).formData();
  if (
    [...form.keys()].some((k) => !["file", "metadata"].includes(k)) ||
    form.getAll("file").length !== 1 ||
    form.getAll("metadata").length !== 1
  )
    throw new Error("INVALID");
  const file = form.get("file"),
    raw = form.get("metadata");
  if (!(file instanceof File) || typeof raw !== "string" || raw.length > 4096)
    throw new Error("FILE");
  let metadata: unknown;
  try {
    metadata = JSON.parse(raw);
  } catch {
    throw new Error("INVALID");
  }
  return { file, metadata };
}
