import { useState } from 'react';
import { CheckCheck, Eye, MailOpen, Mail as MailIcon, Reply, Search, Trash2 } from 'lucide-react';
import { useApi, invalidateCache } from '../../hooks/useApi.js';
import { useDebounced } from '../../hooks/useDebounced.js';
import { useToast } from '../../context/ToastContext.jsx';
import { messagesApi } from '../../services/endpoints.js';
import { formatDate } from '../../utils/format.js';
import { safeUrl } from '../../utils/safeUrl.js';
import { cn } from '../../utils/cn.js';
import PageHeader from '../../components/admin/PageHeader.jsx';
import DataTable from '../../components/admin/DataTable.jsx';
import { inputClass } from '../../components/admin/fields.jsx';
import Button from '../../components/ui/Button.jsx';
import { ConfirmDialog, Modal } from '../../components/ui/Modal.jsx';
import { EmptyState, ErrorState } from '../../components/ui/States.jsx';

const TABS = [{ id: '', label: 'All' }, { id: 'unread', label: 'Unread' }, { id: 'read', label: 'Read' }];
const when = (d) => formatDate(d, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function Messages() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const dq = useDebounced(q.trim(), 300);
  const params = { ...(status ? { status } : {}), ...(dq ? { q: dq } : {}), page, limit: 15 };
  const { data, meta, loading, error, refetch } = useApi(`admin:messages:${JSON.stringify(params)}`, () => messagesApi.list(params), { ttl: 0 });

  const [open, setOpen] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  const rows = data || [];
  const unread = meta?.unread ?? 0;
  const refresh = async () => { invalidateCache(); await refetch(); };

  const setRead = async (m, read) => {
    try {
      await messagesApi.setRead(m._id, read);
      setOpen((o) => (o?._id === m._id ? { ...o, read } : o));
      await refresh();
    } catch (err) { toast.error(err.message); }
  };

  // Opening a message marks it read, like any inbox
  const openMessage = (m) => {
    setOpen(m);
    if (!m.read) setRead(m, true);
  };

  const markAll = async () => {
    try { await messagesApi.markAllRead(); toast.success('All messages marked as read'); await refresh(); }
    catch (err) { toast.error(err.message); }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await messagesApi.remove(toDelete._id);
      toast.success('Message deleted');
      if (open?._id === toDelete._id) setOpen(null);
      setToDelete(null);
      await refresh();
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  const iconBtn = 'grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-fg';
  const columns = [
    { header: 'Sender', render: (m) => (
      <div className="min-w-0">
        <p className={cn('truncate', !m.read && 'font-semibold')}>{!m.read && <span className="mr-2 inline-block size-2 rounded-full bg-accent align-middle" aria-label="Unread" />}{m.name}</p>
        <p className="truncate text-xs text-muted">{m.email}</p>
      </div>
    ) },
    { header: 'Subject', render: (m) => (
      <button onClick={() => openMessage(m)} className="block max-w-xs text-left hover:text-accent">
        <span className={cn('block truncate', !m.read && 'font-semibold')}>{m.subject}</span>
        <span className="block truncate text-xs text-muted">{m.message}</span>
      </button>
    ) },
    { header: 'Received', render: (m) => <span className="whitespace-nowrap text-muted">{when(m.createdAt)}</span> },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Messages"
        description="Messages sent through your contact form."
        action={unread > 0 && <Button variant="secondary" onClick={markAll}><CheckCheck className="size-4" aria-hidden="true" /> Mark all as read</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Filter messages" className="inline-flex rounded-xl border border-line bg-surface p-1">
          {TABS.map((t) => (
            <button key={t.id} aria-pressed={status === t.id} onClick={() => { setStatus(t.id); setPage(1); }}
              className={cn('rounded-lg px-3.5 py-1.5 text-sm transition-colors', status === t.id ? 'bg-accent/10 font-medium text-accent' : 'text-muted hover:text-fg')}>
              {t.label}{t.id === 'unread' && unread > 0 ? ` (${unread})` : ''}
            </button>
          ))}
        </div>
        <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
          <input aria-label="Search messages" placeholder="Search…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className={`${inputClass} h-10 pl-9`} />
        </div>
      </div>

      {error && !data ? (
        <ErrorState error={error} onRetry={refetch} title="Couldn't load messages" />
      ) : !loading && rows.length === 0 ? (
        <EmptyState icon={MailOpen} title={status || dq ? 'No messages match' : 'No messages yet'} description={status || dq ? 'Try a different filter or search.' : 'When someone uses your contact form, their message shows up here and in your email.'} />
      ) : (
        <>
          <DataTable caption="Messages" columns={columns} rows={rows} loading={loading && !data}
            actions={(m) => (
              <>
                <button className={iconBtn} aria-label={`Open message from ${m.name}`} onClick={() => openMessage(m)}><Eye className="size-4" /></button>
                <button className={iconBtn} aria-label={m.read ? `Mark message from ${m.name} as unread` : `Mark message from ${m.name} as read`} onClick={() => setRead(m, !m.read)}>
                  {m.read ? <MailIcon className="size-4" /> : <MailOpen className="size-4" />}
                </button>
                <button className={`${iconBtn} hover:!bg-danger/10 hover:!text-danger`} aria-label={`Delete message from ${m.name}`} onClick={() => setToDelete(m)}><Trash2 className="size-4" /></button>
              </>
            )} />
          {meta?.pages > 1 && (
            <nav aria-label="Pagination" className="mt-5 flex items-center justify-between text-sm text-muted">
              <span>Page {meta.page} of {meta.pages} · {meta.total} messages</span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={meta.page <= 1} onClick={() => setPage(meta.page - 1)}>Previous</Button>
                <Button variant="secondary" size="sm" disabled={meta.page >= meta.pages} onClick={() => setPage(meta.page + 1)}>Next</Button>
              </div>
            </nav>
          )}
        </>
      )}

      <Modal open={Boolean(open)} onClose={() => setOpen(null)} title={open?.subject || 'Message'} size="lg">
        {open && (
          <div>
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
              <dt className="text-muted">From</dt><dd className="font-medium">{open.name}</dd>
              <dt className="text-muted">Email</dt><dd><a className="text-accent hover:underline" href={safeUrl(`mailto:${open.email}`)}>{open.email}</a></dd>
              <dt className="text-muted">Received</dt><dd>{when(open.createdAt)}</dd>
            </dl>
            {/* whitespace-pre-wrap + React escaping: visitors' text is shown verbatim, never as HTML */}
            <p className="mt-5 whitespace-pre-wrap break-words rounded-xl border border-line bg-bg p-4 text-sm leading-relaxed">{open.message}</p>
            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-line pt-5">
              <Button variant="ghost" className="mr-auto hover:!bg-danger/10 hover:!text-danger" onClick={() => setToDelete(open)}><Trash2 className="size-4" aria-hidden="true" /> Delete</Button>
              <Button variant="secondary" onClick={() => setRead(open, !open.read)}>{open.read ? 'Mark as unread' : 'Mark as read'}</Button>
              <Button href={`mailto:${open.email}?subject=${encodeURIComponent(`Re: ${open.subject}`)}`}><Reply className="size-4" aria-hidden="true" /> Reply by email</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={Boolean(toDelete)} onClose={() => !busy && setToDelete(null)} onConfirm={confirmDelete} loading={busy}
        title="Delete this message?" description={`The message from ${toDelete?.name ?? ''} will be permanently removed. This can't be undone.`} />
    </div>
  );
}
