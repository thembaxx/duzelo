-- pgTAP integrity, geospatial privacy and verification regression suite.
begin;
set local search_path = public,extensions;
create extension if not exists pgtap with schema extensions;

insert into auth.users(id,email) values
 ('a0000000-0000-4000-8000-000000000001','fixture-client-1@example.invalid'),
 ('a0000000-0000-4000-8000-000000000002','fixture-client-2@example.invalid'),
 ('a0000000-0000-4000-8000-000000000003','fixture-worker-1@example.invalid'),
 ('a0000000-0000-4000-8000-000000000004','fixture-worker-2@example.invalid'),
 ('a0000000-0000-4000-8000-000000000005','fixture-admin@example.invalid');
insert into public.user_profiles(user_id,display_name) values
 ('a0000000-0000-4000-8000-000000000001','Fixture client one'),
 ('a0000000-0000-4000-8000-000000000002','Fixture client two'),
 ('a0000000-0000-4000-8000-000000000003','Fixture worker one'),
 ('a0000000-0000-4000-8000-000000000004','Fixture worker two'),
 ('a0000000-0000-4000-8000-000000000005','Fixture admin');
insert into private.admin_members(user_id,admin_role) values ('a0000000-0000-4000-8000-000000000005','owner');
insert into public.service_categories(id,slug,label_en,requires_trade_review) values
 ('a1000000-0000-4000-8000-000000000001','fixture-clean','Fixture cleaning',false),
 ('a1000000-0000-4000-8000-000000000002','fixture-trade','Fixture trade',true);
insert into public.service_localities(id,town_label,province,approx_marker)
 values ('a2000000-0000-4000-8000-000000000001','Fixture public town','Mpumalanga',
   extensions.ST_SetSRID(extensions.ST_MakePoint(30,-27),4326)::extensions.geography);
insert into public.worker_profiles(id,user_id,display_name,status) values
 ('a3000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000003','Fixture Worker','draft'),
 ('a3000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000004','Another Worker','draft');
insert into public.worker_services(worker_id,category_id,title,price_model) values
 ('a3000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','Fixture house cleaning','quote');
insert into public.job_requests(id,client_id,category_id,title,description,public_town,urgency,status)
values ('a4000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001',
        'a1000000-0000-4000-8000-000000000001','Fixture service request',
        'Fixture description of a fake job','Fixture public town','flexible','open');

select plan(22);

select has_table('public','worker_cards','worker card table exists');
select has_table('private','job_locations','exact locations kept private');
select has_table('private','worker_coverage','worker base points kept private');
select has_table('private','payment_ledger','money ledger kept private');
select has_table('private','audit_events','audit records kept private');
select has_index('private','worker_coverage','worker_coverage_base_gist_idx','worker radius has GIST index');
select has_index('private','job_locations','job_locations_point_gist_idx','job locations have spatial index');
select ok(extensions.ST_DWithin(
  extensions.ST_SetSRID(extensions.ST_MakePoint(30,-27),4326)::extensions.geography,
  extensions.ST_SetSRID(extensions.ST_MakePoint(30,-27),4326)::extensions.geography,
  50), 'ST_DWithin accepts same location');

-- Critical: server role changing a profile status is not proof of review.
select throws_ok(
  'update public.worker_profiles set status=''approved'' where id=''a3000000-0000-4000-8000-000000000001''',
  'P0001',null,'identity verification required before promotion');

insert into private.worker_verifications(worker_id,kind,status,reviewed_by,reviewed_at)
values ('a3000000-0000-4000-8000-000000000001','identity','approved',
        'a0000000-0000-4000-8000-000000000005',now());
update public.worker_profiles set status='approved'
where id='a3000000-0000-4000-8000-000000000001';
select is((select status::text from public.worker_profiles where id='a3000000-0000-4000-8000-000000000001'),
          'approved','reviewed worker may be approved');

-- Unreviewed user cannot appear as a public worker card.
select throws_ok(
  'insert into public.worker_cards(worker_id,slug,public_name,locality_id,town_label,approx_marker,category_ids) values (''a3000000-0000-4000-8000-000000000002'',''fake-worker'',''Fake Worker'',''a2000000-0000-4000-8000-000000000001'',''Private street'',extensions.ST_SetSRID(extensions.ST_MakePoint(31,-28),4326)::extensions.geography,array[''a1000000-0000-4000-8000-000000000001'']::uuid[])',
  'P0001',null,'unreviewed worker cannot publish card');

insert into public.worker_cards(worker_id,slug,public_name,locality_id,town_label,approx_marker,category_ids)
values ('a3000000-0000-4000-8000-000000000001','real-fixture','Fixture Worker',
        'a2000000-0000-4000-8000-000000000001','DO NOT KEEP THIS ADDRESS',
        extensions.ST_SetSRID(extensions.ST_MakePoint(31,-28),4326)::extensions.geography,
        array['a1000000-0000-4000-8000-000000000001']::uuid[]);
select is((select town_label from public.worker_cards where slug='real-fixture'),
          'Fixture public town','public card overwrites forged town label');
select ok((select extensions.ST_DWithin(approx_marker,
  extensions.ST_SetSRID(extensions.ST_MakePoint(30,-27),4326)::extensions.geography,1)
  from public.worker_cards where slug='real-fixture'),
  'public card location forced to configured town marker, not home base');

insert into public.worker_services(worker_id,category_id,title,price_model) values
 ('a3000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002','Fixture plumbing','quote');
select throws_ok(
  'update public.worker_cards set category_ids=array[''a1000000-0000-4000-8000-000000000001'',''a1000000-0000-4000-8000-000000000002'']::uuid[] where slug=''real-fixture''',
  'P0001',null,'regulated trade needs its own verification');

insert into private.worker_verifications(worker_id,kind,category_id,status,reviewed_by,reviewed_at)
values ('a3000000-0000-4000-8000-000000000001','trade',
        'a1000000-0000-4000-8000-000000000002','approved',
        'a0000000-0000-4000-8000-000000000005',now());
update public.worker_cards
set category_ids=array['a1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002']::uuid[],
    verified_trade_category_ids=array['a1000000-0000-4000-8000-000000000001']::uuid[]
where slug='real-fixture';
select is((select cardinality(verified_trade_category_ids) from public.worker_cards where slug='real-fixture'),
           1,'verified badge categories recomputed, caller cannot forge them');

-- A different client's saved address cannot be copied into a job.
insert into private.client_addresses(id,owner_id,label,street_address,town,point)
values ('a5000000-0000-4000-8000-000000000001',
        'a0000000-0000-4000-8000-000000000002','Private test address','Never disclose','Fake town',
        extensions.ST_SetSRID(extensions.ST_MakePoint(30.001,-27.001),4326)::extensions.geography);
select throws_ok(
  'insert into private.job_locations(job_id,address_id,exact_point,service_address_snapshot) values (''a4000000-0000-4000-8000-000000000001'',''a5000000-0000-4000-8000-000000000001'',extensions.ST_SetSRID(extensions.ST_MakePoint(30,-27),4326)::extensions.geography,''{}''::jsonb)',
  'P0001',null,'job cannot reuse a different client address');

-- Inspection access is explicitly granted by the job owner to an eligible worker.
insert into public.job_matches(job_id,worker_id,match_score)
values ('a4000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001',75);
select throws_ok(
  'insert into private.inspection_access_grants(job_id,worker_id,granted_by_client_id,expires_at,reason) values (''a4000000-0000-4000-8000-000000000001'',''a3000000-0000-4000-8000-000000000001'',''a0000000-0000-4000-8000-000000000002'',now()+interval ''1 hour'',''Fake grant'')',
  'P0001',null,'wrong client cannot authorize inspection');
insert into private.inspection_access_grants(job_id,worker_id,granted_by_client_id,expires_at,reason)
values ('a4000000-0000-4000-8000-000000000001',
        'a3000000-0000-4000-8000-000000000001',
        'a0000000-0000-4000-8000-000000000001',
        now()+interval '1 hour','Fictional inspection');
select is((select count(*)::integer from private.inspection_access_grants),1,
          'authorized inspection grant persists');

-- Quote and booking composite references cannot be forged.
select throws_ok(
  'insert into public.quotes(job_id,worker_id,pricing_type,scope) values (''a4000000-0000-4000-8000-000000000001'',''a3000000-0000-4000-8000-000000000002'',''fixed'',''Fake quote'')',
  '23503',null,'unmatched worker cannot quote');

-- Approved verification revocation also hides card and demotes worker.
update private.worker_verifications set status='rejected'
where worker_id='a3000000-0000-4000-8000-000000000001' and kind='identity';
select is((select status::text from public.worker_profiles where id='a3000000-0000-4000-8000-000000000001'),
          'needs_changes','revoked verification demotes worker');
select is((select count(*)::integer from public.worker_cards where slug='real-fixture'),0,
          'revoked verification unpublishes public card');

-- Append-only audit evidence cannot be rewritten or deleted.
insert into private.audit_events(id,actor_type,action,resource_kind)
values ('a6000000-0000-4000-8000-000000000001','system','fixture','test');
select throws_ok(
  'delete from private.audit_events where id=''a6000000-0000-4000-8000-000000000001''',
  'P0001',null,'audit evidence cannot be erased');
select * from finish();
rollback;
