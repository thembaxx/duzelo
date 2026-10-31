import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SIGNED_IN_ROUTE,
  restrictAdminReturnPath,
  safePostLoginPath,
} from './navigation';

describe('post-authentication return path allowlist', () => {
  it.each([
    '/app/client',
    '/app/worker',
    '/app/settings',
    '/app/worker/onboarding',
    '/app/client/jobs',
    '/app/worker/profile/edit',
    '/admin',
    '/admin/verification',
    '/admin/reports/abuse',
  ])('allows a canonical workspace path: %s', (value) => {
    expect(safePostLoginPath(value)).toBe(value);
  });

  it.each([
    'https://example.com', 'http://evil.com', '//evil.com',
    '/\\evil.com', '/%2fevil.com',
    '/app/client?next=https://evil.com', '/app/worker#fragment',
    '/app/worker//onboarding', '/app/client/../admin',
    '/app/client/./admin', '/app/client/%2e%2e/admin',
    '/app/client/%5cadmin', '/app/client\\admin',
    '/app/client\n/admin', '/app/client\r/admin',
    'javascript:alert(1)', 'data:text/html,bad', '',
    '/auth/sign-in', '/login', '/logout', '/',
    '/app/clientish', '/adminevil', '/app', '/settings',
    '/app/client/case.Sensitive', ' '.repeat(600),
    123, null, undefined, {}, [],
  ])('rejects unsafe or unsupported redirect destination: %s', (value) => {
    expect(safePostLoginPath(value)).toBe(DEFAULT_SIGNED_IN_ROUTE);
  });

  it('requires server-verified staff and MFA for admin return URLs', () => {
    expect(restrictAdminReturnPath('/admin', false)).toBe(DEFAULT_SIGNED_IN_ROUTE);
    expect(restrictAdminReturnPath('/admin/verification', false)).toBe(
      DEFAULT_SIGNED_IN_ROUTE,
    );
    expect(restrictAdminReturnPath('/admin/verification', true)).toBe(
      '/admin/verification',
    );
    expect(restrictAdminReturnPath('/app/worker/onboarding', false)).toBe(
      '/app/worker/onboarding',
    );
    expect(restrictAdminReturnPath('//evil.com', true)).toBe(
      DEFAULT_SIGNED_IN_ROUTE,
    );
  });
});
