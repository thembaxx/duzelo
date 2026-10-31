import { describe, expect, it } from "vitest";
import {
  normalizeSouthAfricanMobile,
  parseSmsOtp,
  redactPhoneNumber,
  resendCountdownSeconds,
} from "./phone";

describe("South African phone normalization for a future verified SMS flow", () => {
  it.each([
    ["082 123 4567", "+27821234567"],
    ["+27 82 123 4567", "+27821234567"],
    ["27821234567", "+27821234567"],
    ["(082) 123-4567", "+27821234567"],
    ["0601234567", "+27601234567"],
    ["0731234567", "+27731234567"],
    ["0831234567", "+27831234567"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeSouthAfricanMobile(input)).toEqual({ ok: true, e164: expected });
  });

  it.each([
    "123",
    "082123456",
    "08212345678",
    "+2782123456",
    "+278212345678",
    "+12025550123",
    "0211234567",
    "0821234567; DROP TABLE users",
    "0821234567x5",
    "082+1234567",
    "\n",
    "",
    "0".repeat(49),
    27821234567,
    null,
    undefined,
    {},
    [],
  ])("rejects untrusted, malformed or non-ZA input %s", (input) => {
    expect(normalizeSouthAfricanMobile(input)).toEqual({ ok: false, error: "invalid_phone" });
  });

  it("redacts identifiers in user-facing notices and logs", () => {
    expect(redactPhoneNumber("0821234567")).toBe("+27••••••567");
    expect(redactPhoneNumber("not a phone")).toBe("your number");
  });
});

describe("OTP input and resend UI constraints", () => {
  it("accepts six digits without validating the credential", () => {
    expect(parseSmsOtp("012345")).toEqual({ ok: true, token: "012345" });
    expect(parseSmsOtp(" 012345 ")).toEqual({ ok: true, token: "012345" });
  });

  it.each(["12345", "1234567", "12345a", "12 3456", "", 123456, null])(
    "rejects malformed OTP entry %s",
    (input) => {
      expect(parseSmsOtp(input)).toEqual({ ok: false, error: "invalid_code" });
    },
  );

  it("rounds countdown up and never goes negative", () => {
    expect(resendCountdownSeconds(1000, 1000)).toBe(60);
    expect(resendCountdownSeconds(1000, 1500)).toBe(60);
    expect(resendCountdownSeconds(1000, 2000)).toBe(59);
    expect(resendCountdownSeconds(1000, 61000)).toBe(0);
    expect(resendCountdownSeconds(1000, 70000)).toBe(0);
  });

  it("treats non-finite timestamps as no UI timer, not as auth permission", () => {
    expect(resendCountdownSeconds(Number.NaN, 1000)).toBe(0);
    expect(resendCountdownSeconds(1000, Infinity)).toBe(0);
  });
});
