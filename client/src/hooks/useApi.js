import { useCallback, useEffect, useRef, useState } from 'react';

// Small cache + request de-duplication so navigating between pages doesn't refetch
// everything, and two components asking for the same thing share one request.
const cache = new Map(); // key -> { at, data, meta }
const inflight = new Map(); // key -> Promise

export const invalidateCache = (prefix = '') => {
  for (const k of cache.keys()) if (k.startsWith(prefix)) cache.delete(k);
};

export function useApi(key, fetcher, { ttl = 60_000, enabled = true } = {}) {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const keyRef = useRef(key);
  keyRef.current = key;

  const fresh = useCallback((k) => {
    const c = cache.get(k);
    return c && Date.now() - c.at < ttl ? c : null;
  }, [ttl]);

  const [state, setState] = useState(() => {
    const c = fresh(key);
    return { data: c?.data ?? null, meta: c?.meta ?? null, loading: !c && enabled, error: null };
  });

  const load = useCallback(
    async (force = false) => {
      const k = key;
      if (!force) {
        const c = fresh(k);
        if (c) return setState({ data: c.data, meta: c.meta, loading: false, error: null });
      }
      // Keep previous data on screen while a new key loads (smooth filtering/pagination)
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        let p = inflight.get(k);
        if (!p) {
          p = fetcherRef.current().finally(() => inflight.delete(k));
          inflight.set(k, p);
        }
        const res = await p;
        cache.set(k, { at: Date.now(), data: res.data, meta: res.meta });
        if (keyRef.current === k) setState({ data: res.data, meta: res.meta, loading: false, error: null });
      } catch (error) {
        if (keyRef.current === k) setState((s) => ({ ...s, loading: false, error }));
      }
    },
    [key, fresh]
  );

  useEffect(() => {
    if (enabled) load();
  }, [load, enabled]);

  const refetch = useCallback(() => load(true), [load]);
  return { ...state, refetch };
}
