import { describe, it, expect } from "vitest";
import { parsePublicEnv } from "./env";
import { flagNames, validateDisabledFlags } from "./feature-flags";

describe("environment and fail-closed capabilities", () => {
  it("boots without credentials and supports a replaceable brand", () => {
    expect(parsePublicEnv({}).name).toBe("Duzelo");
    expect(parsePublicEnv({ NEXT_PUBLIC_APP_NAME: "Another name" }).name).toBe("Another name");
  });
  it("requires a paired Supabase URL and publishable key", () => {
    expect(() =>
      parsePublicEnv({ NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co" }),
    ).toThrow();
    expect(() =>
      parsePublicEnv({ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_unusable" }),
    ).toThrow();
    expect(
      parsePublicEnv({ NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "" })
        .supabaseUrl,
    ).toBeUndefined();
  });
  it("rejects malformed and insecure nonlocal site origins without echoing values", () => {
    for (const url of ["javascript:alert(1)", "http://example.com", "invalid-private-value"]) {
      expect(() => parsePublicEnv({ NEXT_PUBLIC_SITE_URL: url })).toThrow(/redacted/);
    }
  });
  it("keeps every unfinished feature off and rejects attempted activation", () => {
    expect(Object.values(validateDisabledFlags({})).every((value) => value === false)).toBe(true);
    for (const flag of flagNames)
      for (const value of ["true", "1", "FALSE", ""])
        expect(() => validateDisabledFlags({ [flag]: value })).toThrow(/must remain false/);
    expect(() =>
      validateDisabledFlags(Object.fromEntries(flagNames.map((name) => [name, "false"]))),
    ).not.toThrow();
  });
});
