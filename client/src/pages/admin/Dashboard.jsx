import { Award, Briefcase, Download, Eye, FileText, FolderKanban, GraduationCap, Inbox, MousePointerClick, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { adminApi } from '../../services/endpoints.js';
import { formatNumber } from '../../utils/format.js';
import { Card, Skeleton } from '../../components/ui/Primitives.jsx';
import { ErrorState } from '../../components/ui/States.jsx';
import { Stagger, StaggerItem } from '../../components/ui/Reveal.jsx';

const STATS = [
  { key: 'projects', label: 'Projects', icon: FolderKanban },
  { key: 'skills', label: 'Skills', icon: Sparkles },
  { key: 'certificates', label: 'Certificates', icon: Award },
  { key: 'messages', label: 'Messages', icon: Inbox, sub: (s) => `${s.unreadMessages} unread` },
  { key: 'experience', label: 'Experience entries', icon: Briefcase },
  { key: 'education', label: 'Education entries', icon: GraduationCap },
  { key: 'posts', label: 'Blog posts', icon: FileText, sub: (s) => `${s.draftPosts} drafts` },
  { key: 'pageViews', label: 'Portfolio views', icon: Eye },
  { key: 'projectClicks', label: 'Project clicks', icon: MousePointerClick },
  { key: 'resumeDownloads', label: 'Resume downloads', icon: Download },
];

export default function Dashboard() {
  const { data, loading, error, refetch } = useApi('admin-stats', adminApi.stats, { ttl: 10_000 });

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-bold sm:text-3xl">Dashboard</h1>
      <p className="mt-1 text-sm text-muted">A snapshot of what's on your portfolio.</p>

      {error && !data ? (
        <ErrorState className="mt-8" error={error} onRetry={refetch} title="Couldn't load stats" />
      ) : (
        <Stagger className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STATS.map(({ key, label, icon: Icon, sub }) => (
            <StaggerItem key={key}>
              <Card className="flex items-start justify-between p-5">
                <div>
                  <p className="text-sm text-muted">{label}</p>
                  {loading && !data ? (
                    <Skeleton className="mt-2 h-9 w-16" />
                  ) : (
                    <p className="mt-1 font-display text-3xl font-bold tabular-nums">{formatNumber(data?.[key])}</p>
                  )}
                  {sub && data && <p className="mt-1 text-xs text-subtle">{sub(data)}</p>}
                </div>
                <span className="grid size-10 place-items-center rounded-xl bg-accent/10 text-accent"><Icon className="size-5" aria-hidden="true" /></span>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}
      {data && data.unreadMessages > 0 && (
        <p className="mt-6 text-sm text-muted">
          You have <strong className="text-fg">{data.unreadMessages}</strong> unread {data.unreadMessages === 1 ? 'message' : 'messages'}.{' '}
          <Link to="/admin/messages" className="text-accent hover:underline">Open inbox</Link>
        </p>
      )}
    </div>
  );
}
