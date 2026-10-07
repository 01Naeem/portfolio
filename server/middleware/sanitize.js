import xss from 'xss';

// Strips dangerous HTML/script from every string in req.body (recursive).
// NoSQL operator injection ($ / .) is handled separately by express-mongo-sanitize.
const clean = (value) => {
  if (typeof value === 'string') return xss(value, { whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: ['script', 'style'] });
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clean(v)]));
  }
  return value;
};

// Fields that legitimately contain rich text/markdown and use a looser policy.
const RICH_FIELDS = new Set(['content']);

export function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = Object.fromEntries(
      Object.entries(req.body).map(([k, v]) => [
        k,
        RICH_FIELDS.has(k) && typeof v === 'string'
          ? xss(v, { stripIgnoreTagBody: ['script', 'style'] })
          : clean(v),
      ])
    );
  }
  next();
}
