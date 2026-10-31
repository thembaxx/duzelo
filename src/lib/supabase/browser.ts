import "client-only";
import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/config/env";

/** Not invoked in M00. Direct writes must remain denied by database grants/RLS. */
export function createSupabaseBrowserClient() {
  if (!publicEnv.supabaseUrl || !publicEnv.publishableKey)
    throw new Error("Supabase is not configured.");
  return createBrowserClient(publicEnv.supabaseUrl, publicEnv.publishableKey);
}
