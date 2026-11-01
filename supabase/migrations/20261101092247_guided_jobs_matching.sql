-- Reviewed M05 extension. Execute only in disposable local/CI databases until
-- dedicated hosting, restore, privacy and notification operations are approved.
begin;
-- Partial drafts are real rows, not fabricated titles/categories.
alter table public.job_requests alter column category_id drop not null;
alter table public.job_requests drop constraint job_requests_title_check;
alter table public.job_requests drop constraint job_requests_description_check;
alter table public.job_requests add constraint job_title_bounds check(length(title)<=140 and (status in ('draft','cancelled') or length(btrim(title))>=5));
alter table public.job_requests add constraint job_description_bounds check(length(description)<=4000 and (status in ('draft','cancelled') or length(btrim(description))>=15));
alter table public.job_requests add constraint submitted_job_category check(status in ('draft','cancelled') or category_id is not null);
alter table public.job_requests add column version integer not null default 1 check(version>0);
alter table public.job_requests add column draft_step integer not null default 0 check(draft_step between 0 and 5);
alter table public.job_requests add column time_slots jsonb not null default '[]' check(jsonb_typeof(time_slots)='array' and jsonb_array_length(time_slots)<=3);
alter table public.job_requests add column contact_window text not null default '' check(length(contact_window)<=200);
alter table private.job_locations alter column exact_point drop not null;
create table private.job_dispatch (
 job_id uuid primary key references public.job_requests(id) on delete cascade,
 area_id uuid references public.service_areas(id),
 waves integer not null default 0 check(waves between 0 and 3),
 next_wave_at timestamptz,
 submitted_at timestamptz,
 expires_at timestamptz,
 approximate boolean not null default false
);
create table private.user_blocks (
 owner_id uuid not null references auth.users(id),
 subject_id uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 primary key(owner_id,subject_id),
 check(owner_id<>subject_id)
);
create index user_blocks_subject_idx on private.user_blocks(subject_id,owner_id);
create table private.worker_match_settings (
 worker_id uuid primary key references public.worker_profiles(id) on delete cascade,
 urgent_ready boolean not null default false,
 daily_limit integer not null default 6 check(daily_limit between 1 and 12)
);
create table private.worker_schedule_blocks (
 id uuid primary key default gen_random_uuid(),
 worker_id uuid not null references public.worker_profiles(id) on delete cascade,
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 check(ends_at>starts_at and ends_at<=starts_at+interval '31 days')
);
create index worker_schedule_blocks_worker_idx on private.worker_schedule_blocks(worker_id,starts_at,ends_at);
create table private.job_assets (
 id uuid primary key default gen_random_uuid(),
 job_id uuid not null references public.job_requests(id) on delete cascade,
 owner_id uuid not null references auth.users(id),
 storage_path text not null unique,
 sha256 text not null check(length(sha256)=64),
 byte_size integer not null check(byte_size between 1 and 3145728),
 state text not null default 'pending' check(state in ('pending','stored','purge_pending','purged')),
 retain_until timestamptz not null,
 created_at timestamptz not null default now()
);
create index job_assets_owner_job_idx on private.job_assets(owner_id,job_id,state);
create function private.check_job_asset() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.owner_id is distinct from (select j.client_id from public.job_requests j where j.id=new.job_id) then raise exception 'Job media must belong to the request owner';end if;
 if tg_op='UPDATE' and (new.id<>old.id or new.owner_id<>old.owner_id or new.job_id<>old.job_id or new.storage_path<>old.storage_path or new.sha256<>old.sha256 or new.byte_size<>old.byte_size or new.retain_until>old.retain_until) then raise exception 'Job media identity and retention are immutable';end if;
 if new.retain_until>new.created_at+interval '90 days' then raise exception 'Job media retention exceeds its limit';end if;
 return new;
end;$$;
create trigger job_asset_integrity before insert or update on private.job_assets for each row execute function private.check_job_asset();
alter table public.job_matches add column wave integer not null default 1 check(wave between 1 and 3);
alter table public.job_matches add column rationale text not null default '';
alter table public.notifications add column source_outbox_id uuid unique references private.notification_outbox(id);

do $$ declare t text; begin
 foreach t in array array['job_dispatch','user_blocks','worker_match_settings','worker_schedule_blocks','job_assets'] loop
  execute format('alter table private.%I enable row level security',t);
  execute format('revoke all on private.%I from public,anon,authenticated',t);
  execute format('grant select,insert,update,delete on private.%I to service_role',t);
 end loop;
end $$;
-- A matched browser must not bypass current eligibility/expiry or see internal
-- scores/object keys. Owner drafts still have the existing owner RLS policy.
create policy jobs_owner_dto_boundary on public.job_requests as restrictive for select to authenticated
 using(client_id=(select auth.uid()));
create policy matches_server_dto_boundary on public.job_matches as restrictive for select to authenticated using(false);
create policy job_media_server_dto_boundary on public.job_media as restrictive for select to authenticated using(false);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('job-requests','job-requests',false,3145728,array['image/jpeg'])
 on conflict(id) do update set public=false,file_size_limit=3145728,allowed_mime_types=array['image/jpeg'];
create policy job_objects_deny on storage.objects as restrictive for all to anon,authenticated
 using(bucket_id<>'job-requests') with check(bucket_id<>'job-requests');
create policy job_bucket_deny on storage.buckets as restrictive for all to anon,authenticated
 using(id<>'job-requests') with check(id<>'job-requests');

-- Eligibility precedes scoring. This function is never exposed as browser RPC.
-- Broad 150 km ST_DWithin supports the existing GIST index, followed by the
-- actual per-worker radius. Town-only requests require explicit town coverage.
create function private.job_candidates(p_job uuid,p_worker uuid default null,p_existing boolean default false)
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
 where j.id=p_job and j.status in ('open','matching')
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
revoke all on function private.job_candidates(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function private.job_candidates(uuid,uuid,boolean) to service_role;
revoke all on function private.check_job_asset() from public,anon,authenticated;
grant execute on function private.check_job_asset() to service_role;
commit;
