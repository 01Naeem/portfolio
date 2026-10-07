import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { baseMocks, mockApi, renderApp } from './helpers.jsx';
import { experienceSummary, focusCard, heroStats, pickSocial, shortIntro, techKey, techList } from '../components/hero/heroData.js';
import { avatarImage, avatarSrcSet } from '../utils/image.js';

const CLD = 'https://res.cloudinary.com/demo/image/upload/v1700000000/portfolio/profile/me.jpg';
const profile = (o = {}) => ({
  name: 'Naeem Khan', title: 'Full-Stack MERN Developer', tagline: 'I build real-world web apps.', bio: 'Short bio about me.', location: 'Bhopal, India', email: 'n@example.com',
  currentFocus: 'Building full-stack web applications', primaryTechnologies: ['React', 'Node.js', 'Express', 'MongoDB'], avatar: { url: CLD },
  availability: { isOpenToWork: true, label: 'Open to Work' },
  socialLinks: [{ _id: '1', platform: 'github', url: 'https://github.com/naeem', order: 0 }, { _id: '2', platform: 'linkedin', url: 'https://linkedin.com/in/naeem', order: 1 }, { _id: '3', platform: 'twitter', url: 'https://x.com/naeem', order: 2 }],
  ...o,
});
const hero = async () => within(await screen.findByRole('region', { name: 'Introduction' }));
const fixtures = (over = {}) => baseMocks({ 'GET /profile': profile(), ...over });
const proj = (n) => Array.from({ length: n }, (_, i) => ({ _id: `p${i}`, slug: `p${i}`, title: `P${i}`, shortDescription: 'x', technologies: [] }));

describe('hero data helpers', () => {
  it('shortIntro prefers the bio, trims on a word boundary, and never repeats the tagline', () => {
    expect(shortIntro({ bio: 'About me.', summary: 'Long summary.' })).toBe('About me.');
    expect(shortIntro({ summary: 'Only a summary.' })).toBe('Only a summary.');
    const long = `${'word '.repeat(80)}end`;
    const out = shortIntro({ bio: long });
    expect(out.length).toBeLessThanOrEqual(222);
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toMatch(/\swor…$/); // no mid-word cut
    expect(shortIntro({ bio: 'Same as tagline' }, 'same AS tagline')).toBe('');
    expect(shortIntro({})).toBe('');
    expect(shortIntro({ bio: 'First paragraph.\n\nSecond paragraph.' })).toBe('First paragraph.');
  });

  it('techList uses profile technologies, de-duplicated; otherwise real skills from front to back of the stack', () => {
    expect(techList({ primaryTechnologies: ['React', ' React ', 'Node.js', ''] })).toEqual(['React', 'Node.js']);
    const skills = [{ name: 'MongoDB', category: 'Database' }, { name: 'Git', category: 'Tools' }, { name: 'React', category: 'Frontend' }, { name: 'Express', category: 'Backend' }];
    expect(techList({}, skills)).toEqual(['React', 'Express', 'MongoDB', 'Git']);
    expect(techList({}, [])).toEqual([]);
    expect(techList({ primaryTechnologies: Array.from({ length: 9 }, (_, i) => `T${i}`) })).toHaveLength(6);
  });

  it('pickSocial only returns real http(s) profiles', () => {
    const links = [{ platform: 'GitHub', url: 'https://github.com/a' }, { platform: 'linkedin', url: 'javascript:alert(1)' }, { platform: 'email', url: 'mailto:a@b.co' }];
    expect(pickSocial(links, 'github').url).toBe('https://github.com/a');
    expect(pickSocial(links, 'linkedin')).toBeUndefined();
    expect(pickSocial(undefined, 'github')).toBeUndefined();
  });

  it('focusCard: focus, else role, else nothing; long text is clamped', () => {
    expect(focusCard({ currentFocus: 'Building X', currentRole: 'Dev' })).toEqual({ label: 'Current focus', text: 'Building X' });
    expect(focusCard({ currentRole: 'MERN Trainee' })).toEqual({ label: 'Current role', text: 'MERN Trainee' });
    expect(focusCard({})).toBeNull();
    expect(focusCard({ currentFocus: 'x'.repeat(400) }).text.length).toBeLessThanOrEqual(160);
  });

  it('experienceSummary counts real work only, merges overlaps, and formats conservatively', () => {
    const now = new Date('2026-10-01T00:00:00Z');
    expect(experienceSummary([], now)).toBeNull();
    expect(experienceSummary([{ type: 'Training', startDate: '2025-01-01', current: true }], now)).toBeNull(); // training is not experience
    expect(experienceSummary([{ type: 'Internship', startDate: '2026-06-01', endDate: '2026-09-01' }], now)).toBe('3 mo');
    expect(experienceSummary([{ type: 'Job', startDate: '2026-09-25', endDate: '2026-10-01' }], now)).toBe('< 1 mo');
    expect(experienceSummary([{ type: 'Job', startDate: '2024-09-01', current: true }], now)).toBe('2+ yrs');
    expect(experienceSummary([{ type: 'Job', startDate: '2025-06-01', current: true }], now)).toBe('1+ yr');
    // two concurrent roles must not double count: Jan-Jun and Mar-Aug => Jan-Aug = 7 months, not 11
    expect(experienceSummary([{ type: 'Job', startDate: '2026-01-01', endDate: '2026-06-01' }, { type: 'Freelance', startDate: '2026-03-01', endDate: '2026-08-01' }], now)).toBe('7 mo');
    // a gap is not counted as experience: Jan-Feb + Aug-Sep = 2 months
    expect(experienceSummary([{ type: 'Job', startDate: '2026-01-01', endDate: '2026-02-01' }, { type: 'Job', startDate: '2026-08-01', endDate: '2026-09-01' }], now)).toBe('2 mo');
  });

  it('heroStats omits anything unknown or zero and invents nothing', () => {
    expect(heroStats({ projectCount: 0, skillCount: 0, experience: [] })).toEqual([]);
    expect(heroStats({ projectCount: 7, skillCount: 0, experience: [] })).toEqual([{ label: 'Projects', value: '7' }]);
    expect(heroStats({ projectCount: 7, skillCount: 12, experience: [{ type: 'Job', startDate: '2024-01-01', current: true }], now: new Date('2026-06-01') }).map((s) => s.label)).toEqual(['Projects', 'Experience', 'Technologies']);
  });

  it('techKey recognises the MERN spellings people actually use', () => {
    expect(['React', 'react.js', 'ReactJS'].map(techKey)).toEqual(['react', 'react', 'react']);
    expect(['Node.js', 'node', 'NodeJS'].map(techKey)).toEqual(['node', 'node', 'node']);
    expect(['Express', 'Express.js'].map(techKey)).toEqual(['express', 'express']);
    expect(['MongoDB', 'mongo'].map(techKey)).toEqual(['mongodb', 'mongodb']);
    expect(techKey('Tailwind')).toBe('generic');
  });

  it('portrait URLs become square, face-aware Cloudinary crops (other hosts untouched)', () => {
    expect(avatarImage(CLD, 560)).toBe('https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_fill,g_auto,ar_1:1,w_560/v1700000000/portfolio/profile/me.jpg');
    expect(avatarImage('https://example.com/me.jpg', 560)).toBe('https://example.com/me.jpg');
    expect(avatarSrcSet(CLD)).toContain('w_360');
    expect(avatarSrcSet('https://example.com/me.jpg')).toBeUndefined();
  });
});

describe('hero content (all from existing data)', () => {
  it('greets with the name from the database inside a single h1, plus title and tagline', async () => {
    mockApi(fixtures());
    renderApp('/');
    const h = await hero();
    const h1 = await h.findByRole('heading', { level: 1 });
    expect(h1).toHaveAccessibleName("Hi, I'm Naeem Khan");
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(h.getByText('Full-Stack MERN Developer')).toBeInTheDocument();
    expect(h.getByText('I build real-world web apps.')).toBeInTheDocument();
    expect(h.getByText('Short bio about me.')).toBeInTheDocument();
    expect(h.getByText('Bhopal, India')).toBeInTheDocument();
  });

  it('uses the Site Settings hero override for title and tagline when set', async () => {
    mockApi(fixtures({ 'GET /settings': { siteTitle: 'x', hero: { title: 'Custom title', subtitle: 'Custom tagline' } } }));
    renderApp('/');
    const h = await hero();
    expect(await h.findByText('Custom title')).toBeInTheDocument();
    expect(h.getByText('Custom tagline')).toBeInTheDocument();
  });

  it('shows the Open to Work badge only when enabled, with the admin-written text', async () => {
    mockApi(fixtures({ 'GET /profile': profile({ availability: { isOpenToWork: true, label: 'Open to Software Roles' } }) }));
    renderApp('/');
    expect(await (await hero()).findByText('Open to Software Roles')).toBeInTheDocument();
  });

  it('falls back to "Open to Work" when no text was written, and hides the badge when disabled', async () => {
    mockApi(fixtures({ 'GET /profile': profile({ availability: { isOpenToWork: true } }) }));
    const first = renderApp('/');
    expect(await (await hero()).findByText('Open to Work')).toBeInTheDocument();
    first.unmount();
    mockApi(fixtures({ 'GET /profile': profile({ availability: { isOpenToWork: false, label: 'Open to Work' } }) }));
    renderApp('/');
    const h = await hero();
    await h.findByRole('heading', { level: 1 });
    expect(h.queryByText('Open to Work')).not.toBeInTheDocument();
  });

  it('call-to-action buttons point at the right places; resume only when one exists', async () => {
    mockApi(fixtures());
    const first = renderApp('/');
    const h = await hero();
    expect(await h.findByRole('link', { name: /view my projects/i })).toHaveAttribute('href', '/#projects');
    expect(h.getByRole('link', { name: /download resume/i })).toHaveAttribute('href', '/api/resume/file?download=1');
    expect(h.getByRole('link', { name: /let's connect/i })).toHaveAttribute('href', '/#contact');
    first.unmount();
    mockApi(fixtures({ 'GET /resume': { available: false } }));
    renderApp('/');
    const h2 = await hero();
    await h2.findByRole('link', { name: /view my projects/i });
    expect(h2.queryByRole('link', { name: /download resume/i })).not.toBeInTheDocument();
  });

  it('shows only GitHub and LinkedIn icons, taken from the stored links', async () => {
    mockApi(fixtures());
    renderApp('/');
    const h = await hero();
    const list = within(await h.findByRole('list', { name: 'Social profiles' }));
    expect(list.getByRole('link', { name: 'GitHub profile' })).toHaveAttribute('href', 'https://github.com/naeem');
    expect(list.getByRole('link', { name: 'LinkedIn profile' })).toHaveAttribute('href', 'https://linkedin.com/in/naeem');
    expect(list.getAllByRole('link')).toHaveLength(2); // the X/Twitter link is not rendered here
    expect(list.getByRole('link', { name: 'GitHub profile' })).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders no social icons at all when there are none (or only unsafe ones)', async () => {
    mockApi(fixtures({ 'GET /profile': profile({ socialLinks: [{ platform: 'github', url: 'javascript:alert(1)' }] }) }));
    renderApp('/');
    const h = await hero();
    await h.findByRole('heading', { level: 1 });
    expect(h.queryByRole('list', { name: 'Social profiles' })).not.toBeInTheDocument();
  });

  it('shows the stored portrait with alt text and a sized, square, high-priority image', async () => {
    mockApi(fixtures());
    renderApp('/');
    const img = await (await hero()).findByRole('img', { name: 'Portrait of Naeem Khan' });
    expect(img.getAttribute('src')).toContain('c_fill,g_auto,ar_1:1');
    expect(img).toHaveAttribute('width', '560');
    expect(img).toHaveAttribute('height', '560');
    expect(img).toHaveAttribute('fetchpriority', 'high');
    expect(img).not.toHaveAttribute('loading', 'lazy'); // it's above the fold
  });

  it('shows initials instead of a broken image when no photo was added', async () => {
    mockApi(fixtures({ 'GET /profile': profile({ avatar: null }) }));
    renderApp('/');
    const h = await hero();
    const mono = await h.findByRole('img', { name: /Naeem Khan \(no photo added yet\)/ });
    expect(mono).toHaveTextContent('NK');
  });

  it('floating badges are decorative; the same technologies are exposed once, as a real list', async () => {
    mockApi(fixtures({ 'GET /profile': profile({ primaryTechnologies: ['React', 'Node.js', 'Express', 'MongoDB', 'Git', 'Docker'] }) }));
    renderApp('/');
    const h = await hero();
    const list = within(await h.findByRole('list', { name: 'Primary technologies' }));
    expect(list.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['React', 'Node.js', 'Express', 'MongoDB', 'Git', 'Docker']);
    const floating = document.querySelectorAll('.hero-float');
    expect(floating).toHaveLength(4); // the first four only
    floating.forEach((f) => expect(f.closest('[aria-hidden="true"]')).toBeTruthy());
  });

  it('falls back to real skills when no primary technologies are set, and omits the row when there is nothing', async () => {
    mockApi(fixtures({ 'GET /profile': profile({ primaryTechnologies: [] }), 'GET /skills': [{ _id: 's1', name: 'React', category: 'Frontend' }, { _id: 's2', name: 'MongoDB', category: 'Database' }] }));
    const first = renderApp('/');
    const h = await hero();
    const list = within(await h.findByRole('list', { name: 'Primary technologies' }));
    expect(list.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['React', 'MongoDB']);
    first.unmount();
    mockApi(fixtures({ 'GET /profile': profile({ primaryTechnologies: [] }) }));
    renderApp('/');
    const h2 = await hero();
    await h2.findByRole('heading', { level: 1 });
    expect(h2.queryByRole('list', { name: 'Primary technologies' })).not.toBeInTheDocument();
    expect(document.querySelectorAll('.hero-float')).toHaveLength(0);
  });

  it('status card uses the current focus, else the current role, else is absent', async () => {
    mockApi(fixtures());
    const a = renderApp('/');
    const h = await hero();
    expect(await h.findByText('Current focus')).toBeInTheDocument();
    expect(h.getByText('Building full-stack web applications')).toBeInTheDocument();
    a.unmount();
    mockApi(fixtures({ 'GET /profile': profile({ currentFocus: '', currentRole: 'MERN Trainee' }) }));
    const b = renderApp('/');
    const h2 = await hero();
    expect(await h2.findByText('Current role')).toBeInTheDocument();
    expect(h2.getByText('MERN Trainee')).toBeInTheDocument();
    b.unmount();
    mockApi(fixtures({ 'GET /profile': profile({ currentFocus: '', currentRole: '' }) }));
    renderApp('/');
    const h3 = await hero();
    await h3.findByRole('heading', { level: 1 });
    expect(h3.queryByText(/Current (focus|role)/)).not.toBeInTheDocument();
  });
});

describe('hero quick stats', () => {
  it('shows counts backed by real data', async () => {
    mockApi(fixtures({
      'GET /projects': { data: proj(2), meta: { total: 7 } },
      'GET /skills': [{ _id: '1', name: 'React', category: 'Frontend' }, { _id: '2', name: 'Node', category: 'Backend' }, { _id: '3', name: 'Mongo', category: 'Database' }],
      'GET /experience': [{ _id: 'e', organization: 'Acme', position: 'Dev', type: 'Internship', startDate: '2020-01-01T00:00:00Z', current: true }],
    }));
    renderApp('/');
    const h = await hero();
    const stats = within((await h.findByText('Projects')).closest('dl'));
    expect(stats.getByText('7')).toBeInTheDocument(); // total from the API meta, not just the page length
    expect(stats.getByText('3')).toBeInTheDocument();
    expect(stats.getByText(/\+ yrs$/)).toBeInTheDocument();
    expect(stats.getByText('Technologies')).toBeInTheDocument();
  });

  it('omits the whole strip when there is nothing to count, and never counts training as experience', async () => {
    mockApi(fixtures({ 'GET /experience': [{ _id: 'e', organization: 'Acme', position: 'Trainee', type: 'Training', startDate: '2020-01-01T00:00:00Z', current: true }] }));
    renderApp('/');
    const h = await hero();
    await h.findByRole('heading', { level: 1 });
    await new Promise((r) => setTimeout(r, 100));
    expect(h.queryByRole('term')).not.toBeInTheDocument();
    expect(document.querySelector('dl[aria-label="Portfolio at a glance"]')).toBeNull();
  });

  it('shares requests with the sections below instead of duplicating them', async () => {
    const calls = mockApi(fixtures({ 'GET /projects': { data: proj(1) }, 'GET /skills': [{ _id: '1', name: 'React', category: 'Frontend' }] }));
    renderApp('/');
    await (await hero()).findByRole('heading', { level: 1 });
    await screen.findByRole('region', { name: /things i've built/i });
    expect(calls.filter((c) => c.key === 'GET /projects')).toHaveLength(1);
    expect(calls.filter((c) => c.key === 'GET /skills')).toHaveLength(1);
  });
});

describe('hero behaviour', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('"Scroll to explore" smoothly scrolls to the next section', async () => {
    mockApi(fixtures());
    const spy = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {});
    renderApp('/');
    await userEvent.click(await screen.findByRole('button', { name: /scroll to explore/i }));
    expect(spy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(spy.mock.contexts.at(-1).id).toBe('about');
  });

  it('does not animate the scroll for visitors who prefer reduced motion', async () => {
    mockApi(fixtures());
    const spy = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {});
    const real = window.matchMedia;
    window.matchMedia = (q) => ({ ...real(q), matches: /reduce/.test(q) });
    try {
      renderApp('/');
      await userEvent.click(await screen.findByRole('button', { name: /scroll to explore/i }));
      expect(spy).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
    } finally {
      window.matchMedia = real;
    }
  });

  it('honours the admin animation settings with CSS switches on the hero', async () => {
    mockApi(fixtures({ 'GET /settings': { siteTitle: 'x', animations: { enabled: false, intensity: 'subtle' } } }));
    const a = renderApp('/');
    await waitFor(async () => expect(await screen.findByRole('region', { name: 'Introduction' })).toHaveClass('motion-off'));
    a.unmount();
    mockApi(fixtures({ 'GET /settings': { siteTitle: 'x', animations: { enabled: true, intensity: 'normal' } } }));
    renderApp('/');
    await waitFor(async () => expect(await screen.findByRole('region', { name: 'Introduction' })).toHaveClass('motion-normal'));
  });

  it('the decorative background is hidden from assistive technology', async () => {
    mockApi(fixtures());
    renderApp('/');
    await (await hero()).findByRole('heading', { level: 1 });
    expect(document.querySelector('.hero-bg')).toHaveAttribute('aria-hidden', 'true');
    expect(document.querySelector('.hero-cursor-glow')).toHaveAttribute('aria-hidden', 'true');
  });

  it('keeps a clear loading skeleton and a retryable error', async () => {
    let fail = true;
    mockApi(fixtures({ 'GET /profile': () => (fail ? { status: 500, body: { success: false, message: 'Profile service down' } } : { data: profile() }) }));
    renderApp('/');
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Profile service down')).toBeInTheDocument();
    fail = false;
    await userEvent.click(within(alert).getByRole('button', { name: /try again/i }));
    expect(await screen.findByRole('heading', { level: 1, name: /Naeem Khan/ })).toBeInTheDocument();
  });
});

describe('navbar active section (scroll spy)', () => {
  const realRect = Element.prototype.getBoundingClientRect;
  afterEach(() => { Element.prototype.getBoundingClientRect = realRect; });

  it('highlights the section under the reading line and Home at the top', async () => {
    mockApi(fixtures());
    renderApp('/');
    await screen.findByRole('region', { name: 'Introduction' });
    const nav = within(screen.getAllByRole('navigation', { name: 'Main' })[0]);
    const tops = { about: 2000, skills: 2600, projects: 3200, experience: 3800, contact: 4400 };
    Element.prototype.getBoundingClientRect = function rect() { return { top: tops[this.id] ?? 9999, bottom: 0, left: 0, right: 0, width: 0, height: 0 }; };
    fireEvent.scroll(window);
    await waitFor(() => expect(nav.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page'));

    Object.assign(tops, { about: -900, skills: -300, projects: 120, experience: 700, contact: 1300 }); // scrolled into Projects
    fireEvent.scroll(window);
    await waitFor(() => expect(nav.getByRole('link', { name: 'Projects' })).toHaveAttribute('aria-current', 'location'));
    expect(nav.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
    expect(nav.getByRole('link', { name: 'Skills' })).not.toHaveAttribute('aria-current');
  });

  it('keeps every existing navigation link and destination', async () => {
    mockApi(fixtures());
    renderApp('/');
    await screen.findByRole('region', { name: 'Introduction' });
    const nav = within(screen.getAllByRole('navigation', { name: 'Main' })[0]);
    const hrefs = Object.fromEntries(['Home', 'About', 'Skills', 'Projects', 'Experience', 'Blog', 'Contact'].map((n) => [n, nav.getByRole('link', { name: n }).getAttribute('href')]));
    expect(hrefs).toEqual({ Home: '/', About: '/#about', Skills: '/#skills', Projects: '/#projects', Experience: '/#experience', Blog: '/blog', Contact: '/#contact' });
  });
});
