import { GraduationCap } from 'lucide-react';
import { useApi } from '../../hooks/useApi.js';
import { publicApi } from '../../services/endpoints.js';
import { Badge, Card } from '../ui/Primitives.jsx';
import { EmptyState, ErrorState } from '../ui/States.jsx';
import { Stagger, StaggerItem } from '../ui/Reveal.jsx';
import Section, { GridSkeleton } from './Section.jsx';

export default function Education() {
  const { data, loading, error, refetch } = useApi('education', publicApi.education, { ttl: 120_000 });
  return (
    <Section id="education" eyebrow="Education" title="Education" alt>
      {error && !data ? <ErrorState error={error} onRetry={refetch} title="Couldn't load education" />
        : loading && !data ? <GridSkeleton count={2} className="h-32" />
        : !data?.length ? <EmptyState icon={GraduationCap} title="Nothing listed yet" />
        : (
          <Stagger as="ul" className="grid gap-5 md:grid-cols-2">
            {data.map((e) => (
              <StaggerItem as="li" key={e._id}>
                <Card className="h-full p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-display text-lg font-bold">{e.degree}{e.fieldOfStudy ? `, ${e.fieldOfStudy}` : ''}</h3>
                      <p className="mt-0.5 text-muted">{e.institution}</p>
                      {e.university && e.university !== e.institution && <p className="text-sm text-subtle">{e.university}</p>}
                    </div>
                    <p className="whitespace-nowrap font-mono text-sm text-accent">{e.startYear} – {e.ongoing ? 'Present' : e.graduationYear || '—'}</p>
                  </div>
                  {e.description && <p className="mt-3 text-sm leading-relaxed text-muted">{e.description}</p>}
                  {e.coursework?.length > 0 && (
                    <>
                      <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-muted">Relevant coursework</p>
                      <ul className="flex flex-wrap gap-1.5">{e.coursework.map((c) => <li key={c}><Badge>{c}</Badge></li>)}</ul>
                    </>
                  )}
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        )}
    </Section>
  );
}
