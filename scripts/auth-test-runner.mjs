import { readFileSync, existsSync } from "node:fs";
import { spawnSync, spawn } from "node:child_process";
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
let fixture;
if(env.DISCOVERY_ENABLED==='true'&&env.AUTH_MODE==='local'){
 fixture=spawn(process.execPath,['scripts/discovery-fixture-server.mjs'],{stdio:['ignore','ignore','inherit']});
 process.on('exit',()=>fixture.kill());
 let ready=false;
 for(let attempt=0;attempt<40;attempt++){
  try{const response=await fetch('http://127.0.0.1:54329/health');if((await response.json()).fixture==='duzelo-m04'){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 if(!ready)throw new Error('Isolated geocoder fixture did not start.');
}
const build = spawnSync("node_modules/.bin/next", ["build"], { env, stdio: "inherit" });
if (build.status) process.exit(build.status);
const scan = spawnSync("node", ["scripts/check-secrets.mjs"], {
  env: { ...env, SECURITY_SCAN_CANARY: env.AUTH_RATE_LIMIT_SECRET },
  stdio: "inherit",
});
if (scan.status) process.exit(scan.status);
const storageScan=spawnSync('node',['scripts/check-secrets.mjs'],{env:{...env,SECURITY_SCAN_CANARY:env.SUPABASE_SECRET_KEY},stdio:'inherit'});
if(storageScan.status)process.exit(storageScan.status);
const geocoderScan=spawnSync('node',['scripts/check-secrets.mjs'],{env:{...env,SECURITY_SCAN_CANARY:env.MAPTILER_GEOCODING_KEY},stdio:'inherit'});
if(geocoderScan.status)process.exit(geocoderScan.status);
const result = spawnSync(
  "node_modules/.bin/playwright",
  ["test", "--config", "playwright.auth.config.ts"],
  { env, stdio: "inherit" },
);
process.exitCode = result.status ?? 1;
