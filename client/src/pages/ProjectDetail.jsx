import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, ExternalLink, ZoomIn } from 'lucide-react';
import { useApi } from '../hooks/useApi.js';
import { publicApi } from '../services/endpoints.js';
import { formatDate } from '../utils/format.js';
import { optimizeImage, srcSet } from '../utils/image.js';
import { safeUrl } from '../utils/safeUrl.js';
import Seo, { useSiteBase } from '../components/Seo.jsx';
import JsonLd from '../components/JsonLd.jsx';
import { projectLd } from '../utils/jsonLd.js';
import { useSite } from '../context/SiteContext.jsx';
import Button from '../components/ui/Button.jsx';
import SocialIcon from '../components/ui/SocialIcon.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Badge, Card, Container, Skeleton } from '../components/ui/Primitives.jsx';
import { ErrorState } from '../components/ui/States.jsx';
import { Reveal } from '../components/ui/Reveal.jsx';
import NotFound from './NotFound.jsx';

const List = ({ title, items }) =>
  items?.length ? (
    <Card>
      <h2 className="mb-3 font-display text-lg font-bold">{title}</h2>
      <ul className="space-y-2.5 text-sm leading-relaxed text-muted">
        {items.map((i) => (
          <li key={i} className="flex gap-2.5"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />{i}</li>
        ))}
      </ul>
    </Card>
  ) : null;

export default function ProjectDetail() {
  const { slug } = useParams();
  const { data: p, loading, error, refetch } = useApi(`project:${slug}`, () => publicApi.project(slug), { ttl: 120_000 });
  const [zoom, setZoom] = useState(null);
  const { profile } = useSite();
  const base = useSiteBase();

  if (error?.status === 404) return <NotFound />;

  return (
    <Container className="pb-24 pt-28 sm:pt-32">
      <Link to="/#projects" className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden="true" /> All projects
      </Link>

      {error && !p ? (
        <ErrorState error={error} onRetry={refetch} title="Couldn't load this project" />
      ) : loading && !p ? (
        <div aria-busy="true" className="space-y-5"><Skeleton className="h-12 w-2/3" /><Skeleton className="h-6 w-1/2" /><Skeleton className="aspect-[16/9] w-full" /></div>
      ) : p && (
        <article>
          <JsonLd data={projectLd(p, profile, base)} />
          <Seo title={p.title} description={p.shortDescription} path={`/projects/${p.slug}`} image={p.coverImage?.url} type="article" />
          <Reveal>
            <h1 className="text-4xl font-extrabold sm:text-5xl">{p.title}</h1>
            <p className="mt-4 max-w-2xl text-lg text-muted">{p.shortDescription}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {p.liveUrl && <Button href={p.liveUrl}><ExternalLink className="size-4" aria-hidden="true" /> Live demo</Button>}
              {p.githubUrl && <Button href={p.githubUrl} variant="secondary"><SocialIcon platform="github" className="size-4" /> Source code</Button>}
              {p.completedAt && (
                <span className="inline-flex items-center gap-1.5 text-sm text-muted"><Calendar className="size-4" aria-hidden="true" />{formatDate(p.completedAt)}</span>
              )}
            </div>
          </Reveal>

          {p.coverImage?.url && (
            <Reveal className="mt-10 overflow-hidden rounded-card border border-line bg-raised">
              <img src={optimizeImage(p.coverImage.url, 1200)} srcSet={srcSet(p.coverImage.url)} sizes="(min-width:1152px) 1100px, 100vw"
                alt={p.coverImage.alt || `${p.title} screenshot`} decoding="async" className="w-full" />
            </Reveal>
          )}

          <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_18rem]">
            <div className="space-y-5 text-lg leading-relaxed text-muted">
              {(p.description || '').split(/\n{2,}/).filter(Boolean).map((para) => <p key={para}>{para}</p>)}
            </div>
            <aside aria-label="Technologies" className="lg:order-last">
              <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-muted">Built with</h2>
              <ul className="flex flex-wrap gap-2">{(p.technologies || []).map((t) => <li key={t}><Badge tone="accent">{t}</Badge></li>)}</ul>
            </aside>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <List title="Features" items={p.features} />
            <List title="Challenges" items={p.challenges} />
            <List title="Solutions" items={p.solutions} />
          </div>

          {p.screenshots?.length > 0 && (
            <section aria-labelledby="shots" className="mt-14">
              <h2 id="shots" className="mb-5 font-display text-2xl font-bold">Screenshots</h2>
              <ul className="grid gap-4 sm:grid-cols-2">
                {p.screenshots.map((s, i) => (
                  <li key={s.url}>
                    <button onClick={() => setZoom(s)} aria-label={`Enlarge screenshot ${i + 1}${s.alt ? `: ${s.alt}` : ''}`}
                      className="group relative block w-full overflow-hidden rounded-card border border-line bg-raised">
                      <img src={optimizeImage(s.url, 800)} alt={s.alt || `${p.title} screenshot ${i + 1}`} loading="lazy" decoding="async" className="w-full transition-transform duration-500 group-hover:scale-[1.02]" />
                      <span className="absolute bottom-3 right-3 grid size-9 place-items-center rounded-lg bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"><ZoomIn className="size-4" /></span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Modal open={Boolean(zoom)} onClose={() => setZoom(null)} title="Screenshot" size="xl">
            {zoom && <img src={optimizeImage(zoom.url, 1600)} alt={zoom.alt || `${p.title} screenshot`} className="w-full rounded-lg" />}
          </Modal>
        </article>
      )}
    </Container>
  );
}
