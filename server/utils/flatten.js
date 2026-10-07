// { a: { b: 1 }, c: [1] } -> { 'a.b': 1, c: [1] }
// Turns a nested partial update into MongoDB dotted $set paths, so editing hero.title doesn't wipe hero.subtitle.
// Arrays are replaced whole.
//
// `replace` lists keys whose object value must be written as ONE unit instead of being split into dotted paths
// (image objects like avatar/favicon). Splitting them is a bug waiting to happen: if the stored value is null
// (what "no image" is saved as), MongoDB cannot create "avatar.url" inside it and fails with PathNotViable.
const isPlain = (v) => v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date);

export function flatten(obj, { replace = [] } = {}, prefix = '', out = {}) {
  const whole = new Set(replace);
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (isPlain(v) && Object.keys(v).length && !whole.has(key)) flatten(v, { replace }, key, out);
    else out[key] = v;
  }
  return out;
}
