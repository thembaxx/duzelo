import { evidenceImage } from "@/features/collaboration/media";
import { collaborationError } from "@/features/collaboration/http";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await evidenceImage((await params).id, request.headers.get("x-duzelo-asset-ticket"));
  } catch (error) {
    return collaborationError(error);
  }
}
