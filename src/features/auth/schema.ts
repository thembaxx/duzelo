import { z } from "zod";
export function normalizePhone(value: string) {
  let phone = value.trim().replace(/[\s()-]/g, "");
  if (phone.startsWith("00")) phone = "+" + phone.slice(2);
  if (/^0[6-8]\d{8}$/.test(phone)) phone = "+27" + phone.slice(1);
  if (/^27[6-8]\d{8}$/.test(phone)) phone = "+" + phone;
  if (!/^\+27[6-8]\d{8}$/.test(phone))
    throw new Error("Enter a South African mobile number, such as 082 000 0001.");
  return phone;
}
const phone = z
  .string()
  .max(40)
  .transform((value, ctx) => {
    try {
      return normalizePhone(value);
    } catch {
      ctx.addIssue({ code: "custom", message: "Enter a valid South African mobile number." });
      return z.NEVER;
    }
  });
export const otpRequestSchema = z
  .object({ phone, captchaToken: z.string().max(4096).optional() })
  .strict();
export const otpVerifySchema = z.object({ phone, code: z.string().regex(/^\d{6}$/) }).strict();
export const profileSchema = z
  .object({
    displayName: z.string().trim().min(2).max(80),
    mode: z.enum(["client", "worker", "both"]),
    adultConsent: z.literal(true),
    termsConsent: z.literal(true),
    emailNotifications: z.boolean(),
    inAppNotifications: z.boolean(),
  })
  .strict();
export const preferencesSchema = z
  .object({
    displayName: z.string().trim().min(2).max(80),
    emailNotifications: z.boolean(),
    inAppNotifications: z.boolean(),
  })
  .strict();
