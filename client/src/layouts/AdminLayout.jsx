import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, m } from 'motion/react';
import { Award, BarChart3, BookOpen, Briefcase, ChevronRight, ExternalLink, FileText, FolderKanban, GraduationCap, LayoutDashboard, Link2, LogOut, Mail, Menu, PenLine, Settings, Sparkles, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import ThemeToggle from '../components/layout/ThemeToggle.jsx';
import Seo from '../components/Seo.jsx';
import { cn } from '../utils/cn.js';

// Each later phase appends its page here; the sidebar, breadcrumbs and routes pick it up.
export const ADMIN_NAV = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, end: true },
  { label: 'Profile', to: '/admin/profile', icon: User },
  { label: 'About', to: '/admin/about', icon: BookOpen },
  { label: 'Skills', to: '/admin/skills', icon: Sparkles },
  { label: 'Projects', to: '/admin/projects', icon: FolderKanban },
  { label: 'Experience', to: '/admin/experience', icon: Briefcase },
  { label: 'Education', to: '/admin/education', icon: GraduationCap },
  { label: 'Certificates', to: '/admin/certificates', icon: Award },
  { label: 'Resume', to: '/admin/resume', icon: FileText },
  { label: 'Social Links', to: '/admin/social', icon: Link2 },
  { label: 'Blog', to: '/admin/blog', icon: PenLine },
  { label: 'Messages', to: '/admin/messages', icon: Mail },
  { label: 'Site Settings', to: '/admin/settings', icon: Settings },
  { label: 'Analytics', to: '/admin/analytics', icon: BarChart3 },
];

function Sidebar({ onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      toast.info('Signed out');
      navigate('/admin/login', { replace: true });
    }
  };

  return (
    <div className="flex h-full flex-col">
      <Link to="/admin" onClick={onNavigate} className="flex h-16 items-center px-5 font-display text-lg font-bold">
        Admin<span className="text-accent">.</span>
      </Link>
      <nav aria-label="Admin" className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {ADMIN_NAV.map(({ label, to, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                isActive ? 'bg-accent/10 font-medium text-accent' : 'text-muted hover:bg-raised hover:text-fg'
              )
            }
          >
            <Icon className="size-4.5" aria-hidden="true" /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="space-y-1 border-t border-line p-3">
        <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted transition-colors hover:bg-raised hover:text-fg">
          <ExternalLink className="size-4.5" aria-hidden="true" /> View site
        </a>
        <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted transition-colors hover:bg-danger/10 hover:text-danger">
          <LogOut className="size-4.5" aria-hidden="true" /> Logout
        </button>
        <p className="truncate px-3 pt-2 text-xs text-subtle" title={user?.email}>{user?.email}</p>
      </div>
    </div>
  );
}

function Breadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split('/').filter(Boolean).slice(1); // drop "admin"
  const labelFor = (seg) => ADMIN_NAV.find((n) => n.to.endsWith(`/${seg}`))?.label || seg.replace(/-/g, ' ');
  return (
    <ol className="flex items-center gap-1.5 text-sm text-muted" aria-label="Breadcrumb">
      <li><Link to="/admin" className="hover:text-fg">Admin</Link></li>
      {parts.map((seg, i) => (
        <li key={seg} className="flex items-center gap-1.5">
          <ChevronRight className="size-3.5" aria-hidden="true" />
          <span className={cn('capitalize', i === parts.length - 1 && 'text-fg')}>{labelFor(seg)}</span>
        </li>
      ))}
      {parts.length === 0 && (
        <li className="flex items-center gap-1.5">
          <ChevronRight className="size-3.5" aria-hidden="true" /><span className="text-fg">Dashboard</span>
        </li>
      )}
    </ol>
  );
}

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-dvh bg-bg">
      <Seo title="Admin" noindex />
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-line bg-surface lg:block">
        <Sidebar />
      </aside>

      <AnimatePresence>
        {open && (
          <>
            <m.div className="fixed inset-0 z-40 bg-black/60 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <m.aside
              className="fixed inset-y-0 left-0 z-50 w-64 border-r border-line bg-surface lg:hidden"
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-3 top-4 rounded-lg p-1.5 text-muted hover:bg-raised"><X className="size-5" /></button>
              <Sidebar onNavigate={() => setOpen(false)} />
            </m.aside>
          </>
        )}
      </AnimatePresence>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-bg/80 px-4 backdrop-blur-md sm:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <button onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} className="grid size-10 place-items-center rounded-xl text-muted hover:bg-raised lg:hidden">
              <Menu className="size-5" />
            </button>
            <Breadcrumbs />
          </div>
          <ThemeToggle />
        </header>
        <main className="px-4 py-8 sm:px-8"><Outlet /></main>
      </div>
    </div>
  );
}
