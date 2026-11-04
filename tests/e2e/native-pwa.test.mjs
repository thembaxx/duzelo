import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');

test('installed Duzelo keeps standalone launch and private routes out of offline storage', () => {
  const manifest = JSON.parse(read('public/manifest.webmanifest'));
  assert.equal(manifest.display, 'standalone');
  assert.deepEqual(manifest.display_override, ['standalone', 'minimal-ui']);
  const worker = read('public/sw.js');
  assert.ok(worker.includes('const PRIVATE ='));
  assert.ok(worker.includes('PRIVATE.test(url.pathname)'));
  assert.ok(worker.includes('no-store'));
});

test('Duzelo reloads for an update only after explicit user approval', () => {
  const runtime = read('src/components/pwa-runtime.tsx');
  assert.ok(runtime.includes('!approvedUpdate.current'));
  assert.ok(runtime.includes('approvedUpdate.current = true'));
  assert.ok(runtime.includes('onClick={applyUpdate}'));
});
