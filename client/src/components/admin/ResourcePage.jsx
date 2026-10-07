import { useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ArrowDown, ArrowUp, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { adminCrud } from '../../services/endpoints.js';
import { useApi, invalidateCache } from '../../hooks/useApi.js';
import { useToast } from '../../context/ToastContext.jsx';
import { toDefaults, toPayload } from '../../utils/formUtils.js';
import Button from '../ui/Button.jsx';
import { ConfirmDialog, Modal } from '../ui/Modal.jsx';
import { EmptyState, ErrorState } from '../ui/States.jsx';
import PageHeader from './PageHeader.jsx';
import DataTable from './DataTable.jsx';
import { FieldRenderer, inputClass } from './fields.jsx';
import { UploadTrackerContext, createTracker } from './UploadTracker.jsx';
import { applyServerErrors } from './formErrors.js';

const PAGE_SIZE = 10;

function ResourceForm({ config, doc, crud, onSaved, onCancel }) {
  const toast = useToast();
  const [banner, setBanner] = useState([]);
  const { register, control, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({ defaultValues: toDefaults(config.fields, doc || config.defaults) });

  const submit = async (values) => {
    setBanner([]);
    const payload = toPayload(config.fields, values);
    try {
      if (doc) await crud.update(doc._id, payload);
      else await crud.create(payload);
      toast.success(`${config.singular} ${doc ? 'updated' : 'created'}`);
      onSaved();
    } catch (err) {
      const unplaced = applyServerErrors(err, setError, config.fields);
      setBanner(unplaced.length ? unplaced : [err.message]);
      toast.error(err.details?.length ? 'Please fix the highlighted fields.' : err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      {banner.length > 0 && (
        <ul role="alert" className="mb-4 space-y-1 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
          {banner.map((b) => <li key={b}>{b}</li>)}
        </ul>
      )}
      <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
        {config.fields.map((f) => <FieldRenderer key={f.name} field={f} control={control} register={register} errors={errors} />)}
      </div>
      <div className="mt-7 flex justify-end gap-3 border-t border-line pt-5">
        <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" loading={isSubmitting}>{doc ? 'Save changes' : `Add ${config.singular.toLowerCase()}`}</Button>
      </div>
    </form>
  );
}

export default function ResourcePage({ config }) {
  const crud = useMemo(() => adminCrud(config.endpoint, { getPath: config.getPath }), [config.endpoint, config.getPath]);
  const toast = useToast();
  const { data, loading, error, refetch } = useApi(`admin:${config.key}`, () => crud.list(config.listParams), { ttl: 0 });
  const tracker = useRef(createTracker()).current;

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState(null); // { doc } | { doc: null } for new
  const [opening, setOpening] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  const rows = data || [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) =>
      (!filter || r[config.filter.field] === filter || r[config.filter.field]?.includes?.(filter)) &&
      (!q || config.searchKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(q)))
    );
  }, [rows, query, filter, config]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const canReorder = config.reorder && !query && !filter;

  const refresh = async () => { invalidateCache(); await refetch(); };

  // Always load the full document: list endpoints omit heavy fields, and it avoids editing stale data
  const openEditor = async (row) => {
    if (!row) return setEditor({ doc: null });
    setOpening(row._id);
    try {
      const { data: doc } = await crud.get(row._id);
      setEditor({ doc });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setOpening(null);
    }
  };
  const closeEditor = () => { tracker.cleanup(); setEditor(null); }; // drops uploads that were never saved
  const saved = async () => { tracker.clear(); setEditor(null); await refresh(); };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await crud.remove(toDelete._id);
      toast.success(`${config.singular} deleted`);
      setToDelete(null);
      await refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const move = async (row, dir) => {
    const ids = rows.map((r) => r._id);
    const i = ids.indexOf(row._id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try {
      await crud.reorder(ids);
      await refresh();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const iconBtn = 'grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-fg disabled:opacity-30 disabled:pointer-events-none';
  const actions = (r) => (
    <>
      {config.rowActions?.(r, { refresh, toast })}
      {canReorder && (
        <>
          <button className={iconBtn} aria-label={`Move ${r[config.titleKey]} up`} disabled={rows[0]?._id === r._id} onClick={() => move(r, -1)}><ArrowUp className="size-4" /></button>
          <button className={iconBtn} aria-label={`Move ${r[config.titleKey]} down`} disabled={rows.at(-1)?._id === r._id} onClick={() => move(r, 1)}><ArrowDown className="size-4" /></button>
        </>
      )}
      <button className={iconBtn} aria-label={`Edit ${r[config.titleKey]}`} disabled={opening === r._id} onClick={() => openEditor(r)}><Pencil className="size-4" /></button>
      <button className={`${iconBtn} hover:!bg-danger/10 hover:!text-danger`} aria-label={`Delete ${r[config.titleKey]}`} onClick={() => setToDelete(r)}><Trash2 className="size-4" /></button>
    </>
  );

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={config.title}
        description={config.description}
        action={<Button onClick={() => openEditor(null)}><Plus className="size-4" aria-hidden="true" /> Add {config.singular.toLowerCase()}</Button>}
      />

      {error && !data ? (
        <ErrorState error={error} onRetry={refetch} title={`Couldn't load ${config.title.toLowerCase()}`} />
      ) : !loading && rows.length === 0 ? (
        <EmptyState title={`No ${config.title.toLowerCase()} yet`} description={config.emptyHint} action={<Button onClick={() => openEditor(null)}><Plus className="size-4" aria-hidden="true" /> Add your first {config.singular.toLowerCase()}</Button>} />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden="true" />
              <input aria-label={`Search ${config.title.toLowerCase()}`} placeholder="Search…" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} className={`${inputClass} h-10 pl-9`} />
            </div>
            {config.filter && (
              <select aria-label={`Filter by ${config.filter.label}`} value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }} className={`${inputClass} h-10 w-auto`}>
                <option value="">All {config.filter.label}</option>
                {config.filter.options.map((o) => <option key={o}>{o}</option>)}
              </select>
            )}
          </div>

          <DataTable caption={config.title} columns={config.columns} rows={visible} loading={loading && !data} actions={actions} />

          {filtered.length === 0 && !loading && <p className="mt-6 text-center text-sm text-muted">Nothing matches your search.</p>}
          {config.footnote && <p className="mt-3 text-xs text-subtle">{config.footnote}</p>}

          {pages > 1 && (
            <nav aria-label="Pagination" className="mt-5 flex items-center justify-between text-sm text-muted">
              <span>Page {current} of {pages} · {filtered.length} items</span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={current === 1} onClick={() => setPage(current - 1)}>Previous</Button>
                <Button variant="secondary" size="sm" disabled={current === pages} onClick={() => setPage(current + 1)}>Next</Button>
              </div>
            </nav>
          )}
        </>
      )}

      <Modal open={Boolean(editor)} onClose={closeEditor} title={`${editor?.doc ? 'Edit' : 'Add'} ${config.singular.toLowerCase()}`} size="lg">
        {editor && (
          <UploadTrackerContext.Provider value={tracker}>
            <ResourceForm config={config} doc={editor.doc} crud={crud} onSaved={saved} onCancel={closeEditor} />
          </UploadTrackerContext.Provider>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => !busy && setToDelete(null)}
        onConfirm={confirmDelete}
        loading={busy}
        title={`Delete this ${config.singular.toLowerCase()}?`}
        description={`"${toDelete?.[config.titleKey] ?? ''}" will be permanently removed${config.deleteNote ? `, ${config.deleteNote}` : ''}. This can't be undone.`}
      />
    </div>
  );
}
