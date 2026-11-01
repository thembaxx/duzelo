import { it, expect } from "vitest";
import {
  emptyDraft,
  draftSchema,
  randToCents,
  readyToSubmit,
  saveSchema,
  submitSchema,
} from "./schema";
const now = Date.parse("2026-11-01T08:00:00Z");
const valid = {
  ...emptyDraft,
  categoryId: "20000000-0000-0000-0000-000000000001",
  title: "Repair a dripping tap",
  description: "The kitchen tap drips while turned off.",
  location: {
    kind: "manual" as const,
    areaId: "40000000-0000-0000-0000-000000000001",
    street: "Private rural directions",
    province: "Mpumalanga" as const,
    notes: "",
    point: { longitude: 30.1, latitude: -27.1 },
    townOnly: false,
    consent: true,
  },
};
it("keeps partial drafts valid without invented titles or categories", () =>
  expect(draftSchema.parse(emptyDraft)).toEqual(emptyDraft));
it.each([
  ["", null],
  ["125", 12500],
  ["125.50", 12550],
  ["0.01", 1],
  ["10,5", 1050],
])("converts optional rand input %s into integer cents", (value, cents) =>
  expect(randToCents(String(value))).toBe(cents),
);
it.each(["-1", "1.001", "1e3", "1000001", "NaN"])(
  "rejects invalid or unbounded budget %s",
  (value) => expect(() => randToCents(value)).toThrow(),
);
it("rejects spoofed owner/status and implicit submission consent", () => {
  expect(
    saveSchema.safeParse({
      jobId: crypto.randomUUID(),
      expectedVersion: 1,
      step: 0,
      data: emptyDraft,
      ownerId: crypto.randomUUID(),
    }).success,
  ).toBe(false);
  expect(
    submitSchema.safeParse({ jobId: crypto.randomUUID(), expectedVersion: 1, consent: false })
      .success,
  ).toBe(false);
});
it("requires a complete request and private-location consent", () => {
  expect(() => readyToSubmit(emptyDraft, now)).toThrow("INCOMPLETE");
  expect(() =>
    readyToSubmit({ ...valid, location: { ...valid.location, consent: false } }, now),
  ).toThrow("INCOMPLETE");
});
it("accepts explicit town-only matching without invented coordinates", () => {
  expect(
    readyToSubmit(
      {
        ...valid,
        location: { ...valid.location, point: null, street: "", province: "", townOnly: true },
      },
      now,
    ).location,
  ).toMatchObject({ point: null, townOnly: true });
});
it("requires a slot for scheduled jobs and rejects past or reversed timing", () => {
  expect(() => readyToSubmit({ ...valid, urgency: "scheduled" }, now)).toThrow("TIMING");
  expect(() =>
    readyToSubmit(
      { ...valid, slots: [{ start: "2026-10-31T08:00:00Z", end: "2026-11-01T07:00:00Z" }] },
      now,
    ),
  ).toThrow("TIMING");
  expect(() =>
    readyToSubmit(
      { ...valid, slots: [{ start: "2026-11-02T10:00:00Z", end: "2026-11-02T08:00:00Z" }] },
      now,
    ),
  ).toThrow("TIMING");
});
it("rejects a window that just ended even within the allowed start tolerance", () => {
  expect(() =>
    readyToSubmit(
      {
        ...valid,
        slots: [
          { start: new Date(now - 50000).toISOString(), end: new Date(now - 10000).toISOString() },
        ],
      },
      now,
    ),
  ).toThrow("TIMING");
});
it("bounds urgent timing to today in Africa/Johannesburg", () => {
  const request = readyToSubmit({ ...valid, urgency: "urgent" }, now);
  expect(request.slots).toEqual([
    { start: "2026-11-01T08:00:00.000Z", end: "2026-11-01T10:00:00.000Z" },
  ]);
  expect(() =>
    readyToSubmit({ ...valid, urgency: "urgent" }, Date.parse("2026-11-01T21:50:00Z")),
  ).toThrow("TIMING");
  expect(() =>
    readyToSubmit(
      {
        ...valid,
        urgency: "urgent",
        slots: [{ start: "2026-11-01T20:00:00Z", end: "2026-11-01T23:00:00Z" }],
      },
      now,
    ),
  ).toThrow("TIMING");
});
it("rejects spoofed coordinates and extra authority in a private location", () => {
  expect(
    draftSchema.safeParse({
      ...valid,
      location: { ...valid.location, point: { latitude: 90, longitude: 180 } },
    }).success,
  ).toBe(false);
  expect(draftSchema.safeParse({ ...valid, status: "open" }).success).toBe(false);
});
