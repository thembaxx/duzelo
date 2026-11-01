import "server-only";
import { readAuthConfig } from "@/config/auth";
export function discoveryConfig() {
  const flag = process.env.DISCOVERY_ENABLED;
  if (flag && !["true", "false"].includes(flag)) throw new Error("Invalid discovery flag.");
  if (flag !== "true") return null;
  const auth = readAuthConfig();
  if (
    !auth ||
    process.env.WORKER_APPROVAL_ENABLED !== "true" ||
    (auth.mode !== "local" && process.env.DISCOVERY_POLICY_APPROVED !== "true")
  )
    throw new Error(
      "Discovery requires reviewed worker and privacy configuration; values redacted.",
    );
  const fixture = process.env.DISCOVERY_TEST_MAP === "true";
  if (fixture && auth.mode !== "local") throw new Error("Synthetic map styles are local-only.");
  function style(value: string | undefined) {
    if (!value) return null;
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error("Invalid licensed map configuration.");
    }
    if (
      process.env.MAP_LICENSE_APPROVED !== "true" ||
      url.protocol !== "https:" ||
      url.hostname !== "api.maptiler.com" ||
      !/^\/maps\/[a-zA-Z0-9_/-]+\/style\.json$/.test(url.pathname) ||
      !url.searchParams.get("key") ||
      url.username ||
      url.password
    )
      throw new Error("Only explicitly approved MapTiler styles are supported.");
    return url.toString();
  }
  const light = fixture
    ? "/api/v1/discovery/test-style-light"
    : style(process.env.MAP_STYLE_LIGHT_URL);
  const dark = fixture
    ? "/api/v1/discovery/test-style-dark"
    : style(process.env.MAP_STYLE_DARK_URL);
  if (dark && !light) throw new Error("A light map style is required before the dark variant.");
  const testGeocoder = process.env.GEOCODING_TEST_URL;
  if (
    testGeocoder &&
    (auth.mode !== "local" || !/^http:\/\/(127\.0\.0\.1|localhost):54329$/.test(testGeocoder))
  )
    throw new Error("Geocoding test endpoints are loopback-only.");
  const geocoding = process.env.GEOCODING_PROVIDER_APPROVED === "true";
  const geocodeKey = process.env.MAPTILER_GEOCODING_KEY ?? "";
  if (geocoding && geocodeKey.length < 10)
    throw new Error("Approved geocoding requires a private provider key.");
  return {
    ...auth,
    fixture,
    map: { light, dark, fixture },
    geocoding,
    geocodeKey,
    geocodeOrigin: testGeocoder ?? "https://api.maptiler.com",
  };
}
