import "server-only";
import { redirect } from "next/navigation";
import { getVerifiedIdentity, type Identity } from "./service";
export type Workspace = "client" | "worker" | "admin";
export async function requireIdentity(): Promise<Identity> {
  const actor = await getVerifiedIdentity();
  if (!actor) redirect("/auth/sign-in");
  if (actor.profile?.is_suspended) redirect("/auth/suspended");
  return actor;
}
export async function requireWorkspace(workspace: Workspace): Promise<Identity> {
  const actor = await getVerifiedIdentity();
  if (!actor) redirect(`/auth/sign-in?workspace=${workspace}`);
  if (actor.profile?.is_suspended) redirect("/auth/suspended");
  if (workspace === "admin") {
    if (!actor.admin) redirect("/auth/forbidden");
    if (!actor.aal2) redirect("/auth/admin-mfa");
    return actor;
  }
  if (
    !actor.profile?.onboarding_completed_at ||
    (workspace === "client" ? !actor.profile.client_enabled : !actor.profile.worker_enabled)
  )
    redirect("/onboarding");
  return actor;
}
