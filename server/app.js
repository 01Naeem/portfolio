import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import morgan from 'morgan';
import mongoose from 'mongoose';

import { env } from './config/env.js';
import { apiLimiter } from './middleware/rateLimiters.js';
import { sanitizeBody } from './middleware/sanitize.js';
import { ApiError } from './utils/ApiError.js';
import { csrfGuard } from './middleware/csrfGuard.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import routes from './routes/index.js';

const app = express();

if (env.trustProxy) app.set('trust proxy', env.trustProxy); // hops between Express and the real client IP (rate limiting depends on it)
app.disable('x-powered-by');

app.use(helmet());
app.use(
  cors({
    origin(origin, cb) {
      // Allow same-origin / server-to-server (no Origin header) and whitelisted origins
      if (!origin || env.clientOrigins.includes(origin)) return cb(null, true);
      return cb(new ApiError(403, 'Origin not allowed'));
    },
    credentials: true,
  })
);
app.use(compression());
app.use(morgan(env.isProd ? ':method :url :status :res[content-length] - :response-time ms' : 'dev')); // URLs only; no headers, cookies or bodies are logged

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(cookieParser());
app.use(mongoSanitize()); // blocks { "$gt": "" } style operator injection
app.use(hpp());
app.use(sanitizeBody);

app.use('/api', apiLimiter);
app.use('/api', csrfGuard);

app.get('/api/health', (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const db = states[mongoose.connection.readyState] || 'unknown';
  res.status(db === 'connected' ? 200 : 503).json({
    success: true,
    status: db === 'connected' ? 'ok' : 'degraded',
    db,
    uptime: Math.round(process.uptime()),
  });
});

app.use('/api', routes);

// Deploy-time check for TRUST_PROXY: should show YOUR public IP, not Vercel's or Render's.
app.get('/api/health/ip', (req, res) => res.json({ success: true, ip: req.ip, forwardedFor: req.get('x-forwarded-for') || null }));

app.use(notFound);
app.use(errorHandler);

export default app;
