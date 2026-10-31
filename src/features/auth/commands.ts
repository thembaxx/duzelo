import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { createAuthClient } from "@/lib/supabase/server";
import { database } from "@/lib/db/server";
import { getVerifiedIdentity } from "./service";
import { readAuthConfig, localTestPhones } from "@/config/auth";
import { otpRequestSchema, otpVerifySchema, profileSchema, preferencesSchema } from "./schema";
import { allowAuthAttempt } from "./rate-limit";

async function actor() {
  const identity = await getVerifiedIdentity();
  if (!identity) throw new Error("UNAUTHORIZED");
  if (identity.profile?.is_suspended) throw new Error("FORBIDDEN");
  return identity;
}
export async function authCommand(
  action: string,
  input: unknown,
  idempotencyKey: string | null = null,
) {
  const config = readAuthConfig();
  if (!config) throw new Error("UNAVAILABLE");
  if (action === "otp") {
    const data = otpRequestSchema.parse(input);
    if (!(await allowAuthAttempt("send", data.phone, 1, 60))) throw new Error("LIMITED");
    if (config.mode === "local" && !localTestPhones.some((phone) => phone === data.phone))
      return { message: "If this number can receive a code, check your messages.", retryAfter: 60 };
    if (config.mode === "supabase" && !data.captchaToken) throw new Error("CAPTCHA");
    const client = await createAuthClient(true);
    // All sends, including provider failures, use an enumeration-safe response.
    await client.auth.signInWithOtp({
      phone: data.phone,
      options: {
        shouldCreateUser: true,
        ...(data.captchaToken ? { captchaToken: data.captchaToken } : {}),
      },
    });
    return { message: "If this number can receive a code, check your messages.", retryAfter: 60 };
  }
  if (action === "verify") {
    const data = otpVerifySchema.parse(input);
    if (config.mode === "local" && !localTestPhones.some((phone) => phone === data.phone))
      throw new Error("CODE");
    if (!(await allowAuthAttempt("verify", data.phone, 5, 900))) throw new Error("LIMITED");
    const client = await createAuthClient(true);
    const { error } = await client.auth.verifyOtp({
      phone: data.phone,
      token: data.code,
      type: "sms",
    });
    if (error) throw new Error("CODE");
    return { redirect: "/onboarding" };
  }
  if (action === "sign-out") {
    z.object({}).strict().parse(input);
    const client = await createAuthClient(true);
    const { error } = await client.auth.signOut({ scope: "global" });
    if (error) throw new Error("UNAVAILABLE");
    return { redirect: "/auth/sign-in" };
  }
  const identity = await actor();
  const commandHash = createHash("sha256").update(JSON.stringify({ action, input })).digest("hex");
  if (
    ["onboard", "preferences"].includes(action) &&
    (!idempotencyKey || !/^[-a-zA-Z0-9_]{16,128}$/.test(idempotencyKey))
  )
    throw new Error("INVALID");

  if (action === "onboard") {
    const data = profileSchema.parse(input);
    const clientEnabled = data.mode !== "worker",
      workerEnabled = data.mode !== "client";
    await database().begin(async (sql) => {
      await sql`select pg_advisory_xact_lock(hashtextextended(${identity.id + ":" + idempotencyKey},2))`;
      const previous =
        await sql`select request_hash from private.command_idempotency where actor_id=${identity.id}::uuid and idempotency_key=${idempotencyKey!}`;
      if (previous.length) {
        if (previous[0]!.request_hash !== commandHash) throw new Error("CONFLICT");
        return;
      }
      await sql`insert into private.command_idempotency(actor_id,idempotency_key,request_hash,status,expires_at) values (${identity.id}::uuid,${idempotencyKey!},${commandHash},'completed',now()+interval '1 day')`;
      const session =
        await sql`select id from auth.sessions where id=${identity.sessionId}::uuid and user_id=${identity.id}::uuid and (not_after is null or not_after>now()) for share`;
      if (!session.length) throw new Error("UNAUTHORIZED");
      // Serialize account commands and recheck suspension under the same transaction.
      await sql`select pg_advisory_xact_lock(hashtextextended(${identity.id},1))`;
      const rows =
        await sql`select is_suspended from public.user_profiles where user_id=${identity.id}::uuid for update`;
      if (rows[0]?.is_suspended) throw new Error("FORBIDDEN");
      await sql`insert into public.user_profiles(user_id,display_name,client_enabled,worker_enabled,adult_consent_at,terms_version,email_notifications,in_app_notifications,onboarding_completed_at) values (${identity.id}::uuid,${data.displayName},${clientEnabled},${workerEnabled},now(),'pilot-preview-v1',${data.emailNotifications},${data.inAppNotifications},now()) on conflict(user_id) do update set display_name=excluded.display_name,client_enabled=user_profiles.client_enabled or excluded.client_enabled,worker_enabled=user_profiles.worker_enabled or excluded.worker_enabled,adult_consent_at=coalesce(user_profiles.adult_consent_at,excluded.adult_consent_at),terms_version=excluded.terms_version,email_notifications=excluded.email_notifications,in_app_notifications=excluded.in_app_notifications,onboarding_completed_at=coalesce(user_profiles.onboarding_completed_at,now()),updated_at=now()`;
      if (workerEnabled)
        await sql`insert into public.worker_profiles(user_id,display_name,status) values (${identity.id}::uuid,${data.displayName},'draft') on conflict(user_id) do nothing`;
      await sql`insert into private.audit_events(actor_id,actor_type,action,resource_kind) values (${identity.id}::uuid,'user','profile.onboarded','profile')`;
    });
    return { redirect: clientEnabled ? "/app/client" : "/app/worker" };
  }
  if (action === "preferences") {
    const data = preferencesSchema.parse(input);
    if (!identity.profile?.onboarding_completed_at) throw new Error("FORBIDDEN");
    await database().begin(async (sql) => {
      await sql`select pg_advisory_xact_lock(hashtextextended(${identity.id + ":" + idempotencyKey},2))`;
      const previous =
        await sql`select request_hash from private.command_idempotency where actor_id=${identity.id}::uuid and idempotency_key=${idempotencyKey!}`;
      if (previous.length) {
        if (previous[0]!.request_hash !== commandHash) throw new Error("CONFLICT");
        return;
      }
      await sql`insert into private.command_idempotency(actor_id,idempotency_key,request_hash,status,expires_at) values (${identity.id}::uuid,${idempotencyKey!},${commandHash},'completed',now()+interval '1 day')`;
      const session =
        await sql`select id from auth.sessions where id=${identity.sessionId}::uuid and user_id=${identity.id}::uuid and (not_after is null or not_after>now()) for share`;
      if (!session.length) throw new Error("UNAUTHORIZED");
      const rows =
        await sql`update public.user_profiles set display_name=${data.displayName},email_notifications=${data.emailNotifications},in_app_notifications=${data.inAppNotifications},updated_at=now() where user_id=${identity.id}::uuid and not is_suspended returning user_id`;
      if (!rows.length) throw new Error("FORBIDDEN");
      await sql`insert into private.audit_events(actor_id,actor_type,action,resource_kind) values (${identity.id}::uuid,'user','profile.updated','profile')`;
    });
    return { message: "Preferences saved." };
  }
  if (action === "mfa-enroll" || action === "mfa-verify") {
    if (!identity.admin) throw new Error("FORBIDDEN");
    if (!(await allowAuthAttempt("mfa", identity.id, 5, 900))) throw new Error("LIMITED");
    const client = await createAuthClient(true);
    if (action === "mfa-enroll") {
      z.object({}).strict().parse(input);
      const { data: factors } = await client.auth.mfa.listFactors();
      if (factors?.totp.some((f) => f.status === "verified")) throw new Error("FORBIDDEN");
      for (const factor of factors?.totp ?? []) {
        if (factor.status !== "verified") await client.auth.mfa.unenroll({ factorId: factor.id });
      }
      const { data, error } = await client.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Duzelo administrator",
      });
      if (error || !data) throw new Error("UNAVAILABLE");
      return { factorId: data.id, secret: data.totp.secret };
    }
    const data = z
      .object({ factorId: z.uuid(), code: z.string().regex(/^\d{6}$/) })
      .strict()
      .parse(input);
    const { error } = await client.auth.mfa.challengeAndVerify({
      factorId: data.factorId,
      code: data.code,
    });
    if (error) throw new Error("CODE");
    return { redirect: "/admin" };
  }
  throw new Error("NOT_FOUND");
}
