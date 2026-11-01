import "server-only";
import { jobsConfig } from "@/features/jobs/config";
export function quotesConfig() {
  const value = process.env.QUOTATIONS_ENABLED ?? "false",
    bookings = process.env.BOOKINGS_ENABLED ?? "false";
  if (![value, bookings].every((v) => ["true", "false"].includes(v)))
    throw new Error("Invalid quotation capability flags.");
  if (value !== "true") {
    if (bookings === "true") throw new Error("Bookings require quotations.");
    return null;
  }
  const config = jobsConfig();
  if (
    !config ||
    bookings !== "true" ||
    (config.mode !== "local" && process.env.BOOKINGS_POLICY_APPROVED !== "true")
  )
    throw new Error(
      "Quotations require reviewed jobs and booking policy configuration; values redacted.",
    );
  return config;
}
