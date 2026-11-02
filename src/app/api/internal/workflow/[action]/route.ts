import { z } from "zod";
import { json } from "@/lib/security/http";
import { collaborationError } from "@/features/collaboration/http";
import {
  schedulerAuthorization,
  remindCompletions,
  cleanupEvidence,
} from "@/features/workflow/maintenance";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  try {
    schedulerAuthorization(request.headers.get("authorization"));
    // No JSON input: bounded batches are controlled by the operator URL.
    const reader = request.body?.getReader();
    if (reader)
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        if (chunk.value.byteLength) {
          await reader.cancel();
          throw new Error("INVALID");
        }
      }
    const limit = z.coerce
      .number()
      .int()
      .min(1)
      .max(50)
      .parse(new URL(request.url).searchParams.get("limit") ?? 20);
    const { action } = await params;
    if (action === "reminders") return json(await remindCompletions(limit));
    if (action === "cleanup") return json(await cleanupEvidence(limit));
    throw new Error("INVALID");
  } catch (error) {
    return collaborationError(error);
  }
}
