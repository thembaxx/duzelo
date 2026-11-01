import "server-only";
import type { TransactionSql } from "postgres";
import type { JobLocation } from "./schema";
export async function saveJobLocation(
  sql: TransactionSql,
  jobId: string,
  ownerId: string,
  location: JobLocation | null,
) {
  if (!location) {
    await sql`delete from private.job_locations where job_id=${jobId}::uuid`;
    await sql`update private.job_dispatch set area_id=null where job_id=${jobId}::uuid`;
    return "";
  }
  let point: { longitude: number; latitude: number } | null = null,
    addressId: string | null = null;
  let snapshot: Record<string, string | boolean> = {},
    notes = "",
    areaId: string | null = null;
  if (location.kind === "saved") {
    const [address] =
      await sql`select id,street_address,town,province,access_instructions,extensions.st_x(point::extensions.geometry) as longitude,extensions.st_y(point::extensions.geometry) as latitude from private.client_addresses where id=${location.id}::uuid and owner_id=${ownerId}::uuid`;
    if (!address) throw new Error("FORBIDDEN");
    const [area] =
      await sql`select id from public.service_areas where active and label=${address.town} limit 1`;
    if (!area) throw new Error("UNKNOWN_TOWN");
    areaId = String(area.id);
    addressId = String(address.id);
    point = { longitude: Number(address.longitude), latitude: Number(address.latitude) };
    snapshot = {
      street: String(address.street_address),
      province: String(address.province),
      consent: true,
      townOnly: false,
    };
    notes = String(address.access_instructions ?? "");
  } else {
    if (!location.consent && (location.point || location.street || location.notes))
      throw new Error("CONSENT");
    areaId = location.areaId;
    point = location.point;
    snapshot = {
      street: location.street,
      province: location.province,
      consent: location.consent,
      townOnly: location.townOnly,
    };
    notes = location.notes;
  }
  const [area] = areaId
    ? await sql`select id,label from public.service_areas where id=${areaId}::uuid and active`
    : [];
  if (areaId && !area) throw new Error("UNKNOWN_TOWN");
  await sql`insert into private.job_locations(job_id,address_id,exact_point,service_address_snapshot,access_notes) values (${jobId}::uuid,${addressId}::uuid,case when ${point !== null} then extensions.st_setsrid(extensions.st_makepoint(${point?.longitude ?? 0},${point?.latitude ?? 0}),4326)::extensions.geography else null end,${sql.json(snapshot)},${notes}) on conflict(job_id) do update set address_id=excluded.address_id,exact_point=excluded.exact_point,service_address_snapshot=excluded.service_address_snapshot,access_notes=excluded.access_notes`;
  await sql`update private.job_dispatch set area_id=${areaId}::uuid,approximate=${point === null} where job_id=${jobId}::uuid`;
  return String(area?.label ?? "");
}
