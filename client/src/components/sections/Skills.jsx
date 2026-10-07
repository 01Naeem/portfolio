import { useApi } from '../../hooks/useApi.js';
import { publicApi } from '../../services/endpoints.js';
import { skillIcon } from '../../utils/icons.js';
import { Badge, Card } from '../ui/Primitives.jsx';
import { EmptyState, ErrorState } from '../ui/States.jsx';
import { Reveal, Stagger, StaggerItem } from '../ui/Reveal.jsx';
import Section, { GridSkeleton } from './Section.jsx';

const ORDER = ['Frontend', 'Backend', 'Database', 'Tools', 'Other'];

export default function Skills() {
  const { data, loading, error, refetch } = useApi('skills', publicApi.skills, { ttl: 120_000 });
  const groups = ORDER.map((c) => ({ category: c, items: (data || []).filter((s) => s.category === c) })).filter((g) => g.items.length);

  return (
    <Section id="skills" eyebrow="Skills" title="Tools I work with" description="Grouped by where they sit in the stack.">
      {error && !data ? <ErrorState error={error} onRetry={refetch} title="Couldn't load skills" />
        : loading && !data ? <GridSkeleton count={6} className="h-24" />
        : groups.length === 0 ? <EmptyState title="Skills coming soon" />
        : (
          <div className="space-y-10">
            {groups.map((g) => (
              <Reveal key={g.category} as="div">
                <h3 className="mb-4 font-display text-lg font-bold">{g.category}</h3>
                <Stagger as="ul" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {g.items.map((s) => {
                    const Icon = skillIcon(s);
                    return (
                      <StaggerItem as="li" key={s._id}>
                        <Card interactive className="flex h-full items-start gap-3 p-4">
                          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent"><Icon className="size-4.5" aria-hidden="true" /></span>
                          <div className="min-w-0">
                            <p className="font-medium">{s.name}</p>
                            {(s.level || s.years) && (
                              <p className="mt-1 flex flex-wrap items-center gap-1.5">
                                {s.level && <Badge>{s.level}</Badge>}
                                {s.years ? <span className="text-xs text-muted">{s.years} {s.years === 1 ? 'year' : 'years'}</span> : null}
                              </p>
                            )}
                            {s.description && <p className="mt-1.5 text-xs leading-relaxed text-muted">{s.description}</p>}
                          </div>
                        </Card>
                      </StaggerItem>
                    );
                  })}
                </Stagger>
              </Reveal>
            ))}
          </div>
        )}
    </Section>
  );
}
