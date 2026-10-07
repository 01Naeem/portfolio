import { getPath } from '../../utils/formUtils.js';

// Server validation errors look like [{ field: 'startDate', message }]. Put each message under its input
// when we have one; anything we can't place (e.g. "coverImage.url") is returned for a summary banner.
export function applyServerErrors(err, setError, fields) {
  const names = new Set(fields.filter((f) => f.name).map((f) => f.name));
  const unplaced = [];
  for (const d of err.details || []) {
    const top = d.field.split('.').slice(0, 2).join('.');
    const match = names.has(d.field) ? d.field : [...names].find((n) => d.field === n || d.field.startsWith(`${n}.`) || top === n);
    if (match) setError(match, { type: 'server', message: d.message });
    else unplaced.push(`${d.field}: ${d.message}`);
  }
  return unplaced;
}
export { getPath };
