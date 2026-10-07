import { formatDate } from '../../utils/format.js';

// Dependency-free bar chart. Drawn as SVG for the eye; a visually-hidden table carries the same
// numbers for screen readers.
export default function BarChart({ data, label }) {
  const W = 600, H = 170, PAD = { t: 10, r: 6, b: 24, l: 30 };
  const max = Math.max(1, ...data.map((d) => d.views));
  const niceMax = max <= 4 ? 4 : Math.ceil(max / 4) * 4;
  const bw = (W - PAD.l - PAD.r) / data.length;
  const y = (v) => PAD.t + (H - PAD.t - PAD.b) * (1 - v / niceMax);
  const ticks = [0, niceMax / 2, niceMax];
  const fmt = (d) => formatDate(d, { day: 'numeric', month: 'short' });
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="h-auto w-full">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth="1" />
            <text x={PAD.l - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill="var(--subtle)">{Math.round(t)}</text>
          </g>
        ))}
        {data.map((d, i) => (
          <rect key={d.date} x={PAD.l + i * bw + bw * 0.15} width={Math.max(1, bw * 0.7)} y={y(d.views)} height={H - PAD.b - y(d.views)} rx="2" fill="var(--accent)" opacity={d.views ? 0.9 : 0.25}>
            <title>{`${fmt(d.date)}: ${d.views} ${d.views === 1 ? 'view' : 'views'}`}</title>
          </rect>
        ))}
        <text x={PAD.l} y={H - 6} fontSize="10" fill="var(--subtle)">{fmt(data[0].date)}</text>
        <text x={W - PAD.r} y={H - 6} fontSize="10" textAnchor="end" fill="var(--subtle)">{fmt(data.at(-1).date)}</text>
      </svg>
      <table className="sr-only">
        <caption>{label}</caption>
        <thead><tr><th>Date</th><th>Views</th></tr></thead>
        <tbody>{data.map((d) => <tr key={d.date}><td>{d.date}</td><td>{d.views}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}
