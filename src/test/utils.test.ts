import { describe, it, expect } from 'vitest';
import { createPageUrl } from '../utils/index';

describe('createPageUrl', () => {
  it('returns a path starting with /', () => {
    expect(createPageUrl('Home')).toBe('/Home');
  });

  it('replaces spaces with hyphens', () => {
    expect(createPageUrl('My Page')).toBe('/My-Page');
  });

  it('replaces multiple spaces with hyphens', () => {
    expect(createPageUrl('Trip Planner Page')).toBe('/Trip-Planner-Page');
  });

  it('handles page names with no spaces', () => {
    expect(createPageUrl('Profile')).toBe('/Profile');
  });

  it('handles an empty string', () => {
    expect(createPageUrl('')).toBe('/');
  });

  it('handles page names with consecutive spaces', () => {
    expect(createPageUrl('A  B')).toBe('/A--B');
  });
});
