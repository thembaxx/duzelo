import { it, expect, vi, beforeEach, afterEach } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/features/quotes/config", () => ({ quotesConfig: vi.fn() }));
import { quotesConfig } from "@/features/quotes/config";
import { workflowConfig } from "./config";
beforeEach(() => {
  vi.stubEnv("MESSAGING_ENABLED", "false");
  vi.stubEnv("WORKFLOW_ENABLED", "false");
  vi.stubEnv("WORKFLOW_SIGNING_SECRET", "unit_test_secret_that_is_long_enough_42");
  vi.stubEnv("WORKFLOW_SCHEDULER_SECRET", "");
  vi.stubEnv("WORKFLOW_REVIEW_HOURS", "48");
  vi.stubEnv("WORKFLOW_MEDIA_TTL_SECONDS", "60");
  vi.mocked(quotesConfig).mockReturnValue({ mode: "local" } as NonNullable<
    ReturnType<typeof quotesConfig>
  >);
});
afterEach(() => vi.unstubAllEnvs());
it("defaults both unfinished capabilities off", () => {
  delete process.env.MESSAGING_ENABLED;
  delete process.env.WORKFLOW_ENABLED;
  expect(workflowConfig()).toBeNull();
});
it("rejects partial and malformed activation", () => {
  vi.stubEnv("WORKFLOW_ENABLED", "true");
  expect(() => workflowConfig()).toThrow();
  vi.stubEnv("MESSAGING_ENABLED", "true");
  expect(workflowConfig()?.reviewHours).toBe(48);
  vi.stubEnv("WORKFLOW_MEDIA_TTL_SECONDS", "61");
  expect(() => workflowConfig()).toThrow();
});
it("requires hosted policy, retention and private signing secret", () => {
  vi.stubEnv("WORKFLOW_ENABLED", "true");
  vi.stubEnv("MESSAGING_ENABLED", "true");
  vi.mocked(quotesConfig).mockReturnValue({ mode: "supabase" } as NonNullable<
    ReturnType<typeof quotesConfig>
  >);
  expect(() => workflowConfig()).toThrow();
  vi.stubEnv("WORKFLOW_POLICY_APPROVED", "true");
  vi.stubEnv("WORKFLOW_MEDIA_RETENTION_DAYS", "30");
  expect(workflowConfig()?.retentionDays).toBe(30);
  vi.stubEnv("WORKFLOW_SIGNING_SECRET", "");
  expect(() => workflowConfig()).toThrow();
});
it("requires existing agreement capability", () => {
  vi.stubEnv("WORKFLOW_ENABLED", "true");
  vi.stubEnv("MESSAGING_ENABLED", "true");
  vi.mocked(quotesConfig).mockReturnValue(null);
  expect(() => workflowConfig()).toThrow();
});
