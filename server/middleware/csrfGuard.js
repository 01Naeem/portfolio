import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

// Defence in depth on top of SameSite cookies: browser requests that change data must come
// from our own site. Requests without an Origin header (curl, Postman, server-to-server)
// carry no ambient browser cookies, so they are not a CSRF vector.
export function csrfGuard(req, res, next) {
  if (SAFE.has(req.method)) return next();
  const origin = req.get('origin');
  if (!origin) return next();
  const host = req.get('x-forwarded-host') || req.get('host');
  let originHost;
  try {
    originHost = new URL(origin).host;
  } catch {
    return next(new ApiError(403, 'Invalid origin'));
  }
  if (env.clientOrigins.includes(origin) || originHost === host) return next();
  return next(new ApiError(403, 'Cross-site request blocked'));
}
