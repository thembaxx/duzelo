import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

// Never infer a remote target or accept passthrough database URLs for destructive
// development operations. The pinned CLI always receives explicit local scope.
if (existsSync("supabase/.temp/project-ref")) {
  throw new Error(
    "This checkout is linked to a hosted Supabase project. Use an isolated, unlinked local checkout.",
  );
}
const commands = {
  start: ["db", "start"],
  reset: ["db", "reset", "--local"],
  test: ["test", "db", "--local"],
  advisors: [
    "db",
    "advisors",
    "--local",
    "--type",
    "security",
    "--level",
    "warn",
    "--fail-on",
    "warn",
  ],
  lint: [
    "db",
    "lint",
    "--local",
    "--schema",
    "public,private",
    "--level",
    "warning",
    "--fail-on",
    "warning",
  ],
  explain: ["db", "query", "--local", "--file", "supabase/queries/nearby-explain.sql"],
};
const command = commands[process.argv[2]];
if (!command || process.argv.length !== 3)
  throw new Error(
    "Choose start, reset, test, advisors, lint or explain; no extra arguments are accepted.",
  );
const result =
  process.argv[2] === "explain"
    ? spawnSync(
        "docker",
        [
          "exec",
          "-i",
          "supabase_db_duzelo",
          "psql",
          "--no-psqlrc",
          "-U",
          "postgres",
          "-d",
          "postgres",
          "-v",
          "ON_ERROR_STOP=1",
        ],
        {
          input: readFileSync("supabase/queries/nearby-explain.sql"),
          stdio: ["pipe", "inherit", "inherit"],
        },
      )
    : spawnSync("node_modules/.bin/supabase", command, { stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
