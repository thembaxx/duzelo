import { z } from "zod";
import { json, readMutation } from "@/lib/security/http";
import { requireQuotes } from "@/features/quotes/policy";
import { quotesCommand } from "@/features/quotes/commands";
import { bookingsCommand } from "@/features/bookings/commands";
import { exactLocation } from "@/features/bookings/location";
import { quotesForJob } from "@/features/quotes/queries";
import { bookingList, bookingDetail } from "@/features/bookings/queries";
import { agreementError } from "@/features/quotes/http";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  try {
    requireQuotes();
    const { action } = await params,
      input = await readMutation(request, 32768),
      key = request.headers.get("idempotency-key");
    if (action === "location") return json(await exactLocation(input, key));
    if (action.startsWith("booking-")) {
      const mode = z
        .enum(["client", "worker"])
        .parse(new URL(request.url).searchParams.get("mode"));
      return json(await bookingsCommand(action.slice(8), input, key, mode === "worker"));
    }
    return json(await quotesCommand(action, input, key));
  } catch (error) {
    return agreementError(error);
  }
}
export async function GET(request: Request, { params }: { params: Promise<{ action: string }> }) {
  try {
    requireQuotes();
    const { action } = await params,
      url = new URL(request.url),
      worker =
        z.enum(["client", "worker"]).parse(url.searchParams.get("mode") ?? "client") === "worker";
    if (action === "job")
      return json(
        await quotesForJob(
          z.guid().parse(url.searchParams.get("jobId")),
          worker,
          z.coerce
            .number()
            .int()
            .min(0)
            .max(15)
            .parse(url.searchParams.get("page") ?? 0),
        ),
      );
    if (action === "bookings") return json(await bookingList(worker));
    if (action === "booking")
      return json(await bookingDetail(z.guid().parse(url.searchParams.get("id")), worker));
    throw new Error("INVALID");
  } catch (error) {
    return agreementError(error);
  }
}
