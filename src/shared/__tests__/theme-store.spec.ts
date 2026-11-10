import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useThemeStore } from '@/shared/services/theme.store';

describe('Theme Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should default to system preference when localStorage is empty', () => {
      // Mock matchMedia to return dark preference
      vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));

      const store = useThemeStore();

      expect(store.preference).toBe('system');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should use stored "light" preference from localStorage', () => {
      localStorage.setItem('theme-preference', 'light');

      const store = useThemeStore();

      expect(store.preference).toBe('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should use stored "dark" preference from localStorage', () => {
      localStorage.setItem('theme-preference', 'dark');

      const store = useThemeStore();

      expect(store.preference).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should use stored "system" preference and resolve via matchMedia', () => {
      localStorage.setItem('theme-preference', 'system');
      vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));

      const store = useThemeStore();

      expect(store.preference).toBe('system');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should fallback to system when localStorage has invalid value', () => {
      localStorage.setItem('theme-preference', 'invalid-value');
      vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));

      const store = useThemeStore();

      expect(store.preference).toBe('system');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });

  describe('applyTheme', () => {
    it('should persist "dark" to localStorage and set data-theme attribute', () => {
      vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));

      const store = useThemeStore();
      store.applyTheme('dark');

      expect(store.preference).toBe('dark');
      expect(localStorage.getItem('theme-preference')).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should persist "light" to localStorage and set data-theme attribute', () => {
      vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));

      const store = useThemeStore();
      store.applyTheme('light');

      expect(store.preference).toBe('light');
      expect(localStorage.getItem('theme-preference')).toBe('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should persist "system" and resolve to OS preference', () => {
      vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));

      const store = useThemeStore();
      store.applyTheme('system');

      expect(store.preference).toBe('system');
      expect(localStorage.getItem('theme-preference')).toBe('system');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should update data-theme when switching between themes', () => {
      vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));

      const store = useThemeStore();

      store.applyTheme('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

      store.applyTheme('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');

      store.applyTheme('system');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });
  });
});
