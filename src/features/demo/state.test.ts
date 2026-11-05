import { describe, expect, it } from "vitest";
import { demoProviders, filterDemoProviders } from "./catalogue";
import {
  demoActivity,
  demoStateSchema,
  demoToday,
  reduceDemoState,
  seedDemoState,
  shiftDemoDate,
  type DemoAction,
} from "./state";
const anchor = "2026-11-02",
  at = "2026-11-02T12:00:00.000Z";
const create: DemoAction = {
  type: "create",
  id: "demo-booking-test",
  provider: demoProviders[0]!.slug,
  service: "regular-clean",
  date: "2026-11-03",
  slot: "09:00",
  at,
};
describe("isolated sample workspace", () => {
  it("seeds valid diverse booking states across six months without private records", () => {
    const state = seedDemoState(anchor);
    expect(demoStateSchema.safeParse(state).success).toBe(true);
    expect(state.bookings).toHaveLength(14);
    expect(new Set(state.bookings.map((b) => b.status)).size).toBe(5);
    expect(state.bookings.some((b) => b.date === shiftDemoDate(anchor, -178))).toBe(true);
    expect(JSON.stringify(state)).not.toMatch(/address|phone|email|bank|payment|token|document/);
    for (const b of state.bookings.filter((b) => b.review))
      expect(b.events.at(-1)?.kind).toBe("reviewed");
  });
  it("uses the South African date across the UTC day boundary", () => {
    expect(demoToday(new Date("2026-11-02T22:30:00Z"))).toBe("2026-11-03");
    expect(shiftDemoDate("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("creates a demo booking with catalogue scope, persists through JSON and rejects duplicate IDs", () => {
    const before = seedDemoState(anchor),
      after = reduceDemoState(before, create);
    expect(after.bookings).toHaveLength(15);
    expect(before.bookings).toHaveLength(14);
    expect(demoStateSchema.parse(JSON.parse(JSON.stringify(after)))).toEqual(after);
    expect(reduceDemoState(after, create)).toBe(after);
  });
  it("rejects unknown services, impossible days, invalid times and dates outside the next 30 days", () => {
    const state = seedDemoState(anchor);
    for (const invalid of [
      { service: "real-service-id" },
      { provider: "real-worker-id" },
      { date: anchor },
      { date: "2026-11-33" },
      { date: "2026-12-03" },
      { slot: "03:00" },
      { at: "not-a-date" },
    ])
      expect(reduceDemoState(state, { ...create, ...invalid } as DemoAction)).toBe(state);
  });
  it("reschedules, simulates progress and keeps cancelled/completed bookings terminal", () => {
    let state = reduceDemoState(seedDemoState(anchor), create);
    const id = "demo-booking-test";
    state = reduceDemoState(state, {
      type: "reschedule",
      id,
      date: "2026-11-10",
      slot: "14:00",
      at,
    });
    expect(state.bookings[0]!.date).toBe("2026-11-10");
    for (const status of ["in-progress", "awaiting-review", "completed"]) {
      state = reduceDemoState(state, { type: "progress", id, at });
      expect(state.bookings[0]!.status).toBe(status);
    }
    const finished = state.bookings[0];
    for (const action of [
      { type: "progress" },
      { type: "cancel" },
      { type: "reschedule", date: "2026-11-08", slot: "11:00" },
    ] as const)
      expect(reduceDemoState(state, { ...action, id, at }).bookings[0]).toBe(finished);
    const cancelled = reduceDemoState(reduceDemoState(seedDemoState(anchor), create), {
      type: "cancel",
      id,
      at,
    });
    expect(reduceDemoState(cancelled, { type: "progress", id, at }).bookings[0]!.status).toBe(
      "cancelled",
    );
  });
  it("allows a single bounded sample review only after completion", () => {
    let state = reduceDemoState(seedDemoState(anchor), create);
    const review: DemoAction = { type: "review", id: "demo-booking-test", rating: 5, at };
    expect(reduceDemoState(state, review).bookings[0]!.review).toBeUndefined();
    for (let i = 0; i < 3; i++)
      state = reduceDemoState(state, { type: "progress", id: review.id, at });
    expect(reduceDemoState(state, { ...review, rating: 6 }).bookings[0]!.review).toBeUndefined();
    state = reduceDemoState(state, review);
    expect(state.bookings[0]!.review).toBe(5);
    expect(reduceDemoState(state, { ...review, rating: 1 }).bookings[0]!.review).toBe(5);
  });
  it("rejects malformed persisted records, duplicate bookings, unknown providers and private extras", () => {
    const state = seedDemoState(anchor);
    for (const invalid of [
      { ...state, version: 2 },
      { ...state, anchor: "2026-02-31" },
      { ...state, saved: ["unknown"] },
      { ...state, bookings: [...state.bookings, state.bookings[0]] },
      { ...state, address: "unexpected" },
    ])
      expect(demoStateSchema.safeParse(invalid).success).toBe(false);
  });
  it("saves only sample providers and searches/filter/sorts the same catalogue used by the map", () => {
    const state = seedDemoState(anchor),
      slug = demoProviders[1]!.slug;
    expect(reduceDemoState(state, { type: "save", slug: "unknown" })).toBe(state);
    const saved = reduceDemoState(state, { type: "save", slug });
    expect(saved.saved).toContain(slug);
    expect(reduceDemoState(saved, { type: "save", slug }).saved).not.toContain(slug);
    expect(filterDemoProviders("GARDEN", "gardening", "price").map((p) => p.slug)).toEqual([
      "demo-root-grow",
      "demo-green-corner",
    ]);
    expect(filterDemoProviders("tap repair", "all", "recommended")).toHaveLength(1);
    expect(filterDemoProviders("plumber", "all", "recommended")[0]?.category).toBe("plumbing");
    expect(filterDemoProviders("electrician", "all", "recommended")[0]?.category).toBe("electrical");
    expect(filterDemoProviders("washer", "all", "recommended")[0]?.category).toBe("plumbing");
    expect(filterDemoProviders("impossible-service", "all", "recommended")).toHaveLength(0);
    expect(filterDemoProviders("", "all", "recommended", state.saved)).toHaveLength(2);
  });
  it("rejects duplicate saved records and cannot append beyond the catalogue limit", () => {
    const state = {
      ...seedDemoState(anchor),
      saved: Array.from({ length: 8 }, () => demoProviders[0]!.slug),
    };
    expect(demoStateSchema.safeParse(state).success).toBe(false);
    expect(reduceDemoState(state, { type: "save", slug: demoProviders[1]!.slug })).toBe(state);
    expect(
      demoStateSchema.safeParse({ ...state, saved: demoProviders.map((p) => p.slug) }).success,
    ).toBe(true);
  });
  it("preserves the arrival reply's original schedule after a reschedule", () => {
    let state = reduceDemoState(seedDemoState(anchor), create);
    state = reduceDemoState(state, {
      type: "message",
      id: "demo-booking-test",
      kind: "arrival",
      at,
    });
    state = reduceDemoState(state, {
      type: "reschedule",
      id: "demo-booking-test",
      date: "2026-11-12",
      slot: "14:00",
      at,
    });
    expect(state.bookings[0]!.events.find((e) => e.kind === "arrival")!.schedule).toEqual({
      date: "2026-11-03",
      slot: "09:00",
    });
    expect(state.bookings[0]!.date).toBe("2026-11-12");
  });
  it("charts completed events in half-open periods, including a simulated future appointment completed now", () => {
    const initial = seedDemoState(anchor);
    expect(demoActivity(initial.bookings, anchor).reduce((n, b) => n + b.count, 0)).toBe(9);
    let state = reduceDemoState(initial, create);
    for (let i = 0; i < 3; i++)
      state = reduceDemoState(state, { type: "progress", id: "demo-booking-test", at });
    expect(demoActivity(state.bookings, anchor).reduce((n, b) => n + b.count, 0)).toBe(10);
    expect(demoActivity(state.bookings, anchor).at(-1)!.count).toBe(
      demoActivity(initial.bookings, anchor).at(-1)!.count + 1,
    );
  });
});
