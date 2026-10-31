import "server-only";
import { redirect } from "next/navigation";
import { getVerifiedIdentity } from "./service";

export type Workspace = "client" | "worker" | "admin";
export async function requireWorkspace(workspace: Workspace): Promise<never> {
  await getVerifiedIdentity();
  // Deliberately deny every caller, including forged sessions, until milestone 02
  // implements verified identity, DB capabilities, suspension and admin MFA checks.
  redirect(`/auth/sign-in?workspace=${workspace}`);
}
