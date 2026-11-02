import { it, expect } from "vitest";
import { signTicket, verifyTicket } from "./tickets";
const data = { assetId: "asset", actorId: "actor", sessionId: "session", expires: 11000 },
  secret = "test-secret",
  token = signTicket(data, secret);
it("authenticates a short-lived actor and session-bound media ticket", () =>
  expect(verifyTicket(token, secret, "asset", "actor", "session", 10000)).toEqual(data));
it.each(["asset", "actor", "session"])("rejects a substituted %s", (field) => {
  const args = ["asset", "actor", "session"];
  args[["asset", "actor", "session"].indexOf(field)] = "other";
  expect(() => verifyTicket(token, secret, args[0]!, args[1]!, args[2]!, 10000)).toThrow(
    "FORBIDDEN",
  );
});
it("rejects exact expiry, wrong key, changed bytes and extra segments", () => {
  for (const [t, s, now] of [
    [token, secret, 11000],
    [token, "wrong", 10000],
    [token + "x", secret, 10000],
    [token + ".extra", secret, 10000],
  ] as const)
    expect(() => verifyTicket(t, s, "asset", "actor", "session", now)).toThrow("FORBIDDEN");
});
it("rejects a ticket with an excessive lifetime or invalid timestamp", () => {
  for (const expires of [72000, NaN, Infinity])
    expect(() =>
      verifyTicket(
        signTicket({ ...data, expires }, secret),
        secret,
        "asset",
        "actor",
        "session",
        10000,
      ),
    ).toThrow();
});
