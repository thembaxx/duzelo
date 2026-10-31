import "server-only";
import postgres from "postgres";
import { readAuthConfig } from "@/config/auth";
let connection: ReturnType<typeof postgres> | undefined;
export function database() {
  const config = readAuthConfig();
  if (!config) throw new Error("Authentication is unavailable.");
  connection ??= postgres(config.databaseUrl, {
    max: 5,
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 20,
    onnotice: () => {},
  });
  return connection;
}
