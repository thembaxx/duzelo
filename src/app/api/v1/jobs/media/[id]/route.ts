import { jobImage } from "@/features/jobs/files";
import { jobError } from "@/features/jobs/http";
export const runtime = "nodejs";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    return await jobImage((await params).id);
  } catch (error) {
    return jobError(error);
  }
}
