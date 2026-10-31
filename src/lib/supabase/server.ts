import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { readAuthConfig } from "@/config/auth";
export async function createAuthClient(writable = false) {
  const config = readAuthConfig();
  if (!config) throw new Error("Authentication is unavailable.");
  const store = await cookies();
  return createServerClient(config.url, config.key, {
    cookieOptions: {
      name: "duzelo-auth",
      httpOnly: true,
      sameSite: "lax",
      secure: config.secure,
      path: "/",
    },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (values) => {
        // Server components are read-only. The proxy persists refreshed cookies.
        if (writable) values.forEach(({ name, value, options }) => store.set(name, value, options));
      },
    },
  });
}
