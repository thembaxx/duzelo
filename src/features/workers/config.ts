import "server-only";
import { readAuthConfig } from "@/config/auth";
export const WORKER_BUCKET = "worker-evidence";
export function workerConfig() {
  const enabled = process.env.WORKER_APPROVAL_ENABLED;
  if (enabled && !["true", "false"].includes(enabled))
    throw new Error("Invalid worker capability flag.");
  if (enabled !== "true") return null;
  const auth = readAuthConfig();
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!auth || !secret)
    throw new Error("Worker storage configuration is incomplete; values redacted.");
  let valid = secret.startsWith("sb_secret_");
  if (auth.mode === "local" && !valid) {
    try {
      valid =
        JSON.parse(Buffer.from(secret.split(".")[1] ?? "", "base64url").toString()).role ===
        "service_role";
    } catch {
      valid = false;
    }
  }
  const retentionDays = auth.mode === "local" ? 7 : Number(process.env.VERIFICATION_RETENTION_DAYS);
  if (
    !valid ||
    !Number.isInteger(retentionDays) ||
    retentionDays < 1 ||
    retentionDays > 365 ||
    (auth.mode !== "local" && process.env.VERIFICATION_POLICY_APPROVED !== "true")
  )
    throw new Error(
      "Worker storage requires a private key and approved retention policy; values redacted.",
    );
  return { ...auth, secret, retentionDays };
}
