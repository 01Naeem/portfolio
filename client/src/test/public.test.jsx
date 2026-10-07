import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { baseMocks, mockApi, renderApp } from './helpers.jsx';
import { optimizeImage, srcSet } from '../utils/image.js';
import { buildTimeline } from '../components/sections/About.jsx';
import { FILTERS, matchesQuery } from '../components/sections/Projects.jsx';

const CLD = 'https://res.cloudinary.com/demo/image/upload/v1700000000/portfolio/projects/a.png';
const proj = (o = {}) => ({ _id: 'p1', slug: 'electrohub', title: 'ElectroHub', shortDescription: 'MERN store', categories: ['Full Stack'], technologies: ['React', 'Node.js', 'Express', 'MongoDB'], featured: false, githubUrl: 'https://github.com/a/e', liveUrl: 'https://e.example.com', ...o });

describe('helpers', () => {
  it('only rewrites Cloudinary URLs that have no transformation yet', () => {
    expect(optimizeImage(CLD, 800)).toBe('https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_800/v1700000000/portfolio/projects/a.png');
    expect(optimizeImage('https://example.com/a.png', 800)).toBe('https://example.com/a.png');
    expect(optimizeImage('https://res.cloudinary.com/demo/image/upload/w_100/v1/a.png', 800)).toContain('w_100/v1/a.png'); // already transformed: untouched
    expect(srcSet('https://example.com/a.png')).toBeUndefined();
    expect(srcSet(CLD)).toContain('w_480');
  });

  it('builds the journey from real education and experience records only', () => {
    const t = buildTimeline(
      [{ degree: 'B.Tech', institution: 'IT', startYear: 2021, graduationYear: 2025, ongoing: false }],
      [{ position: 'Trainee', organization: 'Acme', startDate: '2025-06-01T00:00:00Z' }]
    );
    expect(t.map((e) => `${e.year} ${e.title}`)).toEqual(['2021 B.Tech started', '2025 B.Tech completed', '2025 Trainee']);
    expect(buildTimeline([], [])).toEqual([]);
    expect(buildTimeline([{ degree: 'B.Tech', institution: 'IT', startYear: 2023, ongoing: true }], []).length).toBe(1); // no "completed" while ongoing
  });

  it('project filters: MERN needs all four techs; type filters use categories', () => {
    const f = (id) => FILTERS.find((x) => x.id === id).test;
    expect(f('mern')(proj())).toBe(true);
    expect(f('mern')(proj({ technologies: ['React', 'Node.js'] }))).toBe(false);
    expect(f('react')(proj({ technologies: ['React.js'] }))).toBe(true);
    expect(f('react')(proj({ technologies: ['React Native'] }))).toBe(false);
    expect(f('fullstack')(proj())).toBe(true);
    expect(f('frontend')(proj())).toBe(false);
    expect(matchesQuery(proj(), 'mongo')).toBe(true);
    expect(matchesQuery(proj(), 'zzz')).toBe(false);
  });
});

describe('home sections', () => {
  it('renders all sections with real anchors for the navbar', async () => {
    mockApi(baseMocks());
    renderApp('/');
    await screen.findByRole('heading', { level: 1 });
    for (const id of ['about', 'skills', 'projects', 'experience', 'education', 'resume', 'contact']) expect(document.getElementById(id)).toBeTruthy();
  });

  it('groups skills by category, shows levels/years, and never shows a percentage', async () => {
    mockApi(baseMocks({ 'GET /skills': [
      { _id: 's1', name: 'React', category: 'Frontend', level: 'Proficient', years: 2 },
      { _id: 's2', name: 'MongoDB', category: 'Database' },
      { _id: 's3', name: 'Express.js', category: 'Backend', description: 'REST APIs' },
    ] }));
    renderApp('/');
    const skills = within(await screen.findByRole('region', { name: /tools i work with/i }));
    expect(await skills.findByRole('heading', { name: 'Frontend' })).toBeInTheDocument();
    expect(skills.getByRole('heading', { name: 'Database' })).toBeInTheDocument();
    expect(skills.getByText('Proficient')).toBeInTheDocument();
    expect(skills.getByText('2 years')).toBeInTheDocument();
    expect(skills.queryByText(/%/)).not.toBeInTheDocument();
    expect(skills.queryByRole('heading', { name: 'Tools' })).not.toBeInTheDocument(); // empty groups are skipped
  });

  it('projects: featured spotlight, filtering, search, and a clear empty result', async () => {
    mockApi(baseMocks({ 'GET /projects': { data: [
      proj({ _id: 'p1', title: 'ElectroHub', featured: true }),
      proj({ _id: 'p2', slug: 'taskboard', title: 'TaskBoard', shortDescription: 'kanban app', categories: ['Frontend'], technologies: ['React'], githubUrl: '', liveUrl: '' }),
      proj({ _id: 'p3', slug: 'api-kit', title: 'API Kit', categories: ['Backend'], technologies: ['Node.js'], githubUrl: '', liveUrl: '' }),
    ] } }));
    renderApp('/');
    const sec = within(await screen.findByRole('region', { name: /things i've built/i }));
    expect(await sec.findByText('Featured')).toBeInTheDocument();
    expect(sec.getByRole('link', { name: 'TaskBoard' })).toHaveAttribute('href', '/projects/taskboard');

    await userEvent.click(sec.getByRole('button', { name: /^Backend/ }));
    expect(sec.getByRole('link', { name: 'API Kit' })).toBeInTheDocument();
    expect(sec.queryByRole('link', { name: 'TaskBoard' })).not.toBeInTheDocument();
    expect(sec.queryByText('Featured')).not.toBeInTheDocument(); // spotlight only on the unfiltered view

    await userEvent.click(sec.getByRole('button', { name: /^All/ }));
    await userEvent.type(sec.getByLabelText('Search projects'), 'kanban');
    expect(sec.getByRole('link', { name: 'TaskBoard' })).toBeInTheDocument();
    expect(sec.queryByRole('link', { name: 'API Kit' })).not.toBeInTheDocument();
    await userEvent.clear(sec.getByLabelText('Search projects'));
    await userEvent.type(sec.getByLabelText('Search projects'), 'nothing-matches');
    expect(await sec.findByText(/no projects match/i)).toBeInTheDocument();
  });

  it('hides filter chips that would give zero results', async () => {
    mockApi(baseMocks({ 'GET /projects': { data: [proj({ categories: ['Frontend'], technologies: ['React'] })] } }));
    renderApp('/');
    const sec = within(await screen.findByRole('region', { name: /things i've built/i }));
    await sec.findByRole('button', { name: /^Frontend/ });
    expect(sec.queryByRole('button', { name: /^Backend/ })).not.toBeInTheDocument();
    expect(sec.queryByRole('button', { name: /^MERN/ })).not.toBeInTheDocument();
  });

  it('counts a project click and keeps GitHub/Live links separate from the card link', async () => {
    const calls = mockApi(baseMocks({ 'GET /projects': { data: [proj()] }, 'POST /projects/p1/click': { data: { tracked: true } } }));
    renderApp('/');
    const gh = await screen.findByRole('link', { name: /ElectroHub source code on GitHub/ });
    expect(gh).toHaveAttribute('href', 'https://github.com/a/e');
    expect(gh).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('link', { name: /ElectroHub live demo/ })).toHaveAttribute('target', '_blank');
    await userEvent.click(screen.getByRole('link', { name: 'ElectroHub' }));
    await waitFor(() => expect(calls.some((c) => c.key === 'POST /projects/p1/click')).toBe(true));
  });

  it('experience: shows real entries; says so honestly when there are none', async () => {
    mockApi(baseMocks({ 'GET /experience': [{ _id: 'e1', organization: 'Acme Training', position: 'MERN Trainee', type: 'Training', startDate: '2025-06-01T00:00:00Z', current: true, responsibilities: ['Built REST APIs'], technologies: ['Node.js'] }] }));
    renderApp('/');
    const sec = within(await screen.findByRole('region', { name: /experience & training/i }));
    expect(await sec.findByText('MERN Trainee')).toBeInTheDocument();
    expect(sec.getByText('Acme Training')).toBeInTheDocument();
    expect(sec.getByText(/Present/)).toBeInTheDocument();
    expect(sec.getByText('Built REST APIs')).toBeInTheDocument();
  });

  it('experience empty state is honest, not fabricated', async () => {
    mockApi(baseMocks());
    renderApp('/');
    const sec = within(await screen.findByRole('region', { name: /experience & training/i }));
    expect(await sec.findByText(/nothing listed yet/i)).toBeInTheDocument();
  });

  it('certificates: hidden when empty or switched off in settings', async () => {
    mockApi(baseMocks());
    renderApp('/');
    await screen.findByRole('heading', { level: 1 });
    await waitFor(() => expect(document.getElementById('certificates')).toBeNull());
  });

  it('certificates: rendered with a verify link when present', async () => {
    mockApi(baseMocks({ 'GET /certificates': [{ _id: 'c1', name: 'Meta Front-End', issuer: 'Coursera', issueDate: '2025-01-01T00:00:00Z', credentialId: 'ABC123', credentialUrl: 'https://coursera.org/verify/ABC123' }] }));
    renderApp('/');
    const sec = within(await screen.findByRole('region', { name: /certificates/i }));
    expect(await sec.findByText('Meta Front-End')).toBeInTheDocument();
    expect(sec.getByText('ID: ABC123')).toBeInTheDocument();
    expect(sec.getByRole('link', { name: /verify credential/i })).toHaveAttribute('href', 'https://coursera.org/verify/ABC123');
  });

  it('about: shows the summary and objective from the profile', async () => {
    mockApi(baseMocks({ 'GET /profile': { name: 'Asha', title: 'Dev', summary: 'I build MERN apps.', careerObjective: 'Join a product team.', socialLinks: [], availability: {} } }));
    renderApp('/');
    expect((await screen.findAllByText('I build MERN apps.')).length).toBeGreaterThan(0); // hero teaser + About
    expect(screen.getByText('Join a product team.')).toBeInTheDocument();
  });

  it('recruiter block: plain-text facts and resume buttons', async () => {
    mockApi(baseMocks({ 'GET /profile': { name: 'Asha', title: 'Dev', currentRole: 'MERN Trainee', location: 'Bhopal', email: 'a@b.co', primaryTechnologies: ['React', 'Node.js'], availability: { isOpenToWork: true, label: 'Open to work' }, socialLinks: [{ platform: 'github', url: 'https://github.com/asha' }, { platform: 'linkedin', url: 'https://linkedin.com/in/asha' }] } }));
    renderApp('/');
    const sec = within(await screen.findByRole('region', { name: /for recruiters/i }));
    expect(await sec.findByText('MERN Trainee')).toBeInTheDocument();
    expect(sec.getByText('React, Node.js')).toBeInTheDocument();
    expect(sec.getByRole('link', { name: /github.com\/asha/ })).toBeInTheDocument();
    expect(sec.getByRole('link', { name: /view resume/i })).toHaveAttribute('href', '/api/resume/file');
    expect(sec.getByRole('link', { name: /download pdf/i })).toHaveAttribute('href', '/api/resume/file?download=1');
  });

  it('a failing section shows its own error with retry and does not take the page down', async () => {
    let fail = true;
    mockApi(baseMocks({ 'GET /skills': () => (fail ? { status: 500, body: { success: false, message: 'Skills unavailable' } } : [{ _id: 's1', name: 'React', category: 'Frontend' }]) }));
    renderApp('/');
    expect(await screen.findByRole('heading', { level: 1, name: /Asha Verma/ })).toBeInTheDocument();
    expect(await screen.findByText('Skills unavailable')).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByText('React')).toBeInTheDocument();
  });
});

describe('github section', () => {
  const gh = { profile: { login: 'asha', avatarUrl: '', url: 'https://github.com/asha', followers: 5 }, stats: { repoCount: 4, totalStars: 12 }, languages: [{ name: 'JavaScript', repoCount: 3 }], activity: { pushesLast30Days: 9, activeReposLast30Days: 2 }, recentRepos: [{ name: 'mern-shop', description: 'Store', url: 'https://github.com/asha/mern-shop', language: 'JavaScript', stars: 3, forks: 1 }], contributions: null };
  const on = { 'GET /profile': { name: 'Asha', socialLinks: [], availability: {}, github: { enabled: true, username: 'asha' } }, 'GET /settings': { siteTitle: 'x', sections: { showGithub: true } } };

  it('shows live GitHub data when enabled in both Profile and Site Settings', async () => {
    mockApi(baseMocks({ ...on, 'GET /github': gh }));
    renderApp('/');
    const sec = within(await screen.findByRole('region', { name: /github activity/i }));
    expect(await sec.findByText('mern-shop')).toBeInTheDocument();
    expect(sec.getByText('12')).toBeInTheDocument();
    expect(sec.getByText(/9 pushes to 2 repos/)).toBeInTheDocument();
  });

  it('is absent (and makes no request) when switched off', async () => {
    const calls = mockApi(baseMocks());
    renderApp('/');
    await screen.findByRole('heading', { level: 1 });
    expect(document.getElementById('github')).toBeNull();
    expect(calls.some((c) => c.key === 'GET /github')).toBe(false);
  });

  it('quietly disappears if GitHub fails, leaving manual projects intact', async () => {
    mockApi(baseMocks({ ...on, 'GET /github': { status: 502, body: { success: false, message: 'GitHub is currently unavailable' } }, 'GET /projects': { data: [proj()] } }));
    renderApp('/');
    expect(await screen.findByRole('link', { name: 'ElectroHub' })).toBeInTheDocument();
    await waitFor(() => expect(document.getElementById('github')).toBeNull());
    expect(screen.queryByText(/GitHub is currently unavailable/)).not.toBeInTheDocument();
  });
});

describe('project detail page', () => {
  const full = proj({ description: 'First paragraph.\n\nSecond paragraph.', features: ['JWT auth'], challenges: ['Scaling'], solutions: ['Caching'], screenshots: [{ url: CLD, alt: 'Cart page' }], completedAt: '2025-03-15T00:00:00Z' });

  it('shows the full story, links, and screenshots', async () => {
    mockApi(baseMocks({ 'GET /projects/electrohub': { data: full } }));
    renderApp('/projects/electrohub');
    expect(await screen.findByRole('heading', { level: 1, name: 'ElectroHub' })).toBeInTheDocument();
    expect(screen.getByText('First paragraph.')).toBeInTheDocument();
    expect(screen.getByText('Second paragraph.')).toBeInTheDocument();
    for (const t of ['Features', 'Challenges', 'Solutions']) expect(screen.getByRole('heading', { name: t })).toBeInTheDocument();
    expect(screen.getByText('JWT auth')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /live demo/i })).toHaveAttribute('href', 'https://e.example.com');
    expect(screen.getByRole('link', { name: /source code/i })).toHaveAttribute('href', 'https://github.com/a/e');
    expect(screen.getByRole('link', { name: /all projects/i })).toHaveAttribute('href', '/#projects');
  });

  it('opens a screenshot in an accessible dialog', async () => {
    mockApi(baseMocks({ 'GET /projects/electrohub': { data: full } }));
    renderApp('/projects/electrohub');
    await userEvent.click(await screen.findByRole('button', { name: /enlarge screenshot 1: cart page/i }));
    const dlg = await screen.findByRole('dialog');
    expect(within(dlg).getByRole('img', { name: 'Cart page' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows the 404 page for an unknown or unpublished project', async () => {
    mockApi(baseMocks({ 'GET /projects/ghost': { status: 404, body: { success: false, message: 'Project not found' } } }));
    renderApp('/projects/ghost');
    expect(await screen.findByRole('heading', { name: /doesn't exist/i })).toBeInTheDocument();
  });

  it('shows an error state with retry for other failures', async () => {
    mockApi(baseMocks({ 'GET /projects/electrohub': { status: 500, body: { success: false, message: 'Server exploded' } } }));
    renderApp('/projects/electrohub');
    expect(await screen.findByText('Server exploded')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});

describe('contact form', () => {
  const fill = async (over = {}) => {
    const v = { name: 'Rahul', email: 'rahul@acme.com', subject: 'Job opening', message: 'We would like to talk about a role.', ...over };
    await userEvent.type(await screen.findByLabelText('Name'), v.name);
    await userEvent.type(screen.getByLabelText('Email'), v.email);
    await userEvent.type(screen.getByLabelText('Subject'), v.subject);
    await userEvent.type(screen.getByLabelText('Message'), v.message);
  };
  const submit = () => userEvent.click(screen.getByRole('button', { name: /send message/i }));

  it('validates on the client before calling the API', async () => {
    const calls = mockApi(baseMocks());
    renderApp('/');
    await screen.findByLabelText('Name');
    await submit();
    expect(await screen.findByText('Please enter your name')).toBeInTheDocument();
    expect(screen.getByText('Please enter your email')).toBeInTheDocument();
    expect(screen.getByText('Please write a message')).toBeInTheDocument();
    expect(calls.some((c) => c.key === 'POST /messages')).toBe(false);
  });

  it('rejects a bad email and a too-short message', async () => {
    mockApi(baseMocks());
    renderApp('/');
    await fill({ email: 'not-an-email', message: 'hi' });
    await submit();
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText(/message is too short/i)).toBeInTheDocument();
  });

  it('sends the message with an EMPTY honeypot and shows a success state', async () => {
    const calls = mockApi(baseMocks({ 'POST /messages': { status: 201, data: { message: 'Thanks' } } }));
    renderApp('/');
    await fill();
    await submit();
    expect(await screen.findByRole('heading', { name: 'Message sent' })).toBeInTheDocument();
    const sent = calls.find((c) => c.key === 'POST /messages').data;
    expect(sent).toEqual({ name: 'Rahul', email: 'rahul@acme.com', subject: 'Job opening', message: 'We would like to talk about a role.', website: '' });
    await userEvent.click(screen.getByRole('button', { name: /send another message/i }));
    expect(await screen.findByLabelText('Name')).toHaveValue(''); // form was reset
  });

  it('keeps the honeypot out of reach of keyboards and screen readers', async () => {
    mockApi(baseMocks());
    renderApp('/');
    await screen.findByLabelText('Name');
    const trap = screen.getByLabelText('Website');
    expect(trap).toHaveAttribute('tabindex', '-1');
    expect(trap.closest('[aria-hidden="true"]')).toBeTruthy();
  });

  it('maps server validation errors onto fields and keeps what was typed', async () => {
    mockApi(baseMocks({ 'POST /messages': { status: 400, body: { success: false, message: 'Validation failed', details: [{ field: 'email', message: 'Enter a valid email' }] } } }));
    renderApp('/');
    await fill();
    await submit();
    expect(await screen.findByText('Enter a valid email')).toBeInTheDocument();
    expect(screen.getByText('Please fix the highlighted fields.')).toBeInTheDocument();
    expect(screen.getByLabelText('Subject')).toHaveValue('Job opening');
  });

  it('shows the rate-limit message when the server says slow down', async () => {
    mockApi(baseMocks({ 'POST /messages': { status: 429, body: { success: false, message: 'Too many messages sent. Please try again later.' } } }));
    renderApp('/');
    await fill();
    await submit();
    expect(await screen.findByText('Too many messages sent. Please try again later.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Message sent' })).not.toBeInTheDocument();
  });
});
