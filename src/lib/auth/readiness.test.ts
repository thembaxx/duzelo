import { describe, expect, it } from "vitest";
import { featureFlags } from "../feature-flags";
import { assessPhoneAuthLaunch, type PhoneAuthLaunchEvidence } from "./readiness";

const complete: PhoneAuthLaunchEvidence = {
  organizationIsolated: true,
  projectProvisioned: true,
  dbMigrationAndRlsVerified: true,
  smsProviderApproved: true,
  captchaAndRateLimitsConfigured: true,
  ssrSessionsAndRoleGuardsTested: true,
  localAndHostedOtpE2ePassed: true,
  ownerApprovedLaunch: true,
};

describe("M02 staged phone authentication launch gates", () => {
  it("fails closed while launch evidence and owner approval are missing", () => {
    expect(assessPhoneAuthLaunch({ ...complete, ownerApprovedLaunch: false })).toEqual({
      readyForReview: false,
      missing: ["ownerApprovedLaunch"],
    });
  });

  it.each(Object.keys(complete) as Array<keyof PhoneAuthLaunchEvidence>)(
    "blocks launch if %s is not satisfied",
    (key) => {
      const candidate = { ...complete, [key]: false };
      expect(assessPhoneAuthLaunch(candidate).readyForReview).toBe(false);
      expect(assessPhoneAuthLaunch(candidate).missing).toContain(key);
    },
  );

  it("marks evidence reviewable only when every independent prerequisite is true", () => {
    expect(assessPhoneAuthLaunch(complete)).toEqual({ readyForReview: true, missing: [] });
    // The evidence assessment alone is never an implicit production enablement.
    expect(featureFlags.phoneAuth).toBe(false);
  });
});
