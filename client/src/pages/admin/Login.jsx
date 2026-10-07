import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { m } from 'motion/react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import Seo from '../../components/Seo.jsx';
import Button from '../../components/ui/Button.jsx';
import ThemeToggle from '../../components/layout/ThemeToggle.jsx';

const field =
  'h-11 w-full rounded-xl border border-line bg-bg px-3.5 text-sm outline-none transition-colors placeholder:text-subtle focus:border-accent aria-[invalid=true]:border-danger';

export default function Login() {
  const { user, isAdmin, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [show, setShow] = useState(false);
  const [formError, setFormError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ defaultValues: { email: '', password: '' } });

  const dest = location.state?.from?.startsWith('/admin') ? location.state.from : '/admin';
  if (user && isAdmin) return <Navigate to={dest} replace />;

  const onSubmit = async ({ email, password }) => {
    setFormError('');
    try {
      await login(email.trim(), password);
      navigate(dest, { replace: true });
    } catch (err) {
      // Server messages are deliberately generic ("Invalid email or password") or a lockout / rate-limit notice
      setFormError(err.message);
    }
  };

  return (
    <main className="relative grid min-h-dvh place-items-center px-5">
      <Seo title="Admin sign in" noindex />
      <ThemeToggle className="absolute right-4 top-4" />
      <m.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm rounded-2xl border border-line bg-surface p-7 shadow-xl shadow-black/5"
      >
        <div className="mb-6 grid size-11 place-items-center rounded-xl bg-accent/10 text-accent"><Lock className="size-5" aria-hidden="true" /></div>
        <h1 className="text-2xl font-bold">Admin sign in</h1>
        <p className="mt-1 text-sm text-muted">Manage your portfolio content.</p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-4">
          {formError && (
            <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{formError}</p>
          )}
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">Email</label>
            <input
              id="email" type="email" autoComplete="username" className={field} placeholder="you@example.com"
              aria-invalid={errors.email ? 'true' : 'false'} aria-describedby={errors.email ? 'email-err' : undefined}
              {...register('email', { required: 'Enter your email', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' } })}
            />
            {errors.email && <p id="email-err" className="mt-1.5 text-xs text-danger">{errors.email.message}</p>}
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium">Password</label>
            <div className="relative">
              <input
                id="password" type={show ? 'text' : 'password'} autoComplete="current-password" className={`${field} pr-11`}
                aria-invalid={errors.password ? 'true' : 'false'} aria-describedby={errors.password ? 'pw-err' : undefined}
                {...register('password', { required: 'Enter your password' })}
              />
              <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}
                className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-lg text-muted hover:bg-raised hover:text-fg">
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.password && <p id="pw-err" className="mt-1.5 text-xs text-danger">{errors.password.message}</p>}
          </div>
          <Button type="submit" className="w-full" loading={isSubmitting}>Sign in</Button>
        </form>
      </m.div>
    </main>
  );
}
