import { z } from "zod";
import { json, readMutation } from "@/lib/security/http";
import { jobsConfig } from "@/features/jobs/config";
import { jobsCommand } from "@/features/jobs/commands";
import { jobActor } from "@/features/jobs/boundary";
import { jobError } from "@/features/jobs/http";
import { getOwnerJob, opportunities } from "@/features/jobs/queries";
import { uploadJobImage, removeJobImage } from "@/features/jobs/files";
import { readImage } from "@/features/workers/http";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  try {
    if (!jobsConfig()) throw new Error("UNAVAILABLE");
    const { action } = await params,
      key = request.headers.get("idempotency-key");
    if (action === "upload") {
      const { file, metadata } = await readImage(request, () => jobActor());
      return json(await uploadJobImage(metadata, file, key));
    }
    const input = await readMutation(request);
    return json(
      action === "remove-photo"
        ? await removeJobImage(input, key)
        : await jobsCommand(action, input, key),
    );
  } catch (error) {
    return jobError(error);
  }
}
export async function GET(request: Request, { params }: { params: Promise<{ action: string }> }) {
  try {
    if (!jobsConfig()) throw new Error("UNAVAILABLE");
    const { action } = await params;
    if (action === "opportunities") return json(await opportunities());
    if (action === "opportunity")
      return json(
        (
          await opportunities(z.guid().parse(new URL(request.url).searchParams.get("matchId")))
        )[0] ?? null,
      );
    return json(await getOwnerJob(z.guid().parse(action)));
  } catch (error) {
    return jobError(error);
  }
}
