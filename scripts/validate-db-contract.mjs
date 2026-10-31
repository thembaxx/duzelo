import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const schema = readFileSync('supabase/migrations/20261031153500_initial_schema.sql', 'utf8');
const policy = readFileSync('supabase/migrations/20261031153600_access_controls.sql', 'utf8');
const tests = [
  readFileSync('supabase/tests/database/01_access_policies.sql', 'utf8'),
  readFileSync('supabase/tests/database/02_integrity_and_geometry.sql', 'utf8'),
];

const tables = [...schema.matchAll(/create table (public|private)\.([a-z_]+)\s*\(/g)];
const expected = new Set(tables.map(([,schemaName,table]) => schemaName + '.' + table));
assert.equal(expected.size, tables.length, 'Every application table name must be unique');
assert.ok(expected.size >= 35, 'Baseline migration unexpectedly lost tables');
const enabledRls = schema.match(/'user_profiles','service_categories'.*?'audit_events'/s)?.[0];
assert.ok(enabledRls, 'RLS enable block must remain');
for (const [schemaName, table] of tables.map((v) => [v[1],v[2]])) {
  assert.ok(enabledRls.includes("'" + table + "'"), 'Missing from RLS enable loop: ' + schemaName + '.' + table);
  if (schemaName === 'public') {
    assert.ok(policy.includes("'" + table + "'"), 'Missing from grants: ' + table);
  }
}
assert.ok(schema.includes('create extension if not exists postgis with schema extensions;'));
assert.ok(!/security\s+definer/i.test(schema + policy), 'No unreviewed security-definer functions');
assert.ok(!/grant\s+(insert|update|delete|all)\s+on\s+[^;]+\s+to\s+(anon|authenticated)/i.test(policy), 'Direct browser writes must remain denied');
assert.ok(policy.includes('revoke all on schema private from public, anon, authenticated;'));
assert.ok(policy.includes('revoke update, delete on private.audit_events from service_role;'));
assert.ok(policy.includes("create policy disputes_party_read"));
assert.ok(schema.includes("private.enforce_job_location_owner"));
assert.ok(schema.includes("private.enforce_approved_worker_card"));
assert.ok(schema.includes("private.validate_worker_approval"));
assert.ok(schema.includes("private.reject_immutable_change"));
assert.ok(!/as \$(?=\n)|end; \$;/.test(schema), 'Malformed SQL dollar-quote delimiter');
const opens = (schema.match(/\$\$/g) || []).length + (policy.match(/\$\$/g) || []).length;
assert.equal(opens % 2, 0, 'Unbalanced PostgreSQL dollar-quoted blocks');
tests.forEach((sql,index)=>{
  const announced = Number(sql.match(/select plan\((\d+)\)/)?.[1]);
  const observed = (sql.match(/^select (?:is|throws_ok|ok|has_index|has_table)\(/gm)||[]).length;
  assert.equal(announced,observed,'pgTAP plan count mismatch suite '+(index+1));
  assert.match(sql,/\brollback;/i,'SQL test suite must roll back fictional data');
});
console.log('Static migration contract checks PASS (' + expected.size + ' tables, ' + opens/2 + ' function blocks, ' + tests.length + ' pgTAP suites).');
console.log('NOTE: This does not prove SQL compiles or that RLS works. Execute local Supabase migration reset and pgTAP tests.');
