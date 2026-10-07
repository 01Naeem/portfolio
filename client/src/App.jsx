import { RouterProvider } from 'react-router-dom';
import { LazyMotion, MotionConfig, domAnimation } from 'motion/react';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { SiteProvider } from './context/SiteContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { useSite } from './context/SiteContext.jsx';
import { router } from './routes/index.jsx';

// "always" strips movement site-wide when the admin disabled animations; "user" otherwise respects each visitor's OS setting
function MotionRoot({ children }) {
  const { settings } = useSite();
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion={settings?.animations?.enabled === false ? 'always' : 'user'}>{children}</MotionConfig>
    </LazyMotion>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <SiteProvider>
          <MotionRoot>
            <AuthProvider>
              <RouterProvider router={router} />
            </AuthProvider>
          </MotionRoot>
        </SiteProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
