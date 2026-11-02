import { it, expect } from "vitest";
import { readCursor, writeCursor } from "./cursor";
it("retains full timestamp precision and a stable resource tie-breaker", () => {
  const at = "2026-11-02 09:30:00.123456+00",
    id = "a0700000-0000-0000-0000-000000000001";
  expect(readCursor(writeCursor(at, id, "conversation"))).toEqual({ at, id, kind: "conversation" });
  expect(readCursor(null)).toBeNull();
});
it("rejects oversized, malformed and invalid-date cursors", () => {
  for (const v of [
    "!",
    "a".repeat(257),
    Buffer.from('{"at":"no date","id":"bad"}').toString("base64url"),
  ])
    expect(() => readCursor(v)).toThrow("INVALID");
});
