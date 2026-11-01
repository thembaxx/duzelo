import "server-only";
import { workerConfig } from "@/features/workers/config";
export const JOB_BUCKET = "job-requests";
export function jobsConfig() {
  const enabled = process.env.JOB_REQUESTS_ENABLED ?? "false";
  const matching = process.env.LOCATION_MATCHING_ENABLED ?? "false";
  if (![enabled, matching].every((v) => ["true", "false"].includes(v)))
    throw new Error("Invalid job capability flags.");
  if (enabled !== "true") {
    if (matching === "true") throw new Error("Matching requires the job request capability.");
    return null;
  }
  const worker = workerConfig();
  const retentionDays = worker?.mode === "local" ? 7 : Number(process.env.JOB_MEDIA_RETENTION_DAYS);
  if (
    !worker ||
    matching !== "true" ||
    !Number.isInteger(retentionDays) ||
    retentionDays < 1 ||
    retentionDays > 90 ||
    (worker.mode !== "local" && process.env.JOBS_POLICY_APPROVED !== "true")
  )
    throw new Error(
      "Jobs require reviewed Auth, workers, matching and retention configuration; values redacted.",
    );
  return { ...worker, jobRetentionDays: retentionDays };
}
