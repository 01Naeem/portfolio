import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const KEY = 'theme';
const ThemeContext = createContext(null);

const readStored = () => {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
};

const apply = (t) => {
  document.documentElement.dataset.theme = t;
  document.documentElement.style.colorScheme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#0a0c10' : '#f7f6f3');
};

export function ThemeProvider({ children }) {
  // index.html already set data-theme before first paint; start from that so React agrees with the DOM
  const [theme, setThemeState] = useState(() => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'));

  const setTheme = useCallback((t) => {
    setThemeState(t);
    apply(t);
    try {
      localStorage.setItem(KEY, t);
    } catch {
      /* private mode: preference just won't persist */
    }
  }, []);

  const toggleTheme = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [theme, setTheme]);

  // Admin's "default mode" only applies to visitors who haven't picked a theme themselves
  const applyDefault = useCallback((mode) => {
    if (readStored() || !mode) return;
    const t = mode === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : mode;
    setThemeState(t);
    apply(t);
  }, []);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme, applyDefault }), [theme, setTheme, toggleTheme, applyDefault]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
};
