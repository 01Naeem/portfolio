import axios from 'axios';

// Same-origin by default: dev proxy locally, Vercel rewrite in production.
// withCredentials is harmless same-origin and keeps the cookie working if VITE_API_URL is set.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  timeout: 15000,
  headers: { Accept: 'application/json' },
});

export class ApiError extends Error {
  constructor(message, { status = 0, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export const AUTH_EXPIRED_EVENT = 'auth:expired';

// Every failure becomes an ApiError with a human-readable message, so UI code never has to
// poke at axios internals.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (axios.isCancel(err)) return Promise.reject(err);
    const status = err.response?.status ?? 0;
    const body = err.response?.data;
    let message = body?.message;
    if (!message) {
      if (err.code === 'ECONNABORTED') message = 'The request timed out. Please try again.';
      else if (!err.response) message = 'Cannot reach the server. Check your connection.';
      else message = 'Something went wrong.';
    }
    // A 401 on any call except the auth probes means the session ended while the admin was working.
    const url = err.config?.url || '';
    if (status === 401 && !url.startsWith('/auth/')) window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    return Promise.reject(new ApiError(message, { status, details: body?.details }));
  }
);

// API envelope is { success, data, meta? }
export const unwrap = (promise) => promise.then((r) => ({ data: r.data.data, meta: r.data.meta ?? null }));
