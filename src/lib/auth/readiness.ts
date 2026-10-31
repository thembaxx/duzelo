/**
 * Decision gate for an eventual production phone-auth launch.
 * The standalone helper does NOT enable a feature or read credentials.
 * The isolated local implementation in src/features/auth does not launch production. A hosted provider integration must validate each condition server-side and
 * independently retain the hard-coded `featureFlags.phoneAuth === false`
 * until explicit launch approval and verified acceptance tests.
 */
export interface PhoneAuthLaunchEvidence {
  organizationIsolated: boolean;
  projectProvisioned: boolean;
  dbMigrationAndRlsVerified: boolean;
  smsProviderApproved: boolean;
  captchaAndRateLimitsConfigured: boolean;
  ssrSessionsAndRoleGuardsTested: boolean;
  localAndHostedOtpE2ePassed: boolean;
  ownerApprovedLaunch: boolean;
}

export type PhoneAuthLaunchBlocker = keyof PhoneAuthLaunchEvidence;

const REQUIRED_EVIDENCE: readonly PhoneAuthLaunchBlocker[] = [
  "organizationIsolated",
  "projectProvisioned",
  "dbMigrationAndRlsVerified",
  "smsProviderApproved",
  "captchaAndRateLimitsConfigured",
  "ssrSessionsAndRoleGuardsTested",
  "localAndHostedOtpE2ePassed",
  "ownerApprovedLaunch",
];

export function assessPhoneAuthLaunch(evidence: Readonly<PhoneAuthLaunchEvidence>): {
  readyForReview: boolean;
  missing: PhoneAuthLaunchBlocker[];
} {
  const missing = REQUIRED_EVIDENCE.filter((requirement) => evidence[requirement] !== true);
  return { readyForReview: missing.length === 0, missing };
}
