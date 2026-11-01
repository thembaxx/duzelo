import "server-only";
import {
  draftSchema,
  quoteSchema,
  acceptSchema,
  inspectionSchema,
  revokeSchema,
  closeRequestSchema,
  priceQuote,
  validateTiming,
} from "./schema";
import { quoteCommand, lockJob, eligible, freeTime, notify } from "./policy";
import { quoteRecord, storedTerms, responseRight, checkedPrice } from "./records";
export async function quotesCommand(action: string, input: unknown, key: string | null) {
  if (action === "save") {
    const data = draftSchema.parse(input);
    return quoteCommand(action, data, key, true, async (sql, actor) => {
      const job = await lockJob(sql, data.jobId, actor, true);
      await responseRight(sql, job);
      await eligible(sql, data.jobId, job.match!.worker_id);
      const [latest] =
        await sql`select id,version,status from public.quotes where job_id=${data.jobId}::uuid and worker_id=${job.match!.worker_id}::uuid order by version desc limit 1`;
      if (
        (latest ? String(latest.id) : null) !== data.previousQuoteId ||
        Number(latest?.version ?? 0) !== data.expectedVersion ||
        latest?.status === "accepted"
      )
        throw new Error("CONFLICT");
      if (data.expectedVersion >= 20) throw new Error("VERSION_LIMIT");
      validateTiming(data.terms);
      const price = priceQuote(data.terms),
        t = data.terms;
      const [q] =
        await sql`insert into public.quotes(job_id,worker_id,version,pricing_type,subtotal_cents,travel_fee_cents,total_cents,scope,exclusions,valid_until,tax_mode,tax_cents,inspection_fee_cents,scheduled_start,scheduled_end) values (${data.jobId}::uuid,${job.match!.worker_id}::uuid,${data.expectedVersion + 1},${t.pricingType},${price.subtotalCents},${t.travelFeeCents},${price.totalCents},${t.scope},${t.exclusions},${t.validUntil}::timestamptz,${t.taxMode},${price.taxCents},${t.inspectionFeeCents},${t.startsAt}::timestamptz,${t.endsAt}::timestamptz) returning id,version`;
      for (const [i, line] of t.items.entries())
        await sql`insert into public.quote_items(quote_id,kind,description,quantity,unit_price_cents,sort_order) values (${q!.id}::uuid,${line.kind},${line.description},${line.quantityHundredths / 100},${line.unitPriceCents},${i})`;
      return {
        jobId: data.jobId,
        quoteId: String(q!.id),
        version: Number(q!.version),
        message: "A new private draft version was saved. It has not been sent.",
      };
    });
  }
  if (action === "publish" || action === "withdraw") {
    const data = quoteSchema.parse(input);
    return quoteCommand(action, data, key, true, async (sql, actor) => {
      const [ref] = await sql`select job_id from public.quotes where id=${data.quoteId}::uuid`;
      if (!ref) throw new Error("FORBIDDEN");
      const job = await lockJob(sql, String(ref.job_id), actor, true),
        q = await quoteRecord(sql, data.quoteId);
      if (q.worker_id !== job.match!.worker_id) throw new Error("FORBIDDEN");
      if (q.version !== data.expectedVersion || !["draft", "submitted"].includes(q.status))
        throw new Error("CONFLICT");
      if (action === "withdraw") {
        await sql`update public.quotes set status='withdrawn',updated_at=now() where id=${q.id}::uuid`;
        await sql`update private.inspection_access_grants set revoked_at=now() where quote_id=${q.id}::uuid and revoked_at is null`;
        await notify(
          sql,
          String(job.client_id),
          "quote-withdrawn",
          String(q.id),
          "/app/client/jobs/" + job.id + "/quotes",
        );
        return {
          jobId: String(job.id),
          quoteId: String(q.id),
          message: "Quote withdrawn. Previous terms remain in the history.",
        };
      }
      await responseRight(sql, job);
      await eligible(sql, String(job.id), String(q.worker_id));
      const [latest] =
        await sql`select id from public.quotes where job_id=${job.id}::uuid and worker_id=${q.worker_id}::uuid order by version desc limit 1`;
      if (q.status !== "draft" || latest?.id !== q.id) throw new Error("CONFLICT");
      const terms = await storedTerms(sql, q);
      validateTiming(terms);
      priceQuote(terms);
      await sql`update private.inspection_access_grants set revoked_at=now() where job_id=${job.id}::uuid and worker_id=${q.worker_id}::uuid and revoked_at is null`;
      await freeTime(sql, String(q.worker_id), terms.startsAt, terms.endsAt, null, null);
      await sql`update public.quotes set status='superseded',updated_at=now() where job_id=${job.id}::uuid and worker_id=${q.worker_id}::uuid and status in ('draft','submitted') and id<>${q.id}::uuid`;
      await sql`update private.inspection_access_grants set revoked_at=now() where job_id=${job.id}::uuid and worker_id=${q.worker_id}::uuid and revoked_at is null`;
      await sql`update public.quotes set status='submitted',published_at=now(),updated_at=now() where id=${q.id}::uuid`;
      await sql`update public.job_matches set status='responded' where job_id=${job.id}::uuid and worker_id=${q.worker_id}::uuid`;
      await sql`update public.job_requests set status='quoted',version=version+1,updated_at=now() where id=${job.id}::uuid`;
      await sql`update private.job_dispatch set next_wave_at=null where job_id=${job.id}::uuid`;
      await notify(
        sql,
        String(job.client_id),
        "quote-submitted",
        String(q.id),
        "/app/client/jobs/" + job.id + "/quotes",
      );
      return {
        jobId: String(job.id),
        quoteId: String(q.id),
        message: "Quote sent. No booking or exact-address access was created.",
      };
    });
  }
  if (action === "accept" || action === "authorize-inspection") {
    const data = action === "accept" ? acceptSchema.parse(input) : inspectionSchema.parse(input);
    return quoteCommand(action, data, key, false, async (sql, actor) => {
      const [ref] = await sql`select job_id from public.quotes where id=${data.quoteId}::uuid`;
      if (!ref) throw new Error("FORBIDDEN");
      const job = await lockJob(sql, String(ref.job_id), actor),
        q = await quoteRecord(sql, data.quoteId);
      if (
        job.version !== data.expectedJobVersion ||
        q.version !== data.expectedVersion ||
        q.status !== "submitted" ||
        !q.published_at ||
        !["open", "matching", "quoted"].includes(job.status)
      )
        throw new Error("CONFLICT");
      if (Date.parse(q.valid_until) <= Date.now() || Date.parse(q.scheduled_start) <= Date.now())
        throw new Error("EXPIRED");
      if ((await sql`select id from public.bookings where job_id=${job.id}::uuid`).length)
        throw new Error("CONFLICT");
      await eligible(sql, String(job.id), String(q.worker_id));
      if (action === "authorize-inspection") {
        if (q.pricing_type !== "inspection_required") throw new Error("INSPECTION");
        const existing =
          await sql`select id from private.inspection_access_grants where quote_id=${q.id}::uuid`;
        if (existing.length) throw new Error("CONFLICT");
        await freeTime(
          sql,
          String(q.worker_id),
          new Date(q.scheduled_start).toISOString(),
          new Date(q.scheduled_end).toISOString(),
        );
        const [grant] =
          await sql`insert into private.inspection_access_grants(job_id,worker_id,granted_by_client_id,quote_id,visit_starts_at,visit_ends_at,access_from,expires_at,fee_cents,reason) values (${job.id}::uuid,${q.worker_id}::uuid,${actor.id}::uuid,${q.id}::uuid,${q.scheduled_start}::timestamptz,${q.scheduled_end}::timestamptz,greatest(now(),${q.scheduled_start}::timestamptz-interval '1 hour'),${q.scheduled_end}::timestamptz,${q.inspection_fee_cents},'Client explicitly authorized this inspection version and fee; no work booking.') returning id`;
        await sql`update public.job_requests set version=version+1,updated_at=now() where id=${job.id}::uuid`;
        const [worker] =
          await sql`select user_id from public.worker_profiles where id=${q.worker_id}::uuid`;
        await notify(
          sql,
          String(worker!.user_id),
          "inspection-authorized",
          String(grant!.id),
          "/app/worker/quotes?job=" + job.id,
        );
        return {
          jobId: String(job.id),
          grantId: String(grant!.id),
          message:
            "Site visit authorized with bounded address access. No work price or work booking was accepted.",
        };
      }
      if (q.pricing_type === "inspection_required") throw new Error("INSPECTION");
      const { terms, price } = await checkedPrice(sql, q);
      await sql`update private.inspection_access_grants set revoked_at=now() where job_id=${job.id}::uuid and revoked_at is null`;
      await freeTime(sql, String(q.worker_id), terms.startsAt, terms.endsAt);
      await sql`update public.quotes set status='accepted',updated_at=now() where id=${q.id}::uuid`;
      const others =
        await sql`update public.quotes set status=case when worker_id=${q.worker_id}::uuid then 'superseded'::public.quote_status else 'rejected'::public.quote_status end,updated_at=now() where job_id=${job.id}::uuid and id<>${q.id}::uuid and status in ('submitted','draft') returning id,worker_id`;
      const [booking] =
        await sql`insert into public.bookings(job_id,quote_id,worker_id,scheduled_start,scheduled_end,final_total_cents) values (${job.id}::uuid,${q.id}::uuid,${q.worker_id}::uuid,${terms.startsAt}::timestamptz,${terms.endsAt}::timestamptz,${price.totalCents}) returning id,version`;
      await sql`insert into public.booking_events(booking_id,actor_id,event_type,from_status,to_status,payload) values (${booking!.id}::uuid,${actor.id}::uuid,'booking_requested',null,'pending_worker',${sql.json({ quoteVersion: Number(q.version), paymentCollected: false })})`;
      await sql`update public.job_requests set status='quoted',version=version+1,updated_at=now() where id=${job.id}::uuid`;
      await sql`update public.job_matches set status='expired' where job_id=${job.id}::uuid and worker_id<>${q.worker_id}::uuid and status in ('invited','viewed','responded')`;
      const [worker] =
        await sql`select user_id from public.worker_profiles where id=${q.worker_id}::uuid`;
      await notify(
        sql,
        String(worker!.user_id),
        "booking-requested",
        String(booking!.id),
        "/app/worker/bookings/" + booking!.id,
      );
      await notify(
        sql,
        actor.id,
        "booking-pending",
        String(booking!.id),
        "/app/client/bookings/" + booking!.id,
      );
      for (const other of others.filter((o) => o.worker_id !== q.worker_id)) {
        const [w] =
          await sql`select user_id from public.worker_profiles where id=${other.worker_id}::uuid`;
        await notify(
          sql,
          String(w!.user_id),
          "quote-not-selected",
          String(other.id),
          "/app/worker/quotes?job=" + job.id,
        );
      }
      return {
        jobId: String(job.id),
        bookingId: String(booking!.id),
        version: Number(booking!.version),
        message: "Booking requested. The worker must confirm; the exact address is still withheld.",
      };
    });
  }
  if (action === "revoke-inspection") {
    const data = revokeSchema.parse(input);
    return quoteCommand(action, data, key, false, async (sql, actor) => {
      const [ref] =
        await sql`select g.job_id,w.user_id from private.inspection_access_grants g join public.worker_profiles w on w.id=g.worker_id where g.id=${data.grantId}::uuid`;
      if (!ref) throw new Error("FORBIDDEN");
      const job = await lockJob(sql, String(ref.job_id), actor);
      await sql`update private.inspection_access_grants set revoked_at=now() where id=${data.grantId}::uuid and revoked_at is null`;
      await sql`update public.job_requests set version=version+1,updated_at=now() where id=${job.id}::uuid`;
      await notify(
        sql,
        String(ref.user_id),
        "inspection-revoked",
        data.grantId,
        "/app/worker/quotes?job=" + job.id,
      );
      return {
        jobId: String(job.id),
        message: "Inspection permission revoked. No payment or work booking was changed.",
      };
    });
  }
  if (action === "cancel-request") {
    const data = closeRequestSchema.parse(input);
    return quoteCommand(action, data, key, false, async (sql, actor) => {
      const job = await lockJob(sql, data.jobId, actor);
      if (
        job.version !== data.expectedJobVersion ||
        !["open", "matching", "quoted"].includes(job.status) ||
        (await sql`select id from public.bookings where job_id=${job.id}::uuid`).length
      )
        throw new Error("CONFLICT");
      await sql`update public.quotes set status='rejected',updated_at=now() where job_id=${job.id}::uuid and status in ('draft','submitted')`;
      await sql`update private.inspection_access_grants set revoked_at=now() where job_id=${job.id}::uuid and revoked_at is null`;
      const workers =
        await sql`update public.job_matches set status='expired' where job_id=${job.id}::uuid and status in ('invited','viewed','responded') returning worker_id`;
      await sql`update public.job_requests set status='cancelled',version=version+1,updated_at=now() where id=${job.id}::uuid`;
      await sql`update private.job_dispatch set next_wave_at=null where job_id=${job.id}::uuid`;
      for (const row of workers) {
        const [w] =
          await sql`select user_id from public.worker_profiles where id=${row.worker_id}::uuid`;
        await notify(
          sql,
          String(w!.user_id),
          "request-cancelled",
          job.id + ":" + row.worker_id,
          "/app/worker/quotes",
        );
      }
      return {
        jobId: job.id,
        message:
          "Request closed and inspection permissions revoked. No booking, fee or refund was created.",
      };
    });
  }
  throw new Error("INVALID");
}
