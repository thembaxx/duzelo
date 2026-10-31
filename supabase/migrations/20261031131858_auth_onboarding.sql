-- M02: no browser writes; all onboarding/settings commands verify the live Auth
-- identity and session before using the private command boundary.
begin;
alter table public.user_profiles add column client_enabled boolean not null default false;
alter table public.user_profiles add column worker_enabled boolean not null default false;
alter table public.user_profiles add column adult_consent_at timestamptz;
alter table public.user_profiles add column terms_version text;
alter table public.user_profiles add column email_notifications boolean not null default false;
alter table public.user_profiles add column in_app_notifications boolean not null default true;
alter table public.user_profiles add column onboarding_completed_at timestamptz;

create table private.auth_rate_limits (
  bucket_hash text primary key,
  attempts integer not null check(attempts > 0),
  window_start timestamptz not null,
  updated_at timestamptz not null default now()
);
alter table private.auth_rate_limits enable row level security;
revoke all on private.auth_rate_limits from public,anon,authenticated;
grant select,insert,update,delete on private.auth_rate_limits to service_role;

-- Local Auth is now enabled; its native auth.sessions table becomes authoritative.
-- No session or role claims are manufactured by this migration.
create index if not exists auth_rate_updated_idx on private.auth_rate_limits(updated_at);

-- Local CLI configuration only. Hosted SMS must use a reviewed real provider;
-- this invoker hook is neither exposed through Data API nor a login bypass.
create function private.local_sms_test_hook(event jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
begin
 if ltrim(coalesce(event->'user'->>'phone',''),'+') not in ('27820000001','27820000002','27820000003') then
   raise exception 'Local SMS adapter rejects non-fixture numbers';
 end if;
 return '{}'::jsonb;
end;
$$;
revoke all on function private.local_sms_test_hook(jsonb) from public,anon,authenticated;
grant usage on schema private to supabase_auth_admin;
grant execute on function private.local_sms_test_hook(jsonb) to supabase_auth_admin;

commit;
