import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { formatDate } from '../utils/format.js';
import { optimizeImage, srcSet } from '../utils/image.js';
import { Badge } from './ui/Primitives.jsx';

export default function PostCard({ post: p }) {
  const img = p.coverImage?.url;
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface transition-[transform,border-color,box-shadow] duration-300 ease-out-soft hover:-translate-y-1 hover:border-accent/50 hover:shadow-lg hover:shadow-black/5">
      {img ? (
        <div className="aspect-[16/9] overflow-hidden bg-raised">
          <img src={optimizeImage(img, 800)} srcSet={srcSet(img)} sizes="(min-width:1024px) 360px, (min-width:640px) 50vw, 100vw"
            alt={p.coverImage.alt || ''} loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-500 ease-out-soft group-hover:scale-[1.04]" />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col p-5">
        <p className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {p.category && <span className="font-medium text-accent">{p.category}</span>}
          {p.publishedAt && <time dateTime={p.publishedAt}>{formatDate(p.publishedAt, { day: 'numeric', month: 'short', year: 'numeric' })}</time>}
          {p.readingTimeMinutes ? <span className="inline-flex items-center gap-1"><Clock className="size-3" aria-hidden="true" />{p.readingTimeMinutes} min read</span> : null}
        </p>
        <h2 className="font-display text-lg font-bold">
          <Link to={`/blog/${p.slug}`} className="after:absolute after:inset-0 after:content-[''] hover:text-accent">{p.title}</Link>
        </h2>
        {p.excerpt && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{p.excerpt}</p>}
        {p.tags?.length > 0 && (
          <ul className="mt-auto flex flex-wrap gap-1.5 pt-4" aria-label="Tags">{p.tags.slice(0, 3).map((t) => <li key={t}><Badge>{t}</Badge></li>)}</ul>
        )}
      </div>
    </article>
  );
}
