import "server-only";
import { createClient } from "@supabase/supabase-js";
import { workerConfig } from "./config";
export function workerStorage() {
  const config = workerConfig();
  if (!config) throw new Error("UNAVAILABLE");
  return createClient(config.url, config.secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(15000) }) },
  }).storage;
}
