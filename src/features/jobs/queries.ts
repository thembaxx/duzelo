import "server-only";
import { z } from "zod";
import { database } from "@/lib/db/server";
import { catalog } from "@/features/workers/queries";
import { jobActor, lockActor } from "./boundary";
import { jobsConfig } from "./config";
import { discoveryConfig } from "@/features/discovery/config";
import { storedDraft } from "./stored-draft";
import type { JobOptions, OwnerJob, Opportunity } from "./types";
const iso = (value: unknown) => (value ? new Date(String(value)).toISOString() : null);
export async function jobOptions(): Promise<JobOptions> {
  const actor = await jobActor();
  const [options, saved] = await Promise.all([
    catalog(),
    database()`select id,label,town from private.client_addresses where owner_id=${actor.id}::uuid order by created_at,id limit 10`,
  ]);
  return {
    ...options,
    saved: saved.map((r) => ({ id: String(r.id), label: String(r.label), town: String(r.town) })),
    local: jobsConfig()!.mode === "local",
    map: discoveryConfig()?.map ?? null,
  };
}
export async function ownerJobs() {
  const actor = await jobActor();
  return database()`select j.id,j.title,j.status,j.version,j.created_at from public.job_requests j join private.job_dispatch d on d.job_id=j.id where j.client_id=${actor.id}::uuid order by j.updated_at desc limit 100`;
}
export async function getOwnerJob(id: string): Promise<OwnerJob> {
  z.guid().parse(id);
  const actor = await jobActor();
  return database().begin(async (sql) => {
    await lockActor(sql, actor);
    const [job] =
      await sql`select j.*,d.waves,d.next_wave_at,d.expires_at,d.approximate,c.public_name as direct_worker from public.job_requests j join private.job_dispatch d on d.job_id=j.id left join public.worker_cards c on c.worker_id=j.requested_worker_id where j.id=${id}::uuid and j.client_id=${actor.id}::uuid`;
    if (!job) throw new Error("FORBIDDEN");
    const assets =
      await sql`select id,state,retain_until>now() as retained from private.job_assets where job_id=${id}::uuid and owner_id=${actor.id}::uuid and state in ('pending','stored','purge_pending') order by created_at`;
    const matches =
      await sql`select m.worker_id,coalesce(c.public_name,'Previously invited provider') as name,m.status,m.expires_at,exists(select 1 from private.user_blocks b where b.owner_id=${actor.id}::uuid and b.subject_id=w.user_id) as blocked from public.job_matches m join public.worker_profiles w on w.id=m.worker_id left join public.worker_cards c on c.worker_id=w.id and c.safe_until>now() where m.job_id=${id}::uuid order by m.dispatched_at,m.id`;
    return {
      id,
      version: Number(job.version),
      step: Number(job.draft_step),
      status:
        ["open", "matching"].includes(String(job.status)) &&
        job.expires_at &&
        Date.parse(String(job.expires_at)) <= Date.now()
          ? "expired"
          : String(job.status),
      town: String(job.public_town),
      data: await storedDraft(sql, job),
      directWorker: job.requested_worker_id
        ? String(job.direct_worker ?? "Selected provider")
        : null,
      assets: assets.map((a) => ({
        id: String(a.id),
        state: a.state === "stored" && !a.retained ? "expired" : String(a.state),
      })),
      waves: Number(job.waves),
      invited: matches.length,
      nextWave: iso(job.next_wave_at),
      expires: iso(job.expires_at),
      approximate: Boolean(job.approximate),
      matches: matches.map((m) => ({
        workerId: String(m.worker_id),
        name: String(m.name),
        status:
          ["invited", "viewed"].includes(String(m.status)) &&
          Date.parse(String(m.expires_at)) <= Date.now()
            ? "expired"
            : String(m.status),
        expires: iso(m.expires_at)!,
        blocked: Boolean(m.blocked),
      })),
    };
  }) as Promise<OwnerJob>;
}
export async function opportunities(matchId?: string): Promise<Opportunity[]> {
  if (matchId) z.guid().parse(matchId);
  const actor = await jobActor(true);
  return database().begin(async (sql) => {
    await lockActor(sql, actor, true);
    const rows =
      await sql`select m.id as match_id,m.job_id,m.status,m.expires_at,m.rationale,j.title,j.description,j.public_town,j.urgency,j.time_slots,j.contact_window,j.budget_min_cents,j.budget_max_cents,category.label_en as category,d.approximate from public.job_matches m join public.worker_profiles w on w.id=m.worker_id join public.job_requests j on j.id=m.job_id join private.job_dispatch d on d.job_id=j.id join public.service_categories category on category.id=j.category_id join lateral private.job_candidates(j.id,w.id,true) eligible on eligible.worker_id=w.id where w.user_id=${actor.id}::uuid and m.status in ('invited','viewed') and m.expires_at>now() and (${matchId ?? null}::uuid is null or m.id=${matchId ?? null}::uuid) order by m.expires_at,m.id limit 50`;
    const result: Opportunity[] = [];
    for (const r of rows) {
      const media =
        await sql`select id from private.job_assets where job_id=${r.job_id}::uuid and state='stored' and retain_until>now() order by created_at limit 8`;
      result.push({
        matchId: String(r.match_id),
        jobId: String(r.job_id),
        title: String(r.title),
        description: String(r.description),
        category: String(r.category),
        town: String(r.public_town),
        urgency: String(r.urgency),
        slots: r.time_slots,
        contactWindow: String(r.contact_window),
        budgetMin: r.budget_min_cents === null ? null : Number(r.budget_min_cents),
        budgetMax: r.budget_max_cents === null ? null : Number(r.budget_max_cents),
        status: String(r.status),
        expires: iso(r.expires_at)!,
        rationale: String(r.rationale),
        approximate: Boolean(r.approximate),
        media: media.map((a) => String(a.id)),
      });
    }
    return result;
  }) as Promise<Opportunity[]>;
}
export async function matchSettings() {
  const actor = await jobActor(true),
    sql = database();
  const [worker] = await sql`select id from public.worker_profiles where user_id=${actor.id}::uuid`;
  if (!worker) throw new Error("FORBIDDEN");
  const [settings] =
    await sql`select urgent_ready,daily_limit from private.worker_match_settings where worker_id=${worker.id}::uuid`;
  const blocks =
    await sql`select id,starts_at,ends_at from private.worker_schedule_blocks where worker_id=${worker.id}::uuid and ends_at>now() order by starts_at limit 20`;
  const blockedClients =
    await sql`select distinct on (j.client_id) m.id,j.id as job_id from private.user_blocks b join public.job_requests j on j.client_id=b.subject_id join public.job_matches m on m.job_id=j.id and m.worker_id=${worker.id}::uuid where b.owner_id=${actor.id}::uuid order by j.client_id,m.dispatched_at desc nulls last,m.id limit 100`;
  return {
    urgentReady: Boolean(settings?.urgent_ready),
    dailyLimit: Number(settings?.daily_limit ?? 6),
    blockedClients: blockedClients.map((b) => ({
      matchId: String(b.id),
      reference: String(b.job_id).slice(0, 8),
    })),
    blocks: blocks.map((b) => ({
      id: String(b.id),
      start: iso(b.starts_at)!,
      end: iso(b.ends_at)!,
    })),
  };
}
export async function jobNotifications() {
  const actor = await jobActor(true);
  return database()`select id,title,body,href,created_at from public.notifications where user_id=${actor.id}::uuid and kind='job-invitation' order by created_at desc limit 30`;
}
