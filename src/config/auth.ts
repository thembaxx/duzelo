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
      captchaSecret: z.string().optional(),
    })
    .safeParse({
      mode: process.env.AUTH_MODE,
      url: process.env.SUPABASE_URL,
      key: process.env.SUPABASE_PUBLISHABLE_KEY,
      databaseUrl: process.env.DATABASE_URL,
      origin: process.env.NEXT_PUBLIC_SITE_URL,
      rateSecret: process.env.AUTH_RATE_LIMIT_SECRET,
      captchaSiteKey: process.env.NEXT_PUBLIC_AUTH_CAPTCHA_SITE_KEY,
      captchaSecret: process.env.AUTH_CAPTCHA_SECRET,
    });
  if (!result.success)
    throw new Error("Invalid authentication configuration; values are redacted.");
  const config = result.data;
  const urls = [config.url, config.databaseUrl, config.origin].map((value) => new URL(value));
  if (!["postgres:", "postgresql:"].includes(urls[1]!.protocol))
    throw new Error("DATABASE_URL must use PostgreSQL.");
  if (config.mode === "local" && !config.key.startsWith("sb_publishable_")) {
    try {
      if (
        JSON.parse(Buffer.from(config.key.split(".")[1] ?? "", "base64url").toString()).role !==
        "anon"
      )
        throw new Error();
    } catch {
      throw new Error(
        "Local Auth requires a publishable or legacy anon key, never a privileged key.",
      );
    }
  }
  const local = urls.every((url) => ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname));
  if (config.mode === "local" && !local)
    throw new Error("Local OTP mode requires loopback-only Auth, database and app URLs.");
  if (
    config.mode === "supabase" &&
    (process.env.SMS_PROVIDER_APPROVED !== "true" ||
      !config.captchaSiteKey ||
      !config.captchaSecret ||
      urls[0]?.protocol !== "https:" ||
      urls[2]?.protocol !== "https:" ||
      !config.key.startsWith("sb_publishable_") ||
      urls[1]?.searchParams.get("sslmode") !== "require")
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
export const localTestPhones = [
  "+27820000001",
  "+27820000002",
  "+27820000003",
  "+27820000004",
  "+27820000005",
  "+27820000006",
  "+27820000007",
  "+27820000008",
  "+27820000009",
] as const;
