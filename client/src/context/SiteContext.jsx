import { createContext, useContext, useEffect, useMemo } from 'react';
import { useApi } from '../hooks/useApi.js';
import { publicApi } from '../services/endpoints.js';
import { useTheme } from './ThemeContext.jsx';

const SiteContext = createContext(null);

// Loads the global content every page needs (profile, settings, resume availability) once.
export function SiteProvider({ children }) {
  const profile = useApi('profile', publicApi.profile, { ttl: 120_000 });
  const settings = useApi('settings', publicApi.settings, { ttl: 120_000 });
  const resume = useApi('resume-info', publicApi.resumeInfo, { ttl: 120_000 });
  const { applyDefault } = useTheme();

  const accent = settings.data?.theme?.accentColor;
  const defaultMode = settings.data?.theme?.defaultMode;

  useEffect(() => {
    if (accent) document.documentElement.style.setProperty('--accent-base', accent);
  }, [accent]);
  const favicon = settings.data?.favicon?.url;
  useEffect(() => {
    if (!favicon) return;
    let link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.removeAttribute('type'); // the default is image/svg+xml; an uploaded file may be png/ico
    link.href = favicon;
  }, [favicon]);
  useEffect(() => {
    if (defaultMode) applyDefault(defaultMode);
  }, [defaultMode, applyDefault]);

  const value = useMemo(
    () => ({
      profile: profile.data,
      settings: settings.data,
      resume: resume.data,
      loading: profile.loading || settings.loading,
      // Only the profile is essential; settings/resume failing just means defaults
      error: profile.error,
      refetch: () => {
        profile.refetch();
        settings.refetch();
        resume.refetch();
      },
    }),
    [profile, settings, resume]
  );
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export const useSite = () => {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used inside SiteProvider');
  return ctx;
};
