import "server-only";
import { validateDisabledFlags } from "./feature-flags";
import { publicEnv } from "./env";

export function validateServerEnv() {
  for (const name of Object.keys(process.env)) {
    if (
      name.startsWith("NEXT_PUBLIC_") &&
      /SECRET|SERVICE_ROLE|PASSWORD|DATABASE|PRIVATE|ACCESS_TOKEN/i.test(name)
    ) {
      throw new Error(
        "A privileged variable uses the public prefix. Remove it; values are redacted.",
      );
    }
  }
  return { public: publicEnv, features: validateDisabledFlags(process.env) };
}
