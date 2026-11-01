import { json, readMutation } from "@/lib/security/http";
import { allowAuthAttempt } from "@/features/auth/rate-limit";
import { discoveryConfig } from "@/features/discovery/config";
import { searchWorkers } from "@/features/discovery/queries";
import { geocode } from "@/features/discovery/geocode";
import { saveAddress } from "@/features/discovery/addresses";
import { discoveryError } from "@/features/discovery/http";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  try {
    if (!discoveryConfig()) throw new Error("UNAVAILABLE");
    const { action } = await params,
      input = await readMutation(request);
    if (action === "search" || action === "geocode") {
      if (
        !(await allowAuthAttempt(
          "discovery-" + action,
          "public",
          action === "search" ? 60 : 20,
          60,
        ))
      )
        throw new Error("LIMITED");
      return json(action === "search" ? await searchWorkers(input) : await geocode(input));
    }
    if (action === "address")
      return json(await saveAddress(input, request.headers.get("idempotency-key")));
    return json({ error: { message: "Not found." } }, 404);
  } catch (error) {
    return discoveryError(error);
  }
}
export async function GET(_: Request, { params }: { params: Promise<{ action: string }> }) {
  const config = discoveryConfig(),
    { action } = await params;
  if (!config?.fixture || !["test-style-light", "test-style-dark"].includes(action))
    return json({ error: { message: "Not found." } }, 404);
  const dark = action === "test-style-dark";
  return json({
    version: 8,
    name: "Synthetic local map — not a geographic basemap",
    sources: {
      fixture: {
        type: "geojson",
        attribution: "Synthetic local test map · CC0",
        data: { type: "FeatureCollection", features: [] },
      },
    },
    layers: [
      {
        id: "backdrop",
        type: "background",
        paint: { "background-color": dark ? "#152c26" : "#e8f0e4" },
      },
      { id: "fixture", type: "circle", source: "fixture", paint: { "circle-color": "#0b6f65" } },
    ],
  });
}
