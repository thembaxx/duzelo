import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);
const optionalText = z.preprocess(emptyToUndefined, z.string().min(1).optional());
const siteUrl = z.url().refine((value) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    url.protocol === "https:" ||
    (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))
  );
}, "Use HTTPS outside localhost.");
const publicSchema = z
  .object({
    name: z.string().trim().min(1).max(40).default("Duzelo"),
    tagline: z.string().trim().min(1).max(100).default("Good help, close to home."),
    siteUrl: siteUrl.default("http://localhost:3000"),
    supabaseUrl: z.preprocess(emptyToUndefined, z.url().optional()),
    publishableKey: optionalText.pipe(z.string().startsWith("sb_publishable_").optional()),
  })
  .refine((value) => Boolean(value.supabaseUrl) === Boolean(value.publishableKey), {
    message: "Supabase URL and publishable key must be configured together.",
  });

export function parsePublicEnv(input: Record<string, string | undefined>) {
  const result = publicSchema.safeParse({
    name: input.NEXT_PUBLIC_APP_NAME,
    tagline: input.NEXT_PUBLIC_APP_TAGLINE,
    siteUrl: input.NEXT_PUBLIC_SITE_URL,
    supabaseUrl: input.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: input.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  if (!result.success)
    throw new Error(
      "Invalid public environment configuration. Check .env.example; values are redacted.",
    );
  return result.data;
}

// Explicit references are required for Next.js browser build-time substitution.
export const publicEnv = parsePublicEnv({
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_TAGLINE: process.env.NEXT_PUBLIC_APP_TAGLINE,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});
