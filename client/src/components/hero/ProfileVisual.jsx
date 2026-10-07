import { Terminal } from 'lucide-react';
import { m } from 'motion/react';
import { avatarImage, avatarSrcSet } from '../../utils/image.js';
import { cn } from '../../utils/cn.js';
import TechIcon from './TechIcon.jsx';
import { initials } from './heroData.js';

// Where each floating badge sits around the portrait, with its own float rhythm so they never move in lockstep.
const SLOTS = [
  { pos: 'left-[-6%] top-[9%] sm:left-[-12%]', dur: '6.5s', delay: '0s' },
  { pos: 'right-[-5%] top-[24%] sm:right-[-11%]', dur: '7.5s', delay: '-2s' },
  { pos: 'left-[-8%] top-[56%] sm:left-[-15%]', dur: '7s', delay: '-4s' },
  { pos: 'right-[-3%] top-[70%] sm:right-[-9%]', dur: '8s', delay: '-1s' },
];

export default function ProfileVisual({ profile, techs, focus, enter, className }) {
  const name = profile.name || '';
  const url = profile.avatar?.url;

  return (
    <div className={cn('relative mx-auto mb-10 w-[min(76vw,21rem)] lg:mb-8 lg:w-[min(34vw,27rem)]', className)}>
      <div className="relative aspect-square">
        {/* ambient glow + two slow orbit rings (decorative) */}
        <div aria-hidden="true" className="hero-glow absolute -inset-[14%] rounded-full" />
        <div aria-hidden="true" className="hero-ring hero-orbit absolute -inset-[7%] rounded-full border-dashed" style={{ '--dur': '50s' }}>
          <span className="hero-dot absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div aria-hidden="true" className="hero-ring hero-orbit hero-orbit-rev absolute -inset-[17%] rounded-full" style={{ '--dur': '75s' }}>
          <span className="hero-dot hero-dot-sm absolute bottom-[14%] left-[3%]" />
        </div>

        {/* portrait in a gradient frame */}
        <m.div {...enter(5, { scale: 0.94 })} className="hero-frame group absolute inset-0 rounded-full p-[3px]">
          <div className="relative size-full overflow-hidden rounded-full bg-surface">
            {url ? (
              <img
                src={avatarImage(url, 560)}
                srcSet={avatarSrcSet(url)}
                sizes="(min-width: 1024px) 432px, 76vw"
                alt={`Portrait of ${name}`}
                width="560"
                height="560"
                fetchPriority="high"
                decoding="async"
                className="size-full object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.05]"
              />
            ) : (
              <div role="img" aria-label={`${name} (no photo added yet)`} className="grid size-full place-items-center bg-linear-to-br from-accent/25 via-raised to-surface font-display text-6xl font-extrabold text-accent sm:text-7xl">
                {initials(name)}
              </div>
            )}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/10" />
          </div>
        </m.div>

        {/* floating technology badges: decorative duplicates of the tech list, hidden from assistive tech */}
        {techs.slice(0, SLOTS.length).map((t, i) => (
          <div key={t} aria-hidden="true" className={cn('absolute', SLOTS[i].pos)}>
            <m.div {...enter(7 + i * 0.6, { scale: 0.85 })}>
              <div className="hero-float hero-chip glass" style={{ '--dur': SLOTS[i].dur, '--delay': SLOTS[i].delay }}>
                <TechIcon name={t} className="size-4 text-accent" />
                <span>{t}</span>
              </div>
            </m.div>
          </div>
        ))}
      </div>

      {focus && (
        <div className="absolute -bottom-7 left-1/2 w-[90%] max-w-[18.5rem] -translate-x-1/2">
          <m.div {...enter(9)} className="glass group rounded-2xl p-3.5 transition-[transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-accent/50">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent"><Terminal className="size-4.5" aria-hidden="true" /></span>
              <div className="min-w-0">
                <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">{focus.label}</p>
                <p className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug">{focus.text}</p>
              </div>
            </div>
          </m.div>
        </div>
      )}
    </div>
  );
}
