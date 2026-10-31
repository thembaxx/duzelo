import { describe, expect, it } from "vitest";
import { demoRequests } from "./demo-requests";
import { findServiceCategory } from "./services";

describe("editorial demo scenarios", () => {
  it("has stable, unique demo-only IDs and valid categories", () => {
    expect(new Set(demoRequests.map((r) => r.id)).size).toBe(demoRequests.length);
    for (const request of demoRequests) {
      expect(request.id.startsWith("demo-")).toBe(true);
      expect(findServiceCategory(request.categorySlug)).toBeDefined();
      expect(request.town).toContain("example");
      expect(request.exampleBudget.startsWith("Example budget:")).toBe(true);
    }
  });
  it("does not invent worker identities or rating claims", () => {
    expect(JSON.stringify(demoRequests)).not.toMatch(/verified|rating|review count|book now/i);
  });
});
