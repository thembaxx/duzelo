import { it, expect, vi, beforeEach, afterEach } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/features/workers/config", () => ({ workerConfig: vi.fn() }));
import { workerConfig } from "@/features/workers/config";
import { jobsConfig } from "./config";
beforeEach(() => {
  vi.stubEnv("JOB_REQUESTS_ENABLED", "false");
  vi.stubEnv("LOCATION_MATCHING_ENABLED", "false");
  vi.mocked(workerConfig).mockReturnValue({ mode: "local" } as NonNullable<
    ReturnType<typeof workerConfig>
  >);
});
afterEach(() => vi.unstubAllEnvs());
it("keeps requests and matching off by default", () => expect(jobsConfig()).toBeNull());
it("rejects matching without the job capability", () => {
  vi.stubEnv("LOCATION_MATCHING_ENABLED", "true");
  expect(() => jobsConfig()).toThrow();
});
it("requires both capabilities and real worker infrastructure", () => {
  vi.stubEnv("JOB_REQUESTS_ENABLED", "true");
  expect(() => jobsConfig()).toThrow();
  vi.stubEnv("LOCATION_MATCHING_ENABLED", "true");
  expect(jobsConfig()?.jobRetentionDays).toBe(7);
  vi.mocked(workerConfig).mockReturnValue(null);
  expect(() => jobsConfig()).toThrow();
});
it("requires an approved bounded hosted retention policy", () => {
  vi.stubEnv("JOB_REQUESTS_ENABLED", "true");
  vi.stubEnv("LOCATION_MATCHING_ENABLED", "true");
  vi.mocked(workerConfig).mockReturnValue({ mode: "supabase" } as NonNullable<
    ReturnType<typeof workerConfig>
  >);
  vi.stubEnv("JOB_MEDIA_RETENTION_DAYS", "30");
  vi.stubEnv("JOBS_POLICY_APPROVED", "false");
  expect(() => jobsConfig()).toThrow();
  vi.stubEnv("JOBS_POLICY_APPROVED", "true");
  expect(jobsConfig()?.jobRetentionDays).toBe(30);
  vi.stubEnv("JOB_MEDIA_RETENTION_DAYS", "999");
  expect(() => jobsConfig()).toThrow();
});
