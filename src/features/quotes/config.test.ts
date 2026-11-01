import { it, expect, vi, beforeEach, afterEach } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/features/jobs/config", () => ({ jobsConfig: vi.fn() }));
import { jobsConfig } from "@/features/jobs/config";
import { quotesConfig } from "./config";
beforeEach(() => {
  vi.stubEnv("QUOTATIONS_ENABLED", "false");
  vi.stubEnv("BOOKINGS_ENABLED", "false");
  vi.mocked(jobsConfig).mockReturnValue({ mode: "local" } as NonNullable<
    ReturnType<typeof jobsConfig>
  >);
});
afterEach(() => vi.unstubAllEnvs());
it("keeps quotations and bookings off by default", () => expect(quotesConfig()).toBeNull());
it("rejects partial or unreviewed hosted activation", () => {
  vi.stubEnv("BOOKINGS_ENABLED", "true");
  expect(() => quotesConfig()).toThrow();
  vi.stubEnv("QUOTATIONS_ENABLED", "true");
  expect(quotesConfig()?.mode).toBe("local");
  vi.mocked(jobsConfig).mockReturnValue(null);
  expect(() => quotesConfig()).toThrow();
  vi.mocked(jobsConfig).mockReturnValue({ mode: "supabase" } as NonNullable<
    ReturnType<typeof jobsConfig>
  >);
  vi.stubEnv("BOOKINGS_POLICY_APPROVED", "false");
  expect(() => quotesConfig()).toThrow();
  vi.stubEnv("BOOKINGS_POLICY_APPROVED", "true");
  expect(quotesConfig()?.mode).toBe("supabase");
});
