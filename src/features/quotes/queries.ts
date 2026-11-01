import "server-only";
import type { TransactionSql, Row } from "postgres";
import { database } from "@/lib/db/server";
import { lockActor } from "@/features/jobs/boundary";
import { quoteActor, lockJob } from "./policy";
import { storedTerms, responseRight } from "./records";
import type { QuoteView, QuotesView } from "./types";
const iso = (v: unknown) => new Date(String(v)).toISOString();
export async function quoteProjection(
  sql: TransactionSql,
  q: Row,
  worker: boolean,
  canQuote = false,
  canChoose = false,
): Promise<QuoteView> {
  const terms = await storedTerms(sql, q);
  const [provider] =
    await sql`select coalesce(c.public_name,'Previously invited provider') as name from public.worker_profiles w left join public.worker_cards c on c.worker_id=w.id and c.safe_until>now() where w.id=${q.worker_id}::uuid`;
  const expired = q.status === "submitted" && Date.parse(terms.validUntil) <= Date.now();
  return {
    id: String(q.id),
    version: Number(q.version),
    workerName: String(provider?.name ?? "Selected provider"),
    status: expired ? "expired" : String(q.status),
    terms,
    subtotalCents: q.subtotal_cents === null ? null : Number(q.subtotal_cents),
    taxCents: Number(q.tax_cents),
    totalCents: q.total_cents === null ? null : Number(q.total_cents),
    published: !!q.published_at,
    canPublish: worker && canQuote && q.status === "draft",
    canWithdraw: worker && ["draft", "submitted"].includes(q.status),
    canChoose:
      canChoose && !expired && q.status === "submitted" && Date.parse(terms.startsAt) > Date.now(),
  };
}
export async function quotesForJob(jobId: string, worker = false, page = 0): Promise<QuotesView> {
  const actor = await quoteActor(worker);
  return database().begin(async (sql) => {
    await lockActor(sql, actor, worker);
    const job = await lockJob(sql, jobId, actor, worker);
    const [booking] =
      await sql`select id,status,worker_id from public.bookings where job_id=${jobId}::uuid`;
    let canQuote = false;
    let eligibilityMessage = "Read the supplied terms carefully. An invitation is not a booking.";
    if (worker) {
      const [check] =
        await sql`select private.agreement_worker_eligible(${jobId}::uuid,${job.match!.worker_id}::uuid,true) as allowed`;
      if (check?.allowed && !booking) {
        try {
          await responseRight(sql, job);
          canQuote = true;
        } catch (error) {
          if (!(error instanceof Error) || !["EXPIRED", "CONFLICT"].includes(error.message))
            throw error;
        }
      }
      eligibilityMessage = canQuote
        ? "Current approval, category and coverage checks pass. The schedule is checked again when sending and confirming."
        : "New quotes are unavailable: check approval, category, coverage, invitation expiry, blocks or the existing appointment.";
    }
    const rows =
      await sql`select q.*,private.agreement_worker_eligible(q.job_id,q.worker_id,true) as eligible from public.quotes q where q.job_id=${jobId}::uuid and q.scheduled_start is not null and (${worker} and q.worker_id=${job.match?.worker_id ?? null}::uuid or not ${worker} and q.published_at is not null) order by q.created_at desc,q.version desc limit 300`;
    const active = rows.filter(
      (q) => q.status === "submitted" && Date.parse(iso(q.valid_until)) > Date.now(),
    );
    const historical = rows.filter((q) => !active.includes(q));
    const shown = worker ? historical : historical.slice(page * 20, page * 20 + 20);
    const latest = worker ? (rows[0] ?? null) : null;
    if (worker && !canQuote && !rows.length && !booking) throw new Error("FORBIDDEN");
    const [offers, history, latestView] = await Promise.all([
      Promise.all(
        active.map((q) =>
          quoteProjection(
            sql,
            q,
            worker,
            canQuote && q.id === latest?.id,
            !worker &&
              !booking &&
              !!q.eligible &&
              ["open", "matching", "quoted"].includes(job.status),
          ),
        ),
      ),
      Promise.all(
        shown.map((q) => quoteProjection(sql, q, worker, canQuote && q.id === latest?.id, false)),
      ),
      latest ? quoteProjection(sql, latest, true, canQuote) : null,
    ]);
    const grants =
      await sql`select g.* from private.inspection_access_grants g where g.job_id=${jobId}::uuid and g.quote_id is not null and (not ${worker} or g.worker_id=${job.match?.worker_id ?? null}::uuid) order by g.approved_at desc limit 30`;
    for (const offer of offers)
      if (
        offer.terms.pricingType === "inspection_required" &&
        grants.some((g) => g.quote_id === offer.id)
      )
        offer.canChoose = false;
    const media =
      worker && canQuote
        ? await sql`select id from private.job_assets where job_id=${jobId}::uuid and state='stored' and retain_until>now() order by created_at limit 8`
        : [];
    return {
      jobId,
      jobVersion: job.version,
      title: job.title,
      description:
        worker && !canQuote && !booking
          ? "Original request details are no longer shared. Your quotation history is retained."
          : job.description,
      town: job.public_town,
      jobStatus: job.status,
      worker,
      canQuote,
      eligibilityMessage,
      latest: latestView,
      offers,
      history,
      historyPage: page,
      hasMore: !worker && historical.length > (page + 1) * 20,
      bookingId: booking ? String(booking.id) : null,
      media: media.map((m) => String(m.id)),
      grants: grants.map((g) => ({
        id: String(g.id),
        quoteId: String(g.quote_id),
        visitStart: iso(g.visit_starts_at),
        visitEnd: iso(g.visit_ends_at),
        accessFrom: iso(g.access_from),
        expires: iso(g.expires_at),
        revoked: !!g.revoked_at,
        active: !g.revoked_at && Date.parse(iso(g.expires_at)) > Date.now(),
        feeCents: Number(g.fee_cents),
      })),
    };
  }) as Promise<QuotesView>;
}
export async function workerQuoteJobs() {
  const actor = await quoteActor(true);
  return database().begin(async (sql) => {
    await lockActor(sql, actor, true);
    const rows =
      await sql`select j.id,j.title,j.public_town,j.status from public.job_matches m join public.worker_profiles w on w.id=m.worker_id join public.job_requests j on j.id=m.job_id where w.user_id=${actor.id}::uuid and (exists(select 1 from public.quotes q where q.job_id=j.id and q.worker_id=w.id and q.scheduled_start is not null) or (m.status in ('invited','viewed') and m.expires_at>now() and j.status in ('open','matching','quoted') and private.agreement_worker_eligible(j.id,w.id,true))) order by j.updated_at desc limit 100`;
    return rows.map((j) => ({
      id: String(j.id),
      title: String(j.title),
      town: String(j.public_town),
      status: String(j.status),
    }));
  });
}
