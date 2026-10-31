import { describe, expect, it } from "vitest";
import {
  accountModeHome,
  authorizeWorkspace,
  parseAccountMode,
  type ServerVerifiedAccount,
  type Workspace,
} from "./access";

const active: ServerVerifiedAccount = {
  userId: "11111111-1111-4111-8111-111111111111",
  isSuspended: false,
  activeStaffRole: null,
  staffMfaVerified: false,
};

describe("server-verified workspace access contract", () => {
  it.each(["client", "worker", "settings", "admin"] as Workspace[])(
    "rejects signed-out access to %s",
    (workspace) => {
      expect(authorizeWorkspace(workspace, null)).toBe("sign_in_required");
    },
  );

  it.each(["client", "worker", "settings", "admin"] as Workspace[])(
    "blocks suspended accounts from %s",
    (workspace) => {
      expect(authorizeWorkspace(workspace, { ...active, isSuspended: true })).toBe(
        "account_suspended",
      );
    },
  );

  it.each(["client", "worker", "settings"] as Workspace[])(
    "allows normal signed-in account workspace %s",
    (workspace) => {
      expect(authorizeWorkspace(workspace, active)).toBe("allow");
    },
  );

  it("does not grant staff access from ordinary account identity", () => {
    expect(authorizeWorkspace("admin", active)).toBe("admin_access_denied");
  });

  it("rejects an unverified server identity even if a staff role is supplied", () => {
    expect(
      authorizeWorkspace("admin", {
        userId: "",
        isSuspended: false,
        activeStaffRole: "owner",
        staffMfaVerified: true,
      }),
    ).toBe("sign_in_required");
  });

  it("does not let a staff role bypass MFA", () => {
    expect(
      authorizeWorkspace("admin", {
        ...active,
        activeStaffRole: "owner",
      }),
    ).toBe("staff_mfa_required");
  });

  it.each(["owner", "verification", "support", "finance", "read_only"] as const)(
    "permits a verified staff member %s to visit admin UI (not all admin actions)",
    (role) => {
      expect(
        authorizeWorkspace("admin", {
          ...active,
          activeStaffRole: role,
          staffMfaVerified: true,
        }),
      ).toBe("allow");
    },
  );
});

describe("client/worker UI mode", () => {
  it.each([undefined, null, "admin", "verified_worker", {}, false])(
    "defaults untrusted preferences to client mode",
    (value) => {
      expect(parseAccountMode(value)).toBe("client");
    },
  );

  it("switches only the workspace destination, not authorization", () => {
    expect(parseAccountMode("worker")).toBe("worker");
    expect(accountModeHome("worker")).toBe("/app/worker");
    expect(accountModeHome("client")).toBe("/app/client");
    expect(authorizeWorkspace("admin", active)).toBe("admin_access_denied");
  });
});
