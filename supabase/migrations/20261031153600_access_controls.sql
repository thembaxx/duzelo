-- Duzelo migration 02: least-privilege grants and RLS.
-- Companion to 20261031153500_initial_schema.sql; neither has been applied to a hosted project.
-- All browser writes are DENIED. Milestones 02+ must use session-authorized commands.
begin;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;
revoke all on all tables in schema private from public, anon, authenticated;
grant select, insert, update, delete on all tables in schema private to service_role;
-- Never give an application credential the ability to rewrite or erase evidence.
revoke update, delete on private.audit_events from service_role;

-- New projects no longer automatically expose public tables through the Data API;
-- explicitly grant per-table SELECT, not blanket write privileges.
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'user_profiles','service_categories','service_localities','business_profiles',
    'worker_profiles','worker_services','worker_cards','job_requests','job_media',
    'job_matches','quotes','quote_items','bookings','booking_events','change_orders',
    'conversations','conversation_members','messages','reviews','disputes',
    'safety_reports','notifications'
  ] loop
    execute format('revoke all on table public.%I from public, anon, authenticated', tbl);
    execute format('grant select on table public.%I to authenticated', tbl);
    execute format('grant select, insert, update, delete on table public.%I to service_role', tbl);
  end loop;
end $$;
revoke update, delete on public.booking_events from service_role;
grant select on public.service_categories, public.service_localities, public.worker_cards, public.worker_services to anon;

-- Close newly added-table privileges for migrations made by the postgres role.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema private revoke all on tables from anon, authenticated;

-- Profile fields and private worker/business records are owner-only.
create policy user_profiles_self_read on public.user_profiles for select to authenticated
  using (user_id=(select auth.uid()));
create policy categories_public_read on public.service_categories for select to anon,authenticated
  using (active);
create policy localities_public_read on public.service_localities for select to anon,authenticated
  using (active);
create policy worker_cards_public_read on public.worker_cards for select to anon,authenticated
  using (true); -- publication is privileged and guarded by verification and approved locality triggers
create policy worker_profiles_owner_read on public.worker_profiles for select to authenticated
  using (user_id=(select auth.uid()));
create policy business_profiles_owner_read on public.business_profiles for select to authenticated
  using (owner_id=(select auth.uid()));
create policy worker_services_guest_read on public.worker_services for select to anon
  using (active and exists (
    select 1 from public.worker_cards c where c.worker_id=worker_services.worker_id
  ));
create policy worker_services_signed_read on public.worker_services for select to authenticated
  using (
    (active and exists (select 1 from public.worker_cards c where c.worker_id=worker_services.worker_id))
    or exists (select 1 from public.worker_profiles w
      where w.id=worker_services.worker_id and w.user_id=(select auth.uid()))
  );

-- Match reads depend only on worker profile + suspension state; they never
-- recursively query job_requests. No guest job access.
create policy job_matches_worker_read on public.job_matches for select to authenticated
  using (exists (
    select 1 from public.worker_profiles w
    join public.user_profiles u on u.user_id=w.user_id and not u.is_suspended
    where w.id=job_matches.worker_id and w.user_id=(select auth.uid()) and w.status='approved'
  ));
create policy job_requests_participants_read on public.job_requests for select to authenticated
  using (
    client_id=(select auth.uid())
    or (status not in ('draft','cancelled','expired') and exists (
      select 1 from public.worker_profiles w
      join public.user_profiles u on u.user_id=w.user_id and not u.is_suspended
      where w.id=job_requests.requested_worker_id
        and w.user_id=(select auth.uid()) and w.status='approved'
    ))
    or (status not in ('draft','cancelled','expired') and exists (
      select 1 from public.job_matches m
      join public.worker_profiles w on w.id=m.worker_id and w.status='approved'
      join public.user_profiles u on u.user_id=w.user_id and not u.is_suspended
      where m.job_id=job_requests.id and w.user_id=(select auth.uid())
        and m.status in ('invited','viewed','responded')
    ))
  );
create policy job_media_participants_read on public.job_media for select to authenticated
  using (
    created_by=(select auth.uid())
    or (kind='request' and exists (
      select 1 from public.job_requests j where j.id=job_media.job_id
    ))
    or (kind in ('progress','completion') and exists (
      select 1 from public.bookings b
      where b.job_id=job_media.job_id
        and b.status in ('confirmed','in_progress','completion_pending','completed','disputed')
    ))
  );
create policy quotes_participants_read on public.quotes for select to authenticated
  using (
    (status <> 'draft' and exists (
      select 1 from public.job_requests j
      where j.id=quotes.job_id and j.client_id=(select auth.uid())
    ))
    or exists (
      select 1 from public.worker_profiles w
      where w.id=quotes.worker_id and w.user_id=(select auth.uid())
    )
  );
create policy quote_items_participants_read on public.quote_items for select to authenticated
  using (exists (select 1 from public.quotes q where q.id=quote_items.quote_id));
create policy bookings_participants_read on public.bookings for select to authenticated
  using (
    exists (select 1 from public.job_requests j
      where j.id=bookings.job_id and j.client_id=(select auth.uid()))
    or exists (select 1 from public.worker_profiles w
      where w.id=bookings.worker_id and w.user_id=(select auth.uid()))
  );
create policy booking_events_participants_read on public.booking_events for select to authenticated
  using (exists (select 1 from public.bookings b where b.id=booking_events.booking_id));
create policy change_orders_participants_read on public.change_orders for select to authenticated
  using (exists (select 1 from public.bookings b where b.id=change_orders.booking_id));
create policy conversation_members_self_read on public.conversation_members for select to authenticated
  using (user_id=(select auth.uid()));
create policy conversations_member_read on public.conversations for select to authenticated
  using (exists (select 1 from public.conversation_members m
    where m.conversation_id=conversations.id and m.user_id=(select auth.uid())));
create policy messages_member_read on public.messages for select to authenticated
  using (exists (select 1 from public.conversation_members m
    where m.conversation_id=messages.conversation_id and m.user_id=(select auth.uid())));

-- Published reviews, booking disputes and any payment details MUST be returned
-- by separate authorized/redacted server DTOs; never serve the raw record publicly.
create policy reviews_author_read on public.reviews for select to authenticated
  using (author_id=(select auth.uid()));
create policy disputes_party_read on public.disputes for select to authenticated
  using (
    opened_by=(select auth.uid())
    or exists (
      select 1 from public.bookings b where b.id=disputes.booking_id
    )
  );
create policy reports_author_read on public.safety_reports for select to authenticated
  using (reporter_id=(select auth.uid()));
create policy notifications_recipient_read on public.notifications for select to authenticated
  using (user_id=(select auth.uid()));

-- Zero insert/update/delete policies for anon/authenticated.
-- Private schema and storage buckets stay outside the Data API.
-- Real service-role commands must authenticate caller, verify ownership, and audit.
commit;
