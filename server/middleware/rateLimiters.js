import rateLimit from 'express-rate-limit';

const make = (opts) =>
  rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) =>
      res.status(429).json({ success: false, message: opts.message || 'Too many requests, please try again later.' }),
    ...opts,
  });

export const apiLimiter = make({ windowMs: 15 * 60 * 1000, limit: 300 });

// Brute-force protection for the admin login
export const loginLimiter = make({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: 'Too many login attempts. Try again in 15 minutes.',
});

// Public contact form: 5 messages per hour per IP
export const contactLimiter = make({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: 'Too many messages sent. Please try again later.',
});

// Page-view beacon: generous for real browsing, tight enough that scripts can't inflate the numbers
export const viewLimiter = make({ windowMs: 5 * 60 * 1000, limit: 60, message: 'Too many requests.' });
