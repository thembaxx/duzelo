import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { agreementError } from "./http";

it("keeps a disabled capability distinct from an outage", async () => {
  const response = agreementError(new Error("UNAVAILABLE"));
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({
    error: { message: "Quotations and bookings are not open yet." },
  });
});
it("redacts unexpected database failures and prevents response caching", async () => {
  const response = agreementError(new Error("DO_NOT_DISCLOSE_DATABASE_DETAIL"));
  expect(response.status).toBe(503);
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(await response.json()).toEqual({
    error: { message: "Quotations and bookings are temporarily unavailable. Try again later." },
  });
});
