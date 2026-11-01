begin;
set local search_path=public,extensions;
create extension if not exists btree_gist with schema extensions;

alter table public.quotes
 add column tax_mode text not null default 'none' check(tax_mode in ('none','vat_15_exclusive','vat_15_inclusive')),
 add column tax_cents bigint not null default 0 check(tax_cents between 0 and 100000000),
 add column inspection_fee_cents bigint not null default 0 check(inspection_fee_cents between 0 and 100000000),
 add column scheduled_start timestamptz,
 add column scheduled_end timestamptz,
 add column published_at timestamptz,
 add constraint quote_schedule_pair check ((scheduled_start is null and scheduled_end is null) or (scheduled_start is not null and scheduled_end is not null and scheduled_end>scheduled_start));
do $$ declare r record; begin
 for r in select conname from pg_constraint where conrelid='public.quotes'::regclass and contype='c' and pg_get_constraintdef(oid) like '%total_cents =%' loop
  execute format('alter table public.quotes drop constraint %I',r.conname);
 end loop;
end $$;
alter table public.quotes add constraint quote_price_components check(
 (pricing_type='inspection_required' and subtotal_cents is null and total_cents is null and travel_fee_cents=0 and tax_cents=0 and tax_mode='none')
 or (pricing_type<>'inspection_required' and subtotal_cents is not null and total_cents is not null and inspection_fee_cents=0 and total_cents=subtotal_cents+travel_fee_cents+case when tax_mode='vat_15_exclusive' then tax_cents else 0 end));
alter table public.quote_items add column kind text not null default 'labor' check(kind in ('labor','materials'));

create function private.freeze_quote_version() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='DELETE' then raise exception 'Quote versions are retained as history'; end if;
 if (to_jsonb(new)-array['status','updated_at','published_at']) is distinct from (to_jsonb(old)-array['status','updated_at','published_at'])
  or (old.published_at is not null and new.published_at is distinct from old.published_at)
  or (new.published_at is distinct from old.published_at and not(old.status='draft' and new.status='submitted')) then
  raise exception 'Quote terms and version identity are immutable; save a new version';
 end if;
 return new;
end $$;
create trigger quote_version_guard before update or delete on public.quotes for each row execute function private.freeze_quote_version();
create function private.freeze_quote_lines() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op<>'INSERT' then raise exception 'Quote lines are immutable'; end if;
 perform 1 from public.quotes where id=new.quote_id for update;
 if exists(select 1 from public.quotes where id=new.quote_id and (published_at is not null or status<>'draft')) then
  raise exception 'Published quote lines are immutable';
 end if;
 return new;
end $$;
create trigger quote_line_guard before insert or update or delete on public.quote_items for each row execute function private.freeze_quote_lines();
create function private.validate_quote_price() returns trigger language plpgsql security invoker set search_path='' as $$
declare q public.quotes; subtotal bigint; n integer; tax bigint; base bigint;
begin
 select * into q from public.quotes where id=new.id;
 if q.published_at is null then return null; end if;
 if q.scheduled_start is null or q.scheduled_end is null or q.valid_until is null or q.valid_until>q.scheduled_start then raise exception 'Published quotes require an explicit window and expiry'; end if;
 select coalesce(sum(round(i.quantity*i.unit_price_cents)),0)::bigint,count(*) into subtotal,n from public.quote_items i where i.quote_id=q.id;
 if q.pricing_type='inspection_required' then
  if n<>0 or q.total_cents is not null then raise exception 'An inspection has no agreed work price'; end if;
 else
  base:=subtotal+q.travel_fee_cents;
  tax:=case q.tax_mode when 'vat_15_exclusive' then round(base::numeric*15/100)::bigint when 'vat_15_inclusive' then round(base::numeric*15/115)::bigint else 0 end;
  if n<1 or n>20 or subtotal<>q.subtotal_cents or q.tax_cents<>tax or q.total_cents<>base+(case when q.tax_mode='vat_15_exclusive' then tax else 0 end) or q.total_cents>100000000 then raise exception 'Quote totals must match server-calculated lines and tax'; end if;
 end if;
 return null;
end $$;
create constraint trigger quote_price_guard after insert or update on public.quotes deferrable initially deferred for each row execute function private.validate_quote_price();

alter table private.inspection_access_grants
 add column quote_id uuid references public.quotes(id),
 add column visit_starts_at timestamptz,
 add column visit_ends_at timestamptz,
 add column access_from timestamptz,
 add column fee_cents bigint not null default 0 check(fee_cents between 0 and 100000000);
create unique index inspection_one_grant_per_quote on private.inspection_access_grants(quote_id) where quote_id is not null;
create function private.validate_inspection_proposal() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' then
  if (to_jsonb(new)-'revoked_at') is distinct from (to_jsonb(old)-'revoked_at') or (old.revoked_at is not null and new.revoked_at is distinct from old.revoked_at) then raise exception 'Inspection consent cannot be extended or reassigned'; end if;
 else
  if not exists(select 1 from public.quotes q where q.id=new.quote_id and q.job_id=new.job_id and q.worker_id=new.worker_id and q.pricing_type='inspection_required' and q.status='submitted' and q.published_at is not null and q.valid_until>now() and q.scheduled_start=new.visit_starts_at and q.scheduled_end=new.visit_ends_at and q.inspection_fee_cents=new.fee_cents)
    or new.access_from is null or new.access_from<new.approved_at or new.access_from<new.visit_starts_at-interval '1 hour'
    or new.expires_at<>new.visit_ends_at or new.visit_ends_at<=new.visit_starts_at
    or new.expires_at>now()+interval '8 days' then raise exception 'Inspection needs a current proposal, disclosed fee and bounded access window'; end if;
 end if;
 return new;
end $$;
create trigger inspection_proposal_guard before insert or update on private.inspection_access_grants for each row execute function private.validate_inspection_proposal();

create function private.agreement_worker_eligible(p_job uuid,p_worker uuid,p_available boolean default true)
returns boolean language sql volatile security invoker set search_path='' as $$
with recursive categories as (
 select c.id,0 as depth from public.service_categories c join public.job_requests j on j.category_id=c.id where j.id=p_job and c.active
 union all select c.id,t.depth+1 from public.service_categories c join categories t on c.parent_id=t.id where c.active and t.depth<8
)
select exists(
 select 1 from public.job_requests j
 join public.user_profiles client on client.user_id=j.client_id and client.client_enabled and not client.is_suspended and client.onboarding_completed_at is not null
 join public.worker_profiles w on w.id=p_worker and w.user_id<>j.client_id and w.status='approved'
 join public.user_profiles owner on owner.user_id=w.user_id and owner.worker_enabled and not owner.is_suspended and owner.onboarding_completed_at is not null
 join private.worker_applications app on app.worker_id=w.id and app.state='reviewed'
 join public.worker_cards card on card.worker_id=w.id and card.safe_until>now()
 join private.worker_coverage cov on cov.worker_id=w.id
 join private.job_locations l on l.job_id=j.id
 left join private.worker_match_settings settings on settings.worker_id=w.id
 where j.id=p_job and (not p_available or (w.is_available and (j.urgency<>'urgent' or coalesce(settings.urgent_ready,false))))
 and (j.requested_worker_id is null or j.requested_worker_id=w.id)
 and exists(select 1 from categories c where c.id=any(private.eligible_worker_categories(w.id)) and c.id=any(card.category_ids))
 and not exists(select 1 from private.user_blocks b where (b.owner_id=j.client_id and b.subject_id=w.user_id) or (b.owner_id=w.user_id and b.subject_id=j.client_id))
 and not exists(select 1 from public.safety_reports r where r.status='triaged' and r.subject_user_id in(w.user_id,j.client_id))
 and ((l.exact_point is not null and extensions.st_dwithin(cov.base_point,l.exact_point,150000) and extensions.st_dwithin(cov.base_point,l.exact_point,cov.radius_km*1000) and (cardinality(cov.town_allowlist)=0 or j.public_town=any(cov.town_allowlist)))
 or (l.exact_point is null and (j.public_town=any(cov.town_allowlist) or (cardinality(cov.town_allowlist)=0 and card.town_label=j.public_town))))
);
$$;

create function private.worker_time_free(p_worker uuid,p_start timestamptz,p_end timestamptz,p_booking uuid default null,p_grant uuid default null)
returns boolean language sql volatile security invoker set search_path='' as $$
 select p_start is not null and p_end is not null and p_end>p_start
 and not exists(select 1 from private.worker_schedule_blocks b where b.worker_id=p_worker and b.starts_at<p_end and b.ends_at>p_start)
 and not exists(select 1 from public.bookings b where b.worker_id=p_worker and b.id is distinct from p_booking and b.status in('pending_worker','confirmed','in_progress','completion_pending') and b.scheduled_start<p_end and b.scheduled_end>p_start)
 and not exists(select 1 from private.inspection_access_grants g where g.worker_id=p_worker and g.id is distinct from p_grant and g.revoked_at is null and g.expires_at>now() and g.visit_starts_at<p_end and g.visit_ends_at>p_start);
$$;
create function private.guard_appointment_schedule() returns trigger language plpgsql security invoker set search_path='' as $$
declare worker uuid; starts timestamptz; ends timestamptz; booking uuid; grant_id uuid;
begin
 if tg_table_name='bookings' then
  if new.status not in ('pending_worker','confirmed','in_progress','completion_pending') or new.scheduled_start is null then return new; end if;
  worker:=new.worker_id; starts:=new.scheduled_start; ends:=new.scheduled_end; booking:=new.id;
 else
  if new.revoked_at is not null or new.quote_id is null then return new; end if;
  worker:=new.worker_id; starts:=new.visit_starts_at; ends:=new.visit_ends_at; grant_id:=new.id;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('duzelo.appointment:'||worker::text,4));
 if not private.worker_time_free(worker,starts,ends,booking,grant_id) then raise exception 'Appointment schedule conflict' using errcode='23P01'; end if;
 return new;
end $$;
create trigger booking_schedule_guard before insert or update on public.bookings for each row execute function private.guard_appointment_schedule();
create trigger inspection_schedule_guard before insert or update on private.inspection_access_grants for each row execute function private.guard_appointment_schedule();
alter table public.bookings add constraint bookings_no_overlapping_active exclude using gist
 (worker_id with =,tstzrange(scheduled_start,scheduled_end,'[)') with &&)
 where (status in ('pending_worker','confirmed','in_progress','completion_pending') and scheduled_start is not null and scheduled_end is not null);
alter table public.bookings add constraint booking_schedule_pair check((scheduled_start is null and scheduled_end is null) or (scheduled_start is not null and scheduled_end is not null and scheduled_end>scheduled_start));

create or replace function private.check_booking_quote() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.quotes q where q.id=new.quote_id and q.job_id=new.job_id and q.worker_id=new.worker_id and q.status='accepted' and q.pricing_type<>'inspection_required' and q.total_cents=new.final_total_cents) then raise exception 'Booking requires the accepted priced quote for this job and worker'; end if;
 if exists(select 1 from public.quotes q where q.id=new.quote_id and q.published_at is not null and (new.scheduled_start is distinct from q.scheduled_start or new.scheduled_end is distinct from q.scheduled_end)) then raise exception 'Accepted appointment window is immutable; use an agreed reschedule'; end if;
 if tg_op='UPDATE' and (new.job_id,new.quote_id,new.worker_id,new.final_total_cents) is distinct from (old.job_id,old.quote_id,old.worker_id,old.final_total_cents) then raise exception 'Accepted booking quote references and amount are immutable; use a change order'; end if;
 return new;
end;$$;

create policy quotes_server_projection on public.quotes as restrictive for select to authenticated using(false);
create policy quote_lines_server_projection on public.quote_items as restrictive for select to authenticated using(false);
create policy bookings_server_projection on public.bookings as restrictive for select to authenticated using(false);
create policy booking_events_server_projection on public.booking_events as restrictive for select to authenticated using(false);

revoke all on function private.freeze_quote_version(),private.freeze_quote_lines(),private.validate_quote_price(),private.validate_inspection_proposal(),private.agreement_worker_eligible(uuid,uuid,boolean),private.worker_time_free(uuid,timestamptz,timestamptz,uuid,uuid),private.guard_appointment_schedule() from public,anon,authenticated;
grant execute on function private.freeze_quote_version(),private.freeze_quote_lines(),private.validate_quote_price(),private.validate_inspection_proposal(),private.agreement_worker_eligible(uuid,uuid,boolean),private.worker_time_free(uuid,timestamptz,timestamptz,uuid,uuid),private.guard_appointment_schedule() to service_role;

-- Existing invitations stay readable while another worker has quoted. No new waves.
create or replace function private.job_candidates(p_job uuid,p_worker uuid default null,p_existing boolean default false)
returns table(worker_id uuid,user_id uuid,score integer,exposure integer,last_invited timestamptz,approximate boolean)
language sql volatile security invoker set search_path='' as $$
with recursive category_tree as (
 select c.id,0 as depth from public.service_categories c join public.job_requests j on j.category_id=c.id where j.id=p_job and c.active
 union all
 select c.id,t.depth+1 from public.service_categories c join category_tree t on c.parent_id=t.id where c.active and t.depth<8
), eligible as (
 select w.id,w.user_id,l.exact_point,cov.base_point,cov.radius_km,
  case when j.category_id=any(private.eligible_worker_categories(w.id)) then 35 else 25 end as relevance,
  coalesce((select count(*)::integer from public.job_matches old where old.worker_id=w.id and old.dispatched_at>now()-interval '1 day'),0) as exposure,
  (select max(old.dispatched_at) from public.job_matches old where old.worker_id=w.id) as last_invited,
  coalesce((select floor(15.0*count(*) filter(where old.status in ('declined','responded'))/nullif(count(*),0))::integer from public.job_matches old where old.worker_id=w.id and old.dispatched_at>now()-interval '30 days' and (old.expires_at<=now() or old.status in ('declined','responded'))),7) as reliability,
  case when exists(select 1 from public.service_categories sc where sc.requires_trade_review and sc.id in(select id from category_tree) and sc.id=any(private.eligible_worker_categories(w.id))) then 5 else 0 end
   +case when exists(select 1 from private.worker_assets a join private.worker_applications app on app.worker_id=a.worker_id and app.revision=a.application_revision where a.worker_id=w.id and a.kind='portfolio' and a.state='stored' and a.public_approved and a.retain_until>now()) then 5 else 0 end as evidence
 from public.job_requests j
 join private.job_dispatch dispatch on dispatch.job_id=j.id and dispatch.expires_at>now()
 join private.job_locations l on l.job_id=j.id
 join public.user_profiles client on client.user_id=j.client_id and not client.is_suspended and client.client_enabled and client.onboarding_completed_at is not null
 join public.worker_profiles w on w.user_id<>j.client_id and w.status='approved' and w.is_available
 join public.user_profiles owner on owner.user_id=w.user_id and not owner.is_suspended and owner.worker_enabled and owner.onboarding_completed_at is not null
 join private.worker_applications app on app.worker_id=w.id and app.state='reviewed'
 join public.worker_cards card on card.worker_id=w.id and card.safe_until>now()
 join private.worker_coverage cov on cov.worker_id=w.id
 left join private.worker_match_settings settings on settings.worker_id=w.id
 where j.id=p_job and (j.status in ('open','matching') or (p_existing and j.status='quoted'))
 and (p_worker is null or w.id=p_worker)
 and (j.requested_worker_id is null or j.requested_worker_id=w.id)
 and exists(select 1 from category_tree t where t.id=any(private.eligible_worker_categories(w.id)) and t.id=any(card.category_ids))
 and not exists(select 1 from private.user_blocks b where (b.owner_id=j.client_id and b.subject_id=w.user_id) or (b.owner_id=w.user_id and b.subject_id=j.client_id))
 and not exists(select 1 from public.safety_reports r where r.status='triaged' and r.subject_user_id in (w.user_id,j.client_id))
 and (j.urgency<>'urgent' or coalesce(settings.urgent_ready,false))
 and ((l.exact_point is not null and extensions.st_dwithin(cov.base_point,l.exact_point,150000) and extensions.st_dwithin(cov.base_point,l.exact_point,cov.radius_km*1000)
       and (cardinality(cov.town_allowlist)=0 or j.public_town=any(cov.town_allowlist)))
   or (l.exact_point is null and (j.public_town=any(cov.town_allowlist) or (cardinality(cov.town_allowlist)=0 and card.town_label=j.public_town))))
 and (jsonb_array_length(j.time_slots)=0 or exists(
  select 1 from jsonb_array_elements(j.time_slots) slot
  where (slot->>'end')::timestamptz>now()
  and not exists(select 1 from public.bookings b where b.worker_id=w.id and b.status in ('pending_worker','confirmed','in_progress','completion_pending') and b.scheduled_start<(slot->>'end')::timestamptz and b.scheduled_end>(slot->>'start')::timestamptz)
  and not exists(select 1 from private.worker_schedule_blocks b where b.worker_id=w.id and b.starts_at<(slot->>'end')::timestamptz and b.ends_at>(slot->>'start')::timestamptz)))
 and (p_existing or (
  not exists(select 1 from public.job_matches m where m.job_id=j.id and m.worker_id=w.id)
  and (select count(*) from public.job_matches m where m.worker_id=w.id and m.dispatched_at>now()-interval '1 day')<coalesce(settings.daily_limit,6)
  and (select count(*) from public.job_matches m where m.worker_id=w.id and m.dispatched_at>now()-interval '1 hour')<3
 ))
), scored as (
 select e.id as worker_id,e.user_id,
  (e.relevance+case when e.exact_point is null then 10 else greatest(0,floor(25*(1-extensions.st_distance(e.base_point,e.exact_point)/(e.radius_km*1000))))::integer end+e.reliability+15+e.evidence)::integer as score,
  e.exposure,e.last_invited,e.exact_point is null as approximate
 from eligible e
)
select s.* from scored s order by floor(s.score/5.0) desc,s.exposure,s.last_invited nulls first,s.worker_id limit 250;
$$;

-- Loopback-only no-delivery OTP fixtures used by the native acceptance runner.
create or replace function private.local_sms_test_hook(event jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
begin
 if ltrim(coalesce(event->'user'->>'phone',''),'+') not in ('27820000001','27820000002','27820000003','27820000004','27820000005','27820000006','27820000007','27820000008','27820000009') then raise exception 'Local SMS adapter rejects non-fixture numbers'; end if;
 return '{}'::jsonb;
end;$$;
commit;
