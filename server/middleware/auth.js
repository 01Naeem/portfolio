import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyToken } from '../utils/token.js';
import { env } from '../config/env.js';

async function resolveUser(req) {
  const token = req.cookies?.[env.cookieName];
  if (!token) return null;
  const decoded = verifyToken(token);
  const user = await User.findById(decoded.id).select('name email role tokenVersion');
  // tokenVersion mismatch = password changed or "log out everywhere" was used
  if (!user || user.tokenVersion !== decoded.v) return null;
  return user;
}

export const protect = asyncHandler(async (req, res, next) => {
  let user = null;
  try {
    user = await resolveUser(req);
  } catch {
    /* invalid/expired token falls through to 401 */
  }
  if (!user) throw new ApiError(401, 'Authentication required');
  req.user = user;
  next();
});

// Attaches req.user when a valid session exists, never blocks. Used on public GETs so the
// admin can also see drafts/unpublished items from the same endpoints.
export const optionalAuth = asyncHandler(async (req, res, next) => {
  try {
    req.user = await resolveUser(req);
  } catch {
    req.user = null;
  }
  next();
});

export const restrictTo = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role) ? next() : next(new ApiError(403, 'You do not have permission to do this'));

export const adminOnly = restrictTo('admin');

// Public data is cacheable; anything seen by the logged-in admin never is.
export const publicCache = (seconds = 60) => (req, res, next) => {
  res.set('Vary', 'Cookie');
  res.set(
    'Cache-Control',
    req.user ? 'private, no-store' : `public, max-age=${seconds}, stale-while-revalidate=${seconds * 5}`
  );
  next();
};
