import { Compass, Lightbulb, Target } from 'lucide-react';
import { useApi } from '../../hooks/useApi.js';
import { useSite } from '../../context/SiteContext.jsx';
import { publicApi } from '../../services/endpoints.js';
import { Card, Skeleton } from '../ui/Primitives.jsx';
import { Reveal, Stagger, StaggerItem } from '../ui/Reveal.jsx';
import Section from './Section.jsx';

const year = (d) => new Date(d).getFullYear();

// Builds the journey from the real education and experience records, so nothing is typed in twice
// and nothing can be invented here.
export function buildTimeline(education = [], experience = []) {
  const events = [];
  for (const e of education) {
    events.push({ year: e.startYear, title: `${e.degree} started`, detail: e.institution });
    if (e.graduationYear && !e.ongoing) events.push({ year: e.graduationYear, title: `${e.degree} completed`, detail: e.institution });
  }
  for (const x of experience) events.push({ year: year(x.startDate), title: x.position, detail: x.organization });
  return events.sort((a, b) => a.year - b.year);
}

export default function About() {
  const { profile, loading } = useSite();
  const edu = useApi('education', publicApi.education, { ttl: 120_000 });
  const exp = useApi('experience', publicApi.experience, { ttl: 120_000 });
  const timeline = buildTimeline(edu.data || [], exp.data || []);

  const paragraphs = (profile?.summary || profile?.bio || '').split(/\n{2,}/).filter(Boolean);
  const cards = [
    { icon: Target, title: 'Career objective', text: profile?.careerObjective },
    { icon: Compass, title: 'Current focus', text: profile?.currentFocus },
    { icon: Lightbulb, title: 'How I work', text: profile?.philosophy },
  ].filter((c) => c.text);

  return (
    <Section id="about" eyebrow="About" title="A little about me">
      <div className="grid gap-12 lg:grid-cols-[1.25fr_1fr]">
        <div>
          {loading && !profile ? (
            <div className="space-y-3" aria-busy="true"><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-11/12" /><Skeleton className="h-5 w-4/5" /></div>
          ) : (
            <Reveal className="space-y-4 text-lg leading-relaxed text-muted">
              {paragraphs.map((p) => <p key={p}>{p}</p>)}
            </Reveal>
          )}
          {cards.length > 0 && (
            <Stagger className="mt-8 grid gap-4 sm:grid-cols-2">
              {cards.map(({ icon: Icon, title, text }) => (
                <StaggerItem key={title} className={cards.length === 3 && title === 'How I work' ? 'sm:col-span-2' : ''}>
                  <Card className="h-full p-5">
                    <Icon className="mb-3 size-5 text-accent" aria-hidden="true" />
                    <h3 className="font-display text-base font-bold">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
                  </Card>
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </div>

        {timeline.length > 0 && (
          <Reveal>
            <h3 className="mb-5 font-display text-lg font-bold">Journey</h3>
            <ol className="relative space-y-6 border-l border-line pl-6">
              {timeline.map((e, i) => (
                <li key={`${e.year}-${e.title}-${i}`} className="relative">
                  <span className="absolute -left-[1.9rem] top-1.5 size-3 rounded-full border-2 border-accent bg-bg" aria-hidden="true" />
                  <p className="font-mono text-xs text-accent">{e.year}</p>
                  <p className="font-medium">{e.title}</p>
                  <p className="text-sm text-muted">{e.detail}</p>
                </li>
              ))}
            </ol>
          </Reveal>
        )}
      </div>
    </Section>
  );
}
