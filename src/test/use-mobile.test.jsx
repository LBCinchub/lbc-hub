import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from '../hooks/use-mobile';

describe('useIsMobile', () => {
  let mediaQueryListeners = [];

  const mockMatchMedia = (matches) => {
    window.matchMedia = vi.fn().mockImplementation((query) => {
      const mql = {
        matches,
        media: query,
        onchange: null,
        addEventListener: vi.fn((event, handler) => {
          mediaQueryListeners.push({ event, handler, mql });
        }),
        removeEventListener: vi.fn((event, handler) => {
          mediaQueryListeners = mediaQueryListeners.filter(
            (l) => l.handler !== handler
          );
        }),
        dispatchEvent: vi.fn(),
      };
      return mql;
    });
  };

  beforeEach(() => {
    mediaQueryListeners = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false when viewport is wide (desktop)', () => {
    mockMatchMedia(false);
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('returns true when viewport is narrow (mobile)', () => {
    mockMatchMedia(true);
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('returns true at exactly the breakpoint boundary (767px)', () => {
    mockMatchMedia(true);
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 767,
    });

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('returns false at exactly the breakpoint (768px)', () => {
    mockMatchMedia(false);
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('updates when the media query fires a change event', () => {
    mockMatchMedia(false);
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    // Simulate resizing to mobile width
    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      // Trigger the change listeners registered by the hook
      mediaQueryListeners
        .filter((l) => l.event === 'change')
        .forEach((l) => l.handler());
    });

    expect(result.current).toBe(true);
  });

  it('removes the event listener on unmount', () => {
    mockMatchMedia(false);
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    const { unmount } = renderHook(() => useIsMobile());
    unmount();

    // Verify removeEventListener was called on the mql instance
    const mqlInstance = window.matchMedia.mock.results[0]?.value;
    expect(mqlInstance?.removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    );
  });
});
