import { z } from "zod";

export const flagNames = [
  "LOCATION_MATCHING_ENABLED",
  "WORKER_APPROVAL_ENABLED",
  "PAYMENTS_ENABLED",
  "SMS_CRITICAL_ENABLED",
  "WEB_PUSH_ENABLED",
  "GOOGLE_OAUTH_ENABLED",
  "EMAIL_AUTH_ENABLED",
  "TEAM_DISPATCH_ENABLED",
  "AI_ASSIST_ENABLED",
  "RECURRING_JOBS_ENABLED",
] as const;

export function validateDisabledFlags(input: Record<string, string | undefined>) {
  for (const name of flagNames) {
    if (!z.literal("false").optional().safeParse(input[name]).success) {
      throw new Error(
        `Unfinished capability ${name} must remain false until its milestone is implemented.`,
      );
    }
  }
  return Object.freeze({
    auth: input.AUTH_ENABLED === "true",
    locationMatching: false,
    workerApproval: false,
    paymentsOnline: false,
    smsCritical: false,
    webPush: false,
    googleOauth: false,
    teamDispatch: false,
    aiAssist: false,
    recurringJobs: false,
  } as const);
}
