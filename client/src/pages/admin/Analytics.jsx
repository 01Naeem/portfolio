import { useState } from 'react';
import { Download, Eye, Inbox, MousePointerClick } from 'lucide-react';
import { useApi } from '../../hooks/useApi.js';
import { analyticsApi } from '../../services/endpoints.js';
import { formatNumber } from '../../utils/format.js';
import { cn } from '../../utils/cn.js';
import PageHeader from '../../components/admin/PageHeader.jsx';
import BarChart from '../../components/admin/BarChart.jsx';
import { Card, Skeleton } from '../../components/ui/Primitives.jsx';
import { EmptyState, ErrorState } from '../../components/ui/States.jsx';

const RANGES = [7, 30, 90];

function Stat({ icon: Icon, label, value, sub, loading }) {
  return (
    <Card className="flex items-start justify-between p-5">
      <div>
        <p className="text-sm text-muted">{label}</p>
        {loading ? <Skeleton className="mt-2 h-9 w-16" /> : <p className="mt-1 font-display text-3xl font-bold tabular-nums">{formatNumber(value)}</p>}
        {sub && !loading && <p className="mt-1 text-xs text-subtle">{sub}</p>}
      </div>
      <span className="grid size-10 place-items-center rounded-xl bg-accent/10 text-accent"><Icon className="size-5" aria-hidden="true" /></span>
    </Card>
  );
}

export default function Analytics() {
  const [days, setDays] = useState(30);
  const { data, loading, error, refetch } = useApi(`admin:analytics:${days}`, () => analyticsApi.get(days), { ttl: 0 });
  const first = loading && !data;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Analytics"
        description="Anonymous, privacy-friendly numbers: daily counters only, with no cookies, IP addresses or visitor profiles. Your own visits while signed in aren't counted."
        action={
          <div role="group" aria-label="Date range" className="inline-flex rounded-xl border border-line bg-surface p-1">
            {RANGES.map((r) => (
              <button key={r} aria-pressed={days === r} onClick={() => setDays(r)}
                className={cn('rounded-lg px-3.5 py-1.5 text-sm transition-colors', days === r ? 'bg-accent/10 font-medium text-accent' : 'text-muted hover:text-fg')}>
                {r} days
              </button>
            ))}
          </div>
        }
      />

      {error && !data ? (
        <ErrorState error={error} onRetry={refetch} title="Couldn't load analytics" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat loading={first} icon={Eye} label={`Page views (${days}d)`} value={data?.viewsInRange} sub={`${formatNumber(data?.viewsAllTime)} all time`} />
            <Stat loading={first} icon={MousePointerClick} label="Project clicks" value={data?.topProjects?.reduce((n, p) => n + p.clicks, 0)} sub="top 5 projects, all time" />
            <Stat loading={first} icon={Download} label="Resume downloads" value={data?.resumeDownloads} sub="all time" />
            <Stat loading={first} icon={Inbox} label={`Contact messages (${days}d)`} value={data?.contactSubmissions} sub={`${formatNumber(data?.messagesTotal)} all time`} />
          </div>

          <Card className="mt-6">
            <h2 className="mb-4 text-lg font-bold">Page views per day</h2>
            {first ? <Skeleton className="h-40 w-full" /> : data.viewsInRange === 0 ? (
              <EmptyState title="No views recorded yet" description="Views from real visitors will appear here. Visits while you're signed in as admin are ignored." />
            ) : <BarChart data={data.series} label={`Page views per day over the last ${days} days`} />}
          </Card>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="mb-3 text-lg font-bold">Top pages</h2>
              {first ? <Skeleton className="h-32 w-full" /> : data.topPages.length === 0 ? <p className="text-sm text-muted">Nothing yet.</p> : (
                <ol className="divide-y divide-line text-sm">
                  {data.topPages.map((p) => (
                    <li key={p.path} className="flex items-center justify-between gap-4 py-2.5">
                      <span className="truncate font-mono text-xs">{p.path}</span>
                      <span className="tabular-nums text-muted">{formatNumber(p.views)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
            <Card>
              <h2 className="mb-3 text-lg font-bold">Most-clicked projects</h2>
              {first ? <Skeleton className="h-32 w-full" /> : data.topProjects.length === 0 ? <p className="text-sm text-muted">No project clicks yet.</p> : (
                <ol className="divide-y divide-line text-sm">
                  {data.topProjects.map((p) => (
                    <li key={p._id} className="flex items-center justify-between gap-4 py-2.5">
                      <span className="truncate">{p.title}</span>
                      <span className="tabular-nums text-muted">{formatNumber(p.clicks)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
