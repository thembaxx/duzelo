begin;
create extension if not exists pgtap with schema extensions;
set search_path=public,extensions;
select no_plan();
select ok(exists(select 1 from pg_indexes where schemaname='private' and tablename='worker_coverage' and indexdef ilike '%using gist%'),'worker coverage has GIST index');
select ok(exists(select 1 from pg_indexes where schemaname='private' and tablename='job_locations' and indexdef ilike '%using gist%'),'job location has GIST index');
select ok(extensions.st_dwithin(extensions.st_setsrid(extensions.st_makepoint(30,-27),4326)::extensions.geography,extensions.st_setsrid(extensions.st_makepoint(30.005,-27),4326)::extensions.geography,1000),'nearby synthetic point is within 1 kilometre, using metres');
select ok(not extensions.st_dwithin(extensions.st_setsrid(extensions.st_makepoint(30,-27),4326)::extensions.geography,extensions.st_setsrid(extensions.st_makepoint(30.2,-27),4326)::extensions.geography,10000),'far synthetic point is outside 10 kilometres');
select ok((select extensions.st_x(base_point::extensions.geometry)=30.001 and extensions.st_y(base_point::extensions.geometry)=-27.001 from private.worker_coverage limit 1),'longitude precedes latitude');
select ok((select safe_until>now() from public.worker_cards),'published card has an unexpired server-derived deadline');
-- Simulate an already-stored card at a later time, without relying on a cleanup
-- job. Disabling the deadline trigger is test-setup privilege only.
alter table public.worker_cards disable trigger worker_card_expiry;
update public.worker_cards set safe_until=now()-interval '1 day';
set local role anon;
select is((select count(*)::integer from public.worker_cards),0,'expired stored card is hidden by read policy');
select is((select count(*)::integer from public.worker_services),0,'expired card cannot expose service offerings');
reset role;
alter table public.worker_cards enable trigger worker_card_expiry;
select throws_ok($$insert into private.inspection_access_grants(job_id,worker_id,granted_by_client_id,reason,expires_at) values ('50000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000003','Synthetic invalid consent',now()+interval '1 hour')$$,'P0001',null,'inspection requires actual job owner consent');
select throws_ok($$insert into private.inspection_access_grants(job_id,worker_id,granted_by_client_id,reason,expires_at) values ('50000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','Synthetic valid consent',now()+interval '1 hour')$$,'P0001',null,'owner consent also requires a current inspection proposal and bounded visit');
update private.worker_verifications set reviewed_by='10000000-0000-0000-0000-000000000002' where worker_id='30000000-0000-0000-0000-000000000002' and kind='identity';
select throws_ok($$select private.publish_worker_card('30000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000001','Self-reviewed fixture',null)$$,'P0001',null,'self-reviewed identity cannot publish even from privileged code');
select * from finish();
rollback;
