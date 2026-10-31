-- Run only by an approved database operator using psql variables: user_id, reason.
-- No browser/API can call this file. Never run automatically during signup/seed.
\set ON_ERROR_STOP on
begin;
select id from auth.users where id=:'user_id'::uuid and phone_confirmed_at is not null for update;
insert into private.admin_members(user_id,admin_role,granted_at)
select id,'owner',now() from auth.users where id=:'user_id'::uuid and phone_confirmed_at is not null
on conflict(user_id) do nothing;
insert into private.audit_events(actor_id,actor_type,action,resource_kind,resource_id,metadata_redacted)
select null,'system','admin.operator_bootstrap','admin_members',user_id,jsonb_build_object('operator_reason',:'reason')
from private.admin_members where user_id=:'user_id'::uuid;
commit;
