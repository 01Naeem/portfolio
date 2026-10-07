import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { baseMocks, mockApi, renderApp } from './helpers.jsx';
import { blogPostingLd, personLd, projectLd, websiteLd } from '../utils/jsonLd.js';

const ld = () => [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent));

describe('structured data builders', () => {
  it('Person only lists http(s) profiles in sameAs', () => {
    const p = personLd({ name: 'Asha', title: 'Dev', socialLinks: [{ url: 'https://github.com/a' }, { url: 'mailto:a@b.co' }, { url: 'javascript:1' }], primaryTechnologies: ['React'] }, 'https://asha.dev');
    expect(p.sameAs).toEqual(['https://github.com/a']);
    expect(p['@type']).toBe('Person');
    expect(p.knowsAbout).toEqual(['React']);
  });
  it('WebSite uses the brand part of the title', () => {
    expect(websiteLd({ siteTitle: 'Asha | Software Engineer' }, { name: 'X' }, 'https://asha.dev').name).toBe('Asha');
  });
  it('BlogPosting and project data carry canonical URLs and dates', () => {
    const post = blogPostingLd({ title: 'Hi', slug: 'hi', publishedAt: '2026-09-01T00:00:00Z', tags: ['a'] }, { name: 'Asha' }, 'https://asha.dev');
    expect(post.mainEntityOfPage).toBe('https://asha.dev/blog/hi');
    expect(post.datePublished).toBe('2026-09-01T00:00:00.000Z');
    const proj = projectLd({ title: 'P', slug: 'p', shortDescription: 'd', technologies: ['React', 'Node'] }, { name: 'Asha' }, 'https://asha.dev');
    expect(proj.url).toBe('https://asha.dev/projects/p');
    expect(proj.keywords).toBe('React, Node');
  });
});

describe('structured data in the pages', () => {
  it('home page emits valid Person + WebSite JSON-LD', async () => {
    mockApi(baseMocks());
    renderApp('/');
    await screen.findByRole('heading', { level: 1 });
    await waitFor(() => expect(ld().length).toBeGreaterThan(0));
    const types = ld().map((d) => d['@type']);
    expect(types).toEqual(['Person', 'WebSite']);
    expect(ld()[0].name).toBe('Asha Verma');
    expect(ld()[0].sameAs).toEqual(['https://github.com/asha']); // the javascript: link in the fixture is excluded
  });

  it('hostile text can never close the script tag early', async () => {
    mockApi(baseMocks({ 'GET /profile': { name: '</script><script>window.pwned=1</script>', title: 'Dev', socialLinks: [], availability: {} } }));
    renderApp('/');
    await waitFor(() => expect(ld().length).toBeGreaterThan(0));
    expect(window.pwned).toBeUndefined();
    expect(document.querySelectorAll('script:not([type="application/ld+json"]):not([src])')).toHaveLength(0);
    expect(ld()[0].name).toBe('</script><script>window.pwned=1</script>'); // data preserved as data
  });

  it('a published post emits BlogPosting; a draft preview emits none', async () => {
    const post = { _id: 'b1', slug: 'hi', title: 'Hi', excerpt: 'x', tags: ['a'], status: 'published', publishedAt: '2026-09-01T00:00:00Z', content: 'Body' };
    mockApi(baseMocks({ 'GET /blog/hi': { data: post } }));
    renderApp('/blog/hi');
    await screen.findByRole('heading', { level: 1, name: 'Hi' });
    expect(ld().map((d) => d['@type'])).toContain('BlogPosting');
  });
  it('draft preview has no structured data', async () => {
    mockApi(baseMocks({ 'GET /blog/hi': { data: { _id: 'b1', slug: 'hi', title: 'Hi', status: 'draft', content: 'Body', tags: [] } } }));
    renderApp('/blog/hi');
    await screen.findByRole('heading', { level: 1, name: 'Hi' });
    expect(ld().map((d) => d['@type'])).not.toContain('BlogPosting');
  });
});
