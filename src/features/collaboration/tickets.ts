import { createHmac, timingSafeEqual } from "node:crypto";
export interface MediaTicket {
  assetId: string;
  actorId: string;
  sessionId: string;
  expires: number;
  grantId?: string;
}
export function signTicket(data: MediaTicket, secret: string) {
  const body = Buffer.from(JSON.stringify(data)).toString("base64url");
  return body + "." + createHmac("sha256", secret).update(body).digest("base64url");
}
export function verifyTicket(
  token: string,
  secret: string,
  assetId: string,
  actorId: string,
  sessionId: string,
  now = Date.now(),
): MediaTicket {
  try {
    if (token.length > 2048) throw new Error();
    const [body, signature, ...extra] = token.split(".");
    if (!body || !signature || extra.length) throw new Error();
    const expected = createHmac("sha256", secret).update(body).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error();
    const data = JSON.parse(Buffer.from(body, "base64url").toString()) as MediaTicket;
    if (
      data.assetId !== assetId ||
      data.actorId !== actorId ||
      data.sessionId !== sessionId ||
      !Number.isSafeInteger(data.expires) ||
      data.expires <= now ||
      data.expires > now + 61000
    )
      throw new Error();
    return data;
  } catch {
    throw new Error("FORBIDDEN");
  }
}
