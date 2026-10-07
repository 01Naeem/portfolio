import { Link } from 'react-router-dom';
import { ArrowUpRight, ExternalLink } from 'lucide-react';
import { publicApi } from '../services/endpoints.js';
import { optimizeImage, srcSet } from '../utils/image.js';
import { safeUrl } from '../utils/safeUrl.js';
import { cn } from '../utils/cn.js';
import SocialIcon from './ui/SocialIcon.jsx';
import { Badge } from './ui/Primitives.jsx';

// Stretched-link pattern: the title link covers the whole card (one tab stop, valid HTML), while the
// GitHub/Live icons sit above it and stay independently clickable.
export default function ProjectCard({ project: p, featured = false }) {
  const img = p.coverImage?.url;
  return (
    <article className={cn('group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface transition-[transform,border-color,box-shadow] duration-300 ease-out-soft hover:-translate-y-1 hover:border-accent/50 hover:shadow-lg hover:shadow-black/5', featured && 'lg:flex-row')}>
      <div className={cn('relative aspect-[16/9] overflow-hidden bg-raised', featured && 'lg:aspect-auto lg:w-1/2')}>
        {img ? (
          <img
            src={optimizeImage(img, 800)}
            srcSet={srcSet(img)}
            sizes={featured ? '(min-width:1024px) 540px, 100vw' : '(min-width:1024px) 360px, (min-width:640px) 50vw, 100vw'}
            alt={p.coverImage.alt || `${p.title} screenshot`}
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-500 ease-out-soft group-hover:scale-[1.04]"
          />
        ) : (
          <div className="grid size-full place-items-center font-display text-3xl font-bold text-subtle" aria-hidden="true">{p.title.slice(0, 2)}</div>
        )}
      </div>

      <div className={cn('flex flex-1 flex-col p-5', featured && 'lg:w-1/2 lg:p-8')}>
        {featured && <Badge tone="accent" className="mb-3 self-start">Featured</Badge>}
        <h3 className={cn('font-display font-bold', featured ? 'text-2xl' : 'text-lg')}>
          <Link
            to={`/projects/${p.slug}`}
            onClick={() => publicApi.trackProjectClick(p._id)}
            className="after:absolute after:inset-0 after:content-[''] hover:text-accent"
          >
            {p.title}
          </Link>
        </h3>
        <p className={cn('mt-2 text-sm leading-relaxed text-muted', featured && 'text-base')}>{p.shortDescription}</p>

        {p.technologies?.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Technologies">
            {p.technologies.slice(0, featured ? 8 : 4).map((t) => <li key={t}><Badge>{t}</Badge></li>)}
            {p.technologies.length > (featured ? 8 : 4) && <li><Badge>+{p.technologies.length - (featured ? 8 : 4)}</Badge></li>}
          </ul>
        )}

        <div className="mt-auto flex items-center justify-between pt-5">
          <span className="inline-flex items-center gap-1 text-sm font-medium text-accent">
            View details <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
          </span>
          <div className="relative z-10 flex gap-1">
            {p.githubUrl && (
              <a href={safeUrl(p.githubUrl)} target="_blank" rel="noopener noreferrer" aria-label={`${p.title} source code on GitHub`} className="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-fg">
                <SocialIcon platform="github" className="size-4.5" />
              </a>
            )}
            {p.liveUrl && (
              <a href={safeUrl(p.liveUrl)} target="_blank" rel="noopener noreferrer" aria-label={`${p.title} live demo`} className="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-fg">
                <ExternalLink className="size-4.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
