-- Reviewed M01 baseline derived from PRD and unexecuted root blueprints.
-- Local migration only. No app auth, approval UI, matching or payments are enabled.
begin;
create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
create schema if not exists private;
-- Fail closed for future objects as well as today's explicitly granted tables.
revoke create on schema public from public, anon, authenticated;
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema private revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema private revoke execute on functions from public, anon, authenticated;


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
  preferred_locale text not null default 'en',
  accessibility_prefs jsonb not null default '{}'::jsonb,
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
  approx_marker extensions.geography(Point,4326),
  category_ids uuid[] not null default '{}',
  avatar_path text,
  verified_identity boolean not null default false,
  verified_trade_category_ids uuid[] not null default '{}',
  completed_jobs integer not null default 0 check (completed_jobs=0),
  rating_average numeric(3,2) check (rating_average is null),
  rating_count integer not null default 0 check (rating_count=0),
  is_available boolean not null default true,
  published_at timestamptz not null default now()
);
create index worker_cards_category_gin_idx on public.worker_cards using gin(category_ids);
create index worker_cards_approx_gist_idx on public.worker_cards using gist(approx_marker);
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
  verification_id uuid not null references private.worker_verifications(id),
  storage_path text not null unique,
  original_name text,
  content_type text,
  uploaded_at timestamptz not null default now(),
  deleted_at timestamptz
);

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
  check ((visibility = 'direct' and requested_worker_id is not null) or (visibility = 'matched' and requested_worker_id is null)),
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
  service_address_snapshot jsonb not null,
  access_notes text,
  created_at timestamptz not null default now()
);
create index job_locations_point_gist_idx on private.job_locations using gist(exact_point);
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
  unique(job_id, worker_id, version),
  check ((pricing_type = 'inspection_required' and subtotal_cents is null and total_cents is null)
     or (pricing_type <> 'inspection_required' and subtotal_cents is not null and total_cents is not null and total_cents = subtotal_cents + travel_fee_cents))
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
  quote_id uuid not null references public.quotes(id),
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
  booking_id uuid not null references public.bookings(id),
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


-- Public coarse areas are server-curated town centroids, never worker base coordinates.
create table public.service_areas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null unique,
  centroid extensions.geography(Point,4326) not null,
  active boolean not null default true
);
create table private.business_details (
  business_id uuid primary key references public.business_profiles(id),
  registration_number text
);

-- Publication cannot bypass manual identity and per-category credential review.
-- This returns only categories currently eligible for public discovery.
create function private.eligible_worker_categories(p_worker uuid) returns uuid[]
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
    )
    and (w.business_id is null or exists (
      select 1 from private.worker_verifications v
      join private.admin_members a on a.user_id = v.reviewed_by and a.active
      where v.worker_id = w.id and v.kind = 'business' and v.status = 'approved'
        and exists(select 1 from public.business_profiles b where b.id = w.business_id and b.owner_id = w.user_id and b.status = 'approved')
        and v.reviewed_by <> w.user_id and v.reviewed_at is not null
        and (v.expiry_date is null or v.expiry_date >= current_date)
    ))
    and (not c.requires_trade_review or exists (
      select 1 from private.worker_verifications v
      join private.admin_members a on a.user_id = v.reviewed_by and a.active
      where v.worker_id = w.id and v.kind = 'trade' and v.status = 'approved' and v.category_id = c.id
        and v.reviewed_by <> w.user_id and v.reviewed_at is not null
        and (v.expiry_date is null or v.expiry_date >= current_date)
    ));
$$;

create function private.enforce_worker_publication() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare eligible uuid[];
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('duzelo.worker-publication', 0));
  eligible := private.eligible_worker_categories(new.worker_id);
  if cardinality(eligible) = 0 or cardinality(new.category_ids) = 0
    or not new.category_ids <@ eligible then
    raise exception 'Worker publication requires reviewed identity and valid category credentials';
  end if;
  if not new.verified_identity or not new.verified_trade_category_ids <@ new.category_ids
    or exists (select 1 from public.service_categories c where c.id = any(new.verified_trade_category_ids) and not c.requires_trade_review)
    or exists (select 1 from public.service_categories c where c.id = any(new.category_ids) and c.requires_trade_review and not c.id = any(new.verified_trade_category_ids)) then
    raise exception 'Worker verification badges must match reviewed categories';
  end if;
  if not exists (select 1 from public.service_areas a where a.active and a.label = new.town_label
      and new.approx_marker is not null
      and extensions.st_equals(a.centroid::extensions.geometry, new.approx_marker::extensions.geometry)) then
    raise exception 'Public marker must equal a curated coarse area centroid';
  end if;
  return new;
end;
$$;
create trigger worker_card_publication before insert or update on public.worker_cards
  for each row execute function private.enforce_worker_publication();

-- Required on reads too: time-based credential expiry must hide stale rows even
-- before a scheduled unpublisher has run. Avoid private-schema access in RLS.
-- safe_until is server-generated; no client writes/grants exist.
alter table public.worker_cards add column safe_until timestamptz not null default now();
create function private.set_worker_card_expiry() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('duzelo.worker-publication', 0));
  select coalesce(min((v.expiry_date + 1)::timestamp at time zone 'Africa/Johannesburg'), 'infinity'::timestamptz)
    into new.safe_until
    from private.worker_verifications v
    where v.worker_id = new.worker_id and v.status = 'approved'
      and (v.kind in ('identity','business') or (v.kind = 'trade' and v.category_id = any(new.category_ids)));
  return new;
end;
$$;
create trigger worker_card_expiry before insert or update on public.worker_cards
  for each row execute function private.set_worker_card_expiry();

-- Privileged commands may call this after verifying operator MFA and recording
-- the review. It exposes no API RPC and cannot mint approval from user metadata.
create function private.publish_worker_card(p_worker uuid, p_area uuid, p_public_name text, p_short_bio text)
returns void language plpgsql security invoker set search_path = '' as $$
declare categories uuid[];
begin
  categories := private.eligible_worker_categories(p_worker);
  insert into public.worker_cards(worker_id, slug, public_name, short_bio, town_label, approx_marker,
      category_ids, verified_identity, verified_trade_category_ids)
  select w.id, w.slug, p_public_name, p_short_bio, a.label, a.centroid,
    categories, true, array(select c.id from public.service_categories c where c.id = any(categories) and c.requires_trade_review order by c.id)
  from public.worker_profiles w cross join public.service_areas a where w.id = p_worker and a.id = p_area
  on conflict (worker_id) do update set public_name = excluded.public_name, short_bio = excluded.short_bio,
    town_label = excluded.town_label, approx_marker = excluded.approx_marker, category_ids = excluded.category_ids,
    verified_identity = excluded.verified_identity, verified_trade_category_ids = excluded.verified_trade_category_ids,
    published_at = now();
  if not found then raise exception 'Worker or public area is missing'; end if;
end;
$$;

-- Revoke stale publication whenever eligibility inputs change. Jobs do not
-- automatically cancel; support resolution belongs to later command workflows.
create function private.invalidate_worker_cards() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('duzelo.worker-publication', 0));
  if tg_table_name = 'worker_profiles' then
    delete from public.worker_cards where worker_id = coalesce(new.id, old.id);
  elsif tg_table_name = 'user_profiles' then
    delete from public.worker_cards where worker_id in (select w.id from public.worker_profiles w where w.user_id = coalesce(new.user_id, old.user_id));
  elsif tg_table_name in ('worker_verifications', 'worker_services') then
    delete from public.worker_cards where worker_id in (old.worker_id, new.worker_id);
  else
    -- Category, staff membership, business and coarse-area changes are uncommon;
    -- conservative unpublication is safer than retaining an unchecked claim.
    delete from public.worker_cards;
  end if;
  return null;
end;
$$;
create trigger worker_profile_invalidate after update or delete on public.worker_profiles for each row execute function private.invalidate_worker_cards();
create trigger account_invalidate after update or delete on public.user_profiles for each row execute function private.invalidate_worker_cards();
create trigger verification_invalidate after insert or update or delete on private.worker_verifications for each row execute function private.invalidate_worker_cards();
create trigger service_invalidate after insert or update or delete on public.worker_services for each row execute function private.invalidate_worker_cards();
create trigger category_invalidate after update or delete on public.service_categories for each row execute function private.invalidate_worker_cards();
create trigger admin_invalidate after update or delete on private.admin_members for each row execute function private.invalidate_worker_cards();
create trigger business_invalidate after update or delete on public.business_profiles for each row execute function private.invalidate_worker_cards();
create trigger area_invalidate after update or delete on public.service_areas for each row execute function private.invalidate_worker_cards();

create function private.check_booking_quote() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if not exists(select 1 from public.quotes q where q.id = new.quote_id and q.job_id = new.job_id
    and q.worker_id = new.worker_id and q.status = 'accepted' and q.pricing_type <> 'inspection_required'
    and q.total_cents = new.final_total_cents) then
    raise exception 'Booking requires the accepted priced quote for this job and worker';
  end if;
  if tg_op = 'UPDATE' and (new.job_id, new.quote_id, new.worker_id, new.final_total_cents) is distinct from (old.job_id, old.quote_id, old.worker_id, old.final_total_cents) then
    raise exception 'Accepted booking quote references and amount are immutable; use a change order';
  end if;
  return new;
end;
$$;
create trigger booking_quote_guard before insert or update on public.bookings for each row execute function private.check_booking_quote();

create function private.reject_evidence_mutation() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin raise exception 'Audit and financial evidence is append-only'; end;
$$;
create trigger audit_immutable before update or delete or truncate on private.audit_events for each statement execute function private.reject_evidence_mutation();
create trigger ledger_immutable before update or delete or truncate on private.payment_ledger for each statement execute function private.reject_evidence_mutation();
create trigger booking_events_immutable before update or delete or truncate on public.booking_events for each statement execute function private.reject_evidence_mutation();


create function private.validate_inspection_grant() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if not exists(select 1 from public.job_requests j join public.job_matches m on m.job_id = j.id
    where j.id = new.job_id and j.client_id = new.granted_by_client_id and m.worker_id = new.worker_id) then
    raise exception 'Inspection requires consent from the job owner and an invited worker';
  end if;
  return new;
end;
$$;
create trigger inspection_grant_guard before insert or update on private.inspection_access_grants
  for each row execute function private.validate_inspection_grant();


create function private.guard_business_ownership() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.business_id is not null and not exists(select 1 from public.business_profiles b
    where b.id=new.business_id and b.owner_id=new.user_id) then
    raise exception 'Worker business must belong to the same identity; team delegation is disabled';
  end if;
  return new;
end;
$$;
create trigger worker_business_owner before insert or update on public.worker_profiles for each row execute function private.guard_business_ownership();

create function private.freeze_accepted_quote() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if old.status = 'accepted' then
    raise exception 'Accepted quote versions are immutable';
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end;
$$;
create trigger accepted_quote_immutable before update or delete on public.quotes for each row execute function private.freeze_accepted_quote();
create function private.freeze_accepted_quote_items() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  perform 1 from public.quotes q where q.id in (old.quote_id,new.quote_id) order by q.id for update;
  if exists(select 1 from public.quotes q where q.id in (old.quote_id,new.quote_id) and q.status='accepted') then
    raise exception 'Accepted quote items are immutable';
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end;
$$;
create trigger accepted_quote_items_immutable before insert or update or delete on public.quote_items for each row execute function private.freeze_accepted_quote_items();

-- Enable RLS on all application tables; private schema is not exposed to Data API.
do $$ declare rec record; begin
  for rec in select schemaname, tablename from pg_tables where schemaname in ('public','private') loop
    execute format('alter table %I.%I enable row level security', rec.schemaname, rec.tablename);
    execute format('revoke all on table %I.%I from public, anon, authenticated', rec.schemaname, rec.tablename);
    execute format('grant select, insert, update, delete on table %I.%I to service_role', rec.schemaname, rec.tablename);
  end loop;
end $$;
revoke all on schema private from public, anon, authenticated;
grant usage on schema public, extensions to anon, authenticated, service_role;
grant usage on schema private to service_role;
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on all functions in schema private to service_role;
revoke update, delete on private.audit_events, private.payment_ledger, public.booking_events from service_role;
grant select on all tables in schema public to authenticated;
grant select on public.service_categories, public.service_areas, public.worker_cards, public.worker_services to anon;

create policy user_profiles_self_read on public.user_profiles for select to authenticated
  using (user_id = (select auth.uid()) and not is_suspended);
create policy categories_public_read on public.service_categories for select to anon, authenticated
  using (active);
create policy worker_cards_public_read on public.worker_cards for select to anon, authenticated
  using (safe_until > now());
create policy worker_profiles_owner_read on public.worker_profiles for select to authenticated
  using (user_id = (select auth.uid()) and exists(select 1 from public.user_profiles u where u.user_id = worker_profiles.user_id and not u.is_suspended));
create policy business_profiles_owner_read on public.business_profiles for select to authenticated
  using (owner_id = (select auth.uid()) and exists(select 1 from public.user_profiles u where u.user_id=business_profiles.owner_id and not u.is_suspended));
create policy worker_services_public_read on public.worker_services for select to anon
  using (active and exists (select 1 from public.worker_cards c where c.worker_id=worker_services.worker_id and worker_services.category_id = any(c.category_ids)));
create policy worker_services_authenticated_read on public.worker_services for select to authenticated
  using ((active and exists (select 1 from public.worker_cards c where c.worker_id=worker_services.worker_id and worker_services.category_id = any(c.category_ids)))
    or exists (select 1 from public.worker_profiles w where w.id=worker_services.worker_id and w.user_id=(select auth.uid())));

-- IMPORTANT no mutual recursion: job_matches policy only uses worker_profiles, NOT job_requests.
create policy job_matches_worker_read on public.job_matches for select to authenticated
  using (exists (select 1 from public.worker_profiles w where w.id=job_matches.worker_id and w.user_id=(select auth.uid()) and w.status='approved'));
create policy job_requests_participants_read on public.job_requests for select to authenticated
  using (
    (client_id=(select auth.uid()) and exists(select 1 from public.user_profiles u where u.user_id=job_requests.client_id and not u.is_suspended))
    or (status <> 'draft' and exists (
      select 1 from public.job_matches jm join public.worker_profiles w on w.id=jm.worker_id
      where jm.job_id=job_requests.id and w.user_id=(select auth.uid()) and w.status='approved' and jm.status in ('invited','viewed','responded') and (jm.expires_at is null or jm.expires_at > now())
    ))
  );
create policy job_media_participants_read on public.job_media for select to authenticated
  using (
    (kind='request' and exists (select 1 from public.job_requests j where j.id=job_media.job_id))
    or (kind in ('progress','completion') and (
      created_by=(select auth.uid())
      or exists(select 1 from public.job_requests j where j.id=job_media.job_id and j.client_id=(select auth.uid()))
      or exists(select 1 from public.bookings b where b.job_id=job_media.job_id)
    ))
  );
create policy quotes_participants_read on public.quotes for select to authenticated
  using (
    (quotes.status <> 'draft' and exists (select 1 from public.job_requests j where j.id=quotes.job_id and j.client_id=(select auth.uid())))
    or exists (select 1 from public.worker_profiles w where w.id=quotes.worker_id and w.user_id=(select auth.uid()))
  );
create policy quote_items_participants_read on public.quote_items for select to authenticated
  using (exists (select 1 from public.quotes q where q.id=quote_items.quote_id));
create policy bookings_participants_read on public.bookings for select to authenticated
  using (
    exists (select 1 from public.job_requests j where j.id=bookings.job_id and j.client_id=(select auth.uid()))
    or exists (select 1 from public.worker_profiles w where w.id=bookings.worker_id and w.user_id=(select auth.uid()))
  );
create policy booking_events_participants_read on public.booking_events for select to authenticated
  using (exists (select 1 from public.bookings b where b.id=booking_events.booking_id));
create policy change_orders_participants_read on public.change_orders for select to authenticated
  using (exists (select 1 from public.bookings b where b.id=change_orders.booking_id));

create policy conversation_members_own_read on public.conversation_members for select to authenticated
  using (user_id=(select auth.uid()) and exists(select 1 from public.user_profiles u where u.user_id=conversation_members.user_id and not u.is_suspended));
create policy conversations_member_read on public.conversations for select to authenticated
  using (exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id=conversations.id and cm.user_id=(select auth.uid())
  ));
create policy messages_member_read on public.messages for select to authenticated
  using (exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id=messages.conversation_id and cm.user_id=(select auth.uid())
  ));

-- All payment intents, payment ledger entries and provider events reside in the private schema.
-- There are NO direct client SELECT policies: server routes return redacted booking-specific DTOs
-- after authenticating and authorizing the caller. This avoids revealing provider references,
-- internal reconciliations, payment metadata and other financial records by accident.

create policy reviews_published_or_owner_read on public.reviews for select to authenticated
  using (author_id=(select auth.uid()) or subject_user_id=(select auth.uid()));
create policy disputes_party_read on public.disputes for select to authenticated
  using (opened_by=(select auth.uid()) or exists(select 1 from public.bookings b where b.id=disputes.booking_id));
create policy reports_author_read on public.safety_reports for select to authenticated
  using (reporter_id=(select auth.uid()));
create policy notifications_recipient_read on public.notifications for select to authenticated
  using (user_id=(select auth.uid()) and exists(select 1 from public.user_profiles u where u.user_id=notifications.user_id and not u.is_suspended));

-- No INSERT/UPDATE/DELETE policies for anonymous/authenticated clients: intentional default deny.
-- Any future direct browser writes require transaction-safe policies, per-column grants and pgTAP tests.
-- Storage bucket policies MUST be implemented separately, with private buckets and short-lived signed URLs.

create policy areas_public_read on public.service_areas for select to anon, authenticated using (active);
-- No browser storage access at baseline. Private buckets and narrowly scoped
-- signed-access commands will be introduced with file validation in milestone 03.
do $$ begin
  if to_regclass('storage.objects') is not null then
    revoke all on storage.objects, storage.buckets from anon, authenticated;
  end if;
end $$;
commit;
