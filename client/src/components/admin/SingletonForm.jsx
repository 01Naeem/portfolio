import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useApi, invalidateCache } from '../../hooks/useApi.js';
import { useSite } from '../../context/SiteContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { profileApi } from '../../services/endpoints.js';
import { toDefaults, toPayload } from '../../utils/formUtils.js';
import Button from '../ui/Button.jsx';
import { Card, Skeleton } from '../ui/Primitives.jsx';
import { ErrorState } from '../ui/States.jsx';
import PageHeader from './PageHeader.jsx';
import { FieldRenderer } from './fields.jsx';
import { UploadTrackerContext, createTracker } from './UploadTracker.jsx';
import { applyServerErrors } from './formErrors.js';
import { useState } from 'react';

// One-document editor (profile, about, social links) driven by the same field config as the tables.
function Inner({ config, doc, onSaved }) {
  const toast = useToast();
  const site = useSite();
  const tracker = useRef(createTracker()).current;
  const [banner, setBanner] = useState([]);
  const { register, control, handleSubmit, setError, reset, formState: { errors, isSubmitting, isDirty } } = useForm({ defaultValues: toDefaults(config.fields, doc) });

  // leaving the page with uploads that were never saved: remove them from Cloudinary
  useEffect(() => () => tracker.cleanup(), [tracker]);

  const submit = async (values) => {
    setBanner([]);
    try {
      const { data } = await (config.api || profileApi).update(toPayload(config.fields, values));
      tracker.clear();
      invalidateCache();
      site.refetch(); // public pages/navbar pick the change up immediately
      reset(toDefaults(config.fields, data));
      toast.success('Changes saved');
      onSaved?.(data);
    } catch (err) {
      const unplaced = applyServerErrors(err, setError, config.fields);
      setBanner(unplaced.length ? unplaced : [err.message]);
      toast.error(err.details?.length ? 'Please fix the highlighted fields.' : err.message);
    }
  };

  return (
    <UploadTrackerContext.Provider value={tracker}>
      <form onSubmit={handleSubmit(submit)} noValidate>
        {banner.length > 0 && (
          <ul role="alert" className="mb-4 space-y-1 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
            {banner.map((b) => <li key={b}>{b}</li>)}
          </ul>
        )}
        <Card className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          {config.fields.map((f) => <FieldRenderer key={f.name} field={f} control={control} register={register} errors={errors} />)}
        </Card>
        <div className="sticky bottom-0 -mx-4 mt-6 flex items-center justify-end gap-3 border-t border-line bg-bg/90 px-4 py-4 backdrop-blur sm:-mx-8 sm:px-8">
          {isDirty && <span className="mr-auto text-sm text-muted">Unsaved changes</span>}
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>Save changes</Button>
        </div>
      </form>
    </UploadTrackerContext.Provider>
  );
}

export default function SingletonForm({ config }) {
  const { data, loading, error, refetch } = useApi(config.cacheKey || 'admin:profile', (config.api || profileApi).get, { ttl: 0 });
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={config.title} description={config.description} />
      {error && !data ? (
        <ErrorState error={error} onRetry={refetch} title="Couldn't load this section" />
      ) : loading && !data ? (
        <div className="space-y-4" aria-busy="true">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : (
        <Inner config={config} doc={data} />
      )}
    </div>
  );
}
