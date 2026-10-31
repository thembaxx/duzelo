-- Milestone 01 pgTAP integration checks: all fixtures are fictional and rolled back.
begin;
set local search_path = extensions, public;
create extension if not exists pgtap with schema extensions;

-- Supabase auth.users test records are created under the local postgres owner.
insert into auth.users
 (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values
 ('11111111-1111-4111-8111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','client@duzelo.invalid','fixture',now(),now(),now()),
 ('22222222-2222-4222-8222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','worker@duzelo.invalid','fixture',now(),now(),now()),
 ('33333333-3333-4333-8333-333333333333','00000000-0000-0000-0000-000000000000','authenticated','authenticated','unrelated@duzelo.invalid','fixture',now(),now(),now()),
 ('44444444-4444-4444-8444-444444444444','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin@duzelo.invalid','fixture',now(),now(),now());

insert into public.user_profiles (user_id, display_name) values
 ('11111111-1111-4111-8111-111111111111','Fixture Client'),
 ('22222222-2222-4222-8222-222222222222','Fixture Worker'),
 ('33333333-3333-4333-8333-333333333333','Fixture Unrelated'),
 ('44444444-4444-4444-8444-444444444444','Fixture Admin');
insert into private.admin_members (user_id,admin_role)
values ('44444444-4444-4444-8444-444444444444','owner');

insert into public.worker_profiles (id,user_id,slug,display_name,status)
values
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','fixture-worker','Fixture Worker','approved'),
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','33333333-3333-4333-8333-333333333333','fixture-unrelated','Fixture Unrelated','approved');
insert into public.worker_services(worker_id,category_id,title,price_model)
select 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',id,'Fixture plumbing','quote'
from public.service_categories where slug='plumbing';

insert into private.worker_verifications(worker_id,kind,status,reviewed_by,reviewed_at,expiry_date)
values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','identity','approved','44444444-4444-4444-8444-444444444444',now(),current_date + interval '180 days');
insert into private.worker_verifications(worker_id,kind,category_id,status,reviewed_by,reviewed_at,expiry_date)
select 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','trade',id,'approved','44444444-4444-4444-8444-444444444444',now(),current_date + interval '180 days'
from public.service_categories where slug='plumbing';
insert into public.worker_cards(worker_id,slug,public_name,town_label,category_ids)
select 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','fixture-worker','Fixture Worker','Fictional Town',array[id]
from public.service_categories where slug='plumbing';

insert into public.job_requests (id,client_id,category_id,title,description,public_town,urgency,status)
select 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111',
 id,'Fixture plumbing repair','This is fictional test work requiring an inspection.','Fictional Town','scheduled','open'
from public.service_categories where slug='plumbing';
insert into public.job_matches (job_id,worker_id,match_score,status)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',85,'invited');
insert into public.quotes(id,job_id,worker_id,pricing_type,status,scope,total_cents)
values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','fixed','submitted','Fictional repair',10000);
insert into public.quote_items(quote_id,description,quantity,unit_price_cents)
values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','Fictional labour',1,10000);
insert into public.bookings(id,job_id,quote_id,worker_id)
values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 'dddddddd-dddd-4ddd-8ddd-dddddddddddd','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
insert into public.booking_events(booking_id,event_type,actor_id)
values ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','booking_created','11111111-1111-4111-8111-111111111111');
insert into public.conversations(id,job_id) values
 ('ffffffff-ffff-4fff-8fff-ffffffffffff','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
insert into public.conversation_members(conversation_id,user_id) values
 ('ffffffff-ffff-4fff-8fff-ffffffffffff','11111111-1111-4111-8111-111111111111'),
 ('ffffffff-ffff-4fff-8fff-ffffffffffff','22222222-2222-4222-8222-222222222222');
insert into public.messages(conversation_id,sender_id,body) values
 ('ffffffff-ffff-4fff-8fff-ffffffffffff','11111111-1111-4111-8111-111111111111','Fictional test message');
insert into public.notifications(user_id,kind,title,body) values
 ('11111111-1111-4111-8111-111111111111','test','Test notification','Fictional');
insert into private.audit_events(actor_id,actor_type,action,resource_kind) values
 ('44444444-4444-4444-8444-444444444444','admin','fixture','fixture');
insert into private.client_addresses(id,owner_id,label,street_address,town,point) values
 ('abababab-abab-4aba-8aba-abababababab','11111111-1111-4111-8111-111111111111',
 'Test','Fictional Lane','Fictional Town',
 extensions.ST_SetSRID(extensions.ST_MakePoint(30.807,-27.005),4326)::extensions.geography);

select plan(49);
select has_table('public','worker_cards','Public sanitized read model exists');
select has_table('private','client_addresses','Exact addresses are in private schema');
select has_table('private','worker_coverage','Worker home locations are private');
select has_table('private','admin_members','Admin role registry is private');
select has_table('private','inspection_access_grants','Timed inspection access model exists');
select is((select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname in ('public','private') and c.relkind='r' and not c.relrowsecurity),
  0::bigint,'All public/private application tables have RLS enabled');
select ok(exists (select 1 from pg_indexes where schemaname='private'
  and indexname='worker_coverage_base_gist_idx' and indexdef ilike '%gist%'),
  'Worker spatial coverage has GiST index');
select ok(exists (select 1 from pg_indexes where schemaname='private'
  and indexname='job_locations_point_gist_idx' and indexdef ilike '%gist%'),
  'Job location has GiST index');
select is(has_schema_privilege('anon','private','USAGE'),false,'Anon cannot access private schema');
select is(has_schema_privilege('authenticated','private','USAGE'),false,'Auth users cannot access private schema');
select is(has_table_privilege('authenticated','public.worker_profiles','INSERT'),false,'Browser role cannot insert worker profiles');
select is(has_table_privilege('authenticated','public.worker_cards','UPDATE'),false,'Browser role cannot self-publish');

set local role anon;
select is((select count(*) from public.service_categories),6::bigint,'Guests see active taxonomy');
select is((select count(*) from public.worker_cards),1::bigint,'Guests see approved worker card only');
select ok((select approx_marker is null from public.worker_cards limit 1),'Public card cannot publish exact map coordinates');
select throws_ok('select count(*) from private.client_addresses','42501',null,'Anonymous cannot access exact addresses');
select throws_ok('select count(*) from public.job_requests','42501',null,'Anonymous cannot read jobs');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
select is((select count(*) from public.user_profiles),1::bigint,'Client sees own profile only');
select is((select count(*) from public.job_requests),1::bigint,'Client sees their request');
select is((select count(*) from public.quotes),1::bigint,'Client sees a submitted quote');
select is((select count(*) from public.quote_items),1::bigint,'Client sees quote items');
select is((select count(*) from public.bookings),1::bigint,'Client sees own booking');
select is((select count(*) from public.messages),1::bigint,'Client can read their conversation');
select is((select count(*) from public.notifications),1::bigint,'Client can read their notification');
select throws_ok('insert into public.notifications(user_id,kind,title,body) values (auth.uid(),''x'',''x'',''x'')','42501',null,'Authenticated browser cannot send notification directly');
select throws_ok('select count(*) from private.worker_verifications','42501',null,'Client cannot read private verification files');

select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
select is((select count(*) from public.user_profiles),1::bigint,'Worker sees own profile only');
select is((select count(*) from public.job_matches),1::bigint,'Matched worker sees own invitation');
select is((select count(*) from public.job_requests),1::bigint,'Matched worker sees matched job');
select is((select count(*) from public.quotes),1::bigint,'Worker sees own quote');
select is((select count(*) from public.messages),1::bigint,'Member worker can read shared messages');

select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
select is((select count(*) from public.job_requests),0::bigint,'Unrelated worker cannot read job');
select is((select count(*) from public.job_matches),0::bigint,'Unrelated worker sees no invitation');
select is((select count(*) from public.quotes),0::bigint,'Unrelated worker cannot read quote');
select is((select count(*) from public.quote_items),0::bigint,'Unrelated worker cannot read quote items');
select is((select count(*) from public.bookings),0::bigint,'Unrelated worker cannot read booking');
select is((select count(*) from public.messages),0::bigint,'Unrelated user cannot read messages');
select is((select count(*) from public.notifications),0::bigint,'Unrelated user cannot read notifications');
select throws_ok('select count(*) from private.payment_intents','42501',null,'Unrelated user cannot read payments');

select set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true);
select throws_ok('select count(*) from private.admin_members','42501',null,'Admin membership alone cannot bypass API grants');
reset role;

-- Revoke verified worker status after fixture setup: no stale public cards or job preview.
update public.user_profiles
set is_suspended = true where user_id='22222222-2222-4222-8222-222222222222';
set local role anon;
select is((select count(*) from public.worker_cards),0::bigint,'Suspension unpublishes card');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
select is((select count(*) from public.job_matches),0::bigint,'Suspended worker cannot read new invitations');
select is((select count(*) from public.job_requests),0::bigint,'Suspended worker cannot read matched job details');
reset role;

select throws_ok('update private.audit_events set action=''tamper''','P0001',null,'Append-only administrative audit cannot be changed');
select throws_ok('update public.booking_events set event_type=''tamper''','P0001',null,'Append-only booking events cannot be changed');
select throws_ok('update private.worker_verifications set reviewed_by=''22222222-2222-4222-8222-222222222222'' where kind=''identity''','P0001',null,'Worker cannot self-approve evidence');

-- Ensure mismatched addresses cannot be attached to another client's jobs.
insert into public.job_requests(id,client_id,category_id,title,description,public_town,urgency,status)
select '12345678-1234-4234-8234-123456789012','33333333-3333-4333-8333-333333333333',id,
'Second fictional job','This job has a different owner for privacy checks.','Fictional Town','scheduled','open'
from public.service_categories where slug='plumbing';
select throws_ok(
 'insert into private.job_locations(job_id,address_id,exact_point,service_address_snapshot) select ''12345678-1234-4234-8234-123456789012'',a.id,a.point,''{}''::jsonb from private.client_addresses a',
 'P0001',null,'Cannot attach another clients address');
select throws_ok(
 'insert into private.inspection_access_grants(job_id,worker_id,granted_by_client_id,expires_at,reason) values (''aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'',''cccccccc-cccc-4ccc-8ccc-cccccccccccc'',''11111111-1111-4111-8111-111111111111'',now()+interval ''1 hour'',''fixture'')',
 'P0001',null,'No inspection access grant for unmatched worker');
select throws_ok(
 'insert into public.bookings(job_id,quote_id,worker_id) values (''12345678-1234-4234-8234-123456789012'',''dddddddd-dddd-4ddd-8ddd-dddddddddddd'',''bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'')',
 '23503',null,'Booking quote must match same job and worker');

select * from finish();
rollback;
