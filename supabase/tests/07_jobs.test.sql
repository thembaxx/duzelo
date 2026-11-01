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

-- Synthetic read-model evidence above is not a real native Storage upload.
update public.user_profiles set client_enabled=true where user_id='10000000-0000-0000-0000-000000000001';
update public.user_profiles set worker_enabled=true,client_enabled=true where user_id='10000000-0000-0000-0000-000000000002';
insert into public.job_requests(id,client_id,title,description,public_town,urgency) values
 ('51000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','','','','flexible');
select is((select category_id from public.job_requests where id='51000000-0000-0000-0000-000000000002'),null::uuid,'a recoverable partial draft has no invented category');
select lives_ok($$update public.job_requests set status='cancelled' where id='51000000-0000-0000-0000-000000000002'$$,'incomplete private draft can be cancelled');
insert into public.job_requests(id,client_id,category_id,title,description,public_town,urgency,status) values
 ('51000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Synthetic M05 request','A synthetic service scope for matching tests.','Synthetic test area','flexible','open');
insert into private.job_dispatch(job_id,area_id,submitted_at,expires_at) values
 ('51000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',now(),now()+interval '1 day');
insert into private.job_locations(job_id,exact_point,service_address_snapshot,access_notes) values
 ('51000000-0000-0000-0000-000000000001',extensions.st_setsrid(extensions.st_makepoint(30.001,-27.001),4326)::extensions.geography,'{"street":"M05-PRIVATE-STREET","province":"Mpumalanga","consent":true,"townOnly":false}','M05-PRIVATE-NOTES');
select is((select count(*)::int from private.job_candidates('51000000-0000-0000-0000-000000000001')),1,'only a currently reviewed retained category is eligible');
select is((select score from private.job_candidates('51000000-0000-0000-0000-000000000001')),87,'score uses actual relevance proximity neutral reliability availability and trade evidence');
select ok((select row_to_json(c)::text not like '%M05-PRIVATE%' and row_to_json(c)::text not like '%base_point%' from private.job_candidates('51000000-0000-0000-0000-000000000001')c),'candidate rows contain no precise point or private directions');
update private.job_locations set exact_point=extensions.st_setsrid(extensions.st_makepoint(32,-24),4326)::extensions.geography where job_id='51000000-0000-0000-0000-000000000001';
select is((select count(*)::int from private.job_candidates('51000000-0000-0000-0000-000000000001')),0,'actual worker radius excludes a distant private job point');
update private.job_locations set exact_point=null where job_id='51000000-0000-0000-0000-000000000001';
select ok((select approximate from private.job_candidates('51000000-0000-0000-0000-000000000001')),'town-only fallback is explicitly approximate');
update private.worker_coverage set town_allowlist=array['Different town'] where worker_id='30000000-0000-0000-0000-000000000002';
select is((select count(*)::int from private.job_candidates('51000000-0000-0000-0000-000000000001')),0,'town-only fallback respects the explicit worker town allowlist');
update private.worker_coverage set town_allowlist='{}' where worker_id='30000000-0000-0000-0000-000000000002';
-- Coverage changes withdraw publication; restoration requires actual republishing.
select private.publish_worker_card('30000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000001','Synthetic M05 worker','Synthetic M05 scope');
update private.job_locations set exact_point=extensions.st_setsrid(extensions.st_makepoint(30.001,-27.001),4326)::extensions.geography where job_id='51000000-0000-0000-0000-000000000001';
insert into private.user_blocks(owner_id,subject_id) values ('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002');
select is((select count(*)::int from private.job_candidates('51000000-0000-0000-0000-000000000001')),0,'client block overrides any score');
delete from private.user_blocks;
insert into private.user_blocks(owner_id,subject_id) values ('10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001');
select is((select count(*)::int from private.job_candidates('51000000-0000-0000-0000-000000000001')),0,'worker block overrides any score');
delete from private.user_blocks;
update public.job_requests set urgency='urgent' where id='51000000-0000-0000-0000-000000000001';
select is((select count(*)::int from private.job_candidates('51000000-0000-0000-0000-000000000001')),0,'urgent requests require explicit worker opt-in');
insert into private.worker_match_settings(worker_id,urgent_ready) values ('30000000-0000-0000-0000-000000000002',true);
select is((select count(*)::int from private.job_candidates('51000000-0000-0000-0000-000000000001')),1,'urgent opt-in allows an otherwise eligible worker');
update public.job_requests set urgency='scheduled',time_slots=jsonb_build_array(jsonb_build_object('start',now()+interval '1 day','end',now()+interval '1 day 2 hours')) where id='51000000-0000-0000-0000-000000000001';
insert into private.worker_schedule_blocks(worker_id,starts_at,ends_at) values ('30000000-0000-0000-0000-000000000002',now()+interval '1 day',now()+interval '1 day 2 hours');
select is((select count(*)::int from private.job_candidates('51000000-0000-0000-0000-000000000001')),0,'private hard schedule block prevents invitation');
delete from private.worker_schedule_blocks;
update public.bookings set scheduled_start=now()+interval '1 day',scheduled_end=now()+interval '1 day 2 hours' where id='80000000-0000-0000-0000-000000000001';
select is((select count(*)::int from private.job_candidates('51000000-0000-0000-0000-000000000001')),0,'booked time prevents invitation');
update public.bookings set scheduled_start=null,scheduled_end=null where id='80000000-0000-0000-0000-000000000001';
update public.job_requests set client_id='10000000-0000-0000-0000-000000000002' where id='51000000-0000-0000-0000-000000000001';
select is((select count(*)::int from private.job_candidates('51000000-0000-0000-0000-000000000001')),0,'dual-mode account cannot match its own request');
update public.job_requests set client_id='10000000-0000-0000-0000-000000000001',visibility='direct',requested_worker_id='30000000-0000-0000-0000-000000000003' where id='51000000-0000-0000-0000-000000000001';
select is((select count(*)::int from private.job_candidates('51000000-0000-0000-0000-000000000001')),0,'ineligible direct target never falls back to other workers');
update public.job_requests set requested_worker_id='30000000-0000-0000-0000-000000000002' where id='51000000-0000-0000-0000-000000000001';
select is((select count(*)::int from private.job_candidates('51000000-0000-0000-0000-000000000001')),1,'eligible direct target can be invited');
insert into public.job_matches(job_id,worker_id,match_score,dispatched_at,expires_at) values ('51000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002',87,now(),now()+interval '4 hours');
select is((select count(*)::int from private.job_candidates('51000000-0000-0000-0000-000000000001')),0,'candidate query does not generate a duplicate invitation');
select is((select count(*)::int from private.job_candidates('51000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002',true)),1,'current invitation eligibility is separately rechecked');
select throws_ok($$insert into public.job_matches(job_id,worker_id,match_score) values ('51000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002',87)$$,'23505',null,'unique job-worker row survives duplicate dispatch');
delete from public.job_matches where job_id='51000000-0000-0000-0000-000000000001';
update public.job_requests set visibility='matched',requested_worker_id=null where id='51000000-0000-0000-0000-000000000001';
update public.job_matches set dispatched_at=now() where worker_id='30000000-0000-0000-0000-000000000002';
select is((select count(*)::int from private.job_candidates('51000000-0000-0000-0000-000000000001')),0,'per-worker hourly exposure cap prevents unbounded fanout');
update public.job_matches set dispatched_at=null where worker_id='30000000-0000-0000-0000-000000000002';
update public.job_requests set category_id='20000000-0000-0000-0000-000000000004' where id='51000000-0000-0000-0000-000000000001';
select is((select count(*)::int from private.job_candidates('51000000-0000-0000-0000-000000000001')),0,'a plumbing credential cannot match electrical requests');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select is((select count(*)::int from public.job_requests),0,'worker cannot retrieve full job rows through the Data API');
select is((select count(*)::int from public.job_matches),0,'worker cannot retrieve private ranking values through the Data API');
select throws_ok($$select * from private.job_candidates('51000000-0000-0000-0000-000000000001')$$,'42501',null,'matching function is server-only');
select throws_ok('select * from private.job_assets','42501',null,'private media object keys are denied');
select throws_ok('select * from private.job_locations','42501',null,'private precise location is denied');
reset role;
select ok(exists(select 1 from pg_policies where schemaname='storage' and policyname='job_objects_deny' and permissive='RESTRICTIVE'),'job photo bucket has durable restrictive RLS');
select * from finish();
rollback;
