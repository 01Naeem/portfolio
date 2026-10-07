import dotenv from 'dotenv';
dotenv.config();

const required = ['MONGODB_URI', 'JWT_SECRET'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be at least 32 characters.');
  process.exit(1);
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  cookieName: process.env.COOKIE_NAME || 'portfolio_token',
  clientOrigins: (process.env.CLIENT_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  // Number of reverse proxies in front of Express (0 = none). See README/.env.example.
  trustProxy: Math.max(0, parseInt(process.env.TRUST_PROXY, 10) || (process.env.TRUST_PROXY === 'true' ? 1 : 0)),
  siteUrl: (process.env.SITE_URL || '').replace(/\/+$/, ''), // public URL of the site (https://yourname.dev)
  ipHashSalt: process.env.IP_HASH_SALT || process.env.JWT_SECRET,
  githubToken: process.env.GITHUB_TOKEN || '',
  adminNotifyEmail: process.env.ADMIN_NOTIFY_EMAIL || '',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
  },
};

// Optional integrations: the API still boots without them and reports a clear error when used.
env.cloudinary.enabled = Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);
env.smtp.enabled = Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);
env.smtp.secure = env.smtp.port === 465;
