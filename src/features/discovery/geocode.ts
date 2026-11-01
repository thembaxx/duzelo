import "server-only";
import { z } from "zod";
import { coarsePoint, geocodeSchema, pointSchema } from "./schema";
import { discoveryConfig } from "./config";
import type { Place } from "./types";
const feature = z.object({
  place_name: z.string().min(1).max(500),
  center: z.tuple([z.number(), z.number()]),
});
export function providerPlaces(input: unknown): Place[] {
  const parsed = z.object({ features: z.array(feature).max(20) }).safeParse(input);
  if (!parsed.success) throw new Error("PROVIDER");
  return parsed.data.features.slice(0, 5).flatMap((f) => {
    const point = pointSchema.safeParse({ longitude: f.center[0], latitude: f.center[1] });
    return point.success
      ? [{ label: f.place_name.slice(0, 160), point: coarsePoint(point.data) }]
      : [];
  });
}
export async function geocode(input: unknown) {
  const config = discoveryConfig();
  if (!config?.geocoding) throw new Error("GEOCODING_OFF");
  const { query } = geocodeSchema.parse(input);
  const url = new URL("/geocoding/" + encodeURIComponent(query) + ".json", config.geocodeOrigin);
  for (const [key, value] of Object.entries({
    key: config.geocodeKey,
    country: "za",
    language: "en",
    limit: "5",
    autocomplete: "false",
    bbox: "16,-35,33,-22",
  }))
    url.searchParams.set(key, value);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) throw new Error();
    const reader = response.body?.getReader();
    if (!reader) throw new Error();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 65536) {
        await reader.cancel();
        throw new Error();
      }
      chunks.push(part.value);
    }
    return { places: providerPlaces(JSON.parse(Buffer.concat(chunks).toString("utf8"))) };
  } catch {
    throw new Error("PROVIDER");
  }
}
