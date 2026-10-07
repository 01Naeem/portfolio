import { AxiosError } from 'axios';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { render } from '@testing-library/react';
import { LazyMotion, MotionConfig, domAnimation } from 'motion/react';
import { api } from '../services/api.js';
import { ThemeProvider } from '../context/ThemeContext.jsx';
import { ToastProvider } from '../context/ToastContext.jsx';
import { SiteProvider } from '../context/SiteContext.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';
import { invalidateCache } from '../hooks/useApi.js';
import { routes } from '../routes/index.jsx';

// Replaces the network layer only (axios adapter), so interceptors, services and hooks all run for real.
// handlers: { 'GET /profile': (config) => ({ status, data }) | object }
export function mockApi(handlers) {
  const calls = [];
  api.defaults.adapter = async (config) => {
    const key = `${config.method.toUpperCase()} ${config.url}`;
    let data;
    if (config.data instanceof FormData) data = Object.fromEntries([...config.data.entries()].map(([k, v]) => [k, v instanceof File ? { file: v.name, type: v.type } : v]));
    else if (config.data) data = JSON.parse(config.data);
    calls.push({ key, data, params: config.params, order: calls.length });
    const h = handlers[key];
    const out = typeof h === 'function' ? h(config) : h;
    const status = out?.status ?? (h ? 200 : 404);
    const body = out?.body ?? (h ? { success: true, data: out?.data ?? out, ...(out?.meta ? { meta: out.meta } : {}) } : { success: false, message: `no mock for ${key}` });
    const response = { data: body, status, statusText: '', headers: {}, config };
    if (status >= 400) throw new AxiosError(body.message, 'ERR_BAD_REQUEST', config, null, response);
    return response;
  };
  return calls;
}

export function renderApp(path = '/') {
  invalidateCache();
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const utils = render(
    <LazyMotion features={domAnimation} strict>
    <MotionConfig reducedMotion="always">
      <ThemeProvider>
        <ToastProvider>
          <SiteProvider>
            <AuthProvider>
              <RouterProvider router={router} />
            </AuthProvider>
          </SiteProvider>
        </ToastProvider>
      </ThemeProvider>
    </MotionConfig>
    </LazyMotion>
  );
  return { router, ...utils };
}

export const profile = {
  name: 'Asha Verma', title: 'Software Engineer / MERN Stack Developer', tagline: 'Building things that last.',
  location: 'Bhopal, India', email: 'asha@example.com',
  availability: { isOpenToWork: true, label: 'Open to Software Engineering Opportunities' },
  socialLinks: [
    { _id: '1', platform: 'github', label: 'GitHub', url: 'https://github.com/asha', order: 0 },
    { _id: '2', platform: 'x', label: 'Evil', url: 'javascript:alert(1)', order: 1 },
  ],
};
export const settings = { siteTitle: 'Asha Verma | Software Engineer', theme: { accentColor: '#10b981', defaultMode: 'dark' }, sections: { showBlog: true } };
export const baseMocks = (over = {}) => ({
  'GET /profile': profile,
  'GET /settings': settings,
  'GET /resume': { available: true, fileName: 'Asha.pdf' },
  // empty by default so tests only care about the sections they exercise
  'GET /skills': [],
  'GET /experience': [],
  'GET /education': [],
  'GET /certificates': [],
  'GET /projects': { data: [] },
  'GET /auth/me': { status: 401, body: { success: false, message: 'Authentication required' } },
  ...over,
});

export const adminUser = { id: '1', name: 'Asha', email: 'me@example.com', role: 'admin' };
export const adminMocks = (over = {}) => baseMocks({ 'GET /auth/me': adminUser, ...over });
