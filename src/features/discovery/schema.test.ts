import { it, expect } from "vitest";
import { coarsePoint, searchSchema, pointSchema, saveAddressSchema } from "./schema";
const valid = {
  location: null,
  categoryId: null,
  radiusKm: 30,
  available: false,
  tradeReviewed: false,
  sort: "name",
  cursor: null,
};
it("accepts browsing without geolocation", () =>
  expect(searchSchema.parse(valid).location).toBeNull());
it.each([NaN, Infinity, -Infinity, 90, -90])("rejects spoofed latitude %s", (latitude) =>
  expect(pointSchema.safeParse({ latitude, longitude: 30 }).success).toBe(false),
);
it("coarsens a transient search point before querying", () =>
  expect(coarsePoint({ latitude: -27.123456, longitude: 30.654321 })).toEqual({
    latitude: -27.12,
    longitude: 30.65,
  }));
it.each([
  { ...valid, radiusKm: 100000 },
  { ...valid, actorId: "injected" },
  { ...valid, sort: "base-distance" },
  { ...valid, location: { kind: "saved", id: "../other" } },
  {
    ...valid,
    location: { kind: "coordinates", point: { latitude: -27, longitude: 30, base: true } },
  },
])("rejects unsafe search input", (input) =>
  expect(searchSchema.safeParse(input).success).toBe(false),
);
it("requires explicit consent and no authority fields for saved private addresses", () => {
  const address = {
    label: "Fictional home",
    street: "Fictional rural directions",
    town: "Fictional town",
    province: "Mpumalanga",
    point: { latitude: -27, longitude: 30 },
    consent: true,
  };
  expect(saveAddressSchema.safeParse(address).success).toBe(true);
  expect(saveAddressSchema.safeParse({ ...address, consent: false }).success).toBe(false);
  expect(saveAddressSchema.safeParse({ ...address, ownerId: crypto.randomUUID() }).success).toBe(
    false,
  );
});
