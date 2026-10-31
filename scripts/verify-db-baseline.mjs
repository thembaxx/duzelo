import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const schema = read('supabase/migrations/20261031180000_m01_schema.sql');
const rls = read('supabase/migrations/20261031180100_m01_rls.sql');
const config = read('supabase/config.toml');
const seed = read('supabase/seed.sql');
const pgtap = read('supabase/tests/database/01_rls_guards.test.sql');

const tableMatches = [...schema.matchAll(/create table\s+(public|private)\.([a-z_]+)/gi)];
const tables = tableMatches.map((match) => ({ schema: match[1], name: match[2] }));
assert.ok(tables.length >= 30, 'Expected full baseline, not a partial schema');
assert.equal(new Set(tables.map((value) => value.schema + '.' + value.name)).size, tables.length);

const rlsNames = schema.match(/and tablename in \(\s*([\s\S]*?)\)\s*loop/i)?.[1];
assert.ok(rlsNames, 'Missing bulk RLS enabling loop');
const enabledTables = new Set([...rlsNames.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]));
for (const table of tables) {
  assert.ok(enabledTables.has(table.name), `Missing RLS for ${table.schema}.${table.name}`);
}
const publicGrantNames = rls.match(/schemaname='public' and tablename in \(\s*([\s\S]*?)\)\s*loop/i)?.[1];
assert.ok(publicGrantNames, 'Public table grants must be explicit and reviewable');
const granted = new Set([...publicGrantNames.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]));
for (const table of tables.filter((t) => t.schema === 'public')) {
  assert.ok(granted.has(table.name), `Missing explicit privileges for public.${table.name}`);
}
assert.doesNotMatch(config, /schemas\s*=\s*\[[^\]]*["']private["']/i,
  'Private schema must never be exposed in Data API');
assert.match(config, /schemas\s*=\s*\["public",\s*"graphql_public"\]/);
assert.match(schema, /create extension if not exists postgis with schema extensions/i);
assert.match(schema, /create table private\.client_addresses/);
assert.match(schema, /create table private\.job_locations/);
assert.match(schema, /create table private\.worker_coverage/);
assert.match(schema, /create table private\.admin_members/);
assert.match(schema, /create table private\.verification_documents/);
assert.match(schema, /create table private\.payment_intents/);
assert.match(schema, /create table private\.audit_events/);
assert.match(schema, /check \(approx_marker is null\)/i);
assert.match(rls, /create policy worker_cards_public_read[^;]+verified_identity[^;]+valid_through/is);
assert.match(rls, /join public\.worker_cards c on c\.worker_id = w\.id/);
assert.match(rls, /jm\.expires_at is null or jm\.expires_at > now\(\)/);
assert.match(schema, /guard_verification_review[\s\S]*Self approval is forbidden/i);
assert.match(schema, /worker_verification_invalidate_card/);
assert.match(schema, /worker_status_unpublish_after_change/);
assert.match(schema, /user_suspension_unpublish_worker_cards/);
assert.match(schema, /guard_job_address_owner/);
assert.match(schema, /guard_inspection_grant/);
assert.match(schema, /booking_events_immutable/);
assert.match(schema, /audit_events_immutable/);
assert.match(schema, /using gist\(base_point\)/);
assert.match(schema, /using gist\(exact_point\)/);
assert.doesNotMatch(schema, /security definer/i, 'No unreviewed privilege escalation helpers');
assert.doesNotMatch(rls, /create policy [\s\S]*? for (insert|update|delete) to (?:anon|authenticated)/i,
  'Browser direct writes remain disabled');
assert.match(rls, /revoke all on all tables in schema private from public, anon, authenticated/);
assert.match(rls, /grant select on public\.service_categories, public\.worker_cards, public\.worker_services to anon/);
assert.match(rls, /reviews_author_only_read/);
assert.match(seed, /on conflict \(slug\) do update/);
assert.doesNotMatch(seed, /insert into (?:auth\.users|public\.worker_profiles|public\.reviews)/i,
  'Production seed must never create fictional users, verified workers or reviews');
assert.match(pgtap, /set local role anon/i);
assert.match(pgtap, /set local role authenticated/i);
assert.match(pgtap, /from private\.client_addresses/);
assert.match(pgtap, /from private\.payment_intents/);
assert.match(pgtap, /rollback;/i);
assert.match(pgtap, /select \* from finish\(\)/i);
const declaredCount = Number(pgtap.match(/select plan\((\d+)\)/i)?.[1] ?? -1);
const assertions = [...pgtap.matchAll(/select (?:has_table|is|ok|throws_ok)\(/gi)].length;
assert.equal(declaredCount, assertions, 'pgTAP plan must equal authored assertion count');

for (const match of [...schema.matchAll(/create function private\.([a-z_]+)\(\) returns trigger[\s\S]*?revoke execute on function private\.\1\(\)/gi)]) {
  const functionBody = match[0];
  assert.match(functionBody, /\bas \$\$[\s\S]*?end; \$\$;/,
    `Broken PL/pgSQL delimiter in ${match[1]}`);
}
const functions = [...schema.matchAll(/create function private\.([a-z_]+)\(\) returns trigger/gi)];
assert.equal(functions.length, 9, 'Verify every trigger function, including copied blueprints');

console.log(`DB baseline static guards passed: ${tables.length} tables, ${functions.length} functions, policies and fixtures checked.`);
console.log('NOTE: This is NOT a database migration, pgTAP or PostGIS execution test.');
