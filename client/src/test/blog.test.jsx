import { describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { baseMocks, mockApi, renderApp } from './helpers.jsx';
import Markdown from '../components/Markdown.jsx';

const post = (o = {}) => ({ _id: 'b1', slug: 'hello-mern', title: 'Hello MERN', excerpt: 'First post', category: 'Dev', tags: ['react', 'node'], status: 'published', publishedAt: '2026-09-01T00:00:00Z', readingTimeMinutes: 3, content: '## Intro\n\nBody text.', ...o });
const list = (rows, meta = {}) => ({ data: rows, meta: { total: rows.length, page: 1, limit: 9, pages: 1, ...meta } });
const facets = { tags: [{ name: 'react', count: 2 }, { name: 'node', count: 1 }], categories: [{ name: 'Dev', count: 2 }, { name: 'Life', count: 1 }] };
const blogMocks = (over = {}) => baseMocks({ 'GET /blog': () => list([post(), post({ _id: 'b2', slug: 'second', title: 'Second post' })]), 'GET /blog/meta': facets, ...over });
const posts = (calls) => calls.filter((c) => c.key === 'GET /blog');

describe('Markdown (safety and formatting)', () => {
  const md = (src) => render(<Markdown>{src}</Markdown>).container;

  it('shifts headings down one level because the post title is the h1', () => {
    const c = md('# One\n\n## Two\n\n### Three');
    expect(c.querySelector('h1')).toBeNull();
    expect(c.querySelector('h2').textContent).toBe('One');
    expect(c.querySelector('h3').textContent).toBe('Two');
    expect(c.querySelector('h4').textContent).toBe('Three');
  });

  it('keeps relative depth: a body that starts at "##" still begins at h2 (no h1 -> h3 jump)', () => {
    const c = md('## First\n\n### Sub\n\n## Second');
    expect([...c.querySelectorAll('h2,h3')].map((h) => `${h.tagName}:${h.textContent}`)).toEqual(['H2:First', 'H3:Sub', 'H2:Second']);
  });

  it('ignores "# comments" inside fenced code when choosing the heading depth', () => {
    const c = md('## Setup\n\n```bash\n# install deps\nnpm i\n```');
    expect(c.querySelector('h2').textContent).toBe('Setup');
    expect(c.querySelector('h1')).toBeNull();
  });

  it('renders GFM tables inside a scroll container', () => {
    const c = md('| a | b |\n|---|---|\n| 1 | 2 |');
    expect(c.querySelector('table')).toBeTruthy();
    expect(c.querySelector('table').parentElement.className).toContain('overflow-x-auto');
  });

  it('opens external links safely, leaves internal ones alone, and neutralises javascript: links', () => {
    const c = md('[ext](https://example.com) [int](/projects/x) [bad](javascript:alert(1)) [mail](mailto:a@b.co)');
    const a = (t) => [...c.querySelectorAll('a')].find((x) => x.textContent === t);
    expect(a('ext')).toHaveAttribute('target', '_blank');
    expect(a('ext')).toHaveAttribute('rel', 'noopener noreferrer');
    expect(a('int')).not.toHaveAttribute('target');
    expect(a('bad').getAttribute('href')).toBe('#');
    expect(a('mail').getAttribute('href')).toBe('mailto:a@b.co');
  });

  it('never turns raw HTML in a post into live elements or handlers', () => {
    const c = md('Hi\n\n<script>window.pwned=1</script>\n\n<img src=x onerror="window.pwned=1">\n\n<iframe src="https://evil.example"></iframe>');
    expect(c.querySelector('script')).toBeNull();
    expect(c.querySelector('iframe')).toBeNull();
    expect(c.querySelector('[onerror]')).toBeNull();
    expect(window.pwned).toBeUndefined();
  });

  it('lazy-loads markdown images and keeps alt text', () => {
    const img = md('![A diagram](https://example.com/d.png)').querySelector('img');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('alt', 'A diagram');
  });
});

describe('blog list page', () => {
  it('lists published posts and requests the first page of 9', async () => {
    const calls = mockApi(blogMocks());
    renderApp('/blog');
    expect(await screen.findByRole('link', { name: 'Hello MERN' })).toHaveAttribute('href', '/blog/hello-mern');
    expect(screen.getByRole('link', { name: 'Second post' })).toBeInTheDocument();
    expect(screen.getAllByText('3 min read')).toHaveLength(2); // one per card
    expect(posts(calls)[0].params).toEqual({ page: 1, limit: 9 });
  });

  it('filters by tag and category through the API and keeps the choice in the URL', async () => {
    const calls = mockApi(blogMocks());
    const { router } = renderApp('/blog');
    await userEvent.click(await screen.findByRole('button', { name: '#react' }));
    await waitFor(() => expect(posts(calls).some((c) => c.params.tag === 'react')).toBe(true));
    expect(router.state.location.search).toContain('tag=react');
    expect(screen.getByRole('button', { name: '#react' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: /^Dev/ }));
    await waitFor(() => expect(posts(calls).some((c) => c.params.tag === 'react' && c.params.category === 'Dev')).toBe(true));
    await userEvent.click(screen.getByRole('button', { name: '#react' })); // toggles off
    await waitFor(() => expect(router.state.location.search).not.toContain('tag='));
  });

  it('starts from filters already in the URL (shareable links)', async () => {
    const calls = mockApi(blogMocks());
    renderApp('/blog?tag=node&page=2');
    await screen.findByRole('button', { name: '#node' });
    expect(posts(calls)[0].params).toEqual({ page: 2, limit: 9, tag: 'node' });
    expect(screen.getByRole('button', { name: '#node' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('searches after a short pause and resets to page 1', async () => {
    const calls = mockApi(blogMocks());
    const { router } = renderApp('/blog?page=3');
    await userEvent.type(await screen.findByLabelText('Search posts'), 'mern');
    await waitFor(() => expect(posts(calls).some((c) => c.params.q === 'mern')).toBe(true), { timeout: 2000 });
    expect(router.state.location.search).toBe('?q=mern');
    // typing "mern" must not have fired one request per keystroke
    expect(posts(calls).filter((c) => c.params.q && c.params.q !== 'mern')).toHaveLength(0);
  });

  it('paginates with Previous/Next', async () => {
    const calls = mockApi(blogMocks({ 'GET /blog': (c) => list([post({ title: `Page ${c.params.page} post` })], { page: c.params.page, pages: 3, total: 25 }) }));
    renderApp('/blog');
    expect(await screen.findByText('Page 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Page 2 of 3')).toBeInTheDocument();
    expect(posts(calls).some((c) => c.params.page === 2)).toBe(true);
  });

  it('empty states: nothing published yet vs. no match, with a way back', async () => {
    mockApi(blogMocks({ 'GET /blog': () => list([]), 'GET /blog/meta': { tags: [], categories: [] } }));
    renderApp('/blog');
    expect(await screen.findByText('No posts yet')).toBeInTheDocument();
  });

  it('offers to clear filters when nothing matches', async () => {
    mockApi(blogMocks({ 'GET /blog': () => list([]) }));
    renderApp('/blog?tag=ghost');
    expect(await screen.findByText('No posts match')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    await waitFor(() => expect(screen.getByText('No posts yet')).toBeInTheDocument());
  });

  it('shows an error with retry', async () => {
    let fail = true;
    mockApi(blogMocks({ 'GET /blog': () => (fail ? { status: 500, body: { success: false, message: 'Blog is down' } } : list([post()])) }));
    renderApp('/blog');
    expect(await screen.findByText('Blog is down')).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByRole('link', { name: 'Hello MERN' })).toBeInTheDocument();
  });

  it('is a 404, and absent from the navbar, when the admin turns the blog off', async () => {
    const calls = mockApi(blogMocks({ 'GET /settings': { siteTitle: 'x', sections: { showBlog: false } } }));
    renderApp('/blog');
    expect(await screen.findByRole('heading', { name: /doesn't exist/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Blog' })).not.toBeInTheDocument();
    expect(posts(calls)).toHaveLength(0);
  });

  it('opens a post from the list', async () => {
    mockApi(blogMocks({ 'GET /blog/hello-mern': { data: post() } }));
    const { router } = renderApp('/blog');
    await userEvent.click(await screen.findByRole('link', { name: 'Hello MERN' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/blog/hello-mern'));
    expect(await screen.findByRole('heading', { level: 1, name: 'Hello MERN' })).toBeInTheDocument();
  });
});

describe('blog post page', () => {
  const full = post({ content: '# Intro\n\nSome **bold** body with a [link](https://example.com).\n\n<script>window.pwned=1</script>' });

  it('renders the article, its metadata and tags that link back to filtered lists', async () => {
    mockApi(blogMocks({ 'GET /blog/hello-mern': { data: full } }));
    renderApp('/blog/hello-mern');
    const h1 = await screen.findByRole('heading', { level: 1, name: 'Hello MERN' });
    expect(h1).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1); // markdown "#" did not create a second h1
    expect(screen.getByRole('heading', { level: 2, name: 'Intro' })).toBeInTheDocument();
    expect(screen.getByText('bold')).toBeInTheDocument();
    expect(screen.getAllByText('3 min read').length).toBeGreaterThan(0); // article header (and any related cards)
    expect(screen.getByRole('link', { name: '#react' })).toHaveAttribute('href', '/blog?tag=react');
    expect(screen.getByRole('link', { name: /all posts/i })).toHaveAttribute('href', '/blog');
    expect(document.querySelector('article script:not([type="application/ld+json"])')).toBeNull(); // only the structured-data block, nothing executable
    expect(window.pwned).toBeUndefined();
  });

  it('shows related posts for the first tag, excluding the current one', async () => {
    const calls = mockApi(blogMocks({
      'GET /blog/hello-mern': { data: full },
      'GET /blog': () => list([post(), post({ _id: 'b2', slug: 'second', title: 'Second post' }), post({ _id: 'b3', slug: 'third', title: 'Third post' })]),
    }));
    renderApp('/blog/hello-mern');
    const rel = within(await screen.findByRole('region', { name: /keep reading/i }));
    expect(await rel.findByRole('link', { name: 'Second post' })).toBeInTheDocument();
    expect(rel.getByRole('link', { name: 'Third post' })).toBeInTheDocument();
    expect(rel.queryByRole('link', { name: 'Hello MERN' })).not.toBeInTheDocument();
    expect(posts(calls).some((c) => c.params.tag === 'react' && c.params.limit === 4)).toBe(true);
  });

  it('is a 404 for an unknown post', async () => {
    mockApi(blogMocks({ 'GET /blog/ghost': { status: 404, body: { success: false, message: 'Post not found' } } }));
    renderApp('/blog/ghost');
    expect(await screen.findByRole('heading', { name: /doesn't exist/i })).toBeInTheDocument();
  });

  it('labels a draft preview (only the admin is ever served one)', async () => {
    mockApi(blogMocks({ 'GET /blog/hello-mern': { data: { ...full, status: 'draft' } } }));
    renderApp('/blog/hello-mern');
    expect(await screen.findByText(/draft preview/i)).toBeInTheDocument();
  });

  it('shows an error with retry for other failures', async () => {
    mockApi(blogMocks({ 'GET /blog/hello-mern': { status: 500, body: { success: false, message: 'Server exploded' } } }));
    renderApp('/blog/hello-mern');
    expect(await screen.findByText('Server exploded')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('sets the page title from the SEO title when present', async () => {
    mockApi(blogMocks({ 'GET /blog/hello-mern': { data: { ...full, seo: { title: 'Custom SEO Title' } } } }));
    renderApp('/blog/hello-mern');
    await screen.findByRole('heading', { level: 1, name: 'Hello MERN' });
    await waitFor(() => expect(document.title).toContain('Custom SEO Title'));
  });
});
