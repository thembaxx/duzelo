import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
if (existsSync("supabase/.temp/project-ref")) throw new Error("Use an unlinked local checkout.");
const env = { ...process.env, AUTH_DIAGNOSTICS: "true" };
for (const line of readFileSync(".env.auth-test", "utf8").split("\n")) {
  const split = line.indexOf("=");
  if (split > 0) env[line.slice(0, split)] = line.slice(split + 1);
}
if (
  env.AUTH_MODE !== "local" ||
  ![env.SUPABASE_URL, env.DATABASE_URL].every(
    (value) => value && ["127.0.0.1", "localhost"].includes(new URL(value).hostname),
  )
)
  throw new Error("Auth tests require the local stack.");
const build = spawnSync("node_modules/.bin/next", ["build"], { env, stdio: "inherit" });
if (build.status) process.exit(build.status);
const scan = spawnSync("node", ["scripts/check-secrets.mjs"], {
  env: { ...env, SECURITY_SCAN_CANARY: env.AUTH_RATE_LIMIT_SECRET },
  stdio: "inherit",
});
if (scan.status) process.exit(scan.status);
const result = spawnSync(
  "node_modules/.bin/playwright",
  ["test", "--config", "playwright.auth.config.ts"],
  { env, stdio: "inherit" },
);
process.exitCode = result.status ?? 1;
