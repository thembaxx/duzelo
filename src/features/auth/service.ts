import "server-only";
import { readAuthConfig } from "@/config/auth";
import { createAuthClient } from "@/lib/supabase/server";
import { database } from "@/lib/db/server";
export interface Identity {
  id: string;
  sessionId: string;
  aal2: boolean;
  admin: boolean;
  adminRole: string | null;
  hasVerifiedEmail: boolean;
  profile: {
    display_name: string;
    client_enabled: boolean;
    worker_enabled: boolean;
    is_suspended: boolean;
    onboarding_completed_at: string | null;
    email_notifications: boolean;
    in_app_notifications: boolean;
  } | null;
  workerStatus: string | null;
}
export async function getVerifiedIdentity(): Promise<Identity | null> {
  if (!readAuthConfig()) return null;
  const client = await createAuthClient();
  const { data: claims, error: claimsError } = await client.auth.getClaims();
  if (claimsError || !claims?.claims.sub || typeof claims.claims.session_id !== "string")
    return null;
  const { data, error } = await client.auth.getUser();
  if (error || !data.user?.phone_confirmed_at || data.user.id !== claims.claims.sub) return null;
  const sql = database();
  // A valid old JWT is insufficient after signout or revocation.
  const sessions =
    await sql`select id from auth.sessions where id=${claims.claims.session_id}::uuid and user_id=${data.user.id}::uuid and (not_after is null or not_after>now())`;
  if (!sessions.length) return null;
  const profiles =
    await sql`select display_name,client_enabled,worker_enabled,is_suspended,onboarding_completed_at,email_notifications,in_app_notifications from public.user_profiles where user_id=${data.user.id}::uuid`;
  const staff =
    await sql`select user_id,admin_role from private.admin_members where user_id=${data.user.id}::uuid and active`;
  const factors =
    claims.claims.aal === "aal2"
      ? await sql`select id from auth.mfa_factors where user_id=${data.user.id}::uuid and status='verified'`
      : [];
  const workers =
    await sql`select status from public.worker_profiles where user_id=${data.user.id}::uuid`;
  return {
    id: data.user.id,
    sessionId: claims.claims.session_id,
    aal2: claims.claims.aal === "aal2" && factors.length > 0,
    admin: staff.length > 0,
    adminRole: staff[0]?.admin_role ?? null,
    hasVerifiedEmail: Boolean(data.user.email && data.user.email_confirmed_at),
    profile: (profiles[0] ?? null) as Identity["profile"],
    workerStatus: workers[0]?.status ?? null,
  };
}
