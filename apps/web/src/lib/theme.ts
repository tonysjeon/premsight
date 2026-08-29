export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'premsight-theme';
export const DEFAULT_THEME: Theme = 'dark';

export function isTheme(value: string | null | undefined): value is Theme {
  return value === 'light' || value === 'dark';
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* private mode */
  }
}

export function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(stored)) return stored;
  } catch {
    /* private mode */
  }
  return DEFAULT_THEME;
}
