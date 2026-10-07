import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { adminMocks, baseMocks, mockApi, renderApp } from './helpers.jsx';

// Automated accessibility checks with axe-core against fully populated pages.
// jsdom has no layout engine, so colour contrast is checked separately (see the contrast script in the README/audit).
const audit = async (container = document.body) => {
  const { violations } = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, 'scrollable-region-focusable': { enabled: false } } });
  return violations.map((v) => `${v.id} (${v.impact}): ${v.help} -> ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`);
};

const CLD = 'https://res.cloudinary.com/demo/image/upload/v1700000000/portfolio/projects/a.png';
const data = baseMocks({
  'GET /profile': { name: 'Asha Verma', title: 'MERN Developer', tagline: 'Building things.', summary: 'I build MERN apps.', careerObjective: 'Join a product team.', currentFocus: 'Testing', philosophy: 'Keep it simple', location: 'Bhopal', email: 'asha@example.com', currentRole: 'Trainee', primaryTechnologies: ['React'], availability: { isOpenToWork: true, label: 'Open to work' }, github: { enabled: false }, socialLinks: [{ _id: 'g', platform: 'github', url: 'https://github.com/asha' }, { _id: 'l', platform: 'linkedin', url: 'https://linkedin.com/in/asha' }, { _id: 'e', platform: 'email', url: 'mailto:asha@example.com' }] },
  'GET /skills': [{ _id: 's1', name: 'React', category: 'Frontend', level: 'Proficient', years: 2 }, { _id: 's2', name: 'Node.js', category: 'Backend' }],
  'GET /projects': { data: [{ _id: 'p1', slug: 'electrohub', title: 'ElectroHub', shortDescription: 'MERN store', categories: ['Full Stack'], technologies: ['React', 'Node.js', 'Express', 'MongoDB'], featured: true, githubUrl: 'https://github.com/a/e', liveUrl: 'https://e.example.com', coverImage: { url: CLD, alt: 'Home page' } }, { _id: 'p2', slug: 'tasks', title: 'Tasks', shortDescription: 'Kanban', categories: ['Frontend'], technologies: ['React'] }] },
  'GET /experience': [{ _id: 'e1', organization: 'Acme', position: 'Trainee', type: 'Training', startDate: '2025-06-01T00:00:00Z', current: true, responsibilities: ['APIs'], technologies: ['Node.js'] }],
  'GET /education': [{ _id: 'd1', degree: 'B.Tech', institution: 'IT', startYear: 2021, graduationYear: 2025, coursework: ['DSA'] }],
  'GET /certificates': [{ _id: 'c1', name: 'Meta Front-End', issuer: 'Coursera', issueDate: '2025-01-01T00:00:00Z', credentialUrl: 'https://c.example/1', image: { url: CLD, alt: 'Certificate' } }],
});

describe('accessibility (axe-core)', () => {
  it('home page, every section populated', async () => {
    mockApi(data);
    renderApp('/');
    await screen.findByRole('region', { name: /for recruiters/i });
    await screen.findByRole('region', { name: /let's talk/i });
    await screen.findByRole('region', { name: /certificates/i });
    expect((await audit()).join('\n')).toBe('');
  });

  it('project page with screenshots', async () => {
    mockApi({ ...data, 'GET /projects/electrohub': { data: { _id: 'p1', slug: 'electrohub', title: 'ElectroHub', shortDescription: 'MERN store', description: 'Para one.\n\nPara two.', technologies: ['React'], features: ['Auth'], challenges: ['Scale'], solutions: ['Cache'], coverImage: { url: CLD, alt: 'Home' }, screenshots: [{ url: CLD, alt: 'Cart' }], githubUrl: 'https://github.com/a/e', liveUrl: 'https://e.example.com' } } });
    renderApp('/projects/electrohub');
    await screen.findByRole('heading', { level: 1, name: 'ElectroHub' });
    expect((await audit()).join('\n')).toBe('');
  });

  it('blog list and post', async () => {
    const post = { _id: 'b1', slug: 'hello', title: 'Hello', excerpt: 'First', category: 'Dev', tags: ['react'], status: 'published', publishedAt: '2026-09-01T00:00:00Z', readingTimeMinutes: 3, content: '## Intro\n\nText with a [link](https://example.com).\n\n| a | b |\n|---|---|\n| 1 | 2 |', coverImage: { url: CLD, alt: 'Cover' } };
    mockApi({ ...data, 'GET /blog': () => ({ data: [post], meta: { total: 1, page: 1, limit: 9, pages: 1 } }), 'GET /blog/meta': { tags: [{ name: 'react', count: 1 }], categories: [{ name: 'Dev', count: 1 }] }, 'GET /blog/hello': { data: post } });
    const { router } = renderApp('/blog');
    await screen.findByRole('link', { name: 'Hello' });
    expect((await audit()).join('\n')).toBe('');
    await router.navigate('/blog/hello');
    await screen.findByRole('heading', { level: 1, name: 'Hello' });
    expect((await audit()).join('\n')).toBe('');
  });

  it('admin login', async () => {
    mockApi(baseMocks());
    renderApp('/admin/login');
    await screen.findByRole('heading', { name: /admin sign in/i });
    expect((await audit()).join('\n')).toBe('');
  });

  it('admin projects table with the edit dialog open', async () => {
    mockApi(adminMocks({
      'GET /projects': { data: [{ _id: 'p1', title: 'ElectroHub', shortDescription: 'MERN', categories: ['Full Stack'], published: true, featured: false, clicks: 3 }] },
      'GET /projects/p1': { data: { _id: 'p1', title: 'ElectroHub', shortDescription: 'MERN', technologies: ['React'], categories: ['Full Stack'], published: true, screenshots: [{ url: CLD, alt: 'x' }], coverImage: { url: CLD, alt: 'cover' } } },
    }));
    renderApp('/admin/projects');
    await screen.findByText('ElectroHub');
    expect((await audit()).join('\n')).toBe('');
    await userEvent.click(screen.getByRole('button', { name: 'Edit ElectroHub' }));
    await screen.findByRole('dialog');
    await waitFor(async () => expect((await audit(document.querySelector('[role="dialog"]'))).join('\n')).toBe(''));
  });

  it('admin settings form (checkboxes, colour, headings)', async () => {
    mockApi(adminMocks({ 'GET /settings': { siteTitle: 'x', theme: { accentColor: '#6366f1', defaultMode: 'dark' }, animations: { enabled: true }, sections: {}, analytics: { enabled: true }, seo: {}, hero: {}, contact: {} } }));
    renderApp('/admin/settings');
    await screen.findByRole('heading', { name: 'Appearance' });
    expect((await audit()).join('\n')).toBe('');
  });
});
