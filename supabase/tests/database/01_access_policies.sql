-- pgTAP: transactional security tests; never retain fixture identities in hosted data.
begin;
set local search_path=public,extensions;
create extension if not exists pgtap with schema extensions;

-- Fictional identities and records. The harness runs with privileged local postgres.
insert into auth.users(id,email) values
 ('10000000-0000-4000-8000-000000000001','duzelo-client-a@example.invalid'),
 ('10000000-0000-4000-8000-000000000002','duzelo-client-b@example.invalid'),
 ('10000000-0000-4000-8000-000000000003','duzelo-worker-a@example.invalid'),
 ('10000000-0000-4000-8000-000000000004','duzelo-worker-b@example.invalid'),
 ('10000000-0000-4000-8000-000000000005','duzelo-suspended@example.invalid'),
 ('10000000-0000-4000-8000-000000000006','duzelo-admin@example.invalid');

insert into public.user_profiles(user_id,display_name,is_suspended) values
 ('10000000-0000-4000-8000-000000000001','Fictional Client A',false),
 ('10000000-0000-4000-8000-000000000002','Fictional Client B',false),
 ('10000000-0000-4000-8000-000000000003','Fictional Worker A',false),
 ('10000000-0000-4000-8000-000000000004','Fictional Worker B',false),
 ('10000000-0000-4000-8000-000000000005','Fictional Suspended Worker',true),
 ('10000000-0000-4000-8000-000000000006','Fictional Admin',false);
insert into private.admin_members(user_id,admin_role) values
 ('10000000-0000-4000-8000-000000000006','owner');
insert into public.service_categories(id,slug,label_en,requires_trade_review)
 values('20000000-0000-4000-8000-000000000001','test-cleaning','Fictional cleaning',false),
       ('20000000-0000-4000-8000-000000000002','test-plumbing','Fictional plumbing',true);
insert into public.service_localities(id,town_label,province,approx_marker)
 values ('30000000-0000-4000-8000-000000000001','Fictional Centre','Mpumalanga',extensions.ST_SetSRID(extensions.ST_MakePoint(30,-27),4326)::extensions.geography);
insert into public.worker_profiles(id,user_id,display_name,status) values
 ('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','Fictional Worker A','draft'),
 ('40000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000004','Fictional Worker B','draft'),
 ('40000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000005','Fictional Suspended Worker','draft');
insert into private.worker_verifications(worker_id,kind,status,reviewed_by,reviewed_at)
values
 ('40000000-0000-4000-8000-000000000001','identity','approved','10000000-0000-4000-8000-000000000006',now()),
 ('40000000-0000-4000-8000-000000000003','identity','approved','10000000-0000-4000-8000-000000000006',now());
update public.worker_profiles set status='approved'
where id in ('40000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000003');
insert into public.worker_services(id,worker_id,category_id,title,price_model) values
 ('50000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Fictional clean','quote'),
 ('50000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','Fictional plumbing','quote');
insert into public.job_requests(id,client_id,category_id,title,description,public_town,urgency,status)
values ('60000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',
        '20000000-0000-4000-8000-000000000001','Fictional cleaning request',
        'Test description without private details','Fictional Centre','flexible','open');
insert into public.job_matches(id,job_id,worker_id,match_score)
values ('70000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001',
        '40000000-0000-4000-8000-000000000001',75),
       ('70000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000001',
        '40000000-0000-4000-8000-000000000003',75);
insert into public.job_media(id,job_id,kind,storage_path,created_by)
values ('80000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001',
        'request','fake/fixture-path','10000000-0000-4000-8000-000000000001');
insert into public.quotes(id,job_id,worker_id,pricing_type,scope,status,total_cents)
values ('90000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001',
       '40000000-0000-4000-8000-000000000001','fixed','Fictional scope','submitted',10000);
insert into public.quote_items(id,quote_id,description,quantity,unit_price_cents)
values ('91000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001',
        'Fictional work',1,10000);
insert into public.bookings(id,job_id,worker_id,quote_id,status)
values ('92000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001',
        '40000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001','confirmed');
insert into public.booking_events(booking_id,event_type) values
 ('92000000-0000-4000-8000-000000000001','fixture-event');
insert into public.disputes(booking_id,opened_by,reason)
values ('92000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000001','Fictional reason');

select plan(32);

-- Guest may see category names but no private user/job data.
set local role anon;
select is((select count(*)::integer from public.service_categories where slug='test-cleaning'),1,'guest can see active category');
select is((select count(*)::integer from public.service_localities where town_label='Fictional Centre'),1,'guest can see coarse locality');
select is((select count(*)::integer from public.worker_cards),0,'guest sees no unpublished worker cards');
select throws_ok('select * from public.user_profiles','42501',null,'guest cannot query profiles');
select throws_ok('select * from public.job_requests','42501',null,'guest cannot query jobs');
select throws_ok('select * from private.client_addresses','42501',null,'private schema denied to guests');
select throws_ok('insert into public.service_categories(slug,label_en) values(''breach'',''Breach'')','42501',null,'guest may not mutate category');
reset role;

-- Client A owns job, media and booking but no other user profile.
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select is((select count(*)::integer from public.user_profiles),1,'client reads only own profile');
select is((select count(*)::integer from public.job_requests),1,'client sees own job');
select is((select count(*)::integer from public.job_media),1,'client sees own job media');
select is((select count(*)::integer from public.bookings),1,'client sees own booking');
select is((select count(*)::integer from public.disputes),1,'client sees own dispute');
select throws_ok('select * from private.job_locations','42501',null,'client cannot directly access exact location');
select throws_ok('insert into public.job_requests(client_id,category_id,title,description,public_town,urgency) values (''10000000-0000-4000-8000-000000000001'',''20000000-0000-4000-8000-000000000001'',''Forbidden job'',''Forbidden client side mutation'',''Fake town'',''flexible'')','42501',null,'client direct write denied');
reset role;

-- Client B is unrelated: must not see job, media, quotes, bookings or disputes.
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select is((select count(*)::integer from public.job_requests),0,'unrelated client sees no job');
select is((select count(*)::integer from public.job_media),0,'unrelated client sees no media');
select is((select count(*)::integer from public.quotes),0,'unrelated client sees no quote');
select is((select count(*)::integer from public.bookings),0,'unrelated client sees no booking');
select is((select count(*)::integer from public.disputes),0,'unrelated client sees no dispute');
reset role;

-- Approved matched worker is authorized only for invitations and member data.
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
set local role authenticated;
select is((select count(*)::integer from public.job_matches),1,'matched worker sees invitation');
select is((select count(*)::integer from public.job_requests),1,'matched worker sees coarsened job');
select is((select count(*)::integer from public.job_media),1,'matched worker sees request media');
select is((select count(*)::integer from public.quotes),1,'matched worker sees own quote');
select is((select count(*)::integer from public.bookings),1,'booked worker sees booking');
select is((select count(*)::integer from public.disputes),1,'booked worker sees dispute');
reset role;

-- Draft worker and suspended worker must not see an active client job.
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
set local role authenticated;
select is((select count(*)::integer from public.job_requests),0,'draft worker has no visibility');
select is((select count(*)::integer from public.job_matches),0,'draft worker has no invitations');
reset role;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000005',true);
set local role authenticated;
select is((select count(*)::integer from public.job_requests),0,'suspended matched worker denied');
select is((select count(*)::integer from public.job_matches),0,'suspended matched worker no invitations');
reset role;

-- Admin membership alone must not grant any blanket Data API access.
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000006',true);
set local role authenticated;
select is((select count(*)::integer from public.job_requests),0,'admin JWT has no blanket job access');
select is((select count(*)::integer from public.user_profiles),1,'admin only sees own profile through client role');
select throws_ok('select * from private.admin_members','42501',null,'admin private membership hidden via API');
reset role;
select * from finish();
rollback;
