import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn.js';
import { isExternal, safeUrl } from '../../utils/safeUrl.js';

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap select-none ' +
  'transition-[transform,background-color,border-color,color,box-shadow] duration-200 ease-out-soft ' +
  'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50';

const variants = {
  primary: 'bg-accent text-accent-fg hover:brightness-110 hover:-translate-y-px shadow-sm',
  secondary: 'border border-line bg-surface text-fg hover:border-accent/60 hover:-translate-y-px',
  ghost: 'text-muted hover:text-fg hover:bg-raised',
  danger: 'bg-danger text-white hover:brightness-110',
};
const sizes = { sm: 'h-9 px-3.5 text-sm', md: 'h-11 px-5 text-sm', lg: 'h-12 px-6 text-base' };

// Renders a router <Link> (to), an <a> (href) or a <button>, with one consistent look.
export default function Button({ variant = 'primary', size = 'md', loading = false, to, href, className, children, disabled, type = 'button', ...rest }) {
  const cls = cn(base, variants[variant], sizes[size], className);
  const content = (
    <>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </>
  );
  if (to) return <Link to={to} className={cls} {...rest}>{content}</Link>;
  if (href) {
    const external = isExternal(href);
    return (
      <a href={safeUrl(href)} className={cls} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} {...rest}>
        {content}
      </a>
    );
  }
  return (
    <button type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {content}
    </button>
  );
}
