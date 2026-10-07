import { Building2, ExternalLink } from 'lucide-react';
import { useApi } from '../../hooks/useApi.js';
import { publicApi } from '../../services/endpoints.js';
import { formatDate } from '../../utils/format.js';
import { safeUrl } from '../../utils/safeUrl.js';
import { Badge, Card } from '../ui/Primitives.jsx';
import { EmptyState, ErrorState } from '../ui/States.jsx';
import { Reveal } from '../ui/Reveal.jsx';
import Section, { GridSkeleton } from './Section.jsx';

export default function Experience() {
  const { data, loading, error, refetch } = useApi('experience', publicApi.experience, { ttl: 120_000 });
  return (
    <Section id="experience" eyebrow="Experience" title="Experience & training">
      {error && !data ? <ErrorState error={error} onRetry={refetch} title="Couldn't load experience" />
        : loading && !data ? <GridSkeleton count={2} className="h-36" />
        : !data?.length ? <EmptyState icon={Building2} title="Nothing listed yet" description="Experience and training will appear here once added." />
        : (
          <ol className="relative space-y-6 border-l border-line pl-6 sm:pl-8">
            {data.map((x) => (
              <li key={x._id} className="relative">
                <span className="absolute -left-[1.85rem] top-6 size-3 rounded-full border-2 border-accent bg-bg sm:-left-[2.35rem]" aria-hidden="true" />
                <Reveal>
                  <Card className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1">
                      <div className="flex items-center gap-3">
                        {x.logo?.url && <img src={x.logo.url} alt={x.logo.alt || `${x.organization} logo`} loading="lazy" className="size-10 rounded-lg object-contain" />}
                        <div>
                          <h3 className="font-display text-lg font-bold">{x.position}</h3>
                          <p className="text-muted">{x.organization}</p>
                        </div>
                      </div>
                      <p className="flex items-center gap-2 text-sm text-muted">
                        <Badge>{x.type}</Badge>
                        <time dateTime={x.startDate}>{formatDate(x.startDate)}</time> – {x.current ? 'Present' : x.endDate ? <time dateTime={x.endDate}>{formatDate(x.endDate)}</time> : '—'}
                      </p>
                    </div>
                    {x.description && <p className="mt-4 text-sm leading-relaxed text-muted">{x.description}</p>}
                    {x.responsibilities?.length > 0 && (
                      <ul className="mt-3 space-y-1.5 text-sm text-muted">
                        {x.responsibilities.map((r) => <li key={r} className="flex gap-2.5"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />{r}</li>)}
                      </ul>
                    )}
                    {x.technologies?.length > 0 && (
                      <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Technologies">{x.technologies.map((t) => <li key={t}><Badge>{t}</Badge></li>)}</ul>
                    )}
                    {x.certificateUrl && (
                      <a href={safeUrl(x.certificateUrl)} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
                        View certificate <ExternalLink className="size-3.5" aria-hidden="true" />
                      </a>
                    )}
                  </Card>
                </Reveal>
              </li>
            ))}
          </ol>
        )}
    </Section>
  );
}
