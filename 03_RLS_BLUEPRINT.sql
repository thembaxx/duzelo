-- Duzelo RLS blueprint. Apply AFTER 02_SCHEMA_BLUEPRINT.sql in a clean local Supabase project.
-- Deliberate architecture: client uses SELECT only; all writes use authenticated server commands
-- that validate authorization before a narrowly scoped privileged DB operation.
-- A compromised privileged server key bypasses RLS. Keep it out of browser, logs and edge runtime.
begin;

-- The dedicated private schema MUST NOT be listed in Supabase Data API exposed schemas.
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;
revoke all on all tables in schema private from public, anon, authenticated;
grant select, insert, update, delete on all tables in schema private to service_role;

-- Explicitly revoke table grants, including unintentional blanket default grants.
do $$
declare rec record;
begin
  for rec in select tablename from pg_tables where schemaname='public' and tablename in (
    'user_profiles','service_categories','business_profiles','worker_profiles','worker_services','worker_cards',
    'job_requests','job_media','job_matches','quotes','quote_items','bookings','booking_events',
    'change_orders','conversations','conversation_members','messages',
    'reviews','disputes','safety_reports','notifications')
  loop
    execute format('revoke all on table public.%I from public, anon, authenticated', rec.tablename);
    execute format('grant select on table public.%I to authenticated', rec.tablename);
    execute format('grant select, insert, update, delete on table public.%I to service_role',rec.tablename);
  end loop;
end $$;
grant select on public.service_categories, public.worker_cards, public.worker_services to anon;
-- Reviews are served to guests by an audited, sanitized server DTO endpoint to avoid
-- exposing author_id/subject_user_id or unpublished moderation metadata.

create policy user_profiles_self_read on public.user_profiles for select to authenticated
  using (user_id = (select auth.uid()));
create policy categories_public_read on public.service_categories for select to anon, authenticated
  using (active);
create policy worker_cards_public_read on public.worker_cards for select to anon, authenticated
  using (true); -- sanitized cards only; server guarantees verified status before publication
create policy worker_profiles_owner_read on public.worker_profiles for select to authenticated
  using (user_id = (select auth.uid()));
create policy business_profiles_owner_read on public.business_profiles for select to authenticated
  using (owner_id = (select auth.uid()));
create policy worker_services_public_read on public.worker_services for select to anon
  using (active and exists (select 1 from public.worker_cards c where c.worker_id=worker_services.worker_id));
create policy worker_services_authenticated_read on public.worker_services for select to authenticated
  using ((active and exists (select 1 from public.worker_cards c where c.worker_id=worker_services.worker_id))
    or exists (select 1 from public.worker_profiles w where w.id=worker_services.worker_id and w.user_id=(select auth.uid())));

-- IMPORTANT no mutual recursion: job_matches policy only uses worker_profiles, NOT job_requests.
create policy job_matches_worker_read on public.job_matches for select to authenticated
  using (exists (select 1 from public.worker_profiles w where w.id=job_matches.worker_id and w.user_id=(select auth.uid()) and w.status='approved'));
create policy job_requests_participants_read on public.job_requests for select to authenticated
  using (
    client_id=(select auth.uid())
    or (status <> 'draft' and exists (select 1 from public.worker_profiles w where w.id=job_requests.requested_worker_id and w.user_id=(select auth.uid()) and w.status='approved'))
    or (status <> 'draft' and exists (
      select 1 from public.job_matches jm join public.worker_profiles w on w.id=jm.worker_id
      where jm.job_id=job_requests.id and w.user_id=(select auth.uid()) and w.status='approved'
    ))
  );
create policy job_media_participants_read on public.job_media for select to authenticated
  using (
    (kind='request' and exists (select 1 from public.job_requests j where j.id=job_media.job_id))
    or (kind in ('progress','completion') and (
      created_by=(select auth.uid())
      or exists(select 1 from public.job_requests j where j.id=job_media.job_id and j.client_id=(select auth.uid()))
      or exists(select 1 from public.bookings b where b.job_id=job_media.job_id)
    ))
  );
create policy quotes_participants_read on public.quotes for select to authenticated
  using (
    (quotes.status <> 'draft' and exists (select 1 from public.job_requests j where j.id=quotes.job_id and j.client_id=(select auth.uid())))
    or exists (select 1 from public.worker_profiles w where w.id=quotes.worker_id and w.user_id=(select auth.uid()))
  );
create policy quote_items_participants_read on public.quote_items for select to authenticated
  using (exists (select 1 from public.quotes q where q.id=quote_items.quote_id));
create policy bookings_participants_read on public.bookings for select to authenticated
  using (
    exists (select 1 from public.job_requests j where j.id=bookings.job_id and j.client_id=(select auth.uid()))
    or exists (select 1 from public.worker_profiles w where w.id=bookings.worker_id and w.user_id=(select auth.uid()))
  );
create policy booking_events_participants_read on public.booking_events for select to authenticated
  using (exists (select 1 from public.bookings b where b.id=booking_events.booking_id));
create policy change_orders_participants_read on public.change_orders for select to authenticated
  using (exists (select 1 from public.bookings b where b.id=change_orders.booking_id));

create policy conversation_members_own_read on public.conversation_members for select to authenticated
  using (user_id=(select auth.uid()));
create policy conversations_member_read on public.conversations for select to authenticated
  using (exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id=conversations.id and cm.user_id=(select auth.uid())
  ));
create policy messages_member_read on public.messages for select to authenticated
  using (exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id=messages.conversation_id and cm.user_id=(select auth.uid())
  ));

-- All payment intents, payment ledger entries and provider events reside in the private schema.
-- There are NO direct client SELECT policies: server routes return redacted booking-specific DTOs
-- after authenticating and authorizing the caller. This avoids revealing provider references,
-- internal reconciliations, payment metadata and other financial records by accident.

create policy reviews_published_or_owner_read on public.reviews for select to authenticated
  using (moderation_status='published' or author_id=(select auth.uid()));
create policy disputes_party_read on public.disputes for select to authenticated
  using (opened_by=(select auth.uid()) or exists(select 1 from public.bookings b where b.id=disputes.booking_id));
create policy reports_author_read on public.safety_reports for select to authenticated
  using (reporter_id=(select auth.uid()));
create policy notifications_recipient_read on public.notifications for select to authenticated
  using (user_id=(select auth.uid()));

-- No INSERT/UPDATE/DELETE policies for anonymous/authenticated clients: intentional default deny.
-- Any future direct browser writes require transaction-safe policies, per-column grants and pgTAP tests.
-- Storage bucket policies MUST be implemented separately, with private buckets and short-lived signed URLs.
commit;
