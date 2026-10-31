import { it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

const script = resolve("scripts/db-local.mjs");
it("rejects a hosted-project link before invoking the Supabase CLI", () => {
  const root = mkdtempSync(join(tmpdir(), "duzelo-local-only-"));
  try {
    mkdirSync(join(root, "supabase/.temp"), { recursive: true });
    writeFileSync(join(root, "supabase/.temp/project-ref"), "synthetic-test-ref");
    const result = spawnSync(process.execPath, [script, "reset"], { cwd: root, encoding: "utf8" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("linked to a hosted Supabase project");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
it("rejects remote-URL arguments rather than passing them through", () => {
  const result = spawnSync(process.execPath, [script, "reset", "--linked"], { encoding: "utf8" });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("no extra arguments are accepted");
});

it("excludes private schemas and automatic grants from the API contract", () => {
  const config = readFileSync("supabase/config.toml", "utf8");
  expect(config).toMatch(/^schemas = \["public"\]$/m);
  expect(config).toMatch(/^auto_expose_new_tables = false$/m);
  expect(config).toMatch(/^extra_search_path = \["public", "extensions"\]$/m);
});
