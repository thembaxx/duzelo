import { describe, it, expect } from "vitest";
import { normalizePhone, otpVerifySchema, profileSchema, preferencesSchema } from "./schema";
describe("South African authentication inputs", () => {
  it.each(["082 000 0001", "+27 (82) 000-0001", "0027820000001", "27820000001"])(
    "normalizes %s",
    (input) => expect(normalizePhone(input)).toBe("+27820000001"),
  );
  it.each(["+15551234567", "abc", "08200", "+270820000001", "+278200000011"])(
    "rejects %s",
    (input) => expect(() => normalizePhone(input)).toThrow(),
  );
  it("rejects malformed OTP and unexpected authority fields", () => {
    expect(otpVerifySchema.safeParse({ phone: "0820000001", code: "abc123" }).success).toBe(false);
    expect(
      preferencesSchema.safeParse({
        displayName: "Test user",
        emailNotifications: false,
        inAppNotifications: true,
        is_suspended: false,
      }).success,
    ).toBe(false);
    expect(
      profileSchema.safeParse({
        displayName: "Test user",
        mode: "admin",
        adultConsent: true,
        termsConsent: true,
        emailNotifications: false,
        inAppNotifications: true,
      }).success,
    ).toBe(false);
  });
});
