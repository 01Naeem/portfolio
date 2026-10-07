// Defence in depth: the API already rejects non-http(s)/mailto URLs, but links are
// rendered as hrefs, so anything unexpected becomes "#" instead of executing.
export function safeUrl(url) {
  if (!url || typeof url !== 'string') return '#';
  try {
    const u = new URL(url, window.location.origin);
    return ['http:', 'https:', 'mailto:'].includes(u.protocol) ? url : '#';
  } catch {
    return '#';
  }
}
export const isExternal = (url) => /^https?:\/\//i.test(url || '') && !url.startsWith(window.location.origin);
