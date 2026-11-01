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

-- These reviewed metadata fixtures are synthetic, not real native approval.
set constraints quote_price_guard immediate;
update public.user_profiles set client_enabled=true,worker_enabled=true,onboarding_completed_at=now() where user_id in ('10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002');
insert into public.job_requests(id,client_id,category_id,title,description,public_town,urgency,status) values
 ('56000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Synthetic quote request','A synthetic request for quotation integrity tests.','Synthetic test area','flexible','quoted'),
 ('56000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Synthetic competing appointment','A synthetic request for schedule integrity tests.','Synthetic test area','flexible','quoted');
insert into private.job_dispatch(job_id,area_id,submitted_at,expires_at) values ('56000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',now(),now()+interval '1 day');
insert into private.job_locations(job_id,exact_point,service_address_snapshot) values ('56000000-0000-0000-0000-000000000001',extensions.st_setsrid(extensions.st_makepoint(30.001,-27.001),4326)::extensions.geography,'{"street":"M06-PRIVATE-STREET","consent":true}');
insert into public.job_matches(job_id,worker_id,match_score,status,expires_at) values
 ('56000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002',87,'responded',now()+interval '1 day'),
 ('56000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002',87,'responded',now()+interval '1 day');
select private.publish_worker_card('30000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000001','Synthetic M06 provider','Synthetic quote coverage.');
select ok(private.agreement_worker_eligible('56000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002'),'current retained category and private coverage allow a quotation');
insert into public.quotes(id,job_id,worker_id,pricing_type,subtotal_cents,travel_fee_cents,total_cents,scope,valid_until,tax_mode,tax_cents,scheduled_start,scheduled_end) values
 ('76000000-0000-0000-0000-000000000001','56000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002','fixed',11250,250,13225,'Synthetic itemized service.',now()+interval '1 hour','vat_15_exclusive',1725,now()+interval '1 day',now()+interval '1 day 2 hours');
insert into public.quote_items(quote_id,description,quantity,unit_price_cents) values ('76000000-0000-0000-0000-000000000001','Labor',1.5,7500);
select lives_ok($$update public.quotes set status='submitted',published_at=now() where id='76000000-0000-0000-0000-000000000001'$$,'server-calculated quantity and tax can be published');
select throws_ok($$update public.quotes set scope='Altered after publication' where id='76000000-0000-0000-0000-000000000001'$$,'P0001',null,'published terms cannot be rewritten');
select throws_ok($$update public.quote_items set unit_price_cents=1 where quote_id='76000000-0000-0000-0000-000000000001'$$,'P0001',null,'line-item history is immutable');
select throws_ok($$insert into public.quote_items(quote_id,description,quantity,unit_price_cents) values ('76000000-0000-0000-0000-000000000001','Hidden extra',1,1)$$,'P0001',null,'published version cannot gain a hidden line');
select throws_ok($$delete from public.quotes where id='76000000-0000-0000-0000-000000000001'$$,'P0001',null,'quote versions cannot be erased');

insert into public.quotes(id,job_id,worker_id,version,pricing_type,subtotal_cents,travel_fee_cents,total_cents,scope,valid_until,tax_mode,tax_cents,scheduled_start,scheduled_end) values
 ('76000000-0000-0000-0000-000000000002','56000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002',2,'fixed',11250,250,13225,'Synthetic inconsistent line fixture.',now()+interval '1 hour','vat_15_exclusive',1725,now()+interval '1 day',now()+interval '1 day 2 hours');
insert into public.quote_items(quote_id,description,quantity,unit_price_cents) values ('76000000-0000-0000-0000-000000000002','Inconsistent line',1,1);
select throws_ok($$update public.quotes set status='submitted',published_at=now() where id='76000000-0000-0000-0000-000000000002'$$,'P0001',null,'deferred price guard rejects manipulated totals independently of the app');

insert into public.quotes(id,job_id,worker_id,version,pricing_type,scope,inspection_fee_cents,valid_until,scheduled_start,scheduled_end) values
 ('76000000-0000-0000-0000-000000000003','56000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002',3,'inspection_required','Inspect before pricing the work.',15000,now()+interval '1 hour',now()+interval '2 days',now()+interval '2 days 1 hour');
update public.quotes set status='submitted',published_at=now() where id='76000000-0000-0000-0000-000000000003';
select is((select total_cents from public.quotes where id='76000000-0000-0000-0000-000000000003'),null::bigint,'inspection fee is not a priced work total');
select throws_ok($$insert into private.inspection_access_grants(job_id,worker_id,granted_by_client_id,reason,expires_at,quote_id) values ('56000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','Invalid fixed-price inspection',now()+interval '1 hour','76000000-0000-0000-0000-000000000001')$$,'P0001',null,'fixed-price quotes cannot create inspection grants');
insert into private.inspection_access_grants(id,job_id,worker_id,granted_by_client_id,reason,expires_at,quote_id,visit_starts_at,visit_ends_at,access_from,fee_cents) values
 ('96000000-0000-0000-0000-000000000001','56000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','Synthetic explicit visit and fee consent.',now()+interval '2 days 1 hour','76000000-0000-0000-0000-000000000003',now()+interval '2 days',now()+interval '2 days 1 hour',now()+interval '2 days'-interval '1 hour',15000);
select ok(not private.worker_time_free('30000000-0000-0000-0000-000000000002',now()+interval '2 days',now()+interval '2 days 1 hour'),'authorized inspection reserves the visit time');
select is((select count(*)::integer from private.current_inspection_access('56000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002',now())),0,'future inspection does not reveal location before its access window');
select is((select count(*)::integer from private.current_inspection_access('56000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002',now()+interval '2 days')),1,'the approved visit window can authorize location access');
select is((select count(*)::integer from private.current_inspection_access('56000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002',now()+interval '2 days 1 hour')),0,'exact expiry revokes location access');
select throws_ok($$update private.inspection_access_grants set expires_at=expires_at+interval '1 hour' where id='96000000-0000-0000-0000-000000000001'$$,'P0001',null,'address consent cannot be silently extended');
select lives_ok($$update private.inspection_access_grants set revoked_at=now() where id='96000000-0000-0000-0000-000000000001'$$,'inspection consent is revocable');
select ok(private.worker_time_free('30000000-0000-0000-0000-000000000002',now()+interval '2 days',now()+interval '2 days 1 hour'),'revocation releases the inspection reservation');
select is((select count(*)::integer from private.current_inspection_access('56000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002',now()+interval '2 days')),0,'revocation overrides an otherwise valid access time');
select throws_ok($$update private.inspection_access_grants set revoked_at=null where id='96000000-0000-0000-0000-000000000001'$$,'P0001',null,'revoked consent cannot be restored');

update public.quotes set status='accepted' where id='76000000-0000-0000-0000-000000000001';
insert into public.bookings(id,job_id,quote_id,worker_id,scheduled_start,scheduled_end,final_total_cents) values
 ('86000000-0000-0000-0000-000000000001','56000000-0000-0000-0000-000000000001','76000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002',now()+interval '1 day',now()+interval '1 day 2 hours',13225);
select is((select status::text from public.bookings where id='86000000-0000-0000-0000-000000000001'),'pending_worker','client selection is not worker confirmation');
select ok(not private.worker_time_free('30000000-0000-0000-0000-000000000002',now()+interval '1 day',now()+interval '1 day 2 hours'),'pending booking reserves time');
select ok(private.worker_time_free('30000000-0000-0000-0000-000000000002',now()+interval '1 day',now()+interval '1 day 2 hours','86000000-0000-0000-0000-000000000001',null),'confirmation excludes its own reservation');
insert into public.quotes(id,job_id,worker_id,pricing_type,status,subtotal_cents,total_cents,scope) values
 ('76000000-0000-0000-0000-000000000005','56000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002','fixed','accepted',100,100,'Synthetic other-job accepted history.');
select throws_ok($$insert into public.bookings(job_id,quote_id,worker_id,scheduled_start,scheduled_end,final_total_cents) values ('56000000-0000-0000-0000-000000000002','76000000-0000-0000-0000-000000000005','30000000-0000-0000-0000-000000000002',now()+interval '1 day 30 minutes',now()+interval '1 day 1 hour',100)$$,'23P01',null,'different jobs cannot reserve overlapping worker time');
update public.quotes set status='accepted' where id='76000000-0000-0000-0000-000000000003';
select throws_ok($$insert into public.bookings(job_id,quote_id,worker_id,final_total_cents) values ('56000000-0000-0000-0000-000000000001','76000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000002',15000)$$,'P0001',null,'inspection consent and fees cannot create a work booking');

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select is((select count(*)::integer from public.quotes),0,'client cannot bypass current-party server projection');
select is((select count(*)::integer from public.quote_items),0,'client cannot bypass quote line projection');
select is((select count(*)::integer from public.bookings),0,'client cannot bypass booking projection');
select throws_ok('select * from private.inspection_access_grants','42501',null,'inspection grants are never browser tables');
select throws_ok($$select private.agreement_worker_eligible(null,null,true)$$,'42501',null,'current-approval helper is not a browser RPC');
select throws_ok($$select * from private.current_inspection_access(null,null,now())$$,'42501',null,'a browser cannot inject a clock into inspection authorization');
reset role;
update public.worker_profiles set status='suspended' where id='30000000-0000-0000-0000-000000000002';
select ok(not private.agreement_worker_eligible('56000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002'),'suspension revokes quote/address eligibility');
select * from finish();
rollback;
