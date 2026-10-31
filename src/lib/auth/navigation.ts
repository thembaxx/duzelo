/**
 * Future post-OTP callback redirects must be internal and route-allowlisted.
 * This is a pure validation helper, never a substitute for session or RLS checks.
 * Do NOT pass unchecked returnTo values to Next.js redirect().
 */
export const DEFAULT_SIGNED_IN_ROUTE = '/app/client' as const;

const ALLOWED_WORKSPACE_PATH =
  /^\/(?:app\/(?:client|worker|settings)|admin)(?:\/[a-z0-9-]+)*$/;

/**
 * Reject external, protocol-relative, encoded, ambiguous and recursive URLs.
 * Deliberately drops query strings; a future workflow can allowlist its own keys.
 */
export function safePostLoginPath(input: unknown): string {
  if (typeof input !== 'string' || input.length === 0 || input.length > 512) {
    return DEFAULT_SIGNED_IN_ROUTE;
  }

  if (
    /[%?#\\\s\u0000-\u001f\u007f]/.test(input) ||
    input.includes('//') ||
    input.includes('/./') ||
    input.includes('/../') ||
    !ALLOWED_WORKSPACE_PATH.test(input)
  ) {
    return DEFAULT_SIGNED_IN_ROUTE;
  }

  return input;
}

/**
 * Admin redirects are allowed only after real staff membership and AAL2
 * authorization have been evaluated on the trusted server.
 */
export function restrictAdminReturnPath(
  safePath: string,
  adminAccessGranted: boolean,
): string {
  const pathname = safePostLoginPath(safePath);
  return (pathname === '/admin' || pathname.startsWith('/admin/')) &&
    !adminAccessGranted
    ? DEFAULT_SIGNED_IN_ROUTE
    : pathname;
}
