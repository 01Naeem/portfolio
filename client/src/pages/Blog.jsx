import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PenLine, Search } from 'lucide-react';
import { useApi } from '../hooks/useApi.js';
import { useDebounced } from '../hooks/useDebounced.js';
import { useSite } from '../context/SiteContext.jsx';
import { publicApi } from '../services/endpoints.js';
import { cn } from '../utils/cn.js';
import Seo from '../components/Seo.jsx';
import PostCard from '../components/PostCard.jsx';
import Button from '../components/ui/Button.jsx';
import { Container, SectionHeading } from '../components/ui/Primitives.jsx';
import { EmptyState, ErrorState } from '../components/ui/States.jsx';
import { GridSkeleton } from '../components/sections/Section.jsx';
import { Stagger, StaggerItem } from '../components/ui/Reveal.jsx';
import NotFound from './NotFound.jsx';

const PAGE_SIZE = 9;
const chip = (on) => cn('rounded-full border px-3.5 py-1.5 text-sm transition-colors', on ? 'border-accent bg-accent/10 text-accent' : 'border-line text-muted hover:border-accent/40 hover:text-fg');

export default function Blog() {
  const { settings } = useSite();
  const [sp, setSp] = useSearchParams();
  const tag = sp.get('tag') || '';
  const category = sp.get('category') || '';
  const page = Math.max(1, parseInt(sp.get('page'), 10) || 1);
  const urlQ = sp.get('q') || '';

  // the search box types freely; the URL (and API call) follow after a short pause
  const [q, setQ] = useState(urlQ);
  const dq = useDebounced(q.trim(), 350);
  useEffect(() => {
    if (dq === urlQ) return;
    setSp((prev) => { const n = new URLSearchParams(prev); if (dq) n.set('q', dq); else n.delete('q'); n.delete('page'); return n; }, { replace: true });
  }, [dq]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key, value) => setSp((prev) => { const n = new URLSearchParams(prev); if (value) n.set(key, value); else n.delete(key); if (key !== 'page') n.delete('page'); return n; });

  const params = { page, limit: PAGE_SIZE, ...(tag && { tag }), ...(category && { category }), ...(urlQ && { q: urlQ }) };
  const posts = useApi(`blog:${JSON.stringify(params)}`, () => publicApi.blog(params), { ttl: 60_000, enabled: settings?.sections?.showBlog !== false });
  const facets = useApi('blog-meta', publicApi.blogMeta, { ttl: 120_000 });

  useEffect(() => { window.scrollTo({ top: 0 }); }, [page]);

  if (settings?.sections?.showBlog === false) return <NotFound />;

  const meta = posts.meta;
  const filtering = Boolean(tag || category || urlQ);
  const clear = () => { setQ(''); setSp({}, { replace: true }); };

  return (
    <Container className="pb-24 pt-28 sm:pt-32">
      <Seo title="Blog" description="Articles on web development, the MERN stack and what I'm learning." path="/blog" />
      <SectionHeading as="h1" eyebrow="Blog" title="Writing" description="Notes on building web apps and what I'm learning along the way." />

      <div className="mb-8 space-y-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
          <input type="search" aria-label="Search posts" placeholder="Search posts…" value={q} onChange={(e) => setQ(e.target.value)}
            className="h-11 w-full rounded-xl border border-line bg-bg pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-subtle focus:border-accent" />
        </div>
        {facets.data?.categories?.length > 0 && (
          <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
            <button aria-pressed={!category} onClick={() => set('category', '')} className={chip(!category)}>All categories</button>
            {facets.data.categories.map((c) => <button key={c.name} aria-pressed={category === c.name} onClick={() => set('category', c.name)} className={chip(category === c.name)}>{c.name} <span className="ml-1 text-xs opacity-70">{c.count}</span></button>)}
          </div>
        )}
        {facets.data?.tags?.length > 0 && (
          <div role="group" aria-label="Filter by tag" className="flex flex-wrap gap-2">
            {facets.data.tags.map((t) => <button key={t.name} aria-pressed={tag === t.name} onClick={() => set('tag', tag === t.name ? '' : t.name)} className={chip(tag === t.name)}>#{t.name}</button>)}
          </div>
        )}
      </div>

      {posts.error && !posts.data ? <ErrorState error={posts.error} onRetry={posts.refetch} title="Couldn't load posts" />
        : posts.loading && !posts.data ? <GridSkeleton count={6} className="h-72" />
        : !posts.data?.length ? (
          <EmptyState icon={PenLine} title={filtering ? 'No posts match' : 'No posts yet'} description={filtering ? 'Try a different tag, category or search term.' : 'Articles will appear here once they are published.'}
            action={filtering && <Button variant="secondary" onClick={clear}>Clear filters</Button>} />
        ) : (
          <>
            <Stagger key={JSON.stringify(params)} as="ul" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {posts.data.map((p) => <StaggerItem as="li" key={p._id}><PostCard post={p} /></StaggerItem>)}
            </Stagger>
            {meta?.pages > 1 && (
              <nav aria-label="Pagination" className="mt-10 flex items-center justify-between text-sm text-muted">
                <span>Page {meta.page} of {meta.pages}</span>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={meta.page <= 1} onClick={() => set('page', String(meta.page - 1))}>Previous</Button>
                  <Button variant="secondary" size="sm" disabled={meta.page >= meta.pages} onClick={() => set('page', String(meta.page + 1))}>Next</Button>
                </div>
              </nav>
            )}
            <p className="sr-only" role="status">{meta?.total ?? posts.data.length} posts</p>
          </>
        )}
    </Container>
  );
}
