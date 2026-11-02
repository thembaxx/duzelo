import { it, expect } from "vitest";
import {
  agreementTotal,
  proposalTiming,
  completionInput,
  scopeInput,
  decisionInput,
} from "./schema";
const base = {
  bookingId: "86000000-0000-0000-0000-000000000001",
  expectedVersion: 1,
  consent: true,
};
it("calculates bounded integer agreed amounts without changing the base", () => {
  expect(agreementTotal(10000, [250, -500])).toBe(9750);
  expect(agreementTotal(100000000, [-100000000])).toBe(0);
  for (const [value, deltas] of [
    [100, [0.1]],
    [-1, []],
    [10, [-11]],
    [100000000, [1]],
    [NaN, []],
  ] as [number, number[]][])
    expect(() => agreementTotal(value, deltas)).toThrow("PRICE");
});
it("requires truthful completion evidence or a detailed explanation", () => {
  expect(
    completionInput.safeParse({ ...base, summary: "Short explanation", assetIds: [] }).success,
  ).toBe(false);
  expect(
    completionInput.safeParse({
      ...base,
      summary: "Detailed explanation of why a photo is not possible.",
      assetIds: [],
    }).success,
  ).toBe(true);
  expect(
    completionInput.safeParse({
      ...base,
      summary: "Detailed explanation of the completed work.",
      assetIds: [],
      status: "completed",
    }).success,
  ).toBe(false);
});
it("rejects actor, total and price fraction injection", () => {
  const data = {
    ...base,
    scope: "An explicit scoped change.",
    deltaCents: 100,
    expiresAt: "2027-01-01T00:00:00Z",
  };
  expect(scopeInput.safeParse(data).success).toBe(true);
  for (const extra of [{ actorId: base.bookingId }, { totalCents: 1 }, { deltaCents: 1.5 }])
    expect(scopeInput.safeParse({ ...data, ...extra }).success).toBe(false);
  expect(
    decisionInput.safeParse({
      ...base,
      kind: "scope",
      proposalId: base.bookingId,
      decision: "accept",
      decidedBy: base.bookingId,
    }).success,
  ).toBe(false);
});
it("requires a future bounded proposal, shorter than a day and expiring before work", () => {
  const now = Date.parse("2026-11-02T12:00:00Z");
  proposalTiming("2026-11-03T12:00:00Z", "2026-11-03T13:00:00Z", "2026-11-02T13:00:00Z", now);
  for (const [s, e, x] of [
    ["2026-11-02T11:00:00Z", "2026-11-03T13:00:00Z", "2026-11-02T13:00:00Z"],
    ["2026-11-03T12:00:00Z", "2026-11-05T13:00:00Z", "2026-11-02T13:00:00Z"],
    ["2026-11-03T12:00:00Z", "2026-11-03T13:00:00Z", "2026-11-04T13:00:00Z"],
  ])
    expect(() => proposalTiming(s!, e!, x!, now)).toThrow("TIMING");
});
