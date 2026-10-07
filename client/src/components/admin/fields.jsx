import { useRef, useState } from 'react';
import { Controller, useFieldArray } from 'react-hook-form';
import { ImagePlus, Plus, Trash2, X } from 'lucide-react';
import { uploadsApi } from '../../services/endpoints.js';
import { useToast } from '../../context/ToastContext.jsx';
import { getPath } from '../../utils/formUtils.js';
import { cn } from '../../utils/cn.js';
import Button from '../ui/Button.jsx';
import { useUploadTracker } from './UploadTracker.jsx';

export const inputClass =
  'w-full rounded-xl border border-line bg-bg px-3.5 text-sm outline-none transition-colors placeholder:text-subtle focus:border-accent aria-[invalid=true]:border-danger';
const MAX_MB = 5;

export function Field({ id, label, error, hint, required, className, children }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-danger" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="mt-1.5 text-xs text-subtle">{hint}</p>}
      {error && <p id={`${id}-err`} role="alert" className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
}

export function TagInput({ id, value = [], onChange, placeholder = 'Type and press Enter' }) {
  const [draft, setDraft] = useState('');
  const add = (raw) => {
    const items = raw.split(',').map((s) => s.trim()).filter(Boolean);
    if (!items.length) return;
    onChange([...value, ...items.filter((t) => !value.some((v) => v.toLowerCase() === t.toLowerCase()))]);
    setDraft('');
  };
  return (
    <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-line bg-bg px-2.5 py-2 focus-within:border-accent">
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-lg bg-raised py-1 pl-2.5 pr-1 text-xs">
          {t}
          <button type="button" onClick={() => onChange(value.filter((v) => v !== t))} aria-label={`Remove ${t}`} className="grid size-4 place-items-center rounded text-muted hover:bg-danger/20 hover:text-danger">
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        placeholder={value.length ? '' : placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(draft); }
          else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={() => add(draft)}
        className="min-w-[8rem] flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-subtle"
      />
    </div>
  );
}

// Uploads go straight to Cloudinary via the API; the form stores { url, publicId, alt }.
function useImageUpload(folder) {
  const tracker = useUploadTracker();
  const toast = useToast();
  const [progress, setProgress] = useState(null);

  const upload = async (file, previous) => {
    if (file.size > MAX_MB * 1024 * 1024) { toast.error(`"${file.name}" is larger than ${MAX_MB} MB.`); return null; }
    setProgress(0);
    try {
      const { data } = await uploadsApi.image(file, folder, setProgress);
      // replacing an image uploaded earlier in this same edit: that one is now garbage
      if (previous?.publicId && tracker.has(previous.publicId)) { uploadsApi.remove(previous.publicId).catch(() => {}); tracker.discard(previous.publicId); }
      tracker.add(data.publicId);
      return { url: data.url, publicId: data.publicId, alt: previous?.alt || '' };
    } catch (err) {
      toast.error(err.message);
      return null;
    } finally {
      setProgress(null);
    }
  };
  const discard = (img) => {
    if (img?.publicId && tracker.has(img.publicId)) { uploadsApi.remove(img.publicId).catch(() => {}); tracker.discard(img.publicId); }
  };
  return { upload, discard, progress };
}

function ImagePreview({ image, onAlt, onRemove, altId }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-line bg-bg p-2.5">
      <img src={image.url} alt={image.alt || 'Image preview'} className="size-16 shrink-0 rounded-lg object-cover" loading="lazy" />
      <div className="min-w-0 flex-1">
        <label htmlFor={altId} className="sr-only">Alt text</label>
        <input id={altId} value={image.alt || ''} onChange={(e) => onAlt(e.target.value)} placeholder="Alt text (describe the image)" maxLength={200} className={cn(inputClass, 'h-9')} />
      </div>
      <button type="button" onClick={onRemove} aria-label="Remove image" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger">
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

export function ImageField({ id, value, onChange, folder = 'misc' }) {
  const { upload, discard, progress } = useImageUpload(folder);
  const input = useRef(null);
  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const img = await upload(file, value);
    if (img) onChange(img);
  };
  return (
    <div className="space-y-2">
      {value?.url && <ImagePreview image={value} altId={`${id}-alt`} onAlt={(alt) => onChange({ ...value, alt })} onRemove={() => { discard(value); onChange(null); }} />}
      <input ref={input} id={id} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={pick} className="sr-only" />
      <Button type="button" variant="secondary" size="sm" loading={progress !== null} onClick={() => input.current?.click()}>
        <ImagePlus className="size-4" aria-hidden="true" />
        {progress !== null ? `Uploading ${progress}%` : value?.url ? 'Replace image' : 'Upload image'}
      </Button>
    </div>
  );
}

export function ImagesField({ id, value = [], onChange, folder = 'misc', max = 12 }) {
  const { upload, discard, progress } = useImageUpload(folder);
  const input = useRef(null);
  const pick = async (e) => {
    const files = [...(e.target.files || [])].slice(0, max - value.length);
    e.target.value = '';
    let next = value;
    for (const file of files) {
      const img = await upload(file); // sequential: keeps order and avoids hammering the API
      if (img) { next = [...next, img]; onChange(next); }
    }
  };
  return (
    <div className="space-y-2">
      {value.map((img, i) => (
        <ImagePreview
          key={img.publicId || img.url}
          image={img}
          altId={`${id}-alt-${i}`}
          onAlt={(alt) => onChange(value.map((x, j) => (j === i ? { ...x, alt } : x)))}
          onRemove={() => { discard(img); onChange(value.filter((_, j) => j !== i)); }}
        />
      ))}
      <input ref={input} id={id} type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" onChange={pick} className="sr-only" />
      <Button type="button" variant="secondary" size="sm" disabled={value.length >= max} loading={progress !== null} onClick={() => input.current?.click()}>
        <ImagePlus className="size-4" aria-hidden="true" />
        {progress !== null ? `Uploading ${progress}%` : `Add images (${value.length}/${max})`}
      </Button>
    </div>
  );
}

const PLATFORMS = ['github', 'linkedin', 'twitter', 'instagram', 'email', 'website', 'other'];

export function LinksField({ name, control, register }) {
  const { fields, append, remove } = useFieldArray({ control, name });
  return (
    <div className="space-y-3">
      {fields.map((f, i) => (
        <div key={f.id} className="grid gap-2 rounded-xl border border-line bg-bg p-3 sm:grid-cols-[9rem_1fr_1fr_auto]">
          <select aria-label="Platform" className={cn(inputClass, 'h-10')} {...register(`${name}.${i}.platform`)}>
            {PLATFORMS.map((p) => <option key={p} value={p}>{p === 'twitter' ? 'X / Twitter' : p[0].toUpperCase() + p.slice(1)}</option>)}
          </select>
          <input aria-label="Label (optional)" placeholder="Label (optional)" className={cn(inputClass, 'h-10')} {...register(`${name}.${i}.label`)} />
          <input aria-label="URL" placeholder="https://… or you@email.com" className={cn(inputClass, 'h-10')} {...register(`${name}.${i}.url`)} />
          <button type="button" onClick={() => remove(i)} aria-label="Remove link" className="grid size-10 place-items-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger">
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" onClick={() => append({ platform: 'github', label: '', url: '' })}>
        <Plus className="size-4" aria-hidden="true" /> Add link
      </Button>
    </div>
  );
}

const WIDE = new Set(['textarea', 'tags', 'lines', 'image', 'images', 'links', 'multiselect']);

export function FieldRenderer({ field, control, register, errors }) {
  if (field.type === 'heading') {
    return (
      <div className="sm:col-span-2 [&:not(:first-child)]:mt-4">
        <h2 className="border-b border-line pb-2 font-display text-base font-bold">{field.label}</h2>
        {field.hint && <p className="mt-1.5 text-xs text-subtle">{field.hint}</p>}
      </div>
    );
  }
  const { name, label, type = 'text', required, hint, options = [], placeholder, rows = 4, folder } = field;
  const id = `f-${name.replace(/\./g, '-')}`;
  const err = getPath(errors, name);
  const error = err?.message;
  const a11y = { id, 'aria-invalid': error ? 'true' : 'false', 'aria-describedby': error ? `${id}-err` : hint ? `${id}-hint` : undefined };
  const rules = required ? { required: `${label} is required` } : {};
  const wrap = (child) => (
    <Field id={id} label={label} error={error} hint={hint} required={required} className={cn((WIDE.has(type) || field.full) && 'sm:col-span-2')}>
      {child}
    </Field>
  );

  switch (type) {
    case 'textarea':
    case 'lines':
      return wrap(<textarea rows={rows} placeholder={placeholder} className={cn(inputClass, 'py-2.5 leading-relaxed')} {...a11y} {...register(name, rules)} />);
    case 'select':
      return wrap(
        <select className={cn(inputClass, 'h-11')} {...a11y} {...register(name, rules)}>
          {options.map((o) => { const opt = typeof o === 'string' ? { value: o, label: o } : o; return <option key={opt.value} value={opt.value}>{opt.label}</option>; })}
        </select>
      );
    case 'number':
      return wrap(<input type="number" step={field.step || 'any'} min={field.min} max={field.max} placeholder={placeholder} className={cn(inputClass, 'h-11')} {...a11y} {...register(name, rules)} />);
    case 'color':
      return wrap(<input type="color" className="h-11 w-20 cursor-pointer rounded-xl border border-line bg-bg p-1" {...a11y} {...register(name, rules)} />);
    case 'date':
      return wrap(<input type="date" className={cn(inputClass, 'h-11')} {...a11y} {...register(name, rules)} />);
    case 'checkbox':
      return (
        <div className="flex items-start gap-3 sm:col-span-1">
          <input type="checkbox" className="mt-0.5 size-4.5 accent-[var(--accent)]" {...a11y} {...register(name)} />
          <div className="text-sm">
            <label htmlFor={id} className="font-medium">{label}</label>
            {hint && <p id={`${id}-hint`} className="mt-0.5 text-xs text-subtle">{hint}</p>}
          </div>
        </div>
      );
    case 'tags':
      return wrap(<Controller name={name} control={control} render={({ field: f }) => <TagInput id={id} value={f.value} onChange={f.onChange} placeholder={placeholder} />} />);
    case 'multiselect':
      return wrap(
        <Controller name={name} control={control} render={({ field: f }) => (
          <div role="group" aria-label={label} className="flex flex-wrap gap-2">
            {options.map((o) => {
              const on = f.value?.includes(o);
              return (
                <button key={o} type="button" aria-pressed={on} onClick={() => f.onChange(on ? f.value.filter((x) => x !== o) : [...(f.value || []), o])}
                  className={cn('rounded-lg border px-3 py-1.5 text-sm transition-colors', on ? 'border-accent bg-accent/10 text-accent' : 'border-line text-muted hover:text-fg')}>
                  {o}
                </button>
              );
            })}
          </div>
        )} />
      );
    case 'image':
      return wrap(<Controller name={name} control={control} render={({ field: f }) => <ImageField id={id} value={f.value} onChange={f.onChange} folder={folder} />} />);
    case 'images':
      return wrap(<Controller name={name} control={control} render={({ field: f }) => <ImagesField id={id} value={f.value} onChange={f.onChange} folder={folder} />} />);
    case 'links':
      return wrap(<LinksField name={name} control={control} register={register} />);
    default:
      return wrap(<input type={type === 'email' ? 'email' : 'text'} placeholder={placeholder} className={cn(inputClass, 'h-11')} {...a11y} {...register(name, rules)} />);
  }
}
