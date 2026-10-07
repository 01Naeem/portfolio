import { AlertTriangle, Inbox } from 'lucide-react';
import Button from './Button.jsx';
import { cn } from '../../utils/cn.js';

// Every data-driven view uses these so a failed or empty API call never leaves a blank screen.
export function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center rounded-card border border-dashed border-line px-6 py-14 text-center', className)}>
      <Icon className="mb-3 size-8 text-subtle" aria-hidden="true" />
      <p className="font-display text-lg font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = "Couldn't load this", className }) {
  return (
    <div role="alert" className={cn('flex flex-col items-center rounded-card border border-danger/30 bg-danger/5 px-6 py-12 text-center', className)}>
      <AlertTriangle className="mb-3 size-8 text-danger" aria-hidden="true" />
      <p className="font-display text-lg font-semibold">{title}</p>
      <p className="mt-1 max-w-md text-sm text-muted">{error?.message || 'Something went wrong. Please try again.'}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
