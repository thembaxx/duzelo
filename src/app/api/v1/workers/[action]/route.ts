import { json, readMutation } from "@/lib/security/http";
import { workerCommand } from "@/features/workers/commands";
import { uploadWorkerImage, documentAccess, purgeExpired } from "@/features/workers/files";
import { readImage, workerError } from "@/features/workers/http";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  try {
    const { action } = await params,
      key = request.headers.get("idempotency-key");
    if (action === "upload") {
      const { file, metadata } = await readImage(request);
      return json(await uploadWorkerImage(metadata, file, key));
    }
    const input = await readMutation(request);
    if (action === "document-access") return json(await documentAccess(input, key));
    if (action === "purge-expired") return json(await purgeExpired(input, key));
    return json(await workerCommand(action, input, key));
  } catch (error) {
    return workerError(error);
  }
}
