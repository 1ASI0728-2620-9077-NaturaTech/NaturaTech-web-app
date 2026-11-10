import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ThemePreference } from '@/shared/model/theme.model';

const STORAGE_KEY = 'theme-preference';

/**
 * Resolves the effective theme ('light' or 'dark') from a ThemePreference value.
 * If the preference is 'system', it checks the OS-level prefers-color-scheme media query.
 */
function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return preference;
}

/**
 * Reads the stored theme preference from localStorage.
 * Returns the stored value if it is a valid ThemePreference, otherwise returns null.
 */
function readStoredPreference(): ThemePreference | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return null;
}

export const useThemeStore = defineStore('theme', () => {
  // Initialize preference: read from localStorage or fallback to 'system'
  const initialPreference = readStoredPreference() ?? 'system';
  const preference = ref<ThemePreference>(initialPreference);

  // Apply initial theme to document root immediately
  document.documentElement.setAttribute('data-theme', resolveTheme(initialPreference));

  /**
   * Applies a theme preference: persists to localStorage and updates the data-theme
   * attribute on the document root element.
   */
  function applyTheme(pref: ThemePreference): void {
    preference.value = pref;
    localStorage.setItem(STORAGE_KEY, pref);
    document.documentElement.setAttribute('data-theme', resolveTheme(pref));
  }

  return {
    preference,
    applyTheme,
  };
});
