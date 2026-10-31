import { describe, expect, it } from 'vitest';
import { serviceCategories, findServiceCategory, searchServiceCategories } from './services';

describe('service category catalogue', () => {
  it('has unique service slugs and display numbers', () => {
    expect(new Set(serviceCategories.map((service) => service.slug)).size).toBe(serviceCategories.length);
    expect(new Set(serviceCategories.map((service) => service.number)).size).toBe(serviceCategories.length);
  });

  it('only returns known category details', () => {
    expect(findServiceCategory('plumbing')?.name).toBe('Plumbing');
    expect(findServiceCategory('not-a-service')).toBeUndefined();
  });

  it('filters categories by example, ignores case and trims whitespace', () => {
    expect(searchServiceCategories('  TAP  ').map((value) => value.slug)).toContain('plumbing');
    expect(searchServiceCategories('')).toHaveLength(serviceCategories.length);
    expect(searchServiceCategories('unknown-service')).toEqual([]);
  });
});
