-- M03 isolated worker onboarding and private evidence. No browser mutations.
begin;
create table private.worker_applications (
 worker_id uuid primary key references public.worker_profiles(id),
 revision integer not null default 1 check(revision>0),
 state text not null default 'draft' check(state in ('draft','pending_review','needs_changes','reviewed')),
 area_id uuid not null references public.service_areas(id),
 draft_json jsonb not null,
 submitted_at timestamptz,
 updated_at timestamptz not null default now()
);
alter table private.worker_applications enable row level security;
alter table private.worker_verifications add column application_revision integer not null default 0;
alter table private.worker_verifications add column worker_reason text;
alter table private.worker_verifications drop constraint worker_verifications_status_check;
alter table private.worker_verifications add constraint worker_verifications_status_check check(status in ('submitted','under_review','approved','rejected','expired','needs_changes'));
create unique index worker_verification_revision_kind_idx on private.worker_verifications(worker_id,application_revision,kind,category_id) nulls not distinct;
create table private.worker_assets (
 id uuid primary key,
 worker_id uuid not null references public.worker_profiles(id),
 application_revision integer not null,
 kind text not null check(kind in ('identity','business','trade','avatar','portfolio')),
 category_id uuid references public.service_categories(id),
 storage_path text not null unique,
 sha256 text not null check(length(sha256)=64),
 byte_size integer not null check(byte_size between 1 and 3145728),
 caption text not null default '',
 scan_status text not null default 'pending' check(scan_status in ('pending','clean')),
 scanned_at timestamptz,
 state text not null default 'pending' check(state in ('pending','stored','purge_pending','purged')),
 public_approved boolean not null default false,
 retain_until timestamptz not null,
 created_at timestamptz not null default now(),
 check((kind='trade')=(category_id is not null)),
 check(not public_approved or kind in ('avatar','portfolio')),
 check(state<>'stored' or (scan_status='clean' and scanned_at is not null))
);
alter table private.worker_assets enable row level security;
create index worker_assets_worker_idx on private.worker_assets(worker_id,application_revision);
create index worker_assets_retention_idx on private.worker_assets(retain_until) where state<>'purged';
alter table private.verification_documents add column asset_id uuid unique references private.worker_assets(id);
revoke all on private.worker_applications,private.worker_assets from public,anon,authenticated;
grant select,insert,update,delete on private.worker_applications,private.worker_assets to service_role;
-- Private storage, server-mediated writes and signed access only. Never upsert
-- an owner's raw file or grant browser policies that bypass image validation.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values ('worker-evidence','worker-evidence',false,3145728,array['image/jpeg'])
 on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
-- Storage owns and may restore its table grants at startup. RLS is the
-- durable boundary: restrictive policies defeat even a future broad allow.
create policy worker_evidence_objects_deny on storage.objects
 as restrictive for all to anon,authenticated
 using (bucket_id <> 'worker-evidence') with check (bucket_id <> 'worker-evidence');
create policy worker_evidence_bucket_deny on storage.buckets
 as restrictive for all to anon,authenticated
 using (id <> 'worker-evidence') with check (id <> 'worker-evidence');
-- Retention expiry is an authorization boundary, not only a cleanup schedule.
create function private.bound_worker_evidence_expiry() returns trigger
language plpgsql security invoker set search_path='' as $$
declare evidence_until timestamptz;
begin
 if exists(select 1 from private.worker_applications a where a.worker_id=new.worker_id) then
  select min(a.retain_until) into evidence_until
  from private.worker_assets a join private.verification_documents d on d.asset_id=a.id
  join private.worker_verifications v on v.id=d.verification_id
  join private.worker_applications app on app.worker_id=v.worker_id and app.revision=v.application_revision
  where v.worker_id=new.worker_id and v.status='approved' and a.state='stored' and a.retain_until>now() and d.deleted_at is null and (v.kind in ('identity','business') or (v.kind='trade' and v.category_id=any(new.category_ids)));
  if evidence_until is null or evidence_until<=now() then raise exception 'Current stored evidence is required'; end if;
  new.safe_until:=least(new.safe_until,evidence_until);
 end if;
 return new;
end;$$;
create trigger zz_worker_card_evidence_expiry before insert or update on public.worker_cards for each row execute function private.bound_worker_evidence_expiry();
create function private.invalidate_asset_card() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('duzelo.worker-publication',0));
 delete from public.worker_cards where worker_id=new.worker_id;
 return new;
end;$$;
create trigger worker_asset_invalidate after update of state,retain_until,public_approved on private.worker_assets for each row when(old.state is distinct from new.state or old.retain_until is distinct from new.retain_until or old.public_approved is distinct from new.public_approved) execute function private.invalidate_asset_card();
create or replace function private.local_sms_test_hook(event jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
begin
 if ltrim(coalesce(event->'user'->>'phone',''),'+') not in ('27820000001','27820000002','27820000003','27820000004','27820000005','27820000006') then raise exception 'Local SMS adapter rejects non-fixture numbers'; end if;
 return '{}'::jsonb;
end;$$;
-- Confirmed service taxonomy plus the existing electrical review category.
-- These are category definitions, never invented worker inventory.
-- The local seed references these stable category IDs.
insert into public.service_categories(id,slug,label_en,requires_trade_review) values
 ('20000000-0000-0000-0000-000000000001','plumbing','Plumbing',true),
 ('20000000-0000-0000-0000-000000000002','cleaning','Cleaning',false),
 ('20000000-0000-0000-0000-000000000003','home-repairs','Home repairs',false),
 ('20000000-0000-0000-0000-000000000004','electrical','Electrical',true),
 ('20000000-0000-0000-0000-000000000005','gardening','Gardening',false),
 ('20000000-0000-0000-0000-000000000006','painting','Painting',false),
 ('20000000-0000-0000-0000-000000000007','locksmithing','Locksmithing',true),
 ('20000000-0000-0000-0000-000000000008','window-installation','Window installation',false),
 ('20000000-0000-0000-0000-000000000009','installations','Installations',false),
 ('20000000-0000-0000-0000-000000000010','maintenance','Maintenance',false);
create function private.check_verification_asset() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.asset_id is not null and not exists(
  select 1 from private.worker_assets a join private.worker_verifications v on v.id=new.verification_id
  where a.id=new.asset_id and a.worker_id=v.worker_id and a.application_revision=v.application_revision
  and a.kind=v.kind and a.category_id is not distinct from v.category_id and a.state='stored' and v.status='submitted'
 ) then raise exception 'Verification and evidence must belong to the same worker and revision'; end if;
 return new;
end;$$;
create trigger verification_asset_integrity before insert or update of asset_id,verification_id,storage_path on private.verification_documents for each row execute function private.check_verification_asset();
-- Notification/name preferences do not affect worker approval. Suspension does.
drop trigger account_invalidate on public.user_profiles;
create trigger account_invalidate after update of is_suspended on public.user_profiles for each row when(old.is_suspended is distinct from new.is_suspended) execute function private.invalidate_worker_cards();
create trigger account_delete_invalidate after delete on public.user_profiles for each row execute function private.invalidate_worker_cards();
-- File identity and content are immutable; only lifecycle/access can change.
create function private.guard_worker_asset() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if row(new.worker_id,new.application_revision,new.kind,new.category_id,new.storage_path,new.sha256,new.byte_size,new.caption,new.scan_status,new.scanned_at)
 is distinct from row(old.worker_id,old.application_revision,old.kind,old.category_id,old.storage_path,old.sha256,old.byte_size,old.caption,old.scan_status,old.scanned_at)
 or (old.state='purged' and new.state<>'purged')
 or (old.state='purge_pending' and new.state not in ('purge_pending','purged'))
 or (old.state='stored' and new.state='pending')
 or new.retain_until>old.retain_until then raise exception 'Stored evidence identity is immutable'; end if;
 return new;
end;$$;
create trigger worker_asset_immutable before update on private.worker_assets for each row execute function private.guard_worker_asset();

create or replace function private.eligible_worker_categories(p_worker uuid) returns uuid[]
language sql volatile security invoker set search_path = '' as $$
  select coalesce(array_agg(distinct s.category_id order by s.category_id), '{}'::uuid[])
  from public.worker_profiles w
  join public.user_profiles u on u.user_id = w.user_id and not u.is_suspended
  join public.worker_services s on s.worker_id = w.id and s.active
  join public.service_categories c on c.id = s.category_id and c.active
  where w.id = p_worker and w.status = 'approved'
    and exists (
      select 1 from private.worker_verifications v
      join private.admin_members a on a.user_id = v.reviewed_by and a.active
      where v.worker_id = w.id and v.kind = 'identity' and v.status = 'approved'
        and v.reviewed_by <> w.user_id and v.reviewed_at is not null
        and (v.expiry_date is null or v.expiry_date >= current_date)
        and (not exists(select 1 from private.worker_applications app where app.worker_id=w.id)
          or exists(select 1 from private.worker_applications app
             join private.verification_documents d on d.verification_id=v.id and d.deleted_at is null
             join private.worker_assets f on f.id=d.asset_id and f.state='stored' and f.scan_status='clean' and f.retain_until>now()
             where app.worker_id=w.id and app.revision=v.application_revision))
    )
    and (w.business_id is null or exists (
      select 1 from private.worker_verifications v
      join private.admin_members a on a.user_id = v.reviewed_by and a.active
      where v.worker_id = w.id and v.kind = 'business' and v.status = 'approved'
        and exists(select 1 from public.business_profiles b where b.id = w.business_id and b.owner_id = w.user_id and b.status = 'approved')
        and v.reviewed_by <> w.user_id and v.reviewed_at is not null
        and (v.expiry_date is null or v.expiry_date >= current_date)
        and (not exists(select 1 from private.worker_applications app where app.worker_id=w.id)
          or exists(select 1 from private.worker_applications app
             join private.verification_documents d on d.verification_id=v.id and d.deleted_at is null
             join private.worker_assets f on f.id=d.asset_id and f.state='stored' and f.scan_status='clean' and f.retain_until>now()
             where app.worker_id=w.id and app.revision=v.application_revision))
    ))
    and (not c.requires_trade_review or exists (
      select 1 from private.worker_verifications v
      join private.admin_members a on a.user_id = v.reviewed_by and a.active
      where v.worker_id = w.id and v.kind = 'trade' and v.status = 'approved' and v.category_id = c.id
        and v.reviewed_by <> w.user_id and v.reviewed_at is not null
        and (v.expiry_date is null or v.expiry_date >= current_date)
        and (not exists(select 1 from private.worker_applications app where app.worker_id=w.id)
          or exists(select 1 from private.worker_applications app
             join private.verification_documents d on d.verification_id=v.id and d.deleted_at is null
             join private.worker_assets f on f.id=d.asset_id and f.state='stored' and f.scan_status='clean' and f.retain_until>now()
             where app.worker_id=w.id and app.revision=v.application_revision))
    ));
$$;
create function private.invalidate_application_card() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('duzelo.worker-publication',0));
 delete from public.worker_cards where worker_id=coalesce(new.worker_id,old.worker_id);
 return coalesce(new,old);
end;$$;
create trigger worker_application_invalidate after insert or update or delete on private.worker_applications for each row execute function private.invalidate_application_card();
create table private.worker_review_events (
 id uuid primary key default gen_random_uuid(),
 verification_id uuid not null references private.worker_verifications(id),
 worker_id uuid not null references public.worker_profiles(id),
 application_revision integer not null check(application_revision>0),
 reviewer_id uuid not null references auth.users(id),
 decision text not null check(decision in ('approved','rejected','needs_changes')),
 reason text not null check(length(btrim(reason)) between 10 and 500),
 expiry_date date,
 created_at timestamptz not null default now()
);
alter table private.worker_review_events enable row level security;
revoke all on private.worker_review_events from public,anon,authenticated;
grant select,insert on private.worker_review_events to service_role;
create index worker_review_events_verification_idx on private.worker_review_events(verification_id,created_at);
create function private.immutable_worker_review() returns trigger
language plpgsql security invoker set search_path='' as $$
begin raise exception 'Review decisions are append-only'; end;$$;
create trigger worker_review_immutable before update or delete on private.worker_review_events for each row execute function private.immutable_worker_review();
commit;
