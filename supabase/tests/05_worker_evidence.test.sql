begin;
set search_path=public,extensions;
select no_plan();
select is((select public from storage.buckets where id='worker-evidence'),false,'evidence bucket is private');
select is((select file_size_limit from storage.buckets where id='worker-evidence'),3145728::bigint,'native bucket limits sanitized bytes');
select is((select allowed_mime_types from storage.buckets where id='worker-evidence'),array['image/jpeg'],'only re-encoded JPEG objects are stored');
-- Deliberately simulate platform-restored grants plus future broad policies.
-- Everything, including synthetic metadata (no provider object), rolls back.
grant select,insert,update on storage.objects,storage.buckets to anon,authenticated;
create policy pgtap_future_object_allow on storage.objects for all to anon,authenticated using(true) with check(true);
create policy pgtap_future_bucket_allow on storage.buckets for all to anon,authenticated using(true) with check(true);
insert into storage.objects(id,bucket_id,name) values ('c0000000-0000-0000-0000-000000000001','worker-evidence','pgtap/private.jpg');
set local role anon;
select is((select count(*)::int from storage.objects where bucket_id='worker-evidence'),0,'guest cannot read raw objects despite broad permissive policy');
select is((select count(*)::int from storage.buckets where id='worker-evidence'),0,'guest cannot list the private bucket');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select is((select count(*)::int from storage.objects where bucket_id='worker-evidence'),0,'owner browser cannot bypass signed-access command');
select is((select count(*)::int from storage.buckets where id='worker-evidence'),0,'owner browser cannot list the private bucket');
select throws_ok($$insert into storage.objects(bucket_id,name) values ('worker-evidence','pgtap/bypass.jpg')$$,'42501',null,'browser cannot bypass sanitizer by direct upload');
update storage.objects set name='pgtap/replaced.jpg' where id='c0000000-0000-0000-0000-000000000001';
reset role;
select is((select name from storage.objects where id='c0000000-0000-0000-0000-000000000001'),'pgtap/private.jpg','browser cannot replace a reviewed file');
select ok(not has_table_privilege('authenticated','private.worker_assets','select'),'assets metadata stays private');
select ok(not has_table_privilege('authenticated','private.worker_applications','update'),'owner cannot mutate review state via Data API');
select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.prosecdef),0,'no definer shortcut');
-- App initialization itself withdraws any legacy card. M03 review requires
-- retained clean evidence in the current revision; seed identities stay fixtures.
insert into private.worker_applications(worker_id,revision,state,area_id,draft_json) values ('30000000-0000-0000-0000-000000000002',1,'draft','40000000-0000-0000-0000-000000000001','{"test_fixture":true}');
select is((select count(*)::int from public.worker_cards where worker_id='30000000-0000-0000-0000-000000000002'),0,'new application withdraws publication');
select is(cardinality(private.eligible_worker_categories('30000000-0000-0000-0000-000000000002')),0,'legacy verification cannot approve a new revision');
select throws_ok($$insert into private.worker_assets(id,worker_id,application_revision,kind,storage_path,sha256,byte_size,state,retain_until) values ('a0000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002',1,'identity','fixture/unclean.jpg',repeat('a',64),100,'stored',now()+interval '1 day')$$,'23514',null,'unscanned data cannot be stored');
insert into private.worker_assets(id,worker_id,application_revision,kind,storage_path,sha256,byte_size,state,scan_status,scanned_at,retain_until) values
 ('a0000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002',1,'identity','fixture/identity.jpg',repeat('a',64),100,'stored','clean',now(),now()+interval '1 day'),
 ('a0000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000003',1,'identity','fixture/unrelated.jpg',repeat('b',64),100,'stored','clean',now(),now()+interval '1 day');
select throws_ok($$update private.worker_assets set kind='portfolio' where id='a0000000-0000-0000-0000-000000000001'$$,'P0001',null,'private ID can never be relabelled as portfolio');
select throws_ok($$update private.worker_assets set storage_path='another/path.jpg' where id='a0000000-0000-0000-0000-000000000001'$$,'P0001',null,'object references are immutable');
select throws_ok($$update private.worker_assets set retain_until=now()+interval '2 days' where id='a0000000-0000-0000-0000-000000000001'$$,'P0001',null,'retention cannot be silently extended');
insert into private.worker_verifications(id,worker_id,kind,application_revision) values ('b0000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002','identity',1);
select throws_ok($$insert into private.verification_documents(verification_id,storage_path,asset_id) values ('b0000000-0000-0000-0000-000000000001','fixture/unrelated.jpg','a0000000-0000-0000-0000-000000000002')$$,'P0001',null,'another worker evidence cannot be attached');
insert into private.verification_documents(verification_id,storage_path,asset_id) values ('b0000000-0000-0000-0000-000000000001','fixture/identity.jpg','a0000000-0000-0000-0000-000000000001');
update private.worker_verifications set status='approved',reviewed_by='10000000-0000-0000-0000-000000000004',reviewed_at=now() where id='b0000000-0000-0000-0000-000000000001';
insert into private.worker_review_events(verification_id,worker_id,application_revision,reviewer_id,decision,reason) values ('b0000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002',1,'10000000-0000-0000-0000-000000000004','approved','A fictional operator reviewed this fixture.');
select throws_ok('update private.worker_review_events set reason=''Altered after review''','P0001',null,'review reasoning is append-only');
select throws_ok('delete from private.worker_review_events','P0001',null,'review decisions cannot be erased');
-- Existing plumbing requires a trade claim, so identity alone is insufficient.
select is(cardinality(private.eligible_worker_categories('30000000-0000-0000-0000-000000000002')),0,'identity does not grant trade entitlement');
insert into public.worker_services(worker_id,category_id,title,description,price_model) values ('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','Synthetic cleaning','A fixture service','quote');
select is(cardinality(private.eligible_worker_categories('30000000-0000-0000-0000-000000000002')),1,'only the non-trade category becomes eligible');
update private.worker_applications set state='reviewed' where worker_id='30000000-0000-0000-0000-000000000002';
select lives_ok($$select private.publish_worker_card('30000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000001','Synthetic reviewed name','Synthetic reviewed bio')$$,'retained reviewed evidence allows eligible publication');
select ok((select safe_until<=now()+interval '1 day' from public.worker_cards where worker_id='30000000-0000-0000-0000-000000000002'),'card expiry is bounded by evidence retention');
update private.worker_assets set retain_until=now()-interval '1 second' where id='a0000000-0000-0000-0000-000000000001';
select is((select count(*)::int from public.worker_cards where worker_id='30000000-0000-0000-0000-000000000002'),0,'shortened retention withdraws the card');
select is(cardinality(private.eligible_worker_categories('30000000-0000-0000-0000-000000000002')),0,'expired identity evidence grants no categories');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select throws_ok('select * from private.worker_assets','42501',null,'even owner cannot read storage keys directly');
select throws_ok('update private.worker_applications set state=''reviewed''','42501',null,'worker cannot self-approve the application');
reset role;
select * from finish();
rollback;
