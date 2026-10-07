import { Container, SectionHeading, Skeleton } from '../ui/Primitives.jsx';
import { Reveal } from '../ui/Reveal.jsx';
import { cn } from '../../utils/cn.js';

// The element (and its id) renders immediately, even while data loads, so #hash links always have a target.
export default function Section({ id, eyebrow, title, description, children, className, alt = false }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn('scroll-mt-20 py-20 sm:py-24', alt && 'border-y border-line bg-surface/40', className)}>
      <Container>
        <Reveal>
          <SectionHeading eyebrow={eyebrow} title={<span id={`${id}-title`}>{title}</span>} description={description} />
        </Reveal>
        {children}
      </Container>
    </section>
  );
}

export const GridSkeleton = ({ count = 3, className = 'h-40' }) => (
  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading">
    {Array.from({ length: count }, (_, i) => <Skeleton key={i} className={cn('w-full', className)} />)}
  </div>
);
