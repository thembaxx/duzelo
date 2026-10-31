import { describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
import { getVerifiedIdentity } from "./service";
import { requireWorkspace } from "./guard";

describe("M00 server guard", () => {
  it("does not manufacture an identity", async () => {
    expect(await getVerifiedIdentity()).toBeNull();
  });
  it.each(["client", "worker", "admin"] as const)("always denies %s", async (workspace) => {
    await expect(requireWorkspace(workspace)).rejects.toThrow(
      `REDIRECT:/auth/sign-in?workspace=${workspace}`,
    );
  });
});
