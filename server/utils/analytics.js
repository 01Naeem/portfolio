// Only real public routes are counted, so a bot can't fill the database with made-up paths.
const PATTERNS = [/^\/$/, /^\/blog$/, /^\/blog\/[a-z0-9]+(?:-[a-z0-9]+)*$/, /^\/projects\/[a-z0-9]+(?:-[a-z0-9]+)*$/];
export const MAX_PATHS_PER_DAY = 200;

export const normalizePath = (raw) => {
  if (typeof raw !== 'string') return null;
  const p = raw.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  return p.length <= 120 && PATTERNS.some((r) => r.test(p)) ? p : null;
};

export const utcDay = (d = new Date()) => d.toISOString().slice(0, 10);

// Turns sparse DB rows into one entry per day (zeros included) so charts have no gaps.
export function fillSeries(rows, days, now = new Date()) {
  const byDay = new Map(rows.map((r) => [r._id, r.views]));
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = utcDay(new Date(now.getTime() - i * 86400000));
    out.push({ date: d, views: byDay.get(d) || 0 });
  }
  return out;
}
