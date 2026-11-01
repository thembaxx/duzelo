import { it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { makeCursor, readCursor, queryHash } from "./cursor";
const secret = "inert-unit-cursor-secret";
it("binds pagination to the search without including the search location", () => {
  const query = queryHash({ latitude: -27.123456 });
  const token = makeCursor(secret, query, 20, 1000);
  expect(readCursor(secret, query, token, 2000)).toBe(20);
  expect(Buffer.from(token.split(".")[0]!, "base64url").toString()).not.toContain("-27.123456");
});
it("rejects changed filters, forged tokens and stale pagination", () => {
  const token = makeCursor(secret, "first", 20, 1000);
  expect(() => readCursor(secret, "other", token, 2000)).toThrow("INVALID");
  expect(() => readCursor(secret, "first", token + "x", 2000)).toThrow("INVALID");
  expect(() => readCursor(secret, "first", token, 700000)).toThrow("INVALID");
});
it("bounds offsets and accepts a first page without a cursor", () => {
  expect(readCursor(secret, "query", null)).toBe(0);
  expect(() => readCursor(secret, "query", makeCursor(secret, "query", 1001, 1000), 2000)).toThrow(
    "INVALID",
  );
});
