import { describe, expect, it } from "vitest";
import { SITE_DESCRIPTION, SITE_URL } from "./site";
describe("public metadata", () => {
  it("uses the canonical production origin, not a preview", () => {
    expect(SITE_URL).toBe("https://duzelo.vercel.app");
    expect(new URL(SITE_URL).protocol).toBe("https:");
  });
  it("describes prelaunch capabilities truthfully", () => {
    expect(SITE_DESCRIPTION).toMatch(/preparing/i);
    expect(SITE_DESCRIPTION).not.toMatch(/book now|guaranteed|available verified workers/i);
  });
});
