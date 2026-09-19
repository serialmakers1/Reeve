import { describe, it, expect } from 'vitest';
import { buildSearchOrFilter, escapeOrValue } from '../inspectionsListUtils';

describe('buildSearchOrFilter', () => {
  it('builds a quoted 3-column ilike .or filter for a plain term', () => {
    expect(buildSearchOrFilter('prestige')).toBe(
      'building_name.ilike."*prestige*",owner_name.ilike."*prestige*",owner_phone.ilike."*prestige*"',
    );
  });

  it('preserves spaces, plus and hyphens', () => {
    const out = buildSearchOrFilter('A-1 + block');
    expect(out).toContain('"*A-1 + block*"');
  });

  it('keeps commas/dots/colons/parens literal (via quoting) without breaking or injecting', () => {
    // Structural chars survive as literal text inside the quoted value.
    const out = buildSearchOrFilter('A, B (x). y:z');
    expect(out).toBe(
      'building_name.ilike."*A, B (x). y:z*",owner_name.ilike."*A, B (x). y:z*",owner_phone.ilike."*A, B (x). y:z*"',
    );
  });

  it('neutralizes ILIKE wildcards % and _ and the postgrest * so they cannot broaden the search', () => {
    expect(escapeOrValue('a%b_c*d')).toBe('a b c d');
  });

  it('escapes double-quote and backslash for safe quoting', () => {
    expect(escapeOrValue('say "hi"\\path')).toBe('say \\"hi\\"\\\\path');
  });

  it('returns null for empty, whitespace, or wildcard-only input', () => {
    expect(buildSearchOrFilter('')).toBeNull();
    expect(buildSearchOrFilter('   ')).toBeNull();
    expect(buildSearchOrFilter('%')).toBeNull();
    expect(buildSearchOrFilter('___')).toBeNull();
    expect(buildSearchOrFilter('***')).toBeNull();
  });
});
