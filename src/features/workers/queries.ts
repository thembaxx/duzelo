import type { Catalog, Asset, Verification, OwnerApplication, PublicWorker } from "./types";
import "server-only";
import { z } from "zod";
import { database } from "@/lib/db/server";
import { workerActor } from "./command-boundary";
import { workerConfig } from "./config";
import type { WorkerDraft } from "./schema";

export async function catalog(): Promise<Catalog> {
  const sql = database();
  const [categories, areas] = await Promise.all([
    sql`select id,label_en as label,requires_trade_review as "requiresTrade" from public.service_categories where active order by sort_order,label_en`,
    sql`select id,label from public.service_areas where active order by label`,
  ]);
  return {
    categories: categories as unknown as Catalog["categories"],
    areas: areas as unknown as Catalog["areas"],
  };
}
export async function ownerApplication(): Promise<OwnerApplication> {
  const actor = await workerActor();
  const sql = database();
  const rows =
    await sql`select w.id,w.status,a.revision,a.state,a.draft_json from public.worker_profiles w left join private.worker_applications a on a.worker_id=w.id where w.user_id=${actor.id}::uuid`;
  const w = rows[0];
  if (!w) throw new Error("FORBIDDEN");
  const [options, assets, verifications] = await Promise.all([
    catalog(),
    sql`select id,kind,category_id as "categoryId",caption from private.worker_assets where worker_id=${w.id}::uuid and application_revision=${w.revision ?? 0} and state='stored' and retain_until>now() order by created_at`,
    sql`select id,kind,category_id as "categoryId",status,worker_reason as reason,expiry_date::text as expiry from private.worker_verifications where worker_id=${w.id}::uuid and application_revision=${w.revision ?? 0} order by created_at`,
  ]);
  const config = workerConfig()!;
  return {
    ...options,
    workerId: String(w.id),
    status: String(w.status),
    revision: w.revision ?? null,
    state: w.state ?? null,
    draft: (w.draft_json ?? null) as WorkerDraft | null,
    assets: assets as unknown as Asset[],
    verifications: verifications as unknown as Verification[],
    retentionDays: config.retentionDays,
    local: config.mode === "local",
  };
}
export async function reviewQueue() {
  const actor = await workerActor(true);
  return database()`select w.id,w.display_name,a.revision,a.state,a.submitted_at from private.worker_applications a join public.worker_profiles w on w.id=a.worker_id join public.user_profiles u on u.user_id=w.user_id where a.state in ('pending_review','needs_changes','reviewed') and not u.is_suspended and w.status<>'suspended' and w.user_id<>${actor.id}::uuid order by a.submitted_at nulls last limit 100`;
}
export async function reviewApplication(workerId: string) {
  z.guid().parse(workerId);
  const actor = await workerActor(true);
  const sql = database();
  const rows =
    await sql`select w.id,w.user_id,w.display_name,w.bio,w.business_id,w.status,a.revision,a.state,a.draft_json from public.worker_profiles w join private.worker_applications a on a.worker_id=w.id join public.user_profiles u on u.user_id=w.user_id where w.id=${workerId}::uuid and not u.is_suspended and w.status<>'suspended' and w.user_id<>${actor.id}::uuid`;
  const w = rows[0];
  if (!w) throw new Error("FORBIDDEN");
  const [options, assets, verifications] = await Promise.all([
    catalog(),
    sql`select id,kind,category_id as "categoryId",caption from private.worker_assets where worker_id=${workerId}::uuid and application_revision=${w.revision} and state='stored' and retain_until>now() order by created_at`,
    sql`select id,kind,category_id as "categoryId",status,worker_reason as reason,expiry_date::text as expiry from private.worker_verifications where worker_id=${workerId}::uuid and application_revision=${w.revision} order by created_at`,
  ]);
  const draft = w.draft_json as WorkerDraft;
  // Deliberate review DTO. Exact base, registration number and object keys stay
  // out of the page/RSC payload; document access is a separate audited command.
  return {
    ...options,
    workerId: String(w.id),
    name: String(w.display_name),
    bio: String(w.bio),
    status: String(w.status),
    revision: Number(w.revision),
    state: String(w.state),
    kind: draft.kind,
    areaId: draft.areaId,
    services: draft.services,
    assets: assets as unknown as Asset[],
    verifications: verifications as unknown as Verification[],
  };
}

export async function publicWorkers(slug?: string): Promise<PublicWorker[]> {
  if (!workerConfig()) return [];
  if (slug && !/^provider-[a-f0-9-]{36}$/.test(slug)) return [];
  const sql = database();
  const rows =
    await sql`select c.worker_id,c.slug,c.public_name,c.short_bio,c.town_label,c.verified_identity,c.verified_trade_category_ids,w.business_id,a.revision,private.eligible_worker_categories(c.worker_id) as eligible from public.worker_cards c join public.worker_profiles w on w.id=c.worker_id join private.worker_applications a on a.worker_id=w.id and a.state='reviewed' where c.safe_until>now() and (${slug ?? null}::text is null or c.slug=${slug ?? null}) and cardinality(private.eligible_worker_categories(c.worker_id))>0 order by c.public_name limit 60`;
  const result: PublicWorker[] = [];
  for (const row of rows) {
    const ids = row.eligible as string[];
    const [categories, services, media] = await Promise.all([
      sql`select id,label_en as label,requires_trade_review from public.service_categories where active and id=any(${sql.array(ids)}::uuid[]) order by label_en`,
      sql`select id,title,description,price_model,price_cents,category_id from public.worker_services where worker_id=${row.worker_id}::uuid and active and category_id=any(${sql.array(ids)}::uuid[]) order by title`,
      sql`select id,kind,caption from private.worker_assets where worker_id=${row.worker_id}::uuid and application_revision=${row.revision} and kind in ('avatar','portfolio') and state='stored' and public_approved and retain_until>now() order by created_at`,
    ]);
    result.push({
      slug: String(row.slug),
      name: String(row.public_name),
      bio: String(row.short_bio ?? ""),
      town: String(row.town_label),
      identityReviewed: Boolean(row.verified_identity),
      businessReviewed: Boolean(row.business_id),
      categories: categories.map((c) => ({
        id: String(c.id),
        label: String(c.label),
        tradeReviewed:
          Boolean(c.requires_trade_review) &&
          (row.verified_trade_category_ids as string[]).includes(String(c.id)),
      })),
      services: services.map((s) => ({
        id: String(s.id),
        title: String(s.title),
        description: String(s.description),
        pricing: String(s.price_model),
        priceCents: s.price_cents === null ? null : Number(s.price_cents),
        categoryId: String(s.category_id),
      })),
      media: media.map((m) => ({
        id: String(m.id),
        caption: String(m.caption),
        kind: String(m.kind),
      })),
    });
  }
  return result;
}
export async function publicAsset(id: string) {
  if (!workerConfig() || !z.guid().safeParse(id).success) return null;
  const rows =
    await database()`select a.storage_path from private.worker_assets a join private.worker_applications p on p.worker_id=a.worker_id and p.revision=a.application_revision and p.state='reviewed' join public.worker_cards c on c.worker_id=a.worker_id where a.id=${id}::uuid and a.state='stored' and a.public_approved and a.kind in ('avatar','portfolio') and a.retain_until>now() and c.safe_until>now() and cardinality(private.eligible_worker_categories(c.worker_id))>0`;
  return rows[0] ? String(rows[0].storage_path) : null;
}
