import { createBrowserRouter, useRouteError } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import Home from '../pages/Home.jsx';
import NotFound from '../pages/NotFound.jsx';
import Unauthorized from '../pages/Unauthorized.jsx';
import ProjectDetail from '../pages/ProjectDetail.jsx';
import { ErrorState } from '../components/ui/States.jsx';
import { Spinner } from '../components/ui/Primitives.jsx';

// Shown while a lazy admin route is first being downloaded (avoids a blank flash + router warning)
const fallback = <div className="grid min-h-dvh place-items-center"><Spinner /></div>;

// Admin code is lazy-loaded so visitors never download it.
const lazyPage = (loader) => async () => ({ Component: (await loader()).default });

function RouteError() {
  const error = useRouteError();
  console.error(error);
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <ErrorState error={error instanceof Error ? error : null} title="This page failed to load" onRetry={() => window.location.reload()} />
    </div>
  );
}

export const routes = [
  {
    element: <PublicLayout />,
    errorElement: <RouteError />,
    hydrateFallbackElement: fallback,
    children: [
      { index: true, element: <Home /> },
      { path: 'projects/:slug', element: <ProjectDetail /> },
      { path: 'blog', lazy: lazyPage(() => import('../pages/Blog.jsx')) },
      { path: 'blog/:slug', lazy: lazyPage(() => import('../pages/BlogPost.jsx')) },
      { path: 'unauthorized', element: <Unauthorized /> },
      { path: '*', element: <NotFound /> },
    ],
  },
  { path: '/admin/login', hydrateFallbackElement: fallback, lazy: lazyPage(() => import('../pages/admin/Login.jsx')), errorElement: <RouteError /> },
  {
    path: '/admin',
    element: <ProtectedRoute />,
    hydrateFallbackElement: fallback,
    errorElement: <RouteError />,
    children: [
      {
        lazy: lazyPage(() => import('../layouts/AdminLayout.jsx')),
        children: [
          { index: true, lazy: lazyPage(() => import('../pages/admin/Dashboard.jsx')) },
          { path: 'profile', lazy: lazyPage(() => import('../pages/admin/Profile.jsx')) },
          { path: 'about', lazy: lazyPage(() => import('../pages/admin/About.jsx')) },
          { path: 'skills', lazy: lazyPage(() => import('../pages/admin/Skills.jsx')) },
          { path: 'projects', lazy: lazyPage(() => import('../pages/admin/Projects.jsx')) },
          { path: 'experience', lazy: lazyPage(() => import('../pages/admin/Experience.jsx')) },
          { path: 'education', lazy: lazyPage(() => import('../pages/admin/Education.jsx')) },
          { path: 'certificates', lazy: lazyPage(() => import('../pages/admin/Certificates.jsx')) },
          { path: 'resume', lazy: lazyPage(() => import('../pages/admin/Resume.jsx')) },
          { path: 'social', lazy: lazyPage(() => import('../pages/admin/SocialLinks.jsx')) },
          { path: 'blog', lazy: lazyPage(() => import('../pages/admin/Blog.jsx')) },
          { path: 'messages', lazy: lazyPage(() => import('../pages/admin/Messages.jsx')) },
          { path: 'settings', lazy: lazyPage(() => import('../pages/admin/Settings.jsx')) },
          { path: 'analytics', lazy: lazyPage(() => import('../pages/admin/Analytics.jsx')) },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
