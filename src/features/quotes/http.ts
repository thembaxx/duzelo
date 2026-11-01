import "server-only";
import { ZodError } from "zod";
import { json } from "@/lib/security/http";
export function agreementError(error: unknown) {
  let code =
    error instanceof ZodError ? "INVALID" : error instanceof Error ? error.message : "DATABASE";
  if (error && typeof error === "object" && "code" in error && error.code === "23P01")
    code = "SCHEDULE";
  const errors: Record<string, [number, string]> = {
    UNAVAILABLE: [503, "Quotations and bookings are not open yet."],
    DATABASE: [503, "Quotations and bookings are temporarily unavailable. Try again later."],
    UNAUTHORIZED: [401, "Your session has ended. Sign in again."],
    FORBIDDEN: [403, "This agreement or address is not available to this account."],
    INVALID: [
      422,
      "Check the form fields. Totals, actor identities and statuses cannot be supplied.",
    ],
    PRICE: [
      422,
      "Check line quantities, prices, tax and fee fields. Work prices must be bounded integer cents.",
    ],
    TIMING: [
      422,
      "Choose a future appointment and an earlier quote expiry. No-show cancellation is available thirty minutes after the proposed start.",
    ],
    EXPIRED: [409, "This invitation or quote has expired. Reload the current terms."],
    CONFLICT: [
      409,
      "This agreement changed or a booking already exists. Reload before trying again.",
    ],
    ELIGIBILITY: [
      403,
      "Current approval, category, coverage, availability or safety checks do not permit this action.",
    ],
    SCHEDULE: [
      409,
      "This worker has a conflicting appointment or private unavailable time. No confirmation was made.",
    ],
    INSPECTION: [
      422,
      "An inspection proposal cannot create a work booking. Authorize the disclosed visit separately, then review a later priced quote.",
    ],
    LIMITED: [429, "Please wait a minute before trying again."],
    VERSION_LIMIT: [
      429,
      "This request has reached twenty quote versions for this provider. Start a new request if needed.",
    ],
  };
  if (
    process.env.AUTH_MODE === "local" &&
    process.env.AUTH_DIAGNOSTICS === "true" &&
    error &&
    typeof error === "object" &&
    "code" in error &&
    /^[A-Z0-9]{5}$/.test(String(error.code))
  )
    console.info("Local agreement database rejection", { code: String(error.code) });
  const [status, message] = errors[code] ?? errors.DATABASE!;
  const response = json({ error: { message } }, status);
  if (status === 429) response.headers.set("Retry-After", "60");
  return response;
}
