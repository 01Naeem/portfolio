import { cn } from '../../utils/cn.js';

export const Container = ({ className, as: Tag = 'div', ...p }) => (
  <Tag className={cn('mx-auto w-full max-w-6xl px-5 sm:px-8', className)} {...p} />
);

export const Card = ({ className, interactive = false, as: Tag = 'div', ...p }) => (
  <Tag
    className={cn(
      'rounded-card border border-line bg-surface p-6',
      interactive && 'transition-[transform,border-color,box-shadow] duration-300 ease-out-soft hover:-translate-y-1 hover:border-accent/50 hover:shadow-lg hover:shadow-black/5',
      className
    )}
    {...p}
  />
);

export const Badge = ({ className, tone = 'neutral', ...p }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
      tone === 'neutral' && 'border-line bg-raised text-muted',
      tone === 'accent' && 'border-accent/30 bg-accent/10 text-accent',
      tone === 'success' && 'border-success/30 bg-success/10 text-success',
      className
    )}
    {...p}
  />
);

export const Skeleton = ({ className }) => <div className={cn('skeleton', className)} aria-hidden="true" />;

export const Spinner = ({ className, label = 'Loading' }) => (
  <span role="status" className={cn('inline-flex', className)}>
    <svg className="size-5 animate-spin text-accent" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.2" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
    <span className="sr-only">{label}</span>
  </span>
);

export const SectionHeading = ({ eyebrow, title, description, className, as: Heading = 'h2' }) => (
  <div className={cn('mb-10 max-w-2xl', className)}>
    {eyebrow && <p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-accent">{eyebrow}</p>}
    <Heading className="text-3xl font-bold sm:text-4xl">{title}</Heading>
    {description && <p className="mt-3 text-muted">{description}</p>}
  </div>
);
