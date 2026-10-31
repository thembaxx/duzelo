import "server-only";
import { command } from "./command-boundary";
import {
  workerDraftSchema,
  moneyCents,
  submitSchema,
  decisionSchema,
  publishSchema,
} from "./schema";
export async function workerCommand(action: string, input: unknown, key: string | null) {
  if (action === "profile") {
    const data = workerDraftSchema.parse(input);
    return command(action, data, key, false, null, async (sql, w) => {
      const categoryIds = [...new Set(data.services.map((s) => s.categoryId))];
      const categories =
        await sql`select id from public.service_categories where active and id=any(${categoryIds}::uuid[])`;
      const areas = [...new Set([data.areaId, ...data.townIds])];
      const towns =
        await sql`select id from public.service_areas where active and id=any(${areas}::uuid[])`;
      if (categories.length !== categoryIds.length || towns.length !== areas.length)
        throw new Error("INVALID");
      const revision = w.revision ? (w.state === "draft" ? w.revision : w.revision + 1) : 1;
      const draft = { ...data, travelFee: (data.travelFee / 100).toFixed(2) };
      // Every material edit reopens review and invalidates previously reviewed evidence.
      await sql`update public.worker_profiles set display_name=${data.kind === "business" ? data.businessName : data.displayName},bio=${data.bio},slug=coalesce(slug,${"provider-" + w.id}),status='draft',updated_at=now() where id=${w.id}::uuid`;
      if (w.revision && revision !== w.revision)
        await sql`update private.worker_verifications set status='expired' where worker_id=${w.id}::uuid and application_revision<${revision} and status<>'expired'`;
      if (data.kind === "business") {
        const business = w.business_id
          ? await sql`update public.business_profiles set display_name=${data.businessName},status='draft' where id=${w.business_id}::uuid and owner_id=${w.user_id}::uuid returning id`
          : await sql`insert into public.business_profiles(owner_id,display_name,status) values (${w.user_id}::uuid,${data.businessName},'draft') returning id`;
        if (!business.length) throw new Error("FORBIDDEN");
        const id = String(business[0]!.id);
        await sql`update public.worker_profiles set business_id=${id}::uuid where id=${w.id}::uuid`;
        await sql`insert into private.business_details(business_id,registration_number) values (${id}::uuid,${data.registrationNumber || null}) on conflict(business_id) do update set registration_number=excluded.registration_number`;
      } else await sql`update public.worker_profiles set business_id=null where id=${w.id}::uuid`;
      await sql`insert into private.worker_coverage(worker_id,base_point,radius_km,town_allowlist,travel_fee_cents) values (${w.id}::uuid,extensions.st_setsrid(extensions.st_makepoint(${data.longitude},${data.latitude}),4326)::extensions.geography,${data.radiusKm},${data.townIds},${data.travelFee}) on conflict(worker_id) do update set base_point=excluded.base_point,radius_km=excluded.radius_km,town_allowlist=excluded.town_allowlist,travel_fee_cents=excluded.travel_fee_cents,updated_at=now()`;
      await sql`delete from public.worker_services where worker_id=${w.id}::uuid`;
      for (const service of data.services)
        await sql`insert into public.worker_services(worker_id,category_id,title,description,price_model,price_cents) values (${w.id}::uuid,${service.categoryId}::uuid,${service.title},${service.description},${service.pricing},${service.pricing === "quote" ? null : moneyCents(service.price)})`;
      await sql`insert into private.worker_applications(worker_id,revision,state,area_id,draft_json) values (${w.id}::uuid,${revision},'draft',${data.areaId}::uuid,${sql.json(draft)}) on conflict(worker_id) do update set revision=excluded.revision,state='draft',area_id=excluded.area_id,draft_json=excluded.draft_json,submitted_at=null,updated_at=now()`;
      return { message: "Draft saved. Review is required before publication.", revision };
    });
  }
  if (action === "submit") {
    const data = submitSchema.parse(input);
    return command(action, data, key, false, null, async (sql, w) => {
      if (w.revision !== data.revision || w.state !== "draft") throw new Error("CONFLICT");
      const needs =
        await sql`select 'identity' as kind,null::uuid as category_id union all select 'business',null::uuid where exists(select 1 from public.worker_profiles where id=${w.id}::uuid and business_id is not null) union all select distinct 'trade',s.category_id from public.worker_services s join public.service_categories c on c.id=s.category_id where s.worker_id=${w.id}::uuid and s.active and c.requires_trade_review`;
      for (const need of needs) {
        const files =
          await sql`select a.id from private.worker_assets a where a.worker_id=${w.id}::uuid and a.application_revision=${w.revision} and a.kind=${need.kind} and a.category_id is not distinct from ${need.category_id}::uuid and a.state='stored' and a.retain_until>now()`;
        if (!files.length) throw new Error("INCOMPLETE");
      }
      await sql`update private.worker_applications set state='pending_review',submitted_at=now(),updated_at=now() where worker_id=${w.id}::uuid`;
      await sql`update public.worker_profiles set status='pending_review',updated_at=now() where id=${w.id}::uuid`;
      return { message: "Submitted for manual review.", redirect: "/app/worker/verification" };
    });
  }
  if (action === "decision") {
    const data = decisionSchema.parse(input);
    return command(action, data, key, true, data.workerId, async (sql, w, actor) => {
      if (
        w.revision !== data.revision ||
        !["pending_review", "reviewed", "needs_changes"].includes(w.state ?? "")
      )
        throw new Error("CONFLICT");
      const verification =
        await sql`select * from private.worker_verifications where id=${data.verificationId}::uuid and worker_id=${w.id}::uuid and application_revision=${w.revision} for update`;
      const v = verification[0];
      if (!v) throw new Error("FORBIDDEN");
      const expiry =
        await sql`select ${data.expiryDate}::date is null or ${data.expiryDate}::date>=current_date as valid`;
      if (
        data.decision === "approved" &&
        (!expiry[0]!.valid || (v.kind === "trade" && !data.expiryDate))
      )
        throw new Error("INVALID");
      const files =
        await sql`select a.id from private.verification_documents d join private.worker_assets a on a.id=d.asset_id where d.verification_id=${data.verificationId}::uuid and d.deleted_at is null and a.state='stored' and a.retain_until>now()`;
      if (!files.length) throw new Error("INCOMPLETE");
      if (data.decision === "approved") {
        const unopened =
          await sql`select a.id from private.verification_documents d join private.worker_assets a on a.id=d.asset_id where d.verification_id=${data.verificationId}::uuid and a.state='stored' and not exists(select 1 from private.audit_events e where e.actor_id=${actor.id}::uuid and e.action='worker.document-access' and e.resource_id=a.id and e.occurred_at>now()-interval '1 hour')`;
        if (unopened.length) throw new Error("REVIEW_REQUIRED");
      }
      await sql`update private.worker_verifications set status=${data.decision},reviewed_by=${actor.id}::uuid,reviewed_at=now(),expiry_date=${data.expiryDate}::date,worker_reason=${data.reason} where id=${data.verificationId}::uuid`;
      await sql`insert into private.worker_review_events(verification_id,worker_id,application_revision,reviewer_id,decision,reason,expiry_date) values (${data.verificationId}::uuid,${w.id}::uuid,${w.revision},${actor.id}::uuid,${data.decision},${data.reason},${data.expiryDate}::date)`;
      if (data.decision !== "approved") {
        if (v.kind !== "trade")
          await sql`update public.worker_profiles set status=${data.decision === "needs_changes" ? "needs_changes" : "rejected"}::public.worker_status where id=${w.id}::uuid`;
        if (data.decision === "needs_changes")
          await sql`update private.worker_applications set state='needs_changes' where worker_id=${w.id}::uuid`;
      }
      // Verification updates always invalidate the old card through M01 triggers.
      // Publication is a separate explicit action after public-content inspection.
      await sql`insert into private.audit_events(actor_id,actor_type,action,resource_kind,resource_id,metadata_redacted) values (${actor.id}::uuid,'user','verification.decision','verification',${data.verificationId}::uuid,${sql.json({ decision: data.decision, revision: data.revision, kind: String(v.kind) })})`;
      return { message: "Review decision recorded." };
    });
  }
  if (action === "publish") {
    const data = publishSchema.parse(input);
    return command(action, data, key, true, data.workerId, async (sql, w, actor) => {
      if (w.revision !== data.revision || !["pending_review", "reviewed"].includes(w.state ?? ""))
        throw new Error("CONFLICT");
      const required = w.business_id ? ["identity", "business"] : ["identity"];
      for (const kind of required) {
        const reviewed =
          await sql`select v.id from private.worker_verifications v join private.admin_members m on m.user_id=v.reviewed_by and m.active where v.worker_id=${w.id}::uuid and v.application_revision=${w.revision} and v.kind=${kind} and v.status='approved' and v.reviewed_by<>${w.user_id}::uuid and (v.expiry_date is null or v.expiry_date>=current_date) and exists(select 1 from private.verification_documents d join private.worker_assets a on a.id=d.asset_id where d.verification_id=v.id and d.deleted_at is null and a.state='stored' and a.retain_until>now())`;
        if (!reviewed.length) throw new Error("INCOMPLETE");
      }
      await sql`update public.worker_profiles set status='approved',reviewed_at=now(),updated_at=now() where id=${w.id}::uuid`;
      if (w.business_id)
        await sql`update public.business_profiles set status='approved' where id=${w.business_id}::uuid and owner_id=${w.user_id}::uuid`;
      const eligible = await sql`select private.eligible_worker_categories(${w.id}::uuid) as ids`;
      if (!eligible[0]!.ids.length) throw new Error("INCOMPLETE");
      const unopened =
        await sql`select a.id from private.worker_assets a where a.worker_id=${w.id}::uuid and a.application_revision=${w.revision} and a.kind in ('avatar','portfolio') and a.state='stored' and a.retain_until>now() and not exists(select 1 from private.audit_events e where e.actor_id=${actor.id}::uuid and e.action='worker.document-access' and e.resource_id=a.id and e.occurred_at>now()-interval '1 hour')`;
      if (unopened.length) throw new Error("REVIEW_REQUIRED");
      await sql`update private.worker_assets set public_approved=true where worker_id=${w.id}::uuid and application_revision=${w.revision} and kind in ('avatar','portfolio') and state='stored' and retain_until>now()`;
      await sql`update private.worker_applications set state='reviewed',updated_at=now() where worker_id=${w.id}::uuid`;
      await sql`select private.publish_worker_card(${w.id}::uuid,${w.area_id}::uuid,w.display_name,w.bio) from public.worker_profiles w where w.id=${w.id}::uuid`;
      return { message: "Reviewed profile published for eligible categories." };
    });
  }
  throw new Error("NOT_FOUND");
}
