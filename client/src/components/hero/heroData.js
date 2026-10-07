// Pure helpers that turn existing portfolio data into hero content. Nothing here invents information:
// if the data isn't there, the helper returns null/[] and the hero simply leaves that element out.

const CATEGORY_ORDER = ['Frontend', 'Backend', 'Database', 'Tools', 'Other'];

export const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

// A short teaser from the profile bio (the About section leads with the longer summary, so the two differ when both are set). Skipped when it would just repeat the tagline.
export function shortIntro(profile, tagline = '', max = 220) {
  const text = (profile?.bio || profile?.summary || '').split(/\n{2,}/)[0].replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (tagline && text.toLowerCase() === tagline.trim().toLowerCase()) return '';
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 120 ? cut.lastIndexOf(' ') : max).replace(/[,.;:\s]+$/, '')}…`;
}

// Primary technologies from the profile; if the admin hasn't set any, fall back to real skills (front to back of the stack).
export function techList(profile, skills = [], max = 6) {
  const fromProfile = [...new Set((profile?.primaryTechnologies || []).map((t) => t.trim()).filter(Boolean))];
  if (fromProfile.length) return fromProfile.slice(0, max);
  const rank = (c) => (CATEGORY_ORDER.includes(c) ? CATEGORY_ORDER.indexOf(c) : CATEGORY_ORDER.length);
  return [...new Set([...skills].sort((a, b) => rank(a.category) - rank(b.category)).map((s) => s.name?.trim()).filter(Boolean))].slice(0, max);
}

export function pickSocial(links = [], platform) {
  return [...links].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).find((l) => l.platform?.toLowerCase() === platform && /^https?:\/\//i.test(l.url || ''));
}

// "Currently building" card: the admin's current focus; failing that, their current role.
export function focusCard(profile) {
  const clamp = (s) => (s.length > 160 ? `${s.slice(0, 157).trimEnd()}…` : s);
  const focus = profile?.currentFocus?.replace(/\s+/g, ' ').trim();
  if (focus) return { label: 'Current focus', text: clamp(focus) };
  const role = profile?.currentRole?.trim();
  return role ? { label: 'Current role', text: role } : null;
}

// Whole calendar months between two instants (1 Jan -> 1 Aug = 7; 1 Jan -> 31 Jul = 6).
const monthsBetween = (from, to) => {
  const a = new Date(from);
  const b = new Date(to);
  let n = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (b.getUTCDate() < a.getUTCDate()) n -= 1;
  return Math.max(0, n);
};

// Time spent in real work (Job, Internship, Freelance, Open Source). Training is deliberately not counted as
// experience. Overlapping entries are merged so two concurrent roles don't double count, and gaps are not counted.
export function experienceSummary(entries = [], now = new Date()) {
  const spans = entries
    .filter((e) => e.type !== 'Training' && e.startDate)
    .map((e) => [+new Date(e.startDate), e.current || !e.endDate ? +now : +new Date(e.endDate)])
    .filter(([s, e]) => e >= s)
    .sort((a, b) => a[0] - b[0]);
  if (!spans.length) return null;
  const merged = [];
  for (const [s, e] of spans) {
    const last = merged.at(-1);
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }
  const months = merged.reduce((sum, [s, e]) => sum + monthsBetween(s, e), 0);
  if (months < 1) return '< 1 mo';
  if (months < 12) return `${months} mo`;
  const years = Math.floor(months / 12);
  return `${years}+ ${years === 1 ? 'yr' : 'yrs'}`;
}

// Only statistics the data can back up. Anything unknown or zero is omitted.
export function heroStats({ projectCount, skillCount, experience, now }) {
  return [
    projectCount > 0 && { label: 'Projects', value: String(projectCount) },
    experienceSummary(experience, now) && { label: 'Experience', value: experienceSummary(experience, now) },
    skillCount > 0 && { label: 'Technologies', value: String(skillCount) },
  ].filter(Boolean);
}

export const techKey = (name = '') => {
  const k = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (/^react(js)?$/.test(k)) return 'react';
  if (/^node(js)?$/.test(k)) return 'node';
  if (/^express(js)?$/.test(k)) return 'express';
  if (/^mongo(db)?$/.test(k)) return 'mongodb';
  return 'generic';
};
