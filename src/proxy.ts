import { NextResponse, type NextRequest } from "next/server";

/** Always-denying M00 gate. Not a Supabase refresh/auth implementation.
 * Guard again in server route/layout code; proxy is not sole authorization. */
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const workspace =
    path === "/admin" || path.startsWith("/admin/")
      ? "admin"
      : path === "/app/worker" || path.startsWith("/app/worker/")
        ? "worker"
        : "client";
  const url = new URL("/auth/sign-in", request.url);
  url.searchParams.set("workspace", workspace);
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}
export const config = { matcher: ["/app/:path*", "/admin/:path*"] };
