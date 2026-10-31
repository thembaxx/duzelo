import { describe, expect, it } from 'vitest';
import { featureFlags } from './feature-flags';

describe('foundation feature flags', () => {
  it('does not claim unfinished privileged workflows are enabled', () => {
    expect(Object.values(featureFlags).every((value) => value === false)).toBe(true);
  });
}
