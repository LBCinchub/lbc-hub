import { describe, it, expect } from 'vitest';
import { cn } from '../lib/utils';

describe('cn (className utility)', () => {
  it('returns a single class unchanged', () => {
    expect(cn('foo')).toBe('foo');
  });

  it('merges multiple classes', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes (truthy)', () => {
    expect(cn('foo', true && 'bar')).toBe('foo bar');
  });

  it('handles conditional classes (falsy)', () => {
    expect(cn('foo', false && 'bar')).toBe('foo');
  });

  it('deduplicates conflicting Tailwind classes (last wins)', () => {
    // tailwind-merge should resolve conflicts e.g. two bg-* classes
    const result = cn('bg-red-500', 'bg-blue-500');
    expect(result).toBe('bg-blue-500');
  });

  it('handles undefined and null without throwing', () => {
    expect(() => cn('foo', undefined, null)).not.toThrow();
  });

  it('handles object syntax from clsx', () => {
    expect(cn({ foo: true, bar: false })).toBe('foo');
  });

  it('handles array syntax from clsx', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });

  it('returns empty string when no truthy inputs', () => {
    expect(cn(false, null, undefined)).toBe('');
  });

  it('merges padding utilities correctly', () => {
    // tailwind-merge keeps the last conflicting utility
    const result = cn('p-2', 'p-4');
    expect(result).toBe('p-4');
  });
});
