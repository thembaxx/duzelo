import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
const digest = (secret: string, body: string) =>
  createHmac("sha256", secret)
    .update("discovery:" + body)
    .digest("base64url");
export const queryHash = (input: unknown) =>
  createHash("sha256").update(JSON.stringify(input)).digest("hex");
export function makeCursor(secret: string, query: string, offset: number, now = Date.now()) {
  const body = Buffer.from(JSON.stringify({ query, offset, until: now + 600000 })).toString(
    "base64url",
  );
  return body + "." + digest(secret, body);
}
export function readCursor(secret: string, query: string, token: string | null, now = Date.now()) {
  if (!token) return 0;
  const [body, signature, ...rest] = token.split(".");
  if (!body || !signature || rest.length) throw new Error("INVALID");
  const actual = Buffer.from(signature),
    expected = Buffer.from(digest(secret, body));
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    throw new Error("INVALID");
  let data;
  try {
    data = JSON.parse(Buffer.from(body, "base64url").toString());
  } catch {
    throw new Error("INVALID");
  }
  if (
    data.query !== query ||
    !Number.isInteger(data.offset) ||
    data.offset < 0 ||
    data.offset > 1000 ||
    !Number.isFinite(data.until) ||
    data.until < now
  )
    throw new Error("INVALID");
  return data.offset as number;
}
