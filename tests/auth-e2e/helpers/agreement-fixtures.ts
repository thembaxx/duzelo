import type postgres from "postgres";
import { prepareJobWorkers, privateJobPoint } from "./job-fixtures";
import { area, cleaning } from "./worker-fixtures";
import type { QuoteTerms } from "../../../src/features/quotes/schema";
if (
  process.env.AUTH_MODE !== "local" ||
  !process.env.DATABASE_URL ||
  !["127.0.0.1", "localhost"].includes(new URL(process.env.DATABASE_URL).hostname) ||
  !process.env.SUPABASE_URL ||
  !["127.0.0.1", "localhost"].includes(new URL(process.env.SUPABASE_URL).hostname)
)
  throw new Error("Agreement fixtures require loopback Auth and database.");
export const privateStreet = "M06-PRIVATE-STREET-42",
  privateNotes = "M06-PRIVATE-ACCESS-42",
  privateDescription = "M06-CLOSED-DETAILS-42";
export async function resetAgreementFixtures(sql: ReturnType<typeof postgres>) {
  await sql`update private.inspection_access_grants set revoked_at=now() where granted_by_client_id in (select id from auth.users where phone='27820000007') and revoked_at is null`;
  await sql`update public.bookings set status='cancelled',cancelled_at=now() where job_id in(select id from public.job_requests where client_id in(select id from auth.users where phone='27820000007')) and status in ('pending_worker','confirmed')`;
  await sql`update public.job_requests set status='cancelled' where client_id in(select id from auth.users where phone='27820000007') and status in ('open','matching','quoted','booked')`;
  await sql`delete from public.worker_cards where public_name like '% M06 %'`;
  await sql`delete from private.auth_rate_limits`;
}
export async function agreementWorkers(sql: ReturnType<typeof postgres>, tag: string) {
  const users =
    await sql`select id,phone from auth.users where phone in ('27820000008','27820000009') order by phone`;
  const result: { id: string; userId: string; name: string }[] = [];
  for (const user of users) {
    const profile = await prepareJobWorkers(
      sql,
      String(user.id),
      "M06 " + tag + " " + String(user.phone),
    );
    result.push({
      id: profile.workerId,
      userId: String(user.id),
      name: "Fictional M06 provider " + String(user.phone).slice(-1) + " " + tag,
    });
  }
  for (const w of result) {
    await sql`update public.worker_profiles set display_name=${w.name} where id=${w.id}::uuid`;
    // Only isolated throttle history is moved; server APIs never accept a clock.
    await sql`update public.job_matches set dispatched_at=now()-interval '2 hours' where worker_id=${w.id}::uuid`;
  }
  for (const w of result)
    await sql`select private.publish_worker_card(${w.id}::uuid,${area}::uuid,${w.name},'A fictional M06 service scope for isolated acceptance.')`;
  return result;
}
export function quoteTerms(offsetHours = 48): QuoteTerms {
  const start = new Date(Date.now() + offsetHours * 3600000);
  start.setUTCSeconds(0, 0);
  return {
    pricingType: "fixed",
    scope: "A fictional cleaning scope with labor and materials.",
    exclusions: "No real service or payment.",
    items: [
      {
        kind: "labor",
        description: "Fictional cleaning labor",
        quantityHundredths: 150,
        unitPriceCents: 40000,
      },
    ],
    travelFeeCents: 5000,
    inspectionFeeCents: 0,
    taxMode: "vat_15_exclusive",
    startsAt: start.toISOString(),
    endsAt: new Date(start.getTime() + 3600000).toISOString(),
    validUntil: new Date(Math.min(Date.now() + 3600000, start.getTime() - 60000)).toISOString(),
  };
}
export const agreementJob = {
  categoryId: cleaning,
  title: "Fictional M06 cleaning",
  description: "Fictional cleaning details. " + privateDescription,
  urgency: "flexible" as const,
  slots: [],
  contactWindow: "After 17:00",
  budgetMin: null,
  budgetMax: null,
  location: {
    kind: "manual" as const,
    areaId: area,
    street: privateStreet,
    province: "Mpumalanga" as const,
    notes: privateNotes,
    point: privateJobPoint,
    townOnly: false,
    consent: true,
  },
};
export async function expiredQuoteFixture(
  sql: ReturnType<typeof postgres>,
  jobId: string,
  workerId: string,
  version: number,
) {
  const q = crypto.randomUUID(),
    t = quoteTerms(72);
  await sql.begin(async (tx) => {
    await tx`insert into public.quotes(id,job_id,worker_id,version,pricing_type,subtotal_cents,total_cents,scope,valid_until,scheduled_start,scheduled_end,created_at) values (${q}::uuid,${jobId}::uuid,${workerId}::uuid,${version},'fixed',25000,25000,'An explicitly historical expired quote fixture.',now()-interval '1 hour',${t.startsAt}::timestamptz,${t.endsAt}::timestamptz,now()-interval '2 hours')`;
    await tx`insert into public.quote_items(quote_id,description,quantity,unit_price_cents) values (${q}::uuid,'Historical fixture labor',1,25000)`;
    await tx`update public.quotes set status='submitted',published_at=now()-interval '2 hours' where id=${q}::uuid`;
  });
  return q;
}
export async function pastBookingFixture(
  sql: ReturnType<typeof postgres>,
  owner: string,
  workerId: string,
) {
  const job = crypto.randomUUID(),
    quote = crypto.randomUUID(),
    booking = crypto.randomUUID();
  await sql.begin(async (tx) => {
    await tx`insert into public.job_requests(id,client_id,category_id,title,description,public_town,urgency,status) values (${job}::uuid,${owner}::uuid,${cleaning}::uuid,'Fictional M06 past appointment','Historical test state, not a real visit.','Synthetic test area','flexible','booked')`;
    await tx`insert into private.job_dispatch(job_id,area_id,submitted_at,expires_at) values (${job}::uuid,${area}::uuid,now()-interval '2 days',now()-interval '1 day')`;
    await tx`insert into private.job_locations(job_id,exact_point,service_address_snapshot,access_notes) values (${job}::uuid,extensions.st_setsrid(extensions.st_makepoint(${privateJobPoint.longitude},${privateJobPoint.latitude}),4326)::extensions.geography,${tx.json({ street: privateStreet, province: "Mpumalanga", consent: true, townOnly: false })},${privateNotes})`;
    await tx`insert into public.job_matches(job_id,worker_id,match_score,status) values (${job}::uuid,${workerId}::uuid,80,'responded')`;
    await tx`insert into public.quotes(id,job_id,worker_id,pricing_type,subtotal_cents,total_cents,scope,valid_until,scheduled_start,scheduled_end,created_at) values (${quote}::uuid,${job}::uuid,${workerId}::uuid,'fixed',25000,25000,'An explicitly historical past appointment fixture.',now()-interval '2 hours',now()-interval '1 hour',now()+interval '1 hour',now()-interval '3 hours')`;
    await tx`insert into public.quote_items(quote_id,description,quantity,unit_price_cents) values (${quote}::uuid,'Historical fixture labor',1,25000)`;
    await tx`update public.quotes set status='submitted',published_at=now()-interval '3 hours' where id=${quote}::uuid`;
    await tx`update public.quotes set status='accepted' where id=${quote}::uuid`;
    await tx`insert into public.bookings(id,job_id,quote_id,worker_id,status,scheduled_start,scheduled_end,final_total_cents) select ${booking}::uuid,job_id,id,worker_id,'confirmed',scheduled_start,scheduled_end,total_cents from public.quotes where id=${quote}::uuid`;
    await tx`insert into public.booking_events(booking_id,event_type,to_status,payload) values (${booking}::uuid,'historical_test_fixture','confirmed','{"synthetic":true}')`;
  });
  return { jobId: job, quoteId: quote, bookingId: booking };
}
