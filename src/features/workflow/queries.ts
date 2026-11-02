import "server-only";
import { readCursor, writeCursor } from "@/features/collaboration/cursor";
import type { WorkflowView } from "./types";
import type { TransactionSql } from "postgres";
import type { Identity } from "@/features/auth/service";
import { database } from "@/lib/db/server";
import { lockActor } from "@/features/jobs/boundary";
import { collaborationActor } from "@/features/collaboration/boundary";
import { workContext, type WorkContext } from "./policy";
import { agreementTotal } from "./schema";
const iso = (v: string | Date) => new Date(v).toISOString();
export async function workProjection(
  sql: TransactionSql,
  b: WorkContext,
  actor: Identity,
  staff = false,
  entryCursor?: string,
) {
  const [access] =
    await sql`select private.agreement_worker_eligible(${b.jobId}::uuid,${b.workerId}::uuid,false) and exists(select 1 from public.worker_cards where worker_id=${b.workerId}::uuid and safe_until>clock_timestamp()) as eligible`;
  const readable = staff || b.client || (!!access?.eligible && !b.blocked);
  const reschedules =
    await sql`select id,proposed_by as author,status,base_version,starts_at,ends_at,expires_at from private.booking_reschedules where booking_id=${b.id}::uuid order by created_at desc limit 50`;
  const scopes =
    await sql`select id,requested_by as author,status,base_version,scope_change,delta_cents,expires_at from public.change_orders where booking_id=${b.id}::uuid order by created_at desc limit 50`;
  const deltas =
    await sql`select delta_cents from public.change_orders where booking_id=${b.id}::uuid and status='accepted'`;
  const live = ["confirmed", "in_progress"].includes(b.status) && !b.disputed;
  const proposals = [
    ...reschedules.map((p) => ({ ...p, kind: "reschedule" }) as Record<string, unknown>),
    ...scopes.map((p) => ({ ...p, kind: "scope" }) as Record<string, unknown>),
  ]
    .filter((p) => readable || p.author === actor.id)
    .map((p) => ({
      id: String(p.id),
      kind: String(p.kind),
      status:
        p.status === "proposed" && Date.parse(String(p.expires_at)) <= Date.now()
          ? "expired"
          : String(p.status),
      own: p.author === actor.id,
      description:
        p.kind === "scope"
          ? String(p.scope_change)
          : iso(String(p.starts_at)) + " – " + iso(String(p.ends_at)),
      deltaCents: p.kind === "scope" ? Number(p.delta_cents) : 0,
      expiresAt: iso(String(p.expires_at)),
      canAccept:
        live &&
        !!access?.eligible &&
        !b.blocked &&
        p.base_version === b.version &&
        p.author !== actor.id,
    }));
  const entryPosition = readCursor(entryCursor);
  const entries =
    await sql`select id,actor_id,kind,body,created_at,created_at::text as cursor_at from private.work_entries where booking_id=${b.id}::uuid and (${staff} or actor_id=${actor.id}::uuid or (${readable} and public_to_parties)) and (${entryPosition?.at ?? null}::timestamptz is null or (created_at,id)<(${entryPosition?.at ?? null}::timestamptz,${entryPosition?.id ?? null}::uuid)) order by created_at desc,id desc limit 201`;
  const completions = readable
    ? await sql`select id,round,summary,status,review_due_at,support_due_at from private.completion_submissions where booking_id=${b.id}::uuid order by round`
    : [];
  const attachments = async (kind: "completion" | "entry", id: string) => {
    const assets =
      kind === "completion"
        ? await sql`select a.id,a.state='stored' and a.retain_until>clock_timestamp() as available from private.collaboration_assets a join private.completion_assets x on x.asset_id=a.id where x.completion_id=${id}::uuid`
        : await sql`select a.id,a.state='stored' and a.retain_until>clock_timestamp() as available from private.collaboration_assets a join private.entry_assets x on x.asset_id=a.id where x.entry_id=${id}::uuid`;
    return assets.map((a) => ({ id: String(a.id), available: !!a.available }));
  };
  const [dispute] =
    await sql`select id,status,version,opened_by,reason from public.disputes where booking_id=${b.id}::uuid order by created_at desc limit 1`;
  return {
    id: b.id,
    version: b.version,
    status: b.status,
    client: b.client,
    readable,
    baseCents: b.baseCents,
    totalCents: agreementTotal(
      b.baseCents,
      deltas.map((d) => Number(d.delta_cents)),
    ),
    start: b.start,
    end: b.end,
    canChange: live && !!access?.eligible && !b.blocked,
    canStart:
      !b.client &&
      b.status === "confirmed" &&
      Date.parse(b.start) <= Date.now() &&
      !!access?.eligible &&
      !b.blocked,
    canComplete: !b.client && b.status === "in_progress" && !!access?.eligible && !b.blocked,
    canConfirm: b.client && b.status === "completion_pending" && !b.disputed,
    canDispute:
      !b.disputed &&
      ["confirmed", "in_progress", "completion_pending", "completed"].includes(b.status),
    proposals,
    completions: await Promise.all(
      completions.map(async (c) => ({
        id: String(c.id),
        round: Number(c.round),
        summary: String(c.summary),
        status: String(c.status),
        reviewDue: iso(c.review_due_at),
        supportDue: c.support_due_at ? iso(c.support_due_at) : null,
        assets: await attachments("completion", String(c.id)),
      })),
    ),
    nextEntries:
      entries.length > 200
        ? writeCursor(String(entries[199]!.cursor_at), String(entries[199]!.id))
        : null,
    entries: await Promise.all(
      entries
        .slice(0, 200)
        .reverse()
        .map(async (e) => ({
          id: String(e.id),
          kind: String(e.kind),
          body: String(e.body),
          at: iso(e.created_at),
          own: e.actor_id === actor.id,
          assets: await attachments("entry", String(e.id)),
        })),
    ),
    dispute: dispute
      ? {
          id: String(dispute.id),
          status: String(dispute.status),
          version: Number(dispute.version),
          reason: staff || dispute.opened_by === actor.id ? String(dispute.reason) : null,
        }
      : null,
  };
}
export async function workflowView(id: string, entryCursor?: string): Promise<WorkflowView> {
  const actor = await collaborationActor();
  return database().begin(async (sql) => {
    await lockActor(sql, actor, "either");
    return workProjection(sql, await workContext(sql, id, actor), actor, false, entryCursor);
  });
}
