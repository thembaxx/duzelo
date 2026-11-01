import { execFileSync } from "node:child_process";
import { writeFileSync, existsSync, readFileSync, chmodSync } from "node:fs";
import { randomBytes } from "node:crypto";
if (existsSync("supabase/.temp/project-ref")) throw new Error("Use an unlinked local checkout.");
const data = JSON.parse(
  execFileSync("node_modules/.bin/supabase", ["status", "--output", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }),
);
const origin = "http://127.0.0.1:3000";
const endpoint = data.API_URL ?? data.api_url;
const key = data.PUBLISHABLE_KEY ?? data.publishable_key ?? data.ANON_KEY ?? data.anon_key;
const database = data.DB_URL ?? data.db_url;
const storageSecret=data.SECRET_KEY ?? data.secret_key ?? data.SERVICE_ROLE_KEY ?? data.service_role_key;
if (
  !endpoint ||
  !key ||
  !database ||
  !storageSecret ||
  ![endpoint, database].every((value) =>
    ["127.0.0.1", "localhost"].includes(new URL(value).hostname),
  )
)
  throw new Error("Expected a running loopback-only Supabase stack.");
let pepper = randomBytes(32).toString("hex");
if (existsSync(".env.auth-test"))
  pepper =
    readFileSync(".env.auth-test", "utf8").match(/^AUTH_RATE_LIMIT_SECRET=(.+)$/m)?.[1] ?? pepper;
writeFileSync(
  ".env.auth-test",
  `AUTH_ENABLED=true\nAUTH_MODE=local\nSUPABASE_URL=${endpoint}\nSUPABASE_PUBLISHABLE_KEY=${key}\nDATABASE_URL=${database}\nNEXT_PUBLIC_SITE_URL=${origin}\nAUTH_RATE_LIMIT_SECRET=${pepper}\nWORKER_APPROVAL_ENABLED=true\nSUPABASE_SECRET_KEY=${storageSecret}\nCLAMAV_HOST=127.0.0.1\nCLAMAV_PORT=3310\nCLAMAV_TLS=false\nDISCOVERY_ENABLED=true\nDISCOVERY_TEST_MAP=true\nGEOCODING_PROVIDER_APPROVED=true\nMAPTILER_GEOCODING_KEY=CI_ONLY_DISCOVERY_GEOCODER_CANARY\nGEOCODING_TEST_URL=http://127.0.0.1:54329\n`,
  { mode: 0o600 },
);
chmodSync(".env.auth-test",0o600);
console.log(
  "Wrote ignored local Auth test configuration. Values redacted; no hosted service is configured.",
);
