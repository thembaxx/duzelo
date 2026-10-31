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
 state text not null default 'pending' check(state in ('pending','stored','purge_pending','purged')),
 public_approved boolean not null default false,
 retain_until timestamptz not null,
 created_at timestamptz not null default now(),
 check((kind='trade')=(category_id is not null)),
 check(not public_approved or kind in ('avatar','portfolio'))
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
revoke all on storage.objects,storage.buckets from anon,authenticated;
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
  where v.worker_id=new.worker_id and v.status='approved' and a.state='stored' and d.deleted_at is null;
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
create trigger worker_asset_invalidate after update of state on private.worker_assets for each row when(old.state is distinct from new.state) execute function private.invalidate_asset_card();
create or replace function private.local_sms_test_hook(event jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
begin
 if ltrim(coalesce(event->'user'->>'phone',''),'+') not in ('27820000001','27820000002','27820000003','27820000004','27820000005','27820000006') then raise exception 'Local SMS adapter rejects non-fixture numbers'; end if;
 return '{}'::jsonb;
end;$$;
-- The six confirmed taxonomy entries are migration data, not worker inventory.
-- The local seed references these stable category IDs.
insert into public.service_categories(id,slug,label_en,requires_trade_review) values
 ('20000000-0000-0000-0000-000000000001','plumbing','Plumbing',true),
 ('20000000-0000-0000-0000-000000000002','cleaning','Cleaning',false),
 ('20000000-0000-0000-0000-000000000003','home-repairs','Home repairs',false),
 ('20000000-0000-0000-0000-000000000004','electrical','Electrical',true),
 ('20000000-0000-0000-0000-000000000005','gardening','Gardening',false),
 ('20000000-0000-0000-0000-000000000006','painting','Painting',false);
create function private.check_verification_asset() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.asset_id is not null and not exists(
  select 1 from private.worker_assets a join private.worker_verifications v on v.id=new.verification_id
  where a.id=new.asset_id and a.worker_id=v.worker_id and a.application_revision=v.application_revision
  and a.kind=v.kind and a.category_id is not distinct from v.category_id and a.state='stored'
 ) then raise exception 'Verification and evidence must belong to the same worker and revision'; end if;
 return new;
end;$$;
create trigger verification_asset_integrity before insert or update on private.verification_documents for each row execute function private.check_verification_asset();
commit;
