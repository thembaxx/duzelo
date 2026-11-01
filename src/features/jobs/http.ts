import "server-only";
import { ZodError } from "zod";
import { json } from "@/lib/security/http";
export function jobError(error: unknown) {
  const code =
    error instanceof ZodError ? "INVALID" : error instanceof Error ? error.message : "UNAVAILABLE";
  const errors: Record<string, [number, string]> = {
    UNAVAILABLE: [503, "Job requests are not open yet."],
    UNAUTHORIZED: [401, "Your session has ended. Sign in again."],
    FORBIDDEN: [403, "This request is not available to this account."],
    INVALID: [422, "Check the form fields and try again."],
    INCOMPLETE: [
      422,
      "Complete the category, details, location consent and pending photo uploads before submitting.",
    ],
    CONSENT: [422, "Choose whether to store this private job location before saving it."],
    UNKNOWN_TOWN: [
      422,
      "Choose a supported public town. A saved address outside the directory needs a manual job location.",
    ],
    TIMING: [
      422,
      "Use future time slots with the end after the start. Urgent slots must end today in South African time.",
    ],
    CONFLICT: [
      409,
      "This draft changed or the request key was already used. Reload the saved request before editing.",
    ],
    JOB_LIMIT: [429, "You can create up to twenty drafts in a day."],
    SUBMIT_LIMIT: [429, "You can submit up to five requests in a day."],
    WAVE_NOT_DUE: [409, "The next invitation wave is not due yet."],
    WAVE_LIMIT: [409, "This request has reached its invitation-wave limit."],
    RESPONSE_RECEIVED: [409, "A response has been received. Further invitation waves are paused."],
    FILE: [
      422,
      "Use a valid JPEG or PNG photo, at least 32 pixels across and no larger than 3 MB.",
    ],
    FILE_LIMIT: [422, "A request can hold up to eight photos, including pending uploads."],
    SCANNER: [503, "Image safety checking is unavailable. No image was accepted; retry later."],
    UNSAFE: [422, "This image failed its safety check. Choose a clean photo."],
    LIMITED: [429, "Please wait a minute before trying again."],
  };
  if (
    process.env.AUTH_MODE === "local" &&
    process.env.AUTH_DIAGNOSTICS === "true" &&
    error &&
    typeof error === "object" &&
    "code" in error &&
    /^[0-9A-Z]{5}$/.test(String(error.code))
  )
    console.info("Local job database rejection", { code: String(error.code) });
  const [status, message] = errors[code] ?? errors.UNAVAILABLE!;
  const response = json({ error: { message } }, status);
  if (status === 429)
    response.headers.set(
      "Retry-After",
      ["JOB_LIMIT", "SUBMIT_LIMIT"].includes(code) ? "86400" : "60",
    );
  return response;
}
