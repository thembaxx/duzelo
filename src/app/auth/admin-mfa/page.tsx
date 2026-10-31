import { requireIdentity } from "@/features/auth/guard";
import { notFound, redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/server";
import { MfaForm } from "@/features/auth/forms.client";
import { PageHeading } from "@/features/auth/page-heading";
export const dynamic = "force-dynamic";
export default async function AdminMfa() {
  const actor = await requireIdentity();
  if (!actor.admin) notFound();
  if (actor.aal2) redirect("/admin");
  const client = await createAuthClient();
  const { data } = await client.auth.mfa.listFactors();
  const factor = data?.totp.find((f) => f.status === "verified");
  return (
    <>
      <PageHeading eyebrow="Administrator security" title="One more check.">
        <p>
          Phone verification alone cannot unlock administrator access. Use an authenticator app to
          continue.
        </p>
      </PageHeading>
      {actor.hasVerifiedEmail ? (
        <MfaForm {...(factor ? { factorId: factor.id } : {})} />
      ) : (
        <p>
          An approved operator must arrange a verified administrator email before authenticator
          setup. Administrator access stays locked.
        </p>
      )}
    </>
  );
}
