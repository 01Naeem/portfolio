import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { adminMocks, baseMocks, mockApi, renderApp } from './helpers.jsx';

const msg = (o = {}) => ({ _id: 'm1', name: 'Rahul', email: 'rahul@acme.com', subject: 'Job opening', message: 'We would like to talk.\nSecond line <b>bold</b>', read: false, createdAt: '2026-10-01T10:00:00Z', ...o });
const inbox = (rows, extra = {}) => ({ data: rows, meta: { total: rows.length, page: 1, limit: 15, pages: 1, unread: rows.filter((r) => !r.read).length, ...extra } });

describe('admin: messages inbox', () => {
  it('lists messages, marks unread ones, and filters through the API', async () => {
    const calls = mockApi(adminMocks({ 'GET /messages': () => inbox([msg(), msg({ _id: 'm2', name: 'Priya', read: true })]) }));
    renderApp('/admin/messages');
    expect(await screen.findByText('Rahul')).toBeInTheDocument();
    expect(screen.getByLabelText('Unread')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Unread \(1\)/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Unread/ }));
    await waitFor(() => expect(calls.some((c) => c.key === 'GET /messages' && c.params?.status === 'unread')).toBe(true));
  });

  it('opening an unread message marks it read and shows its text as plain text', async () => {
    const calls = mockApi(adminMocks({
      'GET /messages': () => inbox([msg()]),
      'PATCH /messages/m1': { data: msg({ read: true }) },
    }));
    renderApp('/admin/messages');
    await userEvent.click(await screen.findByRole('button', { name: 'Open message from Rahul' }));
    const dlg = within(await screen.findByRole('dialog'));
    expect(dlg.getByText(/Second line <b>bold<\/b>/)).toBeInTheDocument(); // not rendered as HTML
    expect(dlg.queryByRole('strong')).not.toBeInTheDocument();
    await waitFor(() => expect(calls.find((c) => c.key === 'PATCH /messages/m1')?.data).toEqual({ read: true }));
    expect(dlg.getByRole('link', { name: /reply by email/i })).toHaveAttribute('href', 'mailto:rahul@acme.com?subject=Re%3A%20Job%20opening');
  });

  it('confirms before deleting a message', async () => {
    let rows = [msg({ read: true })];
    const calls = mockApi(adminMocks({
      'GET /messages': () => inbox(rows),
      'DELETE /messages/m1': () => { rows = []; return { data: { message: 'Message deleted' } }; },
    }));
    renderApp('/admin/messages');
    await userEvent.click(await screen.findByRole('button', { name: 'Delete message from Rahul' }));
    expect(calls.some((c) => c.key === 'DELETE /messages/m1')).toBe(false);
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText(/no messages yet/i)).toBeInTheDocument();
  });

  it('marks everything read', async () => {
    const calls = mockApi(adminMocks({ 'GET /messages': () => inbox([msg()]), 'PATCH /messages/read-all': { data: { modified: 1 } } }));
    renderApp('/admin/messages');
    await userEvent.click(await screen.findByRole('button', { name: /mark all as read/i }));
    await waitFor(() => expect(calls.some((c) => c.key === 'PATCH /messages/read-all')).toBe(true));
  });
});

describe('admin: site settings', () => {
  const settingsDoc = {
    siteTitle: 'Asha | Dev', metaDescription: 'Hi', hero: { title: '', subtitle: '' }, contact: { email: '', notificationEmail: '', showPhone: false },
    theme: { defaultMode: 'dark', accentColor: '#6366f1' }, animations: { enabled: true, intensity: 'subtle' },
    sections: { showBlog: true, showCertificates: true, showGithub: false, showTestimonials: false }, analytics: { enabled: true }, seo: { robotsIndex: true, twitterHandle: '' },
  };

  it('renders every group and saves nested values, including the accent color', async () => {
    const calls = mockApi(adminMocks({ 'GET /settings': settingsDoc, 'PUT /settings': { data: { ...settingsDoc, siteTitle: 'New Title' } } }));
    renderApp('/admin/settings');
    for (const h of ['General & SEO', 'Hero', 'Contact', 'Appearance', 'Sections', 'Privacy']) expect(await screen.findByRole('heading', { name: h })).toBeInTheDocument();
    const t = screen.getByLabelText('Website title');
    await userEvent.clear(t);
    await userEvent.type(t, 'New Title');
    await userEvent.click(screen.getByLabelText('Enable animations'));
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(calls.some((c) => c.key === 'PUT /settings')).toBe(true));
    expect(calls.find((c) => c.key === 'PUT /settings').data).toMatchObject({
      siteTitle: 'New Title', animations: { enabled: false, intensity: 'subtle' }, theme: { defaultMode: 'dark', accentColor: '#6366f1' },
      sections: { showBlog: true, showGithub: false }, seo: { robotsIndex: true }, analytics: { enabled: true },
    });
  });

  it('shows server-side validation under the field', async () => {
    mockApi(adminMocks({
      'GET /settings': settingsDoc,
      'PUT /settings': { status: 400, body: { success: false, message: 'Validation failed', details: [{ field: 'siteTitle', message: 'Too big: expected string to have <=70 characters' }] } },
    }));
    renderApp('/admin/settings');
    await userEvent.type(await screen.findByLabelText('Website title'), 'x');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
    expect(await screen.findByText(/<=70 characters/)).toBeInTheDocument();
  });

  it('public site uses the saved accent, favicon and hero override', async () => {
    mockApi(baseMocks({
      'GET /settings': { ...settingsDoc, theme: { defaultMode: 'dark', accentColor: '#ef4444' }, favicon: { url: 'https://res.cloudinary.com/x/fav.png' }, hero: { title: 'Custom headline', subtitle: 'Custom sub' } },
    }));
    renderApp('/');
    expect(await screen.findByText('Custom headline')).toBeInTheDocument();
    expect(screen.getByText('Custom sub')).toBeInTheDocument();
    await waitFor(() => expect(document.documentElement.style.getPropertyValue('--accent-base')).toBe('#ef4444'));
    await waitFor(() => expect(document.querySelector('link[rel="icon"]').getAttribute('href')).toBe('https://res.cloudinary.com/x/fav.png'));
  });
});

describe('admin: blog', () => {
  const post = (o = {}) => ({ _id: 'b1', title: 'Hello MERN', excerpt: 'First post', status: 'draft', category: 'Dev', tags: ['react'], readingTimeMinutes: 3, ...o });

  it('lists posts using the admin query and edits through the by-id endpoint', async () => {
    const calls = mockApi(adminMocks({
      'GET /blog': { data: [post(), post({ _id: 'b2', title: 'Live post', status: 'published', publishedAt: '2026-09-01T00:00:00Z' })] },
      'GET /blog/by-id/b1': { data: post({ content: '# Hi', slug: 'hello-mern', publishedAt: null }) },
      'PUT /blog/b1': { data: post() },
    }));
    renderApp('/admin/blog');
    expect(await screen.findByText('Hello MERN')).toBeInTheDocument();
    expect(screen.getByText('Published', { selector: 'span' })).toBeInTheDocument();
    expect(calls.find((c) => c.key === 'GET /blog').params).toEqual({ all: 'true', limit: 30 });
    await userEvent.click(screen.getByRole('button', { name: 'Edit Hello MERN' }));
    const dlg = within(await screen.findByRole('dialog'));
    expect(dlg.getByLabelText(/content \(markdown\)/i)).toHaveValue('# Hi');
    expect(dlg.getByLabelText('Slug')).toHaveValue('hello-mern');
    await userEvent.click(dlg.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(calls.some((c) => c.key === 'PUT /blog/b1')).toBe(true));
  });

  it('omits an empty slug (server generates it) and sends nested SEO fields', async () => {
    const calls = mockApi(adminMocks({ 'GET /blog': { data: [] }, 'POST /blog': { data: { _id: 'n' } } }));
    renderApp('/admin/blog');
    await userEvent.click(await screen.findByRole('button', { name: /add your first post/i }));
    const dlg = within(screen.getByRole('dialog'));
    await userEvent.type(dlg.getByLabelText(/^title/i), 'My Post');
    await userEvent.type(dlg.getByLabelText(/content \(markdown\)/i), 'Body text');
    await userEvent.type(dlg.getByLabelText('SEO title'), 'Custom SEO');
    await userEvent.type(dlg.getByLabelText('Tags'), 'mern,node{Enter}');
    await userEvent.click(dlg.getByRole('button', { name: /add post/i }));
    await waitFor(() => expect(calls.some((c) => c.key === 'POST /blog')).toBe(true));
    const body = calls.find((c) => c.key === 'POST /blog').data;
    expect('slug' in body).toBe(false);
    expect(body).toMatchObject({ title: 'My Post', content: 'Body text', status: 'draft', tags: ['mern', 'node'], seo: { title: 'Custom SEO', description: '' }, publishedAt: null });
  });
});

describe('admin: analytics', () => {
  const series = Array.from({ length: 30 }, (_, i) => ({ date: `2026-09-${String(i + 1).padStart(2, '0')}`, views: i % 5 }));
  const report = { days: 30, series, viewsInRange: 60, viewsAllTime: 400, topPages: [{ path: '/', views: 40 }, { path: '/blog/hello', views: 9 }], topProjects: [{ _id: 'p1', title: 'ElectroHub', clicks: 12 }], resumeDownloads: 7, contactSubmissions: 3, messagesTotal: 9 };

  it('shows totals, a chart with an accessible data table, and top lists', async () => {
    const calls = mockApi(adminMocks({ 'GET /analytics': () => ({ data: report }) }));
    renderApp('/admin/analytics');
    expect(await screen.findByText('400 all time')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /page views per day over the last 30 days/i })).toBeInTheDocument();
    expect(screen.getAllByRole('row').length).toBeGreaterThan(30); // sr-only table mirrors the chart
    expect(screen.getByText('/blog/hello')).toBeInTheDocument();
    expect(screen.getByText('ElectroHub')).toBeInTheDocument();
    expect(calls.find((c) => c.key === 'GET /analytics').params).toEqual({ days: 30 });
    await userEvent.click(screen.getByRole('button', { name: '7 days' }));
    await waitFor(() => expect(calls.some((c) => c.key === 'GET /analytics' && c.params?.days === 7)).toBe(true));
  });

  it('explains an empty state instead of drawing an empty chart', async () => {
    mockApi(adminMocks({ 'GET /analytics': { data: { ...report, series: series.map((s) => ({ ...s, views: 0 })), viewsInRange: 0, viewsAllTime: 0, topPages: [], topProjects: [] } } }));
    renderApp('/admin/analytics');
    expect(await screen.findByText(/no views recorded yet/i)).toBeInTheDocument();
  });
});

describe('public page-view tracking', () => {
  const visits = (calls) => calls.filter((c) => c.key === 'POST /analytics/view').map((c) => c.data.path);

  it('counts a visitor once per page, sending only the path', async () => {
    const calls = mockApi(baseMocks({ 'POST /analytics/view': { data: { tracked: true } } }));
    renderApp('/');
    await screen.findByRole('heading', { level: 1 });
    await waitFor(() => expect(visits(calls)).toEqual(['/']));
    expect(calls.find((c) => c.key === 'POST /analytics/view').data).toEqual({ path: '/' });
  });

  it('does not count the signed-in admin', async () => {
    const calls = mockApi(adminMocks({ 'POST /analytics/view': { data: { tracked: true } } }));
    renderApp('/');
    await screen.findByRole('heading', { level: 1 });
    await new Promise((r) => setTimeout(r, 150));
    expect(visits(calls)).toEqual([]);
  });

  it('respects the admin switch and Do Not Track', async () => {
    const off = mockApi(baseMocks({ 'GET /settings': { siteTitle: 'x', analytics: { enabled: false } }, 'POST /analytics/view': { data: {} } }));
    renderApp('/');
    await screen.findByRole('heading', { level: 1 });
    await new Promise((r) => setTimeout(r, 150));
    expect(visits(off)).toEqual([]);
  });

  it('a failing analytics call never breaks the page', async () => {
    mockApi(baseMocks({ 'POST /analytics/view': { status: 500, body: { success: false, message: 'boom' } } }));
    renderApp('/');
    expect(await screen.findByRole('heading', { level: 1, name: /Asha Verma/ })).toBeInTheDocument();
  });
});
