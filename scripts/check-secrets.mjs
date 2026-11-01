import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const sourceFiles = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /sb_secret_[A-Za-z0-9_-]{16,}/,
  /(?:sk_live_|sk_test_|gh[pousr]_)[A-Za-z0-9_]{20,}/,
  /["']role["']\s*:\s*["']service_role["']/,
];
const canary = process.env.SECURITY_SCAN_CANARY;
const errors = [];
function scan(path, bundle = false) {
  const body = readFileSync(path);
  if (body.includes(0)) return;
  const text = body.toString("utf8");
  if (patterns.some((pattern) => pattern.test(text)) || (bundle && canary && text.includes(canary)))
    errors.push(`${bundle ? "Browser asset" : "Repository file"}: ${path}`);
  for (const match of text.matchAll(/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+/g)) {
    try {
      if (
        JSON.parse(Buffer.from(match[0].split(".")[1], "base64url").toString()).role ===
        "service_role"
      )
        errors.push(`Privileged JWT in ${path}`);
    } catch {
      /* Not a JWT. */
    }
  }
}
for (const path of new Set(sourceFiles)) if (existsSync(path)) scan(path);
let assets = 0;
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (/\.(?:[cm]?js|map|json)$/.test(path)) {
      scan(path, true);
      assets++;
    }
  }
}
if (existsSync(".next/static")) walk(".next/static");
if (errors.length) {
  console.error("Potential secret exposure (values redacted):\n" + errors.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Secret leakage scan passed: ${new Set(sourceFiles).size} repository files; ${assets} browser assets; canary ${canary ? "checked" : "not supplied"}. Pattern scan is not a complete security audit.`,
  );
