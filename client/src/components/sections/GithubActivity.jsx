import { ExternalLink, GitFork, Star } from 'lucide-react';
import { useApi } from '../../hooks/useApi.js';
import { useSite } from '../../context/SiteContext.jsx';
import { publicApi } from '../../services/endpoints.js';
import { formatNumber } from '../../utils/format.js';
import { safeUrl } from '../../utils/safeUrl.js';
import SocialIcon from '../ui/SocialIcon.jsx';
import { Badge, Card } from '../ui/Primitives.jsx';
import { Reveal } from '../ui/Reveal.jsx';
import Section, { GridSkeleton } from './Section.jsx';

// 0-4 intensity buckets relative to the busiest day, like GitHub's own graph
const level = (n, max) => (n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4)));
const SHADE = ['bg-raised', 'bg-accent/25', 'bg-accent/45', 'bg-accent/70', 'bg-accent'];

function Heatmap({ days, total }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <figure>
      <div role="img" aria-label={`${formatNumber(total)} contributions in the last year`} className="overflow-x-auto pb-1">
        <div className="grid w-max grid-flow-col grid-rows-7 gap-[3px]">
          {days.map((d) => <span key={d.date} title={`${d.date}: ${d.count}`} className={`size-[11px] rounded-[2px] ${SHADE[level(d.count, max)]}`} />)}
        </div>
      </div>
      <figcaption className="mt-2 text-xs text-muted">{formatNumber(total)} contributions in the last year</figcaption>
    </figure>
  );
}

// Optional integration. If it is switched off, or GitHub is unreachable, the whole section disappears
// and the manually entered projects above stand on their own.
export default function GithubActivity() {
  const { profile, settings } = useSite();
  const enabled = Boolean(profile?.github?.enabled && profile?.github?.username && settings?.sections?.showGithub);
  const { data, loading, error } = useApi('github', publicApi.github, { ttl: 600_000, enabled });

  if (!enabled || error) return null;
  const g = data;

  return (
    <Section id="github" eyebrow="Open source" title="GitHub activity" description="Pulled live from my public GitHub profile.">
      {loading && !g ? <GridSkeleton count={3} className="h-40" /> : g && (
        <div className="space-y-6">
          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="flex items-center gap-4">
              {g.profile.avatarUrl && <img src={g.profile.avatarUrl} alt="" width="64" height="64" loading="lazy" className="size-16 rounded-full" />}
              <div className="min-w-0">
                <a href={safeUrl(g.profile.url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-display text-lg font-bold hover:text-accent">
                  <SocialIcon platform="github" className="size-4" />@{g.profile.login}
                </a>
                <p className="text-sm text-muted">{formatNumber(g.profile.followers)} followers · {formatNumber(g.stats.repoCount)} repositories</p>
              </div>
            </Card>
            <Card>
              <p className="text-sm text-muted">Stars earned</p>
              <p className="font-display text-3xl font-bold tabular-nums">{formatNumber(g.stats.totalStars)}</p>
              <p className="mt-1 text-xs text-subtle">{g.activity.pushesLast30Days} pushes to {g.activity.activeReposLast30Days} repos in 30 days</p>
            </Card>
            <Card>
              <p className="mb-3 text-sm text-muted">Languages (by repository)</p>
              <ul className="flex flex-wrap gap-1.5">{g.languages.slice(0, 6).map((l) => <li key={l.name}><Badge>{l.name} · {l.repoCount}</Badge></li>)}</ul>
            </Card>
          </div>

          {g.contributions?.days?.length > 0 && <Reveal><Card><Heatmap days={g.contributions.days} total={g.contributions.total} /></Card></Reveal>}

          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {g.recentRepos.slice(0, 6).map((r) => (
              <li key={r.name}>
                <Card interactive className="flex h-full flex-col p-4">
                  <a href={safeUrl(r.url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium hover:text-accent">
                    {r.name} <ExternalLink className="size-3.5 text-subtle" aria-hidden="true" />
                  </a>
                  {r.description && <p className="mt-1.5 line-clamp-2 text-sm text-muted">{r.description}</p>}
                  <p className="mt-auto flex items-center gap-4 pt-3 text-xs text-muted">
                    {r.language && <span>{r.language}</span>}
                    <span className="inline-flex items-center gap-1"><Star className="size-3.5" aria-hidden="true" />{r.stars}</span>
                    <span className="inline-flex items-center gap-1"><GitFork className="size-3.5" aria-hidden="true" />{r.forks}</span>
                  </p>
                </Card>
              </li>
            ))}
          </ul>
          {g.stale && <p className="text-xs text-subtle">Showing the last saved GitHub data; GitHub is temporarily rate-limiting requests.</p>}
        </div>
      )}
    </Section>
  );
}
