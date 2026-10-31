import { publicAsset } from "@/features/workers/queries";
import { workerStorage } from "@/features/workers/storage";
import { WORKER_BUCKET } from "@/features/workers/config";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const headers = {
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "Content-Type": "image/jpeg",
  };
  try {
    const path = await publicAsset((await params).id);
    if (!path) return new Response(null, { status: 404, headers });
    const file = await workerStorage().from(WORKER_BUCKET).download(path);
    if (file.error || !file.data) return new Response(null, { status: 404, headers });
    return new Response(await file.data.arrayBuffer(), { headers });
  } catch {
    return new Response(null, { status: 503, headers });
  }
}
