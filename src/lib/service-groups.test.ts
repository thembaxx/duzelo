import { describe, expect, it } from "vitest";
import { filterServiceCategories, serviceGroups } from "./service-groups";

describe("progressive category browsing", () => {
  it("keeps all known services reachable without network access", () => {
    expect(filterServiceCategories("all")).toHaveLength(6);
    expect(new Set(serviceGroups.map((group) => group.id)).size).toBe(serviceGroups.length);
  });
  it("returns useful, nonempty filtered views without synthetic worker claims", () => {
    const home = filterServiceCategories("home");
    const outdoor = filterServiceCategories("outdoors");
    expect(home.find((x) => x.slug === "plumbing")).toBeDefined();
    expect(outdoor.find((x) => x.slug === "gardening")).toBeDefined();
    expect(outdoor.find((x) => x.slug === "painting")).toBeDefined();
    expect(home.every((x) => x.name && x.summary)).toBe(true);
  });
});
