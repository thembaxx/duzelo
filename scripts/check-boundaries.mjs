import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { pathToFileURL } from "node:url";

function filesIn(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(dir, entry.name);
    return entry.isDirectory() ? filesIn(path) : /\.[cm]?[jt]sx?$/.test(path) ? [path] : [];
  });
}
// Conservative import graph guard; Next's `server-only` poison pill remains the
// compiler-enforced boundary. This additionally catches transitive local barrels.
export function checkBoundaries(root = resolve("src")) {
  const errors = [];
  const files = filesIn(root);
  const resolveLocal = (specifier, file) => {
    const base = specifier.startsWith("@/")
      ? resolve(root, specifier.slice(2))
      : specifier.startsWith(".")
        ? resolve(dirname(file), specifier)
        : null;
    return (
      base &&
      [
        base,
        ...[".ts", ".tsx", ".js", ".mjs", "/index.ts", "/index.tsx"].map((ext) => base + ext),
      ].find((candidate) => existsSync(candidate) && files.includes(candidate))
    );
  };
  for (const entry of files.filter((file) =>
    /^\s*["']use client["'];?/m.test(readFileSync(file, "utf8")),
  )) {
    const visited = new Set();
    const visit = (file) => {
      if (visited.has(file)) return;
      visited.add(file);
      const source = readFileSync(file, "utf8");
      if (
        /(?:import|require)\s*(?:\(\s*)?["']server-only["']|from\s*["']next\/(?:headers|server)["']/.test(
          source,
        ) ||
        /process\.env\.(?!NEXT_PUBLIC_|NODE_ENV)/.test(source)
      ) {
        errors.push(`${relative(root, entry)} reaches server-only module ${relative(root, file)}`);
      }
      const imports = [
        ...source.matchAll(
          /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?|\brequire\s*\(\s*)["']([^"']+)["']/g,
        ),
      ];
      for (const [, specifier] of imports) {
        if (
          specifier === "@supabase/supabase-js" ||
          (specifier === "@supabase/ssr" && file !== resolve(root, "lib/supabase/browser.ts"))
        )
          errors.push(`${relative(root, file)} imports Supabase outside its adapter`);
        const dependency = resolveLocal(specifier, file);
        if (dependency) visit(dependency);
      }
    };
    visit(entry);
  }
  return errors;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const errors = checkBoundaries();
  if (errors.length) {
    for (const error of errors) console.error(error);
    process.exitCode = 1;
  } else
    console.log(
      "Client/server import boundaries passed (transitive local imports + Next server-only guard).",
    );
}
