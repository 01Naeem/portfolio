// Converts between API documents and react-hook-form values, driven by a field config.
export const getPath = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);
export const setPath = (o, p, v) => {
  const keys = p.split('.');
  let cur = o;
  keys.slice(0, -1).forEach((k) => {
    cur[k] ??= {};
    cur = cur[k];
  });
  cur[keys.at(-1)] = v;
  return o;
};

const toDateInput = (v) => (v ? new Date(v).toISOString().slice(0, 10) : '');
const cleanImage = (i) => (i?.url ? { url: i.url, ...(i.publicId ? { publicId: i.publicId } : {}), alt: i.alt || '' } : null);

export function toDefaults(fields, doc = {}) {
  const out = {};
  for (const f of fields) {
    if (f.type === 'heading') continue;
    const raw = getPath(doc, f.name);
    let v;
    switch (f.type) {
      case 'checkbox': v = raw ?? f.default ?? false; break;
      case 'tags': case 'multiselect': case 'images': case 'links': v = raw ?? []; break;
      case 'image': v = raw ?? null; break;
      case 'lines': v = (raw ?? []).join('\n'); break;
      case 'date': v = toDateInput(raw); break;
      case 'number': v = raw ?? ''; break;
      default: v = raw ?? f.default ?? '';
    }
    setPath(out, f.name, v);
  }
  return out;
}

const normalizeLink = ({ platform, url }) => {
  const u = url.trim();
  if (platform === 'email' && u && !/^mailto:/i.test(u)) return `mailto:${u}`;
  if (platform !== 'email' && u && !/^[a-z][a-z0-9+.-]*:/i.test(u)) return `https://${u}`;
  return u;
};

export function toPayload(fields, values) {
  const payload = {};
  for (const f of fields) {
    if (f.type === 'heading') continue;
    const v = getPath(values, f.name);
    let out;
    switch (f.type) {
      case 'number': out = v === '' || v == null ? (f.nullable ? null : undefined) : Number(v); break;
      case 'date': out = v || null; break;
      case 'checkbox': out = Boolean(v); break;
      case 'tags': case 'multiselect': out = v || []; break;
      case 'lines': out = (v || '').split('\n').map((s) => s.trim()).filter(Boolean); break;
      case 'image': out = cleanImage(v); break;
      case 'images': out = (v || []).map(cleanImage).filter(Boolean); break;
      case 'links':
        out = (v || [])
          .filter((l) => l.url?.trim())
          .map((l, i) => ({ platform: l.platform || 'website', ...(l.label?.trim() ? { label: l.label.trim() } : {}), url: normalizeLink(l), order: i }));
        break;
      default: out = typeof v === 'string' ? v.trim() : v;
        if (f.omitEmpty && out === '') out = undefined;
    }
    if (out !== undefined) setPath(payload, f.name, out);
  }
  return payload;
}
