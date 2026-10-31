import "server-only";
import { NextResponse } from "next/server";
import { readAuthConfig } from "@/config/auth";
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache" },
  });
}
export async function readMutation(request: Request) {
  const config = readAuthConfig();
  if (!config) throw new Error("UNAVAILABLE");
  if (
    request.headers.get("origin") !== config.origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new Error("FORBIDDEN");
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new Error("INVALID");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("INVALID");
  let body = "";
  let length = 0;
  const decoder = new TextDecoder();
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;
    length += chunk.value.byteLength;
    if (length > 8192) {
      await reader.cancel();
      throw new Error("INVALID");
    }
    body += decoder.decode(chunk.value, { stream: true });
  }
  body += decoder.decode();
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new Error("INVALID");
  }
}
