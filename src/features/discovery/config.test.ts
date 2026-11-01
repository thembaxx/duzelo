import { it, expect, vi, afterEach, beforeEach } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/config/auth", () => ({ readAuthConfig: vi.fn() }));
import { readAuthConfig } from "@/config/auth";
import { discoveryConfig } from "./config";
const auth = {
  mode: "local" as const,
  url: "http://127.0.0.1:54321",
  key: "inert-publishable-key",
  databaseUrl: "postgresql://inert@127.0.0.1:54322/postgres",
  origin: "http://127.0.0.1:3000",
  rateSecret: "inert-unit-rate-secret-for-local-test",
  secure: false,
  captchaSecret: undefined,
  captchaSiteKey: undefined,
};
beforeEach(() => {
  vi.mocked(readAuthConfig).mockReturnValue(auth);
  vi.stubEnv("DISCOVERY_ENABLED", "true");
  vi.stubEnv("WORKER_APPROVAL_ENABLED", "true");
  vi.stubEnv("DISCOVERY_TEST_MAP", "false");
  vi.stubEnv("GEOCODING_PROVIDER_APPROVED", "false");
  vi.stubEnv("MAP_STYLE_LIGHT_URL", "");
  vi.stubEnv("MAP_STYLE_DARK_URL", "");
  vi.stubEnv("GEOCODING_TEST_URL", "");
});
afterEach(() => vi.unstubAllEnvs());
it("keeps discovery off without reading infrastructure configuration", () => {
  vi.stubEnv("DISCOVERY_ENABLED", "false");
  expect(discoveryConfig()).toBeNull();
});
it("rejects a malformed enable flag", () => {
  vi.stubEnv("DISCOVERY_ENABLED", "yes");
  expect(() => discoveryConfig()).toThrow(/flag/);
});
it("requires the real worker review and Auth boundary", () => {
  vi.mocked(readAuthConfig).mockReturnValue(null);
  expect(() => discoveryConfig()).toThrow(/configuration/);
});
it("supports list search when no licensed tiles are configured", () =>
  expect(discoveryConfig()?.map.light).toBeNull());
it("uses only explicit licensed MapTiler styles", () => {
  vi.stubEnv(
    "MAP_STYLE_LIGHT_URL",
    "https://api.maptiler.com/maps/unit-fixture/style.json?key=inert_public_fixture",
  );
  vi.stubEnv("MAP_LICENSE_APPROVED", "true");
  expect(discoveryConfig()?.map.dark).toBeNull();
});
it.each([
  "http://api.maptiler.com/maps/unit/style.json?key=fixture",
  "https://tile.openstreetmap.org/style.json",
  "https://public-nominatim.example/style.json",
])("rejects unsupported style %s", (url) => {
  vi.stubEnv("MAP_STYLE_LIGHT_URL", url);
  vi.stubEnv("MAP_LICENSE_APPROVED", "true");
  expect(() => discoveryConfig()).toThrow();
});
it("rejects unapproved map terms and dark-only configuration", () => {
  vi.stubEnv(
    "MAP_STYLE_DARK_URL",
    "https://api.maptiler.com/maps/unit/style.json?key=inert_public_fixture",
  );
  vi.stubEnv("MAP_LICENSE_APPROVED", "false");
  expect(() => discoveryConfig()).toThrow();
  vi.stubEnv("MAP_LICENSE_APPROVED", "true");
  expect(() => discoveryConfig()).toThrow(/light map/);
});
it("requires a private geocoder key after explicit provider approval", () => {
  vi.stubEnv("GEOCODING_PROVIDER_APPROVED", "true");
  vi.stubEnv("MAPTILER_GEOCODING_KEY", "");
  expect(() => discoveryConfig()).toThrow(/private provider key/);
});
it("prevents test providers and maps in hosted mode", () => {
  vi.mocked(readAuthConfig).mockReturnValue({ ...auth, mode: "supabase" });
  vi.stubEnv("DISCOVERY_POLICY_APPROVED", "true");
  vi.stubEnv("DISCOVERY_TEST_MAP", "true");
  expect(() => discoveryConfig()).toThrow(/local-only/);
  vi.stubEnv("DISCOVERY_TEST_MAP", "false");
  vi.stubEnv("GEOCODING_TEST_URL", "http://127.0.0.1:54329");
  expect(() => discoveryConfig()).toThrow(/loopback-only/);
});
it("requires privacy review before hosted discovery", () => {
  vi.mocked(readAuthConfig).mockReturnValue({ ...auth, mode: "supabase" });
  vi.stubEnv("DISCOVERY_POLICY_APPROVED", "false");
  expect(() => discoveryConfig()).toThrow(/privacy configuration/);
});
