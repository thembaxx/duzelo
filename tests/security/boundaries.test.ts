import { it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// @ts-expect-error The dependency-free Node guard intentionally uses .mjs.
import { checkBoundaries } from "../../scripts/check-boundaries.mjs";
it("denies a transitive server import behind a barrel", () => {
  const root = mkdtempSync(join(tmpdir(), "duzelo-boundary-"));
  try {
    mkdirSync(join(root, "lib"));
    writeFileSync(join(root, "page.tsx"), '"use client"; import {value} from "./lib";');
    writeFileSync(join(root, "lib/index.ts"), 'export {value} from "./secret";');
    writeFileSync(
      join(root, "lib/secret.ts"),
      'import "server-only"; export const value = "private";',
    );
    expect(checkBoundaries(root)).toHaveLength(1);
    writeFileSync(join(root, "lib/secret.ts"), 'export const value = "public";');
    expect(checkBoundaries(root)).toEqual([]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
