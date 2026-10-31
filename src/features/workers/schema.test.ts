import { it, expect } from "vitest";
import { moneyCents, hasPublicContact, workerDraftSchema, assetSchema } from "./schema";
const id = "20000000-0000-0000-0000-000000000001";
const draft = {
  displayName: "Fictional service",
  bio: "A fictional service description for isolated validation.",
  kind: "individual",
  businessName: "",
  registrationNumber: "",
  areaId: "40000000-0000-0000-0000-000000000001",
  latitude: -27,
  longitude: 30,
  radiusKm: 20,
  townIds: ["40000000-0000-0000-0000-000000000001"],
  travelFee: "12.05",
  services: [
    {
      categoryId: id,
      title: "Example service",
      description: "A clear scope of work.",
      pricing: "quote",
      price: "",
    },
  ],
};
it("uses integer cents and preserves quote-only prices as absent", () => {
  expect(moneyCents("12.05")).toBe(1205);
  expect(moneyCents("0")).toBe(0);
  const parsed = workerDraftSchema.parse(draft);
  expect(parsed.travelFee).toBe(1205);
  expect(parsed.services[0]!.price).toBe("");
});
it.each(["-1", "1e6", "1.001", "R 50", "Infinity"])(
  "rejects an ambiguous monetary amount %s",
  (value) => expect(() => moneyCents(value)).toThrow(),
);
it.each(["082 123 4567", "person@example.com", "https://contact.example", "Base -27.123456"])(
  "rejects contact or precise location text %s",
  (value) => expect(hasPublicContact(value)).toBe(true),
);
it("rejects authority injection and unsafe coverage bounds", () => {
  expect(workerDraftSchema.safeParse({ ...draft, status: "approved" }).success).toBe(false);
  expect(workerDraftSchema.safeParse({ ...draft, latitude: 200 }).success).toBe(false);
  expect(workerDraftSchema.safeParse({ ...draft, radiusKm: 151 }).success).toBe(false);
  expect(
    workerDraftSchema.safeParse({
      ...draft,
      services: [{ ...draft.services[0], pricing: "fixed", price: "0" }],
    }).success,
  ).toBe(false);
});
it("binds a trade evidence upload to a category", () => {
  expect(
    assetSchema.safeParse({ kind: "trade", categoryId: null, caption: "", consent: true }).success,
  ).toBe(false);
  expect(
    assetSchema.safeParse({ kind: "identity", categoryId: id, caption: "", consent: true }).success,
  ).toBe(false);
  expect(
    assetSchema.safeParse({ kind: "trade", categoryId: id, caption: "", consent: true }).success,
  ).toBe(true);
});
