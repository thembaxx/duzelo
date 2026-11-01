import "server-only";
import { database } from "@/lib/db/server";
import { getVerifiedIdentity } from "@/features/auth/service";
import { catalog } from "@/features/workers/queries";
import { discoveryConfig } from "./config";
import { coarsePoint, searchSchema, type Point, type SearchLocation } from "./schema";
import { makeCursor, readCursor, queryHash } from "./cursor";
import type { DiscoveryOptions, SearchResult, DiscoveryCard } from "./types";
export async function savedAddresses() {
  const actor = await getVerifiedIdentity();
  if (!actor?.profile?.client_enabled || actor.profile.is_suspended)
    return { canSave: false, saved: [] };
  const rows =
    await database()`select id,label,town from private.client_addresses where owner_id=${actor.id}::uuid order by created_at,id limit 10`;
  return {
    canSave: true,
    saved: rows.map((r) => ({ id: String(r.id), label: String(r.label), town: String(r.town) })),
  };
}
export async function discoveryOptions(): Promise<DiscoveryOptions> {
  const config = discoveryConfig();
  if (!config) throw new Error("UNAVAILABLE");
  const [options, towns, saved] = await Promise.all([
    catalog(),
    database()`select id,label,extensions.st_x(centroid::extensions.geometry) as longitude,extensions.st_y(centroid::extensions.geometry) as latitude from public.service_areas where active order by label`,
    savedAddresses(),
  ]);
  return {
    categories: options.categories,
    towns: towns.map((t) => ({
      id: String(t.id),
      label: String(t.label),
      point: { longitude: Number(t.longitude), latitude: Number(t.latitude) },
    })),
    ...saved,
    local: config.mode === "local",
    map: config.map,
    geocoding: config.geocoding,
  };
}
async function resolveLocation(
  location: SearchLocation | null,
): Promise<{ point: Point | null; townId: string | null }> {
  if (!location) return { point: null, townId: null };
  if (location.kind === "coordinates") return { point: coarsePoint(location.point), townId: null };
  if (location.kind === "town") {
    const rows =
      await database()`select extensions.st_x(centroid::extensions.geometry) as longitude,extensions.st_y(centroid::extensions.geometry) as latitude from public.service_areas where id=${location.id}::uuid and active`;
    if (!rows[0]) throw new Error("INVALID");
    return {
      point: { longitude: Number(rows[0].longitude), latitude: Number(rows[0].latitude) },
      townId: null,
    };
  }
  const actor = await getVerifiedIdentity();
  if (!actor) throw new Error("UNAUTHORIZED");
  if (!actor.profile?.client_enabled || actor.profile.is_suspended) throw new Error("FORBIDDEN");
  const rows =
    await database()`select round(extensions.st_x(point::extensions.geometry)::numeric,2)::float8 as longitude,round(extensions.st_y(point::extensions.geometry)::numeric,2)::float8 as latitude from private.client_addresses where id=${location.id}::uuid and owner_id=${actor.id}::uuid`;
  if (!rows[0]) throw new Error("FORBIDDEN");
  return {
    point: { longitude: Number(rows[0].longitude), latitude: Number(rows[0].latitude) },
    townId: null,
  };
}
export async function searchWorkers(input: unknown): Promise<SearchResult> {
  const config = discoveryConfig();
  if (!config) throw new Error("UNAVAILABLE");
  const data = searchSchema.parse(input),
    location = await resolveLocation(data.location);
  const hash = queryHash({ ...data, cursor: null, location }),
    offset = readCursor(config.rateSecret, hash, data.cursor);
  const rows =
    await database()`select * from private.search_worker_cards(${data.categoryId}::uuid,${location.townId}::uuid,${location.point?.longitude ?? null}::float8,${location.point?.latitude ?? null}::float8,${data.radiusKm},${data.available},${data.tradeReviewed},${data.sort},21,${offset})`;
  const workers: DiscoveryCard[] = rows.slice(0, 20).map((r) => ({
    slug: String(r.slug),
    name: String(r.name),
    bio: String(r.bio ?? ""),
    town: String(r.town),
    point: { longitude: Number(r.longitude), latitude: Number(r.latitude) },
    available: Boolean(r.available),
    identityReviewed: Boolean(r.identity_reviewed),
    businessReviewed: Boolean(r.business_reviewed),
    avatarId: r.avatar_id ? String(r.avatar_id) : null,
    categories: r.categories ?? [],
    distanceBand: r.distance_band ? String(r.distance_band) : null,
  }));
  return {
    workers,
    center: location.point,
    nextCursor:
      rows.length > 20 && offset < 1000 ? makeCursor(config.rateSecret, hash, offset + 20) : null,
  };
}
