import { it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { providerPlaces } from "./geocode";
it("returns only labels and coarsened South African search points", () => {
  const result = providerPlaces({
    features: [
      {
        place_name: "Fictional farm",
        center: [30.071234, -27.041234],
        private_key: "must not escape",
      },
      { place_name: "Outside supported area", center: [-74, 40] },
    ],
  });
  expect(result).toEqual([
    { label: "Fictional farm", point: { longitude: 30.07, latitude: -27.04 } },
  ]);
});
it.each([null, {}, { features: [{ place_name: "Broken", center: [Infinity, -27] }] }])(
  "rejects a broken provider response",
  (input) => expect(() => providerPlaces(input)).toThrow("PROVIDER"),
);
