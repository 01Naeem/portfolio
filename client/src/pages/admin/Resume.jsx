import { useRef, useState } from 'react';
import { Download, ExternalLink, FileText, Trash2, Upload } from 'lucide-react';
import { useApi, invalidateCache } from '../../hooks/useApi.js';
import { useSite } from '../../context/SiteContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { resumeApi, resumeUrl } from '../../services/endpoints.js';
import { formatDate, formatNumber } from '../../utils/format.js';
import PageHeader from '../../components/admin/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import { ConfirmDialog } from '../../components/ui/Modal.jsx';
import { Card, Skeleton } from '../../components/ui/Primitives.jsx';
import { ErrorState } from '../../components/ui/States.jsx';

const MAX_MB = 5;

export default function Resume() {
  const { data, loading, error, refetch } = useApi('admin:resume', resumeApi.info, { ttl: 0 });
  const site = useSite();
  const toast = useToast();
  const input = useRef(null);
  const [progress, setProgress] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const done = async () => { invalidateCache(); site.refetch(); await refetch(); };

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return toast.error('Please choose a PDF file.');
    if (file.size > MAX_MB * 1024 * 1024) return toast.error(`The PDF is larger than ${MAX_MB} MB.`);
    setProgress(0);
    try {
      await resumeApi.upload(file, setProgress);
      toast.success(data?.available ? 'Resume replaced' : 'Resume uploaded');
      await done();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProgress(null);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await resumeApi.remove();
      toast.success('Resume deleted');
      setConfirm(false);
      await done();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Resume" description="Upload a PDF once and the public site's View and Download buttons use it. Replacing it never needs a code change." />
      {error && !data ? (
        <ErrorState error={error} onRetry={refetch} title="Couldn't load resume info" />
      ) : loading && !data ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <Card>
          {data?.available ? (
            <div className="flex flex-wrap items-center gap-4">
              <span className="grid size-12 place-items-center rounded-xl bg-accent/10 text-accent"><FileText className="size-6" aria-hidden="true" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{data.fileName}</p>
                <p className="text-sm text-muted">Uploaded {formatDate(data.uploadedAt, { day: 'numeric', month: 'short', year: 'numeric' })} · {formatNumber(data.downloadCount)} downloads</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button href={resumeUrl(false)} variant="secondary" size="sm"><ExternalLink className="size-4" aria-hidden="true" /> View</Button>
                <Button href={resumeUrl(true)} variant="secondary" size="sm"><Download className="size-4" aria-hidden="true" /> Download</Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">No resume uploaded yet. Visitors won't see resume buttons until you add one.</p>
          )}

          <div className="mt-6 flex flex-wrap gap-3 border-t border-line pt-5">
            <input ref={input} type="file" accept="application/pdf,.pdf" onChange={onPick} className="sr-only" aria-label="Choose resume PDF" />
            <Button onClick={() => input.current?.click()} loading={progress !== null}>
              <Upload className="size-4" aria-hidden="true" />
              {progress !== null ? `Uploading ${progress}%` : data?.available ? 'Replace resume' : 'Upload resume'}
            </Button>
            {data?.available && (
              <Button variant="ghost" className="hover:!bg-danger/10 hover:!text-danger" onClick={() => setConfirm(true)}>
                <Trash2 className="size-4" aria-hidden="true" /> Delete
              </Button>
            )}
          </div>
          <p className="mt-3 text-xs text-subtle">PDF only, up to {MAX_MB} MB. Admin views of the file don't count as downloads unless you use Download.</p>
        </Card>
      )}
      <ConfirmDialog open={confirm} onClose={() => !busy && setConfirm(false)} onConfirm={remove} loading={busy} title="Delete your resume?" description="The file is removed and the View/Download buttons disappear from the public site until you upload a new one." />
    </div>
  );
}
