import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useApi } from '../../hooks/useApi.js';
import { publicApi } from '../../services/endpoints.js';
import { cn } from '../../utils/cn.js';
import ProjectCard from '../ProjectCard.jsx';
import { EmptyState, ErrorState } from '../ui/States.jsx';
import { Reveal, Stagger, StaggerItem } from '../ui/Reveal.jsx';
import Section, { GridSkeleton } from './Section.jsx';

const has = (p, re) => (p.technologies || []).some((t) => re.test(t));
// Filters from the spec. Type filters use the project's categories; the rest look at its technologies.
export const FILTERS = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'frontend', label: 'Frontend', test: (p) => p.categories?.includes('Frontend') },
  { id: 'backend', label: 'Backend', test: (p) => p.categories?.includes('Backend') },
  { id: 'fullstack', label: 'Full Stack', test: (p) => p.categories?.includes('Full Stack') },
  { id: 'react', label: 'React', test: (p) => has(p, /^react(\.js)?$/i) },
  { id: 'node', label: 'Node', test: (p) => has(p, /^node(\.js)?$/i) },
  { id: 'mern', label: 'MERN', test: (p) => has(p, /mongo/i) && has(p, /express/i) && has(p, /^react/i) && has(p, /^node/i) },
];

export const matchesQuery = (p, q) => {
  const s = q.trim().toLowerCase();
  return !s || [p.title, p.shortDescription, ...(p.technologies || [])].some((x) => x?.toLowerCase().includes(s));
};

export default function Projects() {
  const { data, loading, error, refetch } = useApi('projects', () => publicApi.projects({ limit: 50 }), { ttl: 120_000 });
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  const all = data || [];
  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.id, all.filter(f.test).length])), [all]);
  const active = FILTERS.find((f) => f.id === filter) || FILTERS[0];
  const shown = all.filter((p) => active.test(p) && matchesQuery(p, query));
  // Highlight one featured project above the grid, but only while the visitor isn't filtering/searching
  const spotlight = filter === 'all' && !query.trim() ? all.find((p) => p.featured) : null;
  const rest = spotlight ? shown.filter((p) => p._id !== spotlight._id) : shown;

  return (
    <Section id="projects" eyebrow="Projects" title="Things I've built" description="Real projects with source code and live demos where available." alt>
      {error && !data ? <ErrorState error={error} onRetry={refetch} title="Couldn't load projects" />
        : loading && !data ? <GridSkeleton count={3} className="h-72" />
        : all.length === 0 ? <EmptyState title="Projects coming soon" description="New work will appear here." />
        : (
          <>
            <Reveal className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <div role="group" aria-label="Filter projects" className="flex flex-wrap gap-2">
                {FILTERS.filter((f) => f.id === 'all' || counts[f.id] > 0).map((f) => (
                  <button key={f.id} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}
                    className={cn('rounded-full border px-3.5 py-1.5 text-sm transition-colors', filter === f.id ? 'border-accent bg-accent/10 text-accent' : 'border-line text-muted hover:border-accent/40 hover:text-fg')}>
                    {f.label} <span className="ml-1 text-xs opacity-70">{counts[f.id]}</span>
                  </button>
                ))}
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
                <input type="search" aria-label="Search projects" placeholder="Search projects…" value={query} onChange={(e) => setQuery(e.target.value)}
                  className="h-10 w-full rounded-xl border border-line bg-bg pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-subtle focus:border-accent" />
              </div>
            </Reveal>

            {spotlight && <Reveal className="mb-6"><ProjectCard project={spotlight} featured /></Reveal>}

            {shown.length === 0 ? (
              <EmptyState title="No projects match" description="Try a different filter or search term." />
            ) : (
              <Stagger key={`${filter}|${query}`} as="ul" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((p) => <StaggerItem as="li" key={p._id}><ProjectCard project={p} /></StaggerItem>)}
              </Stagger>
            )}
            <p className="sr-only" role="status">{shown.length} {shown.length === 1 ? 'project' : 'projects'} shown</p>
          </>
        )}
    </Section>
  );
}
