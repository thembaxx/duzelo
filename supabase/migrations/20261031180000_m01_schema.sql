-- Duzelo Milestone 01: REVISED baseline (never apply the reference blueprints directly).
-- Target: isolated Supabase PostgreSQL 17, reviewed migration and pgTAP tests required.
-- This is a reference migration baseline; application mutation functions and tests are specified in the PRD.
-- If PostGIS already exists outside `extensions`, audit first; never DROP EXTENSION CASCADE on an existing project.
begin;
create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
create schema if not exists private;

create type public.worker_status as enum ('draft','pending_review','needs_changes','approved','suspended','rejected');
create type public.job_status as enum ('draft','open','matching','quoted','booked','in_progress','completion_pending','completed','cancelled','expired','disputed');
create type public.quote_status as enum ('draft','submitted','withdrawn','rejected','accepted','expired','superseded');
create type public.booking_status as enum ('pending_worker','confirmed','declined','cancelled','in_progress','completion_pending','completed','disputed');
create type public.payment_state as enum ('created','pending','succeeded','failed','cancelled','refunded','partially_refunded','disputed');
create type public.payment_method as enum ('direct_cash','direct_eft','online');

-- Identity and worker directory. One auth user may be client and worker.
create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) between 2 and 80),
  avatar_path text,
  preferred_locale text not null default 'en' check (preferred_locale in ('en','zu','ss')),
  accessibility_prefs jsonb not null default '{}'::jsonb check (jsonb_typeof(accessibility_prefs)='object'),
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label_en text not null,
  parent_id uuid references public.service_categories(id),
  requires_trade_review boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0
);
create table public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  display_name text not null,
  registration_number text,
  bio text,
  status public.worker_status not null default 'draft',
  created_at timestamptz not null default now()
);
create index business_profiles_owner_idx on public.business_profiles(owner_id);
create table public.worker_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id),
  business_id uuid references public.business_profiles(id),
  slug text unique,
  display_name text not null,
  bio text,
  status public.worker_status not null default 'draft',
  years_experience smallint check (years_experience between 0 and 80),
  is_available boolean not null default true,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index worker_profiles_business_idx on public.worker_profiles(business_id);
create table public.worker_services (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.worker_profiles(id) on delete cascade,
  category_id uuid not null references public.service_categories(id),
  title text not null,
  description text,
  price_model text not null check (price_model in ('fixed','from','quote','inspection')),
  price_cents bigint check (price_cents is null or price_cents >= 0),
  currency char(3) not null default 'ZAR' check (currency='ZAR'),
  active boolean not null default true,
  unique(worker_id, category_id, title)
);
create index worker_services_category_idx on public.worker_services(category_id, worker_id);

-- Sanitized PUBLIC listing, published only by server after review.
-- Approximate map marker represents a town/suburb centre, never a worker's base/home.
create table public.worker_cards (
  worker_id uuid primary key references public.worker_profiles(id) on delete cascade,
  slug text not null unique,
  public_name text not null,
  short_bio text,
  town_label text not null,
  -- No map point is exposed until reviewed town centroid data exists in Milestone 04.
  approx_marker extensions.geography(Point,4326) check (approx_marker is null),
  valid_through date,
  category_ids uuid[] not null default '{}',
  avatar_path text,
  verified_identity boolean not null default false,
  verified_trade_category_ids uuid[] not null default '{}',
  completed_jobs integer not null default 0 check (completed_jobs>=0),
  rating_average numeric(3,2) check (rating_average between 1 and 5),
  rating_count integer not null default 0 check (rating_count>=0),
  is_available boolean not null default true,
  published_at timestamptz not null default now()
);
create index worker_cards_category_gin_idx on public.worker_cards using gin(category_ids);
create index worker_cards_approx_gist_idx on public.worker_cards using gist(approx_marker);
-- Fail closed if a privileged publisher attempts to expose an unapproved worker.
-- This does not replace category-specific verification checks in server commands.
create function private.enforce_approved_worker_card() returns trigger language plpgsql
security invoker set search_path = '' as $$
begin
  if not exists (
    select 1 from public.worker_profiles w
    join public.user_profiles u on u.user_id = w.user_id
    where w.id = new.worker_id and w.status = 'approved' and not u.is_suspended
  ) then
    raise exception 'Worker card may only be published for approved, unsuspended workers';
  end if;
  if cardinality(new.category_ids) = 0 or exists (
    select 1 from unnest(new.category_ids) as category(id)
    left join public.service_categories c on c.id = category.id and c.active
    left join public.worker_services s
      on s.worker_id = new.worker_id and s.category_id = category.id and s.active
    where c.id is null or s.id is null
  ) then
    raise exception 'Listing categories require an active service offering';
  end if;

  if not exists (
    select 1 from private.worker_verifications v
    where v.worker_id = new.worker_id
      and v.kind = 'identity' and v.status = 'approved'
      and (v.expiry_date is null or v.expiry_date >= current_date)
  ) then
    raise exception 'Listing requires approved, current identity verification';
  end if;

  if exists (
    select 1 from public.service_categories c
    where c.id = any(new.category_ids) and c.requires_trade_review
      and not exists (
        select 1 from private.worker_verifications v
        where v.worker_id = new.worker_id and v.category_id = c.id
          and v.kind = 'trade' and v.status = 'approved'
          and (v.expiry_date is null or v.expiry_date >= current_date)
      )
  ) then
    raise exception 'Listing requires category-specific trade approval';
  end if;

  new.verified_identity := true;
  new.verified_trade_category_ids := coalesce((
    select array_agg(distinct v.category_id)
    from private.worker_verifications v
    where v.worker_id = new.worker_id
      and v.kind = 'trade' and v.status = 'approved'
      and v.category_id = any(new.category_ids)
      and (v.expiry_date is null or v.expiry_date >= current_date)
  ), '{}'::uuid[]);
  new.valid_through := (
    select min(v.expiry_date)
    from private.worker_verifications v
    where v.worker_id = new.worker_id and v.status = 'approved'
      and (v.kind = 'identity' or
        (v.kind = 'trade' and v.category_id = any(new.category_ids)))
      and v.expiry_date is not null
  );
  -- Keep coordinate publication disabled until a vetted town centroid FK exists.
  new.approx_marker := null;
  return new;
end; $;
revoke execute on function private.enforce_approved_worker_card() from public, anon, authenticated;
create trigger worker_card_approved_before_publish
  before insert or update on public.worker_cards
  for each row execute function private.enforce_approved_worker_card();
-- Prevent stale public listings if approval is revoked, even when application code forgets to unpublish.
create function private.unpublish_nonapproved_worker_card() returns trigger language plpgsql
security invoker set search_path = '' as $$
begin
  if new.status <> 'approved' then
    delete from public.worker_cards where worker_id = new.id;
  end if;
  return new;
end; $$;
revoke execute on function private.unpublish_nonapproved_worker_card() from public, anon, authenticated;
create trigger worker_status_unpublish_after_change
  after update of status on public.worker_profiles
  for each row when (old.status is distinct from new.status)
  execute function private.unpublish_nonapproved_worker_card();

-- A whole-account suspension must revoke public visibility, independently of worker status.
create function private.unpublish_suspended_account_worker_cards() returns trigger language plpgsql
security invoker set search_path = '' as $$
begin
  if new.is_suspended then
    delete from public.worker_cards where worker_id in (
      select id from public.worker_profiles where user_id = new.user_id
    );
  end if;
  return new;
end; $$;
revoke execute on function private.unpublish_suspended_account_worker_cards() from public, anon, authenticated;
create trigger user_suspension_unpublish_worker_cards
  after update of is_suspended on public.user_profiles
  for each row when (old.is_suspended is distinct from new.is_suspended)
  execute function private.unpublish_suspended_account_worker_cards();


-- Exact coordinates, residential addresses and sensitive worker controls are PRIVATE.
create table private.client_addresses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  label text not null,
  street_address text not null,
  suburb text,
  town text not null,
  province text not null default 'Mpumalanga',
  postal_code text,
  access_instructions text,
  point extensions.geography(Point,4326) not null,
  created_at timestamptz not null default now()
);
create index client_addresses_owner_idx on private.client_addresses(owner_id);
create index client_addresses_gist_idx on private.client_addresses using gist(point);
create table private.worker_coverage (
  worker_id uuid primary key references public.worker_profiles(id) on delete cascade,
  base_point extensions.geography(Point,4326) not null,
  radius_km integer not null default 20 check(radius_km between 1 and 150),
  town_allowlist text[] not null default '{}',
  travel_fee_cents bigint not null default 0 check (travel_fee_cents >= 0),
  updated_at timestamptz not null default now()
);
create index worker_coverage_base_gist_idx on private.worker_coverage using gist(base_point);
create table private.worker_verifications (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.worker_profiles(id),
  kind text not null check(kind in ('identity','business','trade','reference')),
  category_id uuid references public.service_categories(id),
  status text not null default 'submitted' check(status in ('submitted','under_review','approved','rejected','expired')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  expiry_date date,
  internal_notes text,
  created_at timestamptz not null default now()
);
create index worker_verifications_worker_idx on private.worker_verifications(worker_id);
-- Administrative authority is server-granted only; never driven by user_metadata.
create table private.admin_members (
  user_id uuid primary key references auth.users(id),
  admin_role text not null check(admin_role in ('owner','verification','support','finance','read_only')),
  active boolean not null default true,
  granted_by uuid references auth.users(id),
  granted_at timestamptz not null default now()
);
create table private.command_idempotency (
  actor_id uuid not null references auth.users(id),
  idempotency_key text not null,
  request_hash text not null,
  response_json jsonb,
  status text not null default 'in_progress' check(status in ('in_progress','completed','failed')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key(actor_id,idempotency_key)
);
create index command_idempotency_expiry_idx on private.command_idempotency(expires_at);
create table private.verification_documents (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null references private.worker_verifications(id) on delete cascade,
  storage_path text not null unique,
  original_name text,
  content_type text,
  uploaded_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Approved verifications require a real active reviewer, not a worker self-approval.
create function private.guard_verification_review() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.kind = 'trade' and new.category_id is null then
    raise exception 'Trade verification requires a category';
  end if;
  if new.status = 'approved' then
    if new.reviewed_by is null or new.reviewed_at is null then
      raise exception 'Approved verification requires a dated manual review';
    end if;
    if not exists (
      select 1 from private.admin_members a
      where a.user_id = new.reviewed_by and a.active
        and a.admin_role in ('owner','verification')
    ) then
      raise exception 'Verification reviewer must be an active authorized administrator';
    end if;
    if exists (
      select 1 from public.worker_profiles w
      where w.id = new.worker_id and w.user_id = new.reviewed_by
    ) then
      raise exception 'Self approval is forbidden';
    end if;
  end if;
  return new;
end; $$;
revoke execute on function private.guard_verification_review() from public, anon, authenticated;
create trigger enforce_manual_verification before insert or update
  on private.worker_verifications for each row
  execute function private.guard_verification_review();

-- Any verification change invalidates the previously published card.
-- Admin must re-publish after reviewing the full set of current evidence.
create function private.unpublish_on_verification_change() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    delete from public.worker_cards where worker_id = old.worker_id;
    return old;
  end if;
  delete from public.worker_cards where worker_id = new.worker_id;
  return new;
end; $$;
revoke execute on function private.unpublish_on_verification_change() from public, anon, authenticated;
create trigger worker_verification_invalidate_card
  after insert or update or delete on private.worker_verifications
  for each row execute function private.unpublish_on_verification_change();

-- Team management is out of scope. A linked business must belong to the worker.
create function private.enforce_worker_business_owner() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.business_id is not null and not exists (
    select 1 from public.business_profiles b
    where b.id = new.business_id and b.owner_id = new.user_id
  ) then
    raise exception 'Cross-owner worker/business links require a future audited team model';
  end if;
  return new;
end; $$;
revoke execute on function private.enforce_worker_business_owner() from public, anon, authenticated;
create trigger worker_business_owner_guard before insert or update of business_id,user_id
  on public.worker_profiles for each row execute function private.enforce_worker_business_owner();

-- Job request has coarse town only; the exact point/address is private.
create table public.job_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id),
  category_id uuid not null references public.service_categories(id),
  requested_worker_id uuid references public.worker_profiles(id),
  title text not null check (length(btrim(title)) between 5 and 140),
  description text not null check (length(btrim(description)) between 15 and 4000),
  public_town text not null,
  urgency text not null check(urgency in ('urgent','scheduled','flexible')),
  preferred_start timestamptz,
  preferred_end timestamptz,
  budget_min_cents bigint check (budget_min_cents is null or budget_min_cents>=0),
  budget_max_cents bigint check (budget_max_cents is null or budget_max_cents>=0),
  status public.job_status not null default 'draft',
  visibility text not null default 'matched' check(visibility in ('direct','matched')),
  quote_deadline timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (preferred_end is null or preferred_start is null or preferred_end>preferred_start),
  check (budget_min_cents is null or budget_max_cents is null or budget_min_cents <= budget_max_cents)
);
create index job_requests_client_idx on public.job_requests(client_id, created_at desc);
create index job_requests_category_status_idx on public.job_requests(category_id, status);
create table private.job_locations (
  job_id uuid primary key references public.job_requests(id) on delete cascade,
  address_id uuid references private.client_addresses(id),
  exact_point extensions.geography(Point,4326) not null,
  service_address_snapshot jsonb not null check (jsonb_typeof(service_address_snapshot)='object'),
  access_notes text,
  created_at timestamptz not null default now()
);
create index job_locations_point_gist_idx on private.job_locations using gist(exact_point);
-- An address selected for a job must belong to that job's actual client.
create function private.guard_job_address_owner() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.address_id is not null and not exists (
    select 1 from private.client_addresses a
    join public.job_requests j on j.client_id = a.owner_id
    where a.id = new.address_id and j.id = new.job_id
  ) then
    raise exception 'Job address must belong to the requesting client';
  end if;
  return new;
end; $$;
revoke execute on function private.guard_job_address_owner() from public, anon, authenticated;
create trigger job_address_ownership before insert or update
  on private.job_locations for each row execute function private.guard_job_address_owner();

-- Explicitly authorized site inspections can reveal exact job address only temporarily.
create table private.inspection_access_grants (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.job_requests(id) on delete cascade,
  worker_id uuid not null references public.worker_profiles(id),
  granted_by_client_id uuid not null references auth.users(id),
  approved_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  reason text not null,
  check(expires_at > approved_at)
);
create index inspection_access_grants_lookup_idx on private.inspection_access_grants(job_id,worker_id,expires_at);
-- A time-limited inspection grant is valid only for the job owner and its matched worker.
create function private.guard_inspection_grant() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (
    select 1 from public.job_requests j
    where j.id = new.job_id and j.client_id = new.granted_by_client_id
  ) or not exists (
    select 1 from public.job_matches jm
    where jm.job_id = new.job_id and jm.worker_id = new.worker_id
      and jm.status in ('invited','viewed','responded')
  ) then
    raise exception 'Inspection grant requires job owner and eligible matched worker';
  end if;
  return new;
end; $$;
revoke execute on function private.guard_inspection_grant() from public, anon, authenticated;
create trigger inspection_grant_ownership before insert or update
  on private.inspection_access_grants for each row execute function private.guard_inspection_grant();

create table public.job_media (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.job_requests(id) on delete cascade,
  storage_path text not null,
  kind text not null check (kind in ('request','progress','completion')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index job_media_job_idx on public.job_media(job_id);

-- Server-created match entries are the authority for who may view a matched job.
create table public.job_matches (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.job_requests(id) on delete cascade,
  worker_id uuid not null references public.worker_profiles(id),
  match_score integer not null check (match_score between 0 and 100),
  status text not null default 'invited' check (status in ('invited','viewed','declined','responded','expired')),
  dispatched_at timestamptz,
  expires_at timestamptz,
  unique(job_id, worker_id)
);
create index job_matches_worker_idx on public.job_matches(worker_id, status);
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.job_requests(id),
  worker_id uuid not null references public.worker_profiles(id),
  version integer not null default 1 check (version > 0),
  status public.quote_status not null default 'draft',
  pricing_type text not null check(pricing_type in ('fixed','estimate','inspection_required')),
  subtotal_cents bigint check (subtotal_cents is null or subtotal_cents >= 0),
  travel_fee_cents bigint not null default 0 check(travel_fee_cents>=0),
  total_cents bigint check(total_cents is null or total_cents>=0),
  currency char(3) not null default 'ZAR' check(currency='ZAR'),
  scope text not null,
  exclusions text,
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(job_id, worker_id, version)
);
create index quotes_job_idx on public.quotes(job_id, status);
-- A quote must come from a worker actually matched/invited to the same job.
alter table public.quotes add constraint quote_worker_job_match_fk
  foreign key (job_id, worker_id) references public.job_matches(job_id, worker_id);
alter table public.quotes add constraint quote_job_worker_id_unique unique (id, job_id, worker_id);
create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) not null check(quantity>0),
  unit_price_cents bigint not null check(unit_price_cents>=0),
  sort_order integer not null default 0
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.job_requests(id),
  quote_id uuid references public.quotes(id),
  worker_id uuid not null references public.worker_profiles(id),
  status public.booking_status not null default 'pending_worker',
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  final_total_cents bigint check(final_total_cents is null or final_total_cents>=0),
  completion_requested_at timestamptz,
  completion_confirmed_at timestamptz,
  cancelled_at timestamptz,
  version integer not null default 1 check(version>0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (scheduled_end is null or scheduled_start is null or scheduled_end>scheduled_start)
);
create index bookings_worker_idx on public.bookings(worker_id,status);
-- Prevent linking an accepted quote from a different job or provider.
alter table public.bookings add constraint booking_quote_same_job_worker_fk
  foreign key (quote_id, job_id, worker_id) references public.quotes(id, job_id, worker_id);
create table public.booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  actor_id uuid references auth.users(id),
  event_type text not null,
  from_status text,
  to_status text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index booking_events_booking_idx on public.booking_events(booking_id,created_at);
create table public.change_orders (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id),
  requested_by uuid not null references auth.users(id),
  scope_change text not null,
  delta_cents bigint not null,
  status text not null default 'proposed' check (status in ('proposed','accepted','rejected','withdrawn')),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.job_requests(id),
  kind text not null default 'job' check(kind in ('job','support')),
  created_at timestamptz not null default now()
);
create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (conversation_id,user_id)
);
create index conversation_members_user_idx on public.conversation_members(user_id,conversation_id);
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id),
  body text not null check(length(body) between 1 and 4000),
  sent_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index messages_conversation_idx on public.messages(conversation_id,sent_at);

-- Payment intents and ledgers are PRIVATE. All amounts are integer ZAR cents; no card/PAN data.
-- Client/worker payment summaries must come from authorized, minimal server response DTOs.
create table private.payment_intents (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id),
  payer_id uuid not null references auth.users(id),
  method public.payment_method not null,
  provider text,
  provider_reference text unique,
  amount_cents bigint not null check(amount_cents>0),
  currency char(3) not null default 'ZAR' check(currency='ZAR'),
  status public.payment_state not null default 'created',
  direct_attested_by uuid references auth.users(id),
  direct_confirmed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((method='online' and provider is not null) or (method<>'online' and provider is null))
);
create index payment_intents_booking_idx on private.payment_intents(booking_id,status);
create table private.payment_ledger (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references private.payment_intents(id),
  entry_kind text not null check(entry_kind in ('charge','refund','fee','adjustment')),
  amount_cents bigint not null,
  external_reference text,
  created_at timestamptz not null default now(),
  unique(payment_id,entry_kind,external_reference)
);
create table private.provider_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_dedupe_key text not null,
  payload jsonb not null,
  status text not null default 'received' check(status in ('received','processed','failed')),
  processed_at timestamptz,
  received_at timestamptz not null default now(),
  unique(provider,event_dedupe_key)
);
create table private.payout_accounts (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.worker_profiles(id),
  provider text not null,
  encrypted_token text not null,
  last4 text,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id),
  author_id uuid not null references auth.users(id),
  subject_user_id uuid not null references auth.users(id),
  stars smallint not null check(stars between 1 and 5),
  comment text check(comment is null or length(comment)<=2000),
  moderation_status text not null default 'pending' check(moderation_status in ('pending','published','hidden')),
  created_at timestamptz not null default now(),
  unique(booking_id,author_id),
  check(author_id <> subject_user_id)
);
create index reviews_subject_idx on public.reviews(subject_user_id,moderation_status);
create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id),
  opened_by uuid not null references auth.users(id),
  reason text not null,
  status text not null default 'open' check(status in ('open','investigating','awaiting_evidence','resolved','closed')),
  resolution text,
  handled_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index disputes_booking_idx on public.disputes(booking_id);
create table public.safety_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id),
  subject_user_id uuid references auth.users(id),
  job_id uuid references public.job_requests(id),
  reason text not null,
  status text not null default 'open' check(status in ('open','triaged','resolved','dismissed')),
  created_at timestamptz not null default now()
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  kind text not null,
  title text not null,
  body text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id,read_at,created_at desc);
create table private.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique,
  user_id uuid not null references auth.users(id),
  channel text not null check(channel in ('in_app','email','push','sms')),
  template text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check(status in ('pending','sending','sent','failed','dead_letter')),
  attempts smallint not null default 0,
  available_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index notification_outbox_ready_idx on private.notification_outbox(status,available_at);
create table private.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  actor_type text not null check(actor_type in ('user','admin','system','webhook')),
  action text not null,
  resource_kind text not null,
  resource_id uuid,
  metadata_redacted jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index audit_events_resource_idx on private.audit_events(resource_kind,resource_id,occurred_at desc);
-- Audit trails and booking status events are strictly append-only, including for service_role.
create function private.prevent_event_mutation() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  raise exception 'Append-only event history cannot be updated or deleted';
end; $$;
revoke execute on function private.prevent_event_mutation() from public, anon, authenticated;
create trigger booking_events_immutable before update or delete
  on public.booking_events for each row execute function private.prevent_event_mutation();
create trigger audit_events_immutable before update or delete
  on private.audit_events for each row execute function private.prevent_event_mutation();


-- RLS enabled on EVERY public/private application table. Access policies are applied by the separate locked-down migration.
do $$
declare rec record;
begin
  for rec in
    select schemaname, tablename from pg_tables
    where schemaname in ('public','private')
      and tablename in (
        'user_profiles','service_categories','business_profiles','worker_profiles','worker_services','worker_cards',
        'client_addresses','worker_coverage','worker_verifications','verification_documents','admin_members','command_idempotency','inspection_access_grants',
        'job_requests','job_locations','job_media','job_matches','quotes','quote_items','bookings',
        'booking_events','change_orders','conversations','conversation_members','messages',
        'payment_intents','payment_ledger','provider_webhook_events','payout_accounts',
        'reviews','disputes','safety_reports','notifications','notification_outbox','audit_events')
  loop
    execute format('alter table %I.%I enable row level security',rec.schemaname,rec.tablename);
  end loop;
end $$;
commit;
