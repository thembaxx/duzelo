import "server-only";
import { ZodError } from "zod";
import { json } from "@/lib/security/http";
export function discoveryError(error: unknown) {
  const code =
    error instanceof ZodError ? "INVALID" : error instanceof Error ? error.message : "UNAVAILABLE";
  const messages: Record<string, [number, string]> = {
    INVALID: [422, "Check your location and filters, then try again."],
    UNAUTHORIZED: [401, "Sign in to use saved addresses."],
    FORBIDDEN: [403, "This saved location is not available to this account."],
    CONFLICT: [409, "This request key was already used. Try again with the current form."],
    ADDRESS_LIMIT: [422, "You can save up to ten addresses."],
    LIMITED: [429, "Search is busy. Wait a minute and try again."],
    GEOCODING_OFF: [
      503,
      "Address search is not configured. Choose a town or place a point manually.",
    ],
    PROVIDER: [503, "Address search is unavailable. Choose a town or place a point manually."],
    UNAVAILABLE: [503, "Worker discovery is not open yet."],
  };
  const [status, message] = messages[code] ?? messages.UNAVAILABLE!;
  if (
    process.env.AUTH_MODE === "local" &&
    process.env.AUTH_DIAGNOSTICS === "true" &&
    error &&
    typeof error === "object" &&
    "code" in error &&
    /^[0-9A-Z]{5}$/.test(String(error.code))
  )
    console.info("Local discovery database rejection", { code: String(error.code) });
  const result = json({ error: { message } }, status);
  if (status === 429) result.headers.set("Retry-After", "60");
  return result;
}
