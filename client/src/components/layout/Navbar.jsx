import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, m } from 'motion/react';
import { FileText, Menu, X } from 'lucide-react';
import { useSite } from '../../context/SiteContext.jsx';
import { useScrolled } from '../../hooks/useScrolled.js';
import { resumeUrl } from '../../services/endpoints.js';
import { cn } from '../../utils/cn.js';
import Button from '../ui/Button.jsx';
import ThemeToggle from './ThemeToggle.jsx';

// Section links are hash links on the home page; Blog is its own route.
const NAV = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/#about' },
  { label: 'Skills', to: '/#skills' },
  { label: 'Projects', to: '/#projects' },
  { label: 'Experience', to: '/#experience' },
  { label: 'Blog', to: '/blog', key: 'showBlog' },
  { label: 'Contact', to: '/#contact' },
];

// Highlights the section currently under the reading line while on the home page. It reads the live DOM on each
// (frame-throttled) scroll instead of using IntersectionObserver, because some sections are lazy-loaded and replace
// their placeholder element, which would silently detach an observer.
function useActiveSection(ids, enabled) {
  const [active, setActive] = useState('');
  const key = ids.join('|');
  useEffect(() => {
    if (!enabled) { setActive(''); return undefined; }
    let raf = 0;
    const calc = () => {
      raf = 0;
      const line = window.innerHeight * 0.35;
      let current = '';
      for (const id of key.split('|')) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      // at the very bottom the last section wins, even if it is too short to reach the reading line
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4 && window.scrollY > 0) current = key.split('|').at(-1);
      setActive(current);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(calc); };
    calc();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [key, enabled]);
  return active;
}

export default function Navbar() {
  const { profile, settings, resume } = useSite();
  const scrolled = useScrolled();
  const [open, setOpen] = useState(false);
  const { pathname, hash } = useLocation();

  const items = NAV.filter((i) => !i.key || settings?.sections?.[i.key] !== false);
  const name = profile?.name || 'Portfolio';

  useEffect(() => setOpen(false), [pathname, hash]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const sectionIds = items.filter((i) => i.to.startsWith('/#')).map((i) => i.to.slice(2));
  const activeSection = useActiveSection(sectionIds, pathname === '/');
  const isActive = (to) => {
    if (to === '/blog') return pathname.startsWith('/blog');
    if (pathname !== '/') return false;
    return to === '/' ? !activeSection : to === `/#${activeSection}`;
  };

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300',
        scrolled || open ? 'border-b border-line/60 bg-bg/70 shadow-[0_10px_30px_-22px_rgb(0_0_0/0.7)] backdrop-blur-xl' : 'border-b border-transparent'
      )}
    >
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link to="/" className="font-display text-lg font-bold tracking-tight">
          {name}
          <span className="text-accent">.</span>
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {items.map((i) => (
            <li key={i.to}>
              <Link
                to={i.to}
                aria-current={isActive(i.to) ? (i.to.startsWith('/#') ? 'location' : 'page') : undefined}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm transition-[color,background-color] duration-200 hover:bg-raised/70 hover:text-fg',
                  isActive(i.to) ? 'bg-accent/10 font-medium text-fg' : 'text-muted'
                )}
              >
                {i.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          {resume?.available && (
            <Button href={resumeUrl(false)} variant="secondary" size="sm" className="hidden sm:inline-flex">
              <FileText className="size-4" aria-hidden="true" /> Resume
            </Button>
          )}
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="grid size-10 place-items-center rounded-xl text-muted hover:bg-raised hover:text-fg lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <m.div
            id="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden lg:hidden"
          >
            <ul className="mx-auto flex max-w-6xl flex-col gap-1 px-5 pb-5 pt-1 sm:px-8">
              {items.map((i, idx) => (
                <m.li key={i.to} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03, duration: 0.2 }}>
                  <Link
                    to={i.to}
                    aria-current={isActive(i.to) ? (i.to.startsWith('/#') ? 'location' : 'page') : undefined}
                    className={cn('block rounded-xl px-3 py-3 text-base transition-colors hover:bg-raised hover:text-fg', isActive(i.to) ? 'bg-accent/10 font-medium text-fg' : 'text-muted')}
                  >
                    {i.label}
                  </Link>
                </m.li>
              ))}
              {resume?.available && (
                <li className="pt-2">
                  <Button href={resumeUrl(false)} variant="secondary" className="w-full">
                    <FileText className="size-4" aria-hidden="true" /> View Resume
                  </Button>
                </li>
              )}
            </ul>
          </m.div>
        )}
      </AnimatePresence>
    </header>
  );
}
