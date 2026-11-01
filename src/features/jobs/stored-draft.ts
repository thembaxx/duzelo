import "server-only";
import type { TransactionSql } from "postgres";
import { draftSchema, type DraftData } from "./schema";
export async function storedDraft(
  sql: TransactionSql,
  job: Record<string, unknown>,
): Promise<DraftData> {
  const [location] =
    await sql`select l.service_address_snapshot,l.access_notes,d.area_id,extensions.st_x(l.exact_point::extensions.geometry) as longitude,extensions.st_y(l.exact_point::extensions.geometry) as latitude from private.job_locations l join private.job_dispatch d on d.job_id=l.job_id where l.job_id=${String(job.id)}::uuid`;
  const snapshot = location?.service_address_snapshot ?? {};
  return draftSchema.parse({
    categoryId: job.category_id ?? null,
    title: job.title,
    description: job.description,
    urgency: job.urgency,
    slots: job.time_slots ?? [],
    contactWindow: job.contact_window ?? "",
    budgetMin: job.budget_min_cents === null ? null : Number(job.budget_min_cents),
    budgetMax: job.budget_max_cents === null ? null : Number(job.budget_max_cents),
    location: location
      ? {
          kind: "manual",
          areaId: location.area_id ?? null,
          street: String(snapshot.street ?? ""),
          province: String(snapshot.province ?? ""),
          notes: String(location.access_notes ?? ""),
          point:
            location.longitude === null
              ? null
              : { longitude: Number(location.longitude), latitude: Number(location.latitude) },
          townOnly: snapshot.townOnly === true,
          consent: snapshot.consent === true,
        }
      : null,
  });
}
