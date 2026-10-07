import { useEffect, useRef } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, m } from 'motion/react';
import Navbar from '../components/layout/Navbar.jsx';
import Footer from '../components/layout/Footer.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useSite } from '../context/SiteContext.jsx';
import { publicApi } from '../services/endpoints.js';

// Smooth-scrolls to #section links and resets scroll on real page changes.
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      return undefined;
    }
    // After a route change the target section may need a frame or two to mount
    let tries = 0;
    let raf;
    const go = () => {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else if (tries++ < 30) raf = requestAnimationFrame(go);
    };
    go();
    return () => cancelAnimationFrame(raf);
  }, [pathname, hash]);
  return null;
}

// Anonymous page-view counter. Skipped for the signed-in admin, for visitors sending Do Not Track,
// and when the admin switched analytics off. Only the path is sent: no cookie, no identifier.
function usePageView() {
  const { pathname } = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { settings } = useSite();
  const last = useRef(null);
  useEffect(() => {
    if (authLoading || user || !settings || settings.analytics?.enabled === false) return;
    if (navigator.doNotTrack === '1') return;
    if (last.current === pathname) return;
    last.current = pathname;
    publicApi.trackView(pathname);
  }, [pathname, user, authLoading, settings]);
}

export default function PublicLayout() {
  const { pathname } = useLocation();
  usePageView();
  // useOutlet keeps the old page mounted while it fades out, which a bare <Outlet/> doesn't
  const outlet = useOutlet();
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[120] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-fg">
        Skip to content
      </a>
      <ScrollManager />
      <Navbar />
      <AnimatePresence mode="wait" initial={false}>
        <m.main
          id="main"
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="min-h-[calc(100dvh-8rem)]"
        >
          {outlet}
        </m.main>
      </AnimatePresence>
      <Footer />
    </>
  );
}
