import { it, expect, vi, afterEach } from "vitest";
vi.mock("server-only", () => ({}));
import { readAuthConfig } from "./auth";
afterEach(() => vi.unstubAllEnvs());
function local() {
  for (const [key, value] of Object.entries({
    AUTH_ENABLED: "true",
    AUTH_MODE: "local",
    SUPABASE_URL: "http://127.0.0.1:54321",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_test_fixture",
    DATABASE_URL: "postgresql://fixture:fixture@127.0.0.1:54322/postgres",
    NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000",
    AUTH_RATE_LIMIT_SECRET: "inert-local-rate-pepper-for-unit-test-only",
  }))
    vi.stubEnv(key, value);
}
it("keeps authentication off by default", () => {
  vi.stubEnv("AUTH_ENABLED", "false");
  expect(readAuthConfig()).toBeNull();
});
it("accepts explicitly configured loopback Auth", () => {
  local();
  expect(readAuthConfig()?.mode).toBe("local");
});
it("rejects local test mode against a hosted service", () => {
  local();
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  expect(() => readAuthConfig()).toThrow(/loopback/);
});
it("rejects privileged keys even for local Auth", () => {
  local();
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_" + "secret_" + "unit_fixture_not_a_credential");
  expect(() => readAuthConfig()).toThrow(/never a privileged key/);
});
it("requires approved provider and captcha configuration for hosted Auth", () => {
  local();
  vi.stubEnv("AUTH_MODE", "supabase");
  expect(() => readAuthConfig()).toThrow(/approved SMS/);
});
it("rejects malformed enable flags", () => {
  vi.stubEnv("AUTH_ENABLED", "yes");
  expect(() => readAuthConfig()).toThrow(/true or false/);
});
