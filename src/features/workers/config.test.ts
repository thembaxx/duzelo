import { it, expect, vi, afterEach } from "vitest";
vi.mock("server-only", () => ({}));
import { workerConfig } from "./config";
afterEach(() => vi.unstubAllEnvs());
function local() {
  const settings = {
    WORKER_APPROVAL_ENABLED: "true",
    AUTH_ENABLED: "true",
    AUTH_MODE: "local",
    SUPABASE_URL: "http://127.0.0.1:54321",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_test_fixture",
    SUPABASE_SECRET_KEY: "sb_" + "secret_" + "inert_unit_fixture",
    DATABASE_URL: "postgresql://fixture:fixture@127.0.0.1:54322/postgres",
    NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000",
    AUTH_RATE_LIMIT_SECRET: "inert-local-rate-pepper-for-unit-test-only",
    CLAMAV_HOST: "127.0.0.1",
    CLAMAV_PORT: "3310",
    CLAMAV_TLS: "false",
  };
  for (const [key, value] of Object.entries(settings)) vi.stubEnv(key, value);
}
function hosted() {
  local();
  for (const [key, value] of Object.entries({
    AUTH_MODE: "supabase",
    SUPABASE_URL: "https://example.supabase.co",
    DATABASE_URL: "postgresql://fixture:fixture@database.example/postgres?sslmode=require",
    NEXT_PUBLIC_SITE_URL: "https://example.invalid",
    SMS_PROVIDER_APPROVED: "true",
    NEXT_PUBLIC_AUTH_CAPTCHA_SITE_KEY: "inert-unit-site-key",
    AUTH_CAPTCHA_SECRET: "inert-unit-captcha",
    CLAMAV_HOST: "scanner.example.invalid",
    CLAMAV_TLS: "true",
    VERIFICATION_RETENTION_DAYS: "30",
    VERIFICATION_POLICY_APPROVED: "true",
  }))
    vi.stubEnv(key, value);
}
it("leaves worker review OFF without asking for storage configuration", () => {
  vi.stubEnv("WORKER_APPROVAL_ENABLED", "false");
  vi.stubEnv("SUPABASE_SECRET_KEY", "");
  expect(workerConfig()).toBeNull();
});
it("rejects malformed enable flags", () => {
  vi.stubEnv("WORKER_APPROVAL_ENABLED", "yes");
  expect(() => workerConfig()).toThrow(/flag/);
});
it("requires Auth before enabling document collection", () => {
  local();
  vi.stubEnv("AUTH_ENABLED", "false");
  expect(() => workerConfig()).toThrow(/incomplete/);
});
it("accepts isolated review with a seven-day evidence deadline", () => {
  local();
  expect(workerConfig()?.retentionDays).toBe(7);
});
it("rejects browser keys as privileged Storage credentials", () => {
  local();
  vi.stubEnv("SUPABASE_SECRET_KEY", "sb_publishable_inert_fixture");
  expect(() => workerConfig()).toThrow(/private key/);
});
it("rejects a remote scanner in local test mode", () => {
  local();
  vi.stubEnv("CLAMAV_HOST", "scanner.example.invalid");
  expect(() => workerConfig()).toThrow(/scanner/);
});
it("requires a legally approved hosted retention schedule", () => {
  hosted();
  vi.stubEnv("VERIFICATION_POLICY_APPROVED", "false");
  expect(() => workerConfig()).toThrow(/retention policy/);
});
it.each(["0", "366", "1.5", "not-a-number"])("rejects invalid hosted retention %s", (value) => {
  hosted();
  vi.stubEnv("VERIFICATION_RETENTION_DAYS", value);
  expect(() => workerConfig()).toThrow(/retention policy/);
});
it("requires verified TLS for a hosted scanner", () => {
  hosted();
  vi.stubEnv("CLAMAV_TLS", "false");
  expect(() => workerConfig()).toThrow(/scanner/);
});
it("accepts explicitly configured hosted review without contacting services", () => {
  hosted();
  expect(workerConfig()?.scanner).toEqual({
    host: "scanner.example.invalid",
    port: 3310,
    tls: true,
  });
});
