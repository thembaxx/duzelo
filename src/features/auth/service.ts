import "server-only";

/** No session provider is connected in milestone 00. Never infer identity from headers,
 * cookies, query params, local storage, user_metadata or a selected UI mode. */
export async function getVerifiedIdentity(): Promise<null> {
  return null;
}
