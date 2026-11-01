begin;
set search_path=public,extensions;
select no_plan();
insert into private.worker_applications(worker_id,revision,state,area_id,draft_json) values ('30000000-0000-0000-0000-000000000002',1,'reviewed','40000000-0000-0000-0000-000000000001','{}');
insert into private.worker_assets(id,worker_id,application_revision,kind,category_id,storage_path,sha256,byte_size,state,scan_status,scanned_at,retain_until) values
 ('d0400000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002',1,'identity',null,'fixture/discovery-id.jpg',repeat('a',64),100,'stored','clean',now(),now()+interval '1 day'),
 ('d0400000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002',1,'trade','20000000-0000-0000-0000-000000000001','fixture/discovery-trade.jpg',repeat('b',64),100,'stored','clean',now(),now()+interval '1 day');
insert into private.worker_verifications(id,worker_id,application_revision,kind,category_id) values
 ('d0410000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002',1,'identity',null),
 ('d0410000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002',1,'trade','20000000-0000-0000-0000-000000000001');
insert into private.verification_documents(verification_id,storage_path,asset_id) values
 ('d0410000-0000-0000-0000-000000000001','fixture/discovery-id.jpg','d0400000-0000-0000-0000-000000000001'),
 ('d0410000-0000-0000-0000-000000000002','fixture/discovery-trade.jpg','d0400000-0000-0000-0000-000000000002');
update private.worker_verifications set status='approved',reviewed_by='10000000-0000-0000-0000-000000000004',reviewed_at=now(),expiry_date=current_date+30 where application_revision=1;
select private.publish_worker_card('30000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000001','Synthetic discovery worker','Synthetic discovery scope');
select is((select count(*)::int from private.search_worker_cards(null,null,null,null,30,false,false,'name',20,0)),1,'approved retained current application is discoverable without GPS');
select is((select longitude from private.search_worker_cards(null,null,30,-27,5,false,false,'distance',20,0)),30::float8,'marker is curated town longitude, never private base');
select is((select latitude from private.search_worker_cards(null,null,30,-27,5,false,false,'distance',20,0)),-27::float8,'marker is curated town latitude, never private base');
select is((select distance_band from private.search_worker_cards(null,null,30,-27,5,false,false,'distance',20,0)),'Within about 5 km','only an approximate public-area distance band is returned');
select ok((select row_to_json(r)::text not like '%base_point%' and row_to_json(r)::text not like '%storage_path%' and row_to_json(r)::text not like '%30.001%' from private.search_worker_cards(null,null,null,null,30,false,false,'name',20,0)r),'public DTO excludes evidence, exact base and private fields');
select is((select count(*)::int from private.search_worker_cards(null,null,32,-24,5,false,false,'name',20,0)),0,'spatial radius uses public marker and honours distance');
select is((select count(*)::int from private.search_worker_cards('20000000-0000-0000-0000-000000000002',null,null,null,30,false,false,'name',20,0)),0,'category filter cannot invent a service');
select is((select count(*)::int from private.search_worker_cards('20000000-0000-0000-0000-000000000001',null,null,null,30,false,true,'name',20,0)),1,'trade badge is scoped to eligible reviewed category');
select is((select count(*)::int from private.search_worker_cards(null,null,null,null,30,false,false,'name',20,1)),0,'pagination offset moves past the only result');
select throws_ok($$select * from private.search_worker_cards(null,null,1,1,30,false,false,'name',20,0)$$,'22023',null,'spoofed out-of-range coordinates are rejected in SQL');
select throws_ok($$select * from private.search_worker_cards(null,null,'NaN'::float8,-27,30,false,false,'name',20,0)$$,'22023',null,'non-finite coordinates are rejected');
select throws_ok($$select * from private.search_worker_cards(null,null,null,null,99999,false,false,'name',20,0)$$,'22023',null,'query radius is bounded');
select throws_ok($$select * from private.search_worker_cards(null,null,null,null,30,false,false,'name',9999,0)$$,'22023',null,'query page size is bounded');
select ok(exists(select 1 from pg_indexes where schemaname='public' and tablename='worker_cards' and indexdef ilike '%using gist%'),'public town markers have a GIST index');
set local role anon;
select throws_ok($$select * from private.search_worker_cards(null,null,null,null,30,false,false,'name',20,0)$$,'42501',null,'guest cannot call private SQL or bypass bounded server search');
select throws_ok('select * from private.client_addresses','42501',null,'saved addresses stay private');
reset role;
update public.worker_profiles set is_available=false where id='30000000-0000-0000-0000-000000000002';
select private.publish_worker_card('30000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000001','Synthetic discovery worker','Synthetic discovery scope');
select is((select count(*)::int from private.search_worker_cards(null,null,null,null,30,true,false,'name',20,0)),0,'availability filter follows the server-owned published setting');
update public.user_profiles set is_suspended=true where user_id='10000000-0000-0000-0000-000000000002';
select is((select count(*)::int from private.search_worker_cards(null,null,null,null,30,false,false,'name',20,0)),0,'suspension withdraws discovery');
select * from finish();
rollback;
