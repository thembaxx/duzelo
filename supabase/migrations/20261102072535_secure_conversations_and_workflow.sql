begin;
set local search_path=public,extensions;

alter table public.conversations add column worker_id uuid references public.worker_profiles(id), add column last_sequence bigint not null default 0;
create unique index conversation_job_worker on public.conversations(job_id,worker_id) where worker_id is not null;
alter table public.messages add column sequence bigint;
with positions as (select id,row_number() over(partition by conversation_id order by sent_at,id) as n from public.messages)
 update public.messages m set sequence=p.n from positions p where p.id=m.id;
update public.conversations c set last_sequence=coalesce((select max(m.sequence) from public.messages m where m.conversation_id=c.id),0);
alter table public.messages alter column sequence set not null;
create unique index message_conversation_sequence on public.messages(conversation_id,sequence);

create function private.freeze_conversation_relationship() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='DELETE' or (to_jsonb(new)-'last_sequence') is distinct from (to_jsonb(old)-'last_sequence') then raise exception 'Conversation relationship is immutable'; end if;
 return new;
end $$;
create trigger conversation_relationship before update or delete on public.conversations for each row execute function private.freeze_conversation_relationship();
revoke all on function private.freeze_conversation_relationship() from public,anon,authenticated;
grant execute on function private.freeze_conversation_relationship() to service_role;
create function private.guard_conversation_party() returns trigger language plpgsql security invoker set search_path='' as $$
declare c public.conversations;
begin
 select * into c from public.conversations where id=new.conversation_id for update;
 if c.worker_id is not null and not exists(select 1 from public.job_requests j join public.worker_profiles w on w.id=c.worker_id where j.id=c.job_id and w.user_id<>j.client_id and new.user_id in(j.client_id,w.user_id)) then raise exception 'Conversation membership is limited to its actual job parties'; end if;
 return new;
end $$;
create trigger conversation_party_guard before insert or update on public.conversation_members for each row execute function private.guard_conversation_party();
create function private.guard_message_history() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='INSERT' then
  if not exists(select 1 from public.conversation_members where conversation_id=new.conversation_id and user_id=new.sender_id) then raise exception 'Sender must be a conversation member'; end if;
  update public.conversations set last_sequence=last_sequence+1 where id=new.conversation_id returning last_sequence into new.sequence;
  if new.sequence is null then raise exception 'Conversation required'; end if;
  return new;
 end if;
 if tg_op='DELETE' or (to_jsonb(new)-'deleted_at') is distinct from (to_jsonb(old)-'deleted_at') or old.deleted_at is not null or new.deleted_at is null then raise exception 'Sent messages are immutable; moderation may only tombstone'; end if;
 return new;
end $$;
create trigger message_history_guard before insert or update or delete on public.messages for each row execute function private.guard_message_history();

create table private.conversation_reports (
 id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id),
 report_id uuid not null unique references public.safety_reports(id), message_id uuid references public.messages(id),
 created_at timestamptz not null default clock_timestamp()
);
create table private.booking_reschedules (
 id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.bookings(id),
 proposed_by uuid not null references auth.users(id), base_version integer not null check(base_version>0),
 starts_at timestamptz not null, ends_at timestamptz not null, expires_at timestamptz not null,
 status text not null default 'proposed' check(status in('proposed','accepted','rejected','withdrawn','superseded','expired')),
 decided_by uuid references auth.users(id), decided_at timestamptz, applied_version integer,
 created_at timestamptz not null default clock_timestamp(), check(ends_at>starts_at), check(expires_at<=starts_at)
);
create unique index reschedule_one_pending on private.booking_reschedules(booking_id) where status='proposed';
alter table public.change_orders add column base_version integer, add column expires_at timestamptz,
 add column decided_by uuid references auth.users(id), add column decided_at timestamptz, add column applied_version integer;
alter table public.change_orders drop constraint change_orders_status_check;
alter table public.change_orders add constraint change_orders_status_check check(status in('proposed','accepted','rejected','withdrawn','superseded','expired'));
create unique index change_order_one_pending on public.change_orders(booking_id) where status='proposed';

create function private.guard_agreed_proposal() returns trigger language plpgsql security invoker set search_path='' as $$
declare b public.bookings; client uuid; provider uuid; proposer uuid;
begin
 if tg_op='DELETE' then raise exception 'Agreement proposals are retained'; end if;
 if tg_table_name='change_orders' then proposer:=new.requested_by; else proposer:=new.proposed_by; end if;
 select * into b from public.bookings where id=new.booking_id for update;
 select j.client_id,w.user_id into client,provider from public.job_requests j join public.worker_profiles w on w.id=b.worker_id where j.id=b.job_id;
 if proposer not in(client,provider) then raise exception 'Proposal requires an actual booking party'; end if;
 if tg_op='UPDATE' and ((to_jsonb(new)-array['status','accepted_at','decided_by','decided_at','applied_version']) is distinct from (to_jsonb(old)-array['status','accepted_at','decided_by','decided_at','applied_version']) or old.status<>'proposed') then raise exception 'Proposal terms and decisions are immutable'; end if;
 if new.status='accepted' and (new.decided_by is null or new.decided_by=proposer or new.decided_by not in(client,provider) or new.decided_at is null or new.applied_version is null) then raise exception 'The other booking party must explicitly accept'; end if;
 return new;
end $$;
create trigger reschedule_agreement_guard before insert or update or delete on private.booking_reschedules for each row execute function private.guard_agreed_proposal();
create trigger scope_agreement_guard before insert or update or delete on public.change_orders for each row execute function private.guard_agreed_proposal();
create function private.check_adjusted_work_total() returns trigger language plpgsql security invoker set search_path='' as $$
declare total numeric;
begin
 select b.final_total_cents+coalesce((select sum(c.delta_cents) from public.change_orders c where c.booking_id=b.id and c.status='accepted'),0) into total from public.bookings b where b.id=new.booking_id;
 if total<0 or total>100000000 then raise exception 'Agreed work total is out of bounds'; end if;
 return null;
end $$;
create constraint trigger adjusted_work_total after insert or update on public.change_orders deferrable initially deferred for each row execute function private.check_adjusted_work_total();

create or replace function private.check_booking_quote() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.quotes q where q.id=new.quote_id and q.job_id=new.job_id and q.worker_id=new.worker_id and q.status='accepted' and q.pricing_type<>'inspection_required' and q.total_cents=new.final_total_cents) then raise exception 'Booking requires its immutable accepted priced quote'; end if;
 if tg_op='UPDATE' then
  if (new.job_id,new.quote_id,new.worker_id,new.final_total_cents) is distinct from (old.job_id,old.quote_id,old.worker_id,old.final_total_cents) then raise exception 'Original booking quote and amount remain immutable'; end if;
  if (new.scheduled_start,new.scheduled_end) is distinct from (old.scheduled_start,old.scheduled_end) and not exists(select 1 from private.booking_reschedules r where r.booking_id=new.id and r.status='accepted' and r.applied_version=new.version and r.starts_at=new.scheduled_start and r.ends_at=new.scheduled_end) then raise exception 'Rescheduling requires current explicit acceptance'; end if;
 end if;
 if exists(select 1 from public.quotes q where q.id=new.quote_id and q.published_at is not null and (new.scheduled_start is distinct from q.scheduled_start or new.scheduled_end is distinct from q.scheduled_end)) and not exists(select 1 from private.booking_reschedules r where r.booking_id=new.id and r.status='accepted' and r.applied_version<=new.version and r.starts_at=new.scheduled_start and r.ends_at=new.scheduled_end) then raise exception 'Appointment must retain the accepted original or rescheduled window'; end if;
 return new;
end $$;

create table private.completion_submissions (
 id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.bookings(id),
 round integer not null check(round>0), submitted_by uuid not null references auth.users(id),
 summary text not null check(length(summary) between 15 and 4000), submitted_at timestamptz not null default clock_timestamp(),
 review_due_at timestamptz not null, support_due_at timestamptz,
 status text not null default 'pending' check(status in('pending','confirmed','correction_requested','disputed')),
 responded_by uuid references auth.users(id), responded_at timestamptz,
 unique(booking_id,round), check(review_due_at>submitted_at)
);
create unique index completion_one_pending on private.completion_submissions(booking_id) where status='pending';
create function private.guard_completion_parties() returns trigger language plpgsql security invoker set search_path='' as $$
declare client uuid; provider uuid; phase public.booking_status;
begin
 select j.client_id,w.user_id,b.status into client,provider,phase from public.bookings b join public.job_requests j on j.id=b.job_id join public.worker_profiles w on w.id=b.worker_id where b.id=new.booking_id;
 if new.submitted_by is distinct from provider then raise exception 'Only the selected worker may submit completion'; end if;
 if tg_op='INSERT' and phase<>'in_progress' then raise exception 'Work must be started before completion'; end if;
 if new.status in('confirmed','correction_requested') and (new.responded_by is distinct from client or new.responded_at is null) then raise exception 'Client response is required'; end if;
 if new.status='disputed' and (new.responded_by is null or new.responded_by not in(client,provider) or new.responded_at is null) then raise exception 'Dispute response requires an actual party'; end if;
 return new;
end $$;
create trigger completion_party_guard before insert or update on private.completion_submissions for each row execute function private.guard_completion_parties();
alter table public.disputes add column version integer not null default 1, add column opened_from public.booking_status;
create unique index dispute_one_active on public.disputes(booking_id) where status in('open','investigating','awaiting_evidence');
create table private.work_entries (
 id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.bookings(id),
 actor_id uuid references auth.users(id), kind text not null check(kind in('progress','correction','case_response','support_note')),
 body text not null check(length(body) between 2 and 4000), dispute_id uuid references public.disputes(id),
 completion_id uuid references private.completion_submissions(id), public_to_parties boolean not null default false,
 created_at timestamptz not null default clock_timestamp()
);
create table private.collaboration_assets (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 job_id uuid not null references public.job_requests(id), conversation_id uuid references public.conversations(id),
 booking_id uuid references public.bookings(id), dispute_id uuid references public.disputes(id),
 purpose text not null check(purpose in('message','completion','case')),
 storage_path text not null unique, sha256 text not null check(length(sha256)=64), byte_size integer not null check(byte_size between 1 and 3145728),
 state text not null default 'pending' check(state in('pending','stored','removed','purge_pending','purged')),
 attached boolean not null default false, held boolean not null default false,
 created_at timestamptz not null default clock_timestamp(), retain_until timestamptz not null,
 check((purpose='message' and conversation_id is not null and dispute_id is null) or (purpose='completion' and booking_id is not null and dispute_id is null) or (purpose='case' and booking_id is not null and dispute_id is not null))
);
create index collaboration_assets_context on private.collaboration_assets(job_id,state,retain_until);
create table private.message_assets (message_id uuid not null references public.messages(id), asset_id uuid not null unique references private.collaboration_assets(id), primary key(message_id,asset_id));
create table private.completion_assets (completion_id uuid not null references private.completion_submissions(id), asset_id uuid not null unique references private.collaboration_assets(id), primary key(completion_id,asset_id));
create table private.entry_assets (entry_id uuid not null references private.work_entries(id), asset_id uuid not null unique references private.collaboration_assets(id), primary key(entry_id,asset_id));
create table private.workflow_access_grants (
 id uuid primary key default gen_random_uuid(), actor_id uuid not null references auth.users(id), session_id uuid not null references auth.sessions(id),
 resource_kind text not null check(resource_kind in('booking','conversation','dispute')),
 resource_id uuid not null, reason text not null check(length(reason) between 10 and 500),
 expires_at timestamptz not null, created_at timestamptz not null default clock_timestamp()
);
create index workflow_access_actor on private.workflow_access_grants(actor_id,session_id,expires_at);

create function private.guard_collaboration_asset_link() returns trigger language plpgsql security invoker set search_path='' as $$
declare a private.collaboration_assets; owner uuid; context uuid;
begin
 if tg_op<>'INSERT' then raise exception 'Evidence links are immutable'; end if;
 select * into a from private.collaboration_assets where id=new.asset_id for update;
 if a.id is null or a.state<>'stored' or a.attached or a.retain_until<=clock_timestamp() then raise exception 'Attachment is unavailable or already linked'; end if;
 if tg_table_name='message_assets' then
  select m.sender_id,m.conversation_id into owner,context from public.messages m where m.id=new.message_id;
  if a.purpose<>'message' or a.conversation_id is distinct from context then raise exception 'Message attachment scope mismatch'; end if;
 elsif tg_table_name='completion_assets' then
  select s.submitted_by,s.booking_id into owner,context from private.completion_submissions s where s.id=new.completion_id;
  if a.purpose<>'completion' or a.booking_id is distinct from context then raise exception 'Completion attachment scope mismatch'; end if;
 else
  select e.actor_id,e.dispute_id into owner,context from private.work_entries e where e.id=new.entry_id;
  if a.purpose<>'case' or a.dispute_id is distinct from context then raise exception 'Case attachment scope mismatch'; end if;
 end if;
 if a.owner_id is distinct from owner then raise exception 'Attachment must belong to the actual author'; end if;
 update private.collaboration_assets set attached=true,held=(held or a.purpose='case') where id=a.id;
 return new;
end $$;
create trigger message_asset_link before insert or update or delete on private.message_assets for each row execute function private.guard_collaboration_asset_link();
create trigger completion_asset_link before insert or update or delete on private.completion_assets for each row execute function private.guard_collaboration_asset_link();
create trigger entry_asset_link before insert or update or delete on private.entry_assets for each row execute function private.guard_collaboration_asset_link();

create function private.freeze_work_evidence() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='DELETE' then raise exception 'Work evidence is retained for review'; end if;
 if tg_table_name='completion_submissions' then
  if (to_jsonb(new)-array['status','responded_by','responded_at','support_due_at']) is distinct from (to_jsonb(old)-array['status','responded_by','responded_at','support_due_at']) or (old.status<>'pending' and (new.status,new.responded_by,new.responded_at) is distinct from (old.status,old.responded_by,old.responded_at)) or (old.support_due_at is not null and new.support_due_at is distinct from old.support_due_at) then raise exception 'Completion evidence and past responses are immutable'; end if;
 else raise exception 'Evidence history is append-only'; end if;
 return new;
end $$;
create trigger work_entry_history before update or delete on private.work_entries for each row execute function private.freeze_work_evidence();
create trigger completion_history before update or delete on private.completion_submissions for each row execute function private.freeze_work_evidence();
create trigger workflow_access_history before update or delete on private.workflow_access_grants for each row execute function private.freeze_work_evidence();

create policy conversations_current_server on public.conversations as restrictive for select to authenticated using(false);
create policy conversation_members_current_server on public.conversation_members as restrictive for select to authenticated using(false);
create policy messages_current_server on public.messages as restrictive for select to authenticated using(false);
create policy scope_current_server on public.change_orders as restrictive for select to authenticated using(false);
create policy disputes_current_server on public.disputes as restrictive for select to authenticated using(false);
create policy safety_current_server on public.safety_reports as restrictive for select to authenticated using(false);
do $$ declare t text; begin
 foreach t in array array['conversation_reports','booking_reschedules','completion_submissions','work_entries','collaboration_assets','message_assets','completion_assets','entry_assets','workflow_access_grants'] loop
  execute format('alter table private.%I enable row level security',t);
  execute format('revoke all on private.%I from public,anon,authenticated',t);
  execute format('grant all on private.%I to service_role',t);
 end loop;
end $$;
revoke all on function private.guard_conversation_party(),private.guard_message_history(),private.guard_agreed_proposal(),private.freeze_work_evidence(),private.guard_collaboration_asset_link(),private.check_adjusted_work_total(),private.guard_completion_parties() from public,anon,authenticated;
grant execute on function private.guard_conversation_party(),private.guard_message_history(),private.guard_agreed_proposal(),private.freeze_work_evidence(),private.guard_collaboration_asset_link(),private.check_adjusted_work_total(),private.guard_completion_parties() to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('chat-attachments','chat-attachments',false,3145728,array['image/jpeg']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy collaboration_storage_server_only on storage.objects as restrictive for all to anon,authenticated using(bucket_id<>'chat-attachments') with check(bucket_id<>'chat-attachments');
commit;
