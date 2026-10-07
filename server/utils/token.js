import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const UNITS = { s: 1e3, m: 6e4, h: 36e5, d: 864e5 };
export function parseDuration(str) {
  const m = /^(\d+)\s*([smhd])$/.exec(str);
  return m ? Number(m[1]) * UNITS[m[2]] : 864e5; // default 1 day
}

export const signToken = (user) =>
  jwt.sign({ id: user._id.toString(), v: user.tokenVersion }, env.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: env.jwtExpiresIn,
  });

export const verifyToken = (token) => jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });

// sameSite=lax is enough because the Vercel rewrite keeps the browser same-origin.
const baseCookie = () => ({ httpOnly: true, secure: env.isProd, sameSite: 'lax', path: '/' });

export const setAuthCookie = (res, token) =>
  res.cookie(env.cookieName, token, { ...baseCookie(), maxAge: parseDuration(env.jwtExpiresIn) });

export const clearAuthCookie = (res) => res.clearCookie(env.cookieName, baseCookie());
