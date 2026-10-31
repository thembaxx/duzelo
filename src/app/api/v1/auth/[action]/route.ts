import { ZodError } from "zod";
import { authCommand } from "@/features/auth/commands";
import { json, readMutation } from "@/lib/security/http";
export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  try {
    return json(await authCommand((await params).action, await readMutation(request)));
  } catch (error) {
    const code =
      error instanceof ZodError
        ? "INVALID"
        : error instanceof Error
          ? error.message
          : "UNAVAILABLE";
    const messages: Record<string, [number, string]> = {
      UNAVAILABLE: [503, "Account access is unavailable. Please try again later."],
      UNAUTHORIZED: [401, "Your session has ended. Please sign in again."],
      FORBIDDEN: [403, "This action is not available to this account."],
      LIMITED: [429, "Please wait before trying again."],
      CODE: [400, "The code could not be verified. Check it or try again later."],
      CAPTCHA: [422, "Complete the security check before requesting a code."],
      NOT_FOUND: [404, "This action is not available."],
    };
    const [status, message] =
      messages[code] ??
      (code === "INVALID"
        ? [422, "Check the form and try again."]
        : [503, "Account access is unavailable. Please try again later."]);
    const response = json({ error: { message } }, status);
    if (status === 429) response.headers.set("Retry-After", "60");
    return response;
  }
}
