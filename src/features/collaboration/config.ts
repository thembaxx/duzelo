import "server-only";
import { quotesConfig } from "@/features/quotes/config";
export const COLLABORATION_BUCKET = "chat-attachments";
export function workflowConfig() {
  const messaging = process.env.MESSAGING_ENABLED ?? "false",
    workflow = process.env.WORKFLOW_ENABLED ?? "false";
  if (![messaging, workflow].every((v) => ["true", "false"].includes(v)))
    throw new Error("Invalid collaboration flags.");
  if (messaging === "false" && workflow === "false") return null;
  const base = quotesConfig();
  const secret = process.env.WORKFLOW_SIGNING_SECRET ?? "",
    schedulerSecret = process.env.WORKFLOW_SCHEDULER_SECRET ?? "",
    retentionDays = base?.mode === "local" ? 7 : Number(process.env.WORKFLOW_MEDIA_RETENTION_DAYS),
    reviewHours = Number(process.env.WORKFLOW_REVIEW_HOURS ?? 48),
    ticketSeconds = Number(process.env.WORKFLOW_MEDIA_TTL_SECONDS ?? 60);
  if (
    !base ||
    messaging !== "true" ||
    workflow !== "true" ||
    !/^[A-Za-z0-9_-]{32,128}$/.test(secret) ||
    (schedulerSecret && !/^[A-Za-z0-9_-]{32,128}$/.test(schedulerSecret)) ||
    !Number.isInteger(retentionDays) ||
    retentionDays < 1 ||
    retentionDays > 365 ||
    !Number.isInteger(reviewHours) ||
    reviewHours < 1 ||
    reviewHours > 168 ||
    !Number.isInteger(ticketSeconds) ||
    ticketSeconds < 1 ||
    ticketSeconds > 60 ||
    (base.mode !== "local" && process.env.WORKFLOW_POLICY_APPROVED !== "true")
  )
    throw new Error(
      "Collaboration requires approved policy, retention and signing configuration; values redacted.",
    );
  return { ...base, secret, schedulerSecret, retentionDays, reviewHours, ticketSeconds };
}
