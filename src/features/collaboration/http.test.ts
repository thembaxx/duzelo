import { it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { collaborationError } from "./http";
it("redacts database details and gives no-store retry guidance", async () => {
  const error = Object.assign(new Error("private.storage_path SECRET-BYTES"), { code: "XX000" }),
    response = collaborationError(error);
  expect(response.status).toBe(503);
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(JSON.stringify(await response.json())).not.toContain("SECRET");
  const limited = collaborationError(new Error("LIMITED"));
  expect(limited.status).toBe(429);
  expect(limited.headers.get("retry-after")).toBe("60");
});
it("preserves concrete permission, stale state and schedule errors without SQL details", () => {
  expect(collaborationError(new Error("FORBIDDEN")).status).toBe(403);
  expect(collaborationError({ code: "23505" }).status).toBe(409);
  expect(collaborationError({ code: "23P01" }).status).toBe(409);
  expect(collaborationError(new Error("TIMING")).status).toBe(422);
});
