/**
 * A *trusted server-side* workspace access decision.
 *
 * Construct this snapshot ONLY from a freshly verified Supabase user/session,
 * the account's suspension record and private admin membership + MFA result.
 * Never construct it from request bodies, query strings, user_metadata or a
 * client-chosen "mode". This is defense-in-depth for navigation only: backend
 * commands must separately authorize owner, role and action, and RLS stays on.
 */
export type Workspace = "client" | "worker" | "settings" | "admin";

export type StaffRole = "owner" | "verification" | "support" | "finance" | "read_only";

export type ServerVerifiedAccount = Readonly<{
  userId: string;
  isSuspended: boolean;
  activeStaffRole: StaffRole | null;
  staffMfaVerified: boolean;
}>;

export type WorkspaceDecision =
  | "allow"
  | "sign_in_required"
  | "account_suspended"
  | "admin_access_denied"
  | "staff_mfa_required";

export function authorizeWorkspace(
  workspace: Workspace,
  account: ServerVerifiedAccount | null,
): WorkspaceDecision {
  if (!account?.userId) return "sign_in_required";
  if (account.isSuspended) return "account_suspended";
  if (workspace !== "admin") return "allow";
  if (!account.activeStaffRole) return "admin_access_denied";
  return account.staffMfaVerified ? "allow" : "staff_mfa_required";
}

export type AccountMode = "client" | "worker";

/**
 * A signed-in person may select either onboarding mode; doing so does not
 * grant worker verification, job matching, admin or payment permissions.
 */
export function parseAccountMode(value: unknown): AccountMode {
  return value === "worker" ? "worker" : "client";
}

export function accountModeHome(mode: AccountMode): "/app/client" | "/app/worker" {
  return mode === "worker" ? "/app/worker" : "/app/client";
}

/**
 * Approved worker status alone does NOT prove category credentials, current
 * evidence, spatial eligibility, or publication. Protected commands must
 * recheck those invariants inside the database transaction.
 */
