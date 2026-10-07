import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { baseMocks, mockApi, renderApp } from './helpers.jsx';

describe('public site', () => {
  it('renders the hero from API data and fetches shared data once', async () => {
    const calls = mockApi(baseMocks());
    renderApp('/');
    expect(await screen.findByRole('heading', { level: 1, name: /Asha Verma/ })).toBeInTheDocument();
    expect(screen.getByText('Building things that last.')).toBeInTheDocument();
    // the hero badge, contact section and recruiter block all state availability now
    expect(screen.getAllByText('Open to Software Engineering Opportunities').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bhopal, India').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /download resume/i })).toHaveAttribute('href', '/api/resume/file?download=1');
    // Navbar, Footer and Home all read the same context: one request each, not one per component
    expect(calls.filter((c) => c.key === 'GET /profile')).toHaveLength(1);
    expect(calls.filter((c) => c.key === 'GET /settings')).toHaveLength(1);
  });

  it('neutralises a javascript: link coming from the database', async () => {
    mockApi(baseMocks());
    renderApp('/');
    const hero = await screen.findByRole('heading', { level: 1 });
    const evil = screen.getAllByRole('link', { name: /evil/i })[0];
    expect(evil).toHaveAttribute('href', '#');
    expect(hero).toBeInTheDocument();
  });

  it('hides the resume button when no resume is uploaded', async () => {
    mockApi(baseMocks({ 'GET /resume': { available: false } }));
    renderApp('/');
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('link', { name: /download resume/i })).not.toBeInTheDocument();
  });

  it('shows an error state with a working retry instead of a blank screen', async () => {
    let fail = true;
    mockApi(baseMocks({ 'GET /profile': () => (fail ? { status: 500, body: { success: false, message: 'Database is down' } } : { data: { name: 'Back Online' } }) }));
    renderApp('/');
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Database is down')).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByRole('heading', { level: 1, name: /Back Online/ })).toBeInTheDocument();
  });

  it('applies the admin-configured accent color', async () => {
    mockApi(baseMocks());
    renderApp('/');
    await screen.findByRole('heading', { level: 1 });
    await waitFor(() => expect(document.documentElement.style.getPropertyValue('--accent-base')).toBe('#10b981'));
  });

  it('toggles theme and remembers it', async () => {
    mockApi(baseMocks());
    renderApp('/');
    await screen.findByRole('heading', { level: 1 });
    await userEvent.click(screen.getByRole('button', { name: /switch to light mode/i }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
    expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeInTheDocument();
  });

  it('shows the 404 page for unknown routes', async () => {
    mockApi(baseMocks());
    renderApp('/definitely-not-a-page');
    expect(await screen.findByRole('heading', { name: /doesn't exist/i })).toBeInTheDocument();
  });

  it('opens and closes the mobile menu', async () => {
    mockApi(baseMocks());
    renderApp('/');
    await screen.findByRole('heading', { level: 1 });
    const btn = screen.getByRole('button', { name: /open menu/i });
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(btn);
    expect(screen.getByRole('button', { name: /close menu/i })).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.getByRole('button', { name: /open menu/i })).toHaveAttribute('aria-expanded', 'false'));
  });
});

describe('admin area', () => {
  it('redirects a logged-out visitor from /admin to the login page', async () => {
    mockApi(baseMocks());
    const { router } = renderApp('/admin');
    expect(await screen.findByRole('heading', { name: /admin sign in/i })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/admin/login');
  });

  it('shows the server message for bad credentials and stays on the form', async () => {
    mockApi(baseMocks({ 'POST /auth/login': { status: 401, body: { success: false, message: 'Invalid email or password' } } }));
    renderApp('/admin/login');
    await userEvent.type(await screen.findByLabelText('Email'), 'me@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /admin sign in/i })).toBeInTheDocument();
  });

  it('validates the form before calling the API', async () => {
    const calls = mockApi(baseMocks());
    renderApp('/admin/login');
    await userEvent.click(await screen.findByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Enter your email')).toBeInTheDocument();
    expect(calls.some((c) => c.key === 'POST /auth/login')).toBe(false);
  });

  it('logs in, lands on the dashboard with real stats, and can log out', async () => {
    let loggedIn = false;
    const calls = mockApi(baseMocks({
      'GET /auth/me': () => (loggedIn ? { data: { id: '1', name: 'Asha', email: 'me@example.com', role: 'admin' } } : { status: 401, body: { success: false, message: 'Authentication required' } }),
      'POST /auth/login': () => { loggedIn = true; return { data: { id: '1', name: 'Asha', email: 'me@example.com', role: 'admin' } }; },
      'GET /admin/stats': { projects: 7, skills: 12, certificates: 3, messages: 5, unreadMessages: 2, experience: 1, education: 1, posts: 4, draftPosts: 1, projectClicks: 99, resumeDownloads: 8 },
      'POST /auth/logout': () => { loggedIn = false; return { message: 'Logged out' }; },
    }));
    const { router } = renderApp('/admin/login');
    await userEvent.type(await screen.findByLabelText('Email'), 'me@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Str0ngPassw0rd!');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(await screen.findByText('99')).toBeInTheDocument(); // project clicks
    expect(screen.getByText('2 unread')).toBeInTheDocument();
    expect(calls.find((c) => c.key === 'POST /auth/login').data).toEqual({ email: 'me@example.com', password: 'Str0ngPassw0rd!' });

    await userEvent.click(screen.getAllByRole('button', { name: /logout/i })[0]);
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/login'));
  });

  it('kicks the admin out when the session expires mid-use', async () => {
    let expired = false;
    mockApi(baseMocks({
      'GET /auth/me': { data: { id: '1', name: 'A', email: 'a@b.co', role: 'admin' } },
      'GET /admin/stats': () => (expired ? { status: 401, body: { success: false, message: 'Authentication required' } } : { data: { projects: 1, messages: 0, unreadMessages: 0, draftPosts: 0 } }),
    }));
    const { router } = renderApp('/admin');
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expired = true;
    window.dispatchEvent(new Event('auth:expired')); // what the axios interceptor emits on a 401
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/login'));
  });
});
