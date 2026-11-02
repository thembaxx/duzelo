import { z } from "zod";
import { json, readMutation } from "@/lib/security/http";
import { requireWorkflow } from "@/features/collaboration/boundary";
import { collaborationError, limitedUpload } from "@/features/collaboration/http";
import { messageCommand } from "@/features/messages/commands";
import { inbox, threadView } from "@/features/messages/queries";
import { workCommand } from "@/features/workflow/commands";
import { proposalCommand } from "@/features/workflow/proposals";
import { disputeCommand } from "@/features/workflow/disputes";
import { workflowView } from "@/features/workflow/queries";
import { auditQueue, openAudit, auditView, triageDispute } from "@/features/workflow/admin";
import { uploadEvidence } from "@/features/collaboration/files";
import { mediaAccess } from "@/features/collaboration/media";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  try {
    requireWorkflow();
    const { action } = await params,
      key = request.headers.get("idempotency-key");
    if (action === "upload") {
      const { input, file } = await limitedUpload(request);
      return json(await uploadEvidence(input, file, key));
    }
    const input = await readMutation(request, 32768);
    if (action === "media-access") return json(await mediaAccess(input, key));
    if (action === "audit") return json(await openAudit(input, key));
    if (action === "triage") return json(await triageDispute(input, key));
    if (action.startsWith("thread-"))
      return json(await messageCommand(action.slice(7), input, key));
    if (action.startsWith("work-")) return json(await workCommand(action.slice(5), input, key));
    if (action.startsWith("proposal-"))
      return json(await proposalCommand(action.slice(9), input, key));
    if (action.startsWith("case-")) return json(await disputeCommand(action.slice(5), input, key));
    throw new Error("INVALID");
  } catch (error) {
    return collaborationError(error);
  }
}
export async function GET(request: Request, { params }: { params: Promise<{ action: string }> }) {
  try {
    requireWorkflow();
    const { action } = await params,
      url = new URL(request.url);
    if (action === "inbox") return json(await inbox());
    if (action === "queue") return json(await auditQueue());
    const id = z.guid().parse(url.searchParams.get("id"));
    if (action === "workflow") return json(await workflowView(id));
    if (action === "audit") return json(await auditView(id));
    if (action === "thread") {
      const cursor = z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
      const before = cursor.parse(url.searchParams.get("before") ?? 0),
        after = cursor.parse(url.searchParams.get("after") ?? 0);
      if (before && after) throw new Error("INVALID");
      return json(await threadView(id, before, after));
    }
    throw new Error("INVALID");
  } catch (error) {
    return collaborationError(error);
  }
}
