import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readAuthConfig } from "@/config/auth";
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const protectedRoute =
    path.startsWith("/app") || path.startsWith("/admin") || path === "/onboarding";
  const config = readAuthConfig();
  let response = NextResponse.next({ request });
  const deny = () => {
    const url = new URL("/auth/sign-in", request.url);

    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    redirect.headers.set("Cache-Control", "private, no-store, max-age=0");
    return redirect;
  };
  if (!config) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    return protectedRoute ? deny() : response;
  }
  const client = createServerClient(config.url, config.key, {
    cookieOptions: {
      name: "duzelo-auth",
      httpOnly: true,
      sameSite: "lax",
      secure: config.secure,
      path: "/",
    },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values, cacheHeaders) => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(cacheHeaders ?? {}).forEach(([name, value]) =>
          response.headers.set(name, value),
        );
      },
    },
  });
  const { data, error } = await client.auth.getClaims();
  if (protectedRoute && (error || !data?.claims.sub)) return deny();
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}
export const config = {
  matcher: [
    "/app/:path*",
    "/admin/:path*",
    "/auth/:path*",
    "/onboarding",
    "/api/v1/:path*",
    "/workers/:path*",
  ],
};
