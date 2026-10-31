-- LOCAL TEST FIXTURES ONLY. All people, emails, addresses, and coordinates are synthetic.
-- Never load this seed into a hosted project. npm db scripts always target --local.
-- Auth is disabled in M01; Supabase creates only its supported id-only auth
-- schema baseline. These UUID identities cannot log in. M02 will create real local
-- Auth fixtures through the Auth service, never by faking credentials here.
insert into auth.users (id)
select ('10000000-0000-0000-0000-' || lpad(i::text,12,'0'))::uuid from generate_series(1,6) i;
insert into public.user_profiles(user_id, display_name, is_suspended)
select id, 'Fictional adult fixture ' || right(id::text,1), right(id::text,1) = '5' from auth.users where id::text like '10000000-0000-0000-0000-%';
insert into private.admin_members(user_id,admin_role) values ('10000000-0000-0000-0000-000000000004','owner');
insert into public.service_categories(id,slug,label_en,requires_trade_review) values
 ('20000000-0000-0000-0000-000000000001','plumbing','Plumbing',true),
 ('20000000-0000-0000-0000-000000000002','cleaning','Cleaning',false);
insert into public.service_areas(id,slug,label,centroid) values
 ('40000000-0000-0000-0000-000000000001','synthetic-test-area','Synthetic test area',extensions.st_setsrid(extensions.st_makepoint(30,-27),4326)::extensions.geography);
insert into public.worker_profiles(id,user_id,slug,display_name,status)
select ('30000000-0000-0000-0000-' || lpad(i::text,12,'0'))::uuid,
 ('10000000-0000-0000-0000-' || lpad(i::text,12,'0'))::uuid,
 'fictional-worker-'||i, 'Fictional worker '||i, case when i=6 then 'pending_review'::public.worker_status else 'approved'::public.worker_status end
from unnest(array[2,3,5,6]) i;
insert into public.worker_services(worker_id,category_id,title,price_model)
select id,'20000000-0000-0000-0000-000000000001','Synthetic plumbing offering','quote' from public.worker_profiles;
insert into private.worker_verifications(worker_id,kind,status,reviewed_by,reviewed_at,expiry_date)
select id,'identity','approved','10000000-0000-0000-0000-000000000004',now(),current_date+365 from public.worker_profiles;
insert into private.worker_verifications(worker_id,kind,category_id,status,reviewed_by,reviewed_at,expiry_date)
select id,'trade','20000000-0000-0000-0000-000000000001','approved','10000000-0000-0000-0000-000000000004',now(),current_date+365 from public.worker_profiles;
insert into private.worker_coverage(worker_id,base_point,radius_km)
select id,extensions.st_setsrid(extensions.st_makepoint(30.001,-27.001),4326)::extensions.geography,20 from public.worker_profiles;
insert into private.client_addresses(id,owner_id,label,street_address,town,point) values
 ('90000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Synthetic home','1 Fictional Test Lane','Synthetic test area',extensions.st_setsrid(extensions.st_makepoint(30.002,-27.002),4326)::extensions.geography);
insert into public.job_requests(id,client_id,category_id,title,description,public_town,urgency,status)
select ('50000000-0000-0000-0000-' || lpad(i::text,12,'0'))::uuid,
 '10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',
 'Synthetic fixture job '||i,'A fictional local job used only for database access tests.','Synthetic test area','flexible',
 case when i=2 then 'draft'::public.job_status else 'open'::public.job_status end
from generate_series(1,3) i;
insert into private.job_locations(job_id,address_id,exact_point,service_address_snapshot)
select id,'90000000-0000-0000-0000-000000000001',extensions.st_setsrid(extensions.st_makepoint(30.002,-27.002),4326)::extensions.geography,
 '{"street":"1 Fictional Test Lane","synthetic":true}' from public.job_requests;
insert into public.job_matches(job_id,worker_id,match_score)
select j.id,w.id,80 from public.job_requests j cross join public.worker_profiles w where w.slug in ('fictional-worker-2','fictional-worker-5');
insert into public.quotes(id,job_id,worker_id,pricing_type,status,subtotal_cents,total_cents,scope) values
 ('70000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002','fixed','accepted',10000,10000,'Synthetic accepted work scope');
insert into public.bookings(id,job_id,quote_id,worker_id,final_total_cents) values
 ('80000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000002',10000);
insert into public.conversations(id,job_id) values ('a0000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001');
insert into public.conversation_members(conversation_id,user_id) values
 ('a0000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001'),
 ('a0000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002');
insert into public.messages(conversation_id,sender_id,body) values
 ('a0000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Synthetic message only.');
insert into private.audit_events(actor_id,actor_type,action,resource_kind) values
 ('10000000-0000-0000-0000-000000000004','admin','fixture_created','test');
select private.publish_worker_card('30000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000001','Fictional test worker','Synthetic database test profile.');
