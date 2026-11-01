import "server-only";
import type { TransactionSql } from "postgres";
import { termsSchema, type QuoteTerms, priceQuote } from "./schema";
export async function quoteRecord(sql: TransactionSql, id: string) {
  const [q] = await sql`select * from public.quotes where id=${id}::uuid for update`;
  if (!q) throw new Error("FORBIDDEN");
  return q;
}
export async function storedTerms(
  sql: TransactionSql,
  q: Record<string, any>,
): Promise<QuoteTerms> {
  const items =
    await sql`select kind,description,quantity,unit_price_cents from public.quote_items where quote_id=${q.id}::uuid order by sort_order,id`;
  return termsSchema.parse({
    pricingType: q.pricing_type,
    scope: q.scope,
    exclusions: q.exclusions ?? "",
    items: items.map((i) => ({
      kind: i.kind,
      description: i.description,
      quantityHundredths: Math.round(Number(i.quantity) * 100),
      unitPriceCents: Number(i.unit_price_cents),
    })),
    travelFeeCents: Number(q.travel_fee_cents),
    inspectionFeeCents: Number(q.inspection_fee_cents),
    taxMode: q.tax_mode,
    startsAt: new Date(q.scheduled_start).toISOString(),
    endsAt: new Date(q.scheduled_end).toISOString(),
    validUntil: new Date(q.valid_until).toISOString(),
  });
}
export async function checkedPrice(sql: TransactionSql, q: Record<string, any>) {
  const terms = await storedTerms(sql, q),
    price = priceQuote(terms);
  if (
    price.totalCents !== Number(q.total_cents) ||
    price.subtotalCents !== Number(q.subtotal_cents) ||
    price.taxCents !== Number(q.tax_cents)
  )
    throw new Error("PRICE");
  return { terms, price };
}
export async function responseRight(sql: TransactionSql, job: Record<string, any>) {
  if (!["open", "matching", "quoted"].includes(job.status) || !job.match)
    throw new Error("CONFLICT");
  const [right] =
    await sql`select (${job.match.status} in ('invited','viewed') and ${job.match.expires_at}::timestamptz>now() and d.expires_at>now()) or (${job.match.status}='responded' and exists(select 1 from public.quotes q where q.job_id=d.job_id and q.worker_id=${job.match.worker_id}::uuid and q.published_at>now()-interval '7 days')) as allowed from private.job_dispatch d where d.job_id=${job.id}::uuid`;
  if (!right?.allowed) throw new Error("EXPIRED");
  if ((await sql`select id from public.bookings where job_id=${job.id}::uuid`).length)
    throw new Error("CONFLICT");
}
