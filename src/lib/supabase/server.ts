import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/config/env";

/** Read-only client foundation. Not invoked by M00 routes. No privileged key.
 * M02 must add proxy.ts token refresh before enabling authentication. */
export async function createReadOnlySupabaseClient() {
  if (!publicEnv.supabaseUrl || !publicEnv.publishableKey) {
    throw new Error("Supabase is not configured.");
  }
  const store = await cookies();
  return createServerClient(publicEnv.supabaseUrl, publicEnv.publishableKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: () => {
        throw new Error("Session writes require the milestone 02 SSR refresh adapter.");
      },
    },
  });
}
