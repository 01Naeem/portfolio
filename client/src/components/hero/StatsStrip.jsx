import { m } from 'motion/react';

// Rendered only when at least one statistic is backed by real data.
export default function StatsStrip({ stats, enter }) {
  if (!stats.length) return null;
  return (
    <m.dl
      {...enter(8)}
      aria-label="Portfolio at a glance"
      className="glass mt-14 grid max-w-2xl overflow-hidden rounded-2xl lg:mt-16"
      style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
    >
      {stats.map((s, i) => (
        <div key={s.label} className={`flex flex-col-reverse items-center gap-1 px-3 py-4 text-center sm:py-5 ${i > 0 ? 'border-l border-line/70' : ''}`}>
          <dt className="text-xs text-muted sm:text-sm">{s.label}</dt>
          <dd className="font-display text-2xl font-bold tabular-nums sm:text-3xl">{s.value}</dd>
        </div>
      ))}
    </m.dl>
  );
}
