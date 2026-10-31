import "server-only";
import { z } from "zod";

export function readAuthConfig() {
  if (process.env.AUTH_ENABLED !== "true") {
    if (process.env.AUTH_ENABLED && process.env.AUTH_ENABLED !== "false")
      throw new Error("AUTH_ENABLED must be true or false.");
    return null;
  }
  const result = z
    .object({
      mode: z.enum(["local", "supabase"]),
      url: z.url(),
      key: z.string().min(20),
      databaseUrl: z.url(),
      origin: z.url(),
      rateSecret: z.string().min(32),
      captchaSiteKey: z.string().optional(),
    })
    .safeParse({
      mode: process.env.AUTH_MODE,
      url: process.env.SUPABASE_URL,
      key: process.env.SUPABASE_PUBLISHABLE_KEY,
      databaseUrl: process.env.DATABASE_URL,
      origin: process.env.NEXT_PUBLIC_SITE_URL,
      rateSecret: process.env.AUTH_RATE_LIMIT_SECRET,
      captchaSiteKey: process.env.NEXT_PUBLIC_AUTH_CAPTCHA_SITE_KEY,
    });
  if (!result.success)
    throw new Error("Invalid authentication configuration; values are redacted.");
  const config = result.data;
  const urls = [config.url, config.databaseUrl, config.origin].map((value) => new URL(value));
  const local = urls.every((url) => ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname));
  if (config.mode === "local" && !local)
    throw new Error("Local OTP mode requires loopback-only Auth, database and app URLs.");
  if (
    config.mode === "supabase" &&
    (process.env.SMS_PROVIDER_APPROVED !== "true" ||
      !config.captchaSiteKey ||
      urls[0]?.protocol !== "https:" ||
      urls[2]?.protocol !== "https:" ||
      !config.key.startsWith("sb_publishable_") ||
      !config.databaseUrl.includes("sslmode=require"))
  ) {
    throw new Error(
      "Hosted authentication requires approved SMS, CAPTCHA and TLS database configuration.",
    );
  }
  return {
    ...config,
    origin: new URL(config.origin).origin,
    secure: urls[2]?.protocol === "https:",
  };
}
export const localTestPhones = ["+27820000001", "+27820000002", "+27820000003"] as const;
