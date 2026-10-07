import { ChevronDown } from 'lucide-react';
import { m } from 'motion/react';

// Smoothly scrolls to the next section. "Smooth" is switched off for visitors who prefer reduced motion.
export default function ScrollCue({ enter, target = 'about' }) {
  const go = () => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(target)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };
  return (
    <m.div {...enter(10)} className="mt-auto flex justify-center pb-2 pt-12">
      <button onClick={go} className="group flex flex-col items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-medium tracking-wide text-muted transition-colors hover:text-fg">
        Scroll to explore
        <span className="hero-bob grid size-7 place-items-center rounded-full border border-line bg-surface/60 transition-colors group-hover:border-accent/60">
          <ChevronDown className="size-4" aria-hidden="true" />
        </span>
      </button>
    </m.div>
  );
}
