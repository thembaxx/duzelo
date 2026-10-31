import "server-only";
import { createHmac } from "node:crypto";
import { readAuthConfig } from "@/config/auth";
import { database } from "@/lib/db/server";
export async function allowAuthAttempt(
  action: string,
  subject: string,
  limit: number,
  seconds: number,
) {
  const config = readAuthConfig();
  if (!config) return false;
  const hash = (value: string) =>
    createHmac("sha256", config.rateSecret).update(value).digest("hex");
  return database().begin(async (sql) => {
    // Conservative shared-origin budget: no trust in spoofable forwarding headers.
    // Native Supabase rate limits/CAPTCHA are additional provider-side controls.
    for (const [scope, max, window] of [
      ["shared", 100, 60],
      [subject, limit, seconds],
    ] as const) {
      const key = hash(`${action}:${scope}`);
      await sql`select pg_advisory_xact_lock(hashtextextended(${key},0))`;
      const rows =
        await sql`select attempts,window_start,window_start>now()-${window}::integer*interval '1 second' as active from private.auth_rate_limits where bucket_hash=${key}`;
      const row = rows[0];
      const active = row?.active === true;
      if (active && row.attempts >= max) return false;
      await sql`insert into private.auth_rate_limits(bucket_hash,attempts,window_start) values (${key},1,now()) on conflict(bucket_hash) do update set attempts=${active ? row.attempts + 1 : 1},window_start=case when ${Boolean(active)} then auth_rate_limits.window_start else now() end,updated_at=now()`;
    }
    await sql`delete from private.auth_rate_limits where updated_at<now()-interval '2 days'`;
    return true;
  });
}
