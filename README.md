# MERN Developer Portfolio

A professional, animated, accessible personal portfolio with a full **admin panel**. Every piece of public
content (profile, skills, projects, experience, education, certificates, resume, blog, settings) lives in
MongoDB and is edited from `/admin`, so routine updates never need a code change.

```
ADMIN  →  React admin dashboard  →  Express REST API  →  MongoDB  →  public React site  →  visitor
```

## Contents

1. [Features](#features) · 2. [Tech stack](#tech-stack) · 3. [Architecture](#architecture) · 4. [Folder structure](#folder-structure)
5. [Quick start](#quick-start-local) · 6. [Environment variables](#environment-variables) · 7. [MongoDB Atlas](#mongodb-atlas)
8. [Cloudinary](#cloudinary) · 9. [Email](#email-notifications) · 10. [Admin account](#admin-account)
11. [Tests & checks](#tests--checks) · 12. [Production build](#production-build) · 13. [Deployment](#deployment)
14. [Using the admin panel](#using-the-admin-panel) · 15. [API reference](#api-reference) · 16. [Security](#security)
17. [SEO](#seo) · 18. [Performance](#performance) · 19. [Known limitations](#known-limitations) · 20. [Troubleshooting](#troubleshooting)

---

## Features

**Public site**
- Hero, About (with a journey timeline built from your real education/experience), Skills, Projects, Experience, Education, Certificates, GitHub activity, a recruiter-friendly Resume block, Contact form, and a Blog.
- Projects: featured spotlight, filters (Frontend / Backend / Full Stack / React / Node / MERN), search, detail pages with screenshots, features, challenges and solutions.
- Dark (primary) and light themes, designed separately (not inverted); accent colour is configurable from the admin.
- Smooth, restrained animation that respects `prefers-reduced-motion` and can be switched off site-wide.
- Skills use descriptive levels, never fake percentages. Nothing is invented: empty sections say so honestly.

**Admin panel** (`/admin`)
- Secure login (JWT in an HTTP-only cookie, bcrypt, lockout after repeated failures).
- CRUD with search, filters, pagination, confirmation dialogs and toasts for Projects, Skills, Experience, Education, Certificates, Blog; reordering for Projects and Skills.
- Single-document editors for Profile, About, Social Links and Site Settings.
- Image uploads (Cloudinary), resume upload/replace/delete, messages inbox, privacy-friendly analytics.

**Engineering**
- Layered backend (routes → controllers → services, validators, middleware), Zod validation, centralised error handling.
- Rate limiting, Helmet, CORS allow-list, NoSQL-injection and XSS sanitisation, CSRF origin guard, upload content sniffing.
- Code splitting (admin, blog, below-the-fold sections load on demand), responsive images, API caching headers.
- Automated tests on both sides, including accessibility checks with axe-core.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4, React Router, Axios, Motion (LazyMotion), React Hook Form, Lucide, react-markdown |
| Backend | Node.js 20+, Express, Mongoose, Zod, JWT, bcryptjs, Multer, Nodemailer, Helmet, express-rate-limit |
| Data / media | MongoDB Atlas, Cloudinary |
| Hosting | Vercel (frontend), Render or Railway (API) |
| Testing | Vitest + Testing Library + axe-core (client), `node:test` (server) |

## Architecture

The browser only ever talks to **one origin**. In production Vercel serves the React app and *rewrites* `/api/*`
to the Express server, so cookies are first-party and there is no cross-site cookie or CORS complexity.

```
Browser ──► https://yourname.dev ──► Vercel (static React app)
                  │  /api/*, /robots.txt, /sitemap.xml, link-preview bots
                  └──────────────► Render (Express API) ──► MongoDB Atlas
                                                      └──► Cloudinary (images, resume)
                                                      └──► SMTP (contact notifications)
```

Request flow for a page view: React → Axios (`/api/...`) → Express route → controller → Mongoose → JSON `{ success, data, meta? }`.

## Folder structure

```
.
├── client/                    React app (Vite)
│   ├── public/                theme-init.js (anti-flash theme script), favicon
│   ├── vercel.json            rewrites, caching + security headers
│   └── src/
│       ├── components/        ui/ (design system), layout/, sections/ (home), admin/ (forms, tables)
│       ├── context/           Theme, Site (profile/settings), Auth, Toast
│       ├── features/          admin content-type configs (one config → one admin page)
│       ├── hooks/             useApi (cache + dedupe), useDebounced, useScrolled
│       ├── layouts/           PublicLayout, AdminLayout
│       ├── pages/             Home, ProjectDetail, Blog, BlogPost, 404, admin/*
│       ├── routes/            router + ProtectedRoute
│       ├── services/          api.js (Axios), endpoints.js
│       ├── utils/             format, image (Cloudinary URLs), jsonLd, safeUrl, formUtils
│       └── test/              Vitest suites (+ axe accessibility)
├── server/
│   ├── config/                env validation, db, cloudinary
│   ├── models/                User, Profile, Project, Skill, Experience, Education, Certificate, Message, BlogPost, SiteSettings, DailyStat
│   ├── controllers/  routes/  validators/  middleware/  services/  utils/
│   ├── scripts/seedAdmin.js
│   └── test/                  node:test suites
├── scripts/contrast.py        WCAG contrast audit of the design tokens
├── render.yaml                Render blueprint for the API
└── package.json               root convenience scripts
```

## Quick start (local)

Requirements: **Node 20+**, a MongoDB database (a free Atlas cluster is fine), Python 3 only for the optional contrast script.

```bash
npm run install:all                       # installs server/ and client/
cp server/.env.example server/.env        # then fill it in (see below)
npm run seed:admin                        # needs ADMIN_EMAIL / ADMIN_PASSWORD, see "Admin account"
npm run dev:server                        # API on http://localhost:5000
npm run dev:client                        # site on http://localhost:5173 (proxies /api to :5000)
```

Open `http://localhost:5173` for the site and `http://localhost:5173/admin/login` for the admin.
Cloudinary and SMTP are **optional** locally: the API boots without them and returns a clear error for
the feature that needs them.

## Environment variables

### Server (`server/.env`)

| Variable | Required | Purpose |
|---|---|---|
| `MONGODB_URI` | yes | MongoDB connection string |
| `JWT_SECRET` | yes | ≥ 32 chars. `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `NODE_ENV` | prod | `production` enables secure cookies and hides error details |
| `PORT` | no | default `5000` |
| `JWT_EXPIRES_IN` | no | default `1d` (`30m`, `12h`, `7d` …) |
| `CLIENT_ORIGINS` | prod | Comma-separated browser origins allowed to call the API, e.g. `https://yourname.dev` |
| `SITE_URL` | prod | Public site URL (sitemap, robots, link previews). *Site Settings → Site URL* overrides it |
| `TRUST_PROXY` | prod | Number of proxies in front of Express: `0` local, `1` Render direct, **`2` Vercel rewrite → Render** |
| `CLOUDINARY_CLOUD_NAME` `CLOUDINARY_API_KEY` `CLOUDINARY_API_SECRET` | for uploads | Image and resume storage |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `SMTP_FROM` | for email | Contact-form notifications |
| `ADMIN_NOTIFY_EMAIL` | no | Where alerts go (falls back to Site Settings, then Profile email) |
| `GITHUB_TOKEN` | no | Raises GitHub rate limits and enables the contribution graph |
| `IP_HASH_SALT` | no | Salt for hashing visitor IPs on stored messages (defaults to `JWT_SECRET`) |

### Client (`client/.env`, optional)

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Leave empty to use same-origin `/api` (recommended) |
| `VITE_SITE_URL` | Fallback canonical URL when Site Settings has none |

No secret ever goes in the client: `VITE_*` values are public by design.

## MongoDB Atlas

1. Create a free **M0** cluster at <https://cloud.mongodb.com>.
2. *Database Access* → add a user with a strong password (read/write on one database).
3. *Network Access* → allow your IP for local work. For Render's free tier, which has no fixed IP, allow `0.0.0.0/0` and rely on the strong credentials (or use a paid plan with static outbound IPs and allow-list those).
4. *Connect → Drivers* → copy the `mongodb+srv://…` string, put your database name before the `?`, and set it as `MONGODB_URI`.

Collections and indexes are created automatically on first use.

## Cloudinary

1. Create a free account at <https://cloudinary.com>; copy the cloud name, API key and secret from the dashboard into the three `CLOUDINARY_*` variables.
2. **Important for the resume:** *Settings → Security → "Allow delivery of PDF and ZIP files"* must be enabled, or PDFs upload fine but cannot be fetched.
3. Everything is stored under a `portfolio/` folder. The app only ever deletes assets inside that folder, and removes images automatically when you replace or delete an item.

## Email notifications

Contact-form messages are always stored in MongoDB and shown in **Admin → Messages**. Email is an extra alert.

- **Gmail:** turn on 2-Step Verification, create an **App Password** (Google Account → Security → App passwords), then use `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER=you@gmail.com`, `SMTP_PASS=<app password>`. Your normal password will not work.
- Any SMTP provider works (Brevo, Mailgun, SES …).
- Replies go to the visitor because their address is set as *Reply-To*; the *From* address is always yours, which keeps mail out of spam.

## Admin account

There is no public sign-up. Create the single admin from the command line:

```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='Str0ngPassw0rd!' ADMIN_NAME='Your Name' npm run seed:admin
```

Password rules: 10+ characters with upper case, lower case and a number. The script refuses to create a second admin.
Change the password later in the admin (**API: `POST /api/auth/change-password`**); doing so signs out every other session.

## Tests & checks

```bash
npm test                 # server (node:test) + client (Vitest) suites
npm run contrast         # WCAG contrast of both themes across several accent colours
```

What the suites cover: validation and security guards (401 on every protected route, forged JWTs, CSRF origin guard, NoSQL-injection bodies,
script-scheme URLs), rate limiting, upload content sniffing, SEO builders, every admin CRUD flow with a mocked API, public sections and
filters, the contact form, Markdown safety, structured data, and axe-core accessibility scans of the major pages.

What they do **not** cover: a real MongoDB, Cloudinary, SMTP, GitHub, or a real browser (layout, Lighthouse, screen-reader behaviour).
See [Known limitations](#known-limitations) and run the [first-deploy checklist](#first-deploy-checklist).

## Production build

```bash
npm run build            # client → client/dist
npm --prefix server start
```

## Deployment

Order matters because each step produces a URL the next one needs.

### 1. Database
Set up Atlas as above and keep the connection string.

### 2. API on Render
1. Push this repo to GitHub.
2. Render → **New → Blueprint** → select the repo. It reads [`render.yaml`](render.yaml) (root directory `server`, health check `/api/health`).
3. Fill the variables marked `sync: false`. `JWT_SECRET` is generated for you. Note the service URL, e.g. `https://portfolio-api.onrender.com`.
4. Set `TRUST_PROXY=2`, `CLIENT_ORIGINS=https://yourname.dev`, `SITE_URL=https://yourname.dev` (use your Vercel URL until you have a domain).
5. Create the admin once, from the service's **Shell** tab: `ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run seed:admin`.

> Free Render services sleep after ~15 minutes idle; the first request afterwards takes about 30–60 s. Point a free uptime monitor at `/api/health` if that matters for interviews.
> Railway works the same way: set the root directory to `server`, the start command to `npm start`, and the same variables.

### 3. Frontend on Vercel
1. Edit [`client/vercel.json`](client/vercel.json): replace every `YOUR-API-NAME.onrender.com` with your API host.
2. Vercel → **Add New Project** → import the repo → **Root Directory: `client`**. Framework preset *Vite* is detected.
3. Deploy. Add your custom domain in *Settings → Domains* if you have one, then update `CLIENT_ORIGINS` and `SITE_URL` on Render to match, and redeploy the API.

### First-deploy checklist
- [ ] `https://<site>/api/health` returns `"db":"connected"`.
- [ ] `https://<site>/api/health/ip` shows **your own public IP**. If it shows a Vercel/Render address, change `TRUST_PROXY` (otherwise all visitors share one rate-limit bucket).
- [ ] Sign in at `/admin/login`; a wrong password shows a clean error.
- [ ] Upload an image and a resume PDF; view and download the resume from the public site.
- [ ] Send a test message through the contact form; it appears in **Messages** and in your inbox.
- [ ] `https://<site>/robots.txt` and `/sitemap.xml` load (set the Site URL first).
- [ ] Open the browser console on the home page: any `Content-Security-Policy-Report-Only` violations listed? If none, rename that header in `client/vercel.json` to `Content-Security-Policy` to enforce it.
- [ ] Paste a post URL into LinkedIn/Slack to check the link preview (bots are served a small server-rendered page; see SEO).
- [ ] Run Lighthouse on the live URL and fix anything it flags for your content (image sizes especially).

## Using the admin panel

Sign in at `/admin/login`. Recommended first-time order:

1. **Profile**: name, title, tagline, location, public email, availability, avatar, GitHub username.
2. **Social Links** and **About**.
3. **Skills**, **Projects**, **Experience**, **Education**, **Certificates**. Add only what is real; empty sections show an honest placeholder or hide themselves.
4. **Resume**: upload your PDF.
5. **Site Settings**: site title, meta description, Site URL, social share image, accent colour, which sections to show.
6. **Blog** (optional) and **Analytics**.

Changes appear on the public site immediately (public responses are cached for about a minute at most).

## API reference

Base URL: `/api`. Successful responses are `{ "success": true, "data": …, "meta"?: … }`. Errors are
`{ "success": false, "message": "…", "details"?: [{ "field", "message" }] }` with a matching HTTP status
(`400` validation, `401` not signed in, `403` forbidden, `404`, `409` duplicate, `413` file too large, `429` rate limited).
Authentication is the HTTP-only cookie set by `POST /auth/login`; browsers send it automatically.
Rate limits: 300 requests/15 min per IP overall, 10 login attempts/15 min, 5 contact messages/hour, 60 view beacons/5 min.

### Authentication
| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/api/auth/login` | public | `{ email, password }`; locks the account for 15 min after 5 failures |
| POST | `/api/auth/logout` | public | clears the cookie |
| GET | `/api/auth/me` | admin | current user |
| POST | `/api/auth/logout-all` | admin | invalidates every session |
| POST | `/api/auth/change-password` | admin | `{ currentPassword, newPassword }` |

### Content (public read, admin write)
`skills`, `experience`, `education` and `certificates` share one shape: `GET` collection and `GET /:id` are public, writes are admin-only.

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/api/skills` | public | `?category=Frontend` |
| GET | `/api/skills/:id` | public | |
| POST | `/api/skills` | admin | |
| PUT | `/api/skills/:id` | admin | |
| DELETE | `/api/skills/:id` | admin | removes attached images |
| PATCH | `/api/skills/reorder` | admin | `{ ids: [...] }` in the new order |
| GET | `/api/experience` | public | newest first |
| GET | `/api/experience/:id` | public | |
| POST | `/api/experience` | admin | |
| PUT | `/api/experience/:id` | admin | |
| DELETE | `/api/experience/:id` | admin | |
| PATCH | `/api/experience/reorder` | admin | |
| GET | `/api/education` | public | newest first |
| GET | `/api/education/:id` | public | |
| POST | `/api/education` | admin | |
| PUT | `/api/education/:id` | admin | |
| DELETE | `/api/education/:id` | admin | |
| PATCH | `/api/education/reorder` | admin | |
| GET | `/api/certificates` | public | |
| GET | `/api/certificates/:id` | public | |
| POST | `/api/certificates` | admin | |
| PUT | `/api/certificates/:id` | admin | |
| DELETE | `/api/certificates/:id` | admin | |
| PATCH | `/api/certificates/reorder` | admin | |

### Projects
| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/api/projects` | public | published only. Query: `q`, `category`, `tech`, `featured`, `page`, `limit`. Admin may add `all=true` to include drafts |
| GET | `/api/projects/:idOrSlug` | public | unpublished projects are admin-only |
| POST | `/api/projects` | admin | |
| PUT | `/api/projects/:id` | admin | |
| DELETE | `/api/projects/:id` | admin | |
| PATCH | `/api/projects/reorder` | admin | |
| PATCH | `/api/projects/:id/featured` | admin | toggles featured |
| POST | `/api/projects/:id/click` | public | anonymous counter |

### Blog
| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/api/blog` | public | published only. Query: `tag`, `category`, `q`, `page`, `limit`. Admin: `all=true`, `status` |
| GET | `/api/blog/meta` | public | tags and categories that have published posts |
| GET | `/api/blog/:slug` | public | drafts visible to admin only |
| GET | `/api/blog/by-id/:id` | admin | for the editor |
| POST | `/api/blog` | admin | |
| PUT | `/api/blog/:id` | admin | |
| DELETE | `/api/blog/:id` | admin | |

### Profile, settings, resume, GitHub
| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/api/profile` | public | phone is hidden unless enabled in settings |
| PUT | `/api/profile` | admin | partial updates merge nested fields |
| GET | `/api/settings` | public | admin gets private fields too |
| PUT | `/api/settings` | admin | |
| GET | `/api/resume` | public | metadata only (`available`, `fileName`, `uploadedAt`) |
| GET | `/api/resume/file` | public | streams the PDF; `?download=1` forces download and counts it |
| POST | `/api/resume` | admin | multipart field `file`, PDF ≤ 5 MB |
| DELETE | `/api/resume` | admin | |
| GET | `/api/github` | public | uses the username saved in Profile; cached 10 min; 404 if disabled |

### Messages and uploads
| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/api/messages` | public | contact form: `{ name, email, subject, message, website }` (`website` is a honeypot and must be empty) |
| GET | `/api/messages` | admin | `status=read|unread`, `q`, `page`, `limit` |
| GET | `/api/messages/:id` | admin | |
| PATCH | `/api/messages/:id` | admin | `{ read: boolean }` |
| PATCH | `/api/messages/read-all` | admin | |
| DELETE | `/api/messages/:id` | admin | |
| POST | `/api/uploads/image` | admin | multipart `file` (JPG/PNG/WebP/GIF/ICO ≤ 5 MB) + `folder` |
| DELETE | `/api/uploads` | admin | `{ publicId }`, only `portfolio/…` ids |

### Analytics and dashboard
| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/api/analytics/view` | public | `{ path }`; counted only for real public routes |
| GET | `/api/analytics` | admin | `?days=7|30|90` |
| GET | `/api/admin/stats` | admin | dashboard counters |

### SEO and health
| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/api/robots.txt` | public | served at `/robots.txt` through the Vercel rewrite |
| GET | `/api/sitemap.xml` | public | served at `/sitemap.xml` |
| GET | `/api/share/home` | public | server-rendered link-preview page |
| GET | `/api/share/projects/:slug` | public | |
| GET | `/api/share/blog/:slug` | public | |
| GET | `/api/health` | public | `200` when MongoDB is connected, else `503` |
| GET | `/api/health/ip` | public | the IP Express sees; use it to verify `TRUST_PROXY` |

## Security

- **Auth:** bcrypt (12 rounds), JWT (`HS256` pinned) in an HTTP-only, `SameSite=Lax`, `Secure`-in-production cookie. Tokens carry a version, so changing the password or "log out everywhere" invalidates old sessions. Login is rate limited and locks after repeated failures; unknown emails take the same time as wrong passwords.
- **Authorisation:** every write route and every admin read sits behind `protect` + `adminOnly`; the React route guard is only a convenience.
- **Input:** Zod validation with unknown fields stripped (no mass assignment), HTML stripped from text input, operator-injection (`$gt`) blocked, regex searches escaped, URLs restricted to `http(s)`/`mailto`.
- **Browser:** CORS allow-list, an Origin check on state-changing requests (CSRF defence in depth), Helmet headers, a Content-Security-Policy (report-only until you enforce it), no `dangerouslySetInnerHTML` anywhere. Blog Markdown is rendered to React elements and raw HTML is ignored.
- **Uploads:** files are identified by their first bytes (extension and declared type are ignored), SVG is refused, 5 MB cap, stored in memory then streamed to Cloudinary.
- **Privacy:** analytics are anonymous daily counters (no cookies, IPs or visitor IDs); contact messages store only a salted hash of the IP; the request log records URLs, not headers or bodies.
- **Operations:** secrets only in environment variables, `.env` is git-ignored, production errors never include stack traces. `npm audit` reported 0 vulnerabilities in both packages when this was written; re-run it periodically.

## SEO

- Per-page title, description, canonical URL, Open Graph and Twitter tags; JSON-LD `Person` + `WebSite` (home), `BlogPosting` (posts), `CreativeWork` (projects).
- `robots.txt` and `sitemap.xml` are generated from your published content (set the Site URL). Turning off *Allow search engines to index* in Site Settings makes robots disallow everything and removes the sitemap.
- Because this is a single-page app, social-media scrapers (which don't run JavaScript) are routed by `vercel.json` to `/api/share/*`, small server-rendered pages with the right Open Graph tags. Search engines that render JavaScript see the normal page.

## Performance

- Initial load ships only React, the router, the animation core and the home hero/about/skills/projects code. The admin, blog, Markdown renderer, and the below-the-fold sections load on demand (and are prefetched when the browser is idle).
- Animations use Motion's `LazyMotion` (the lightweight feature set).
- Cloudinary images are requested resized with automatic format/quality, with `srcset`, lazy loading and explicit decoding hints.
- Fonts are self-hosted variable fonts; hashed assets are cached for a year; public API responses carry short cache headers; gzip is on.

## Known limitations

- **Not verified in this build environment:** a real MongoDB, Cloudinary and SMTP; the Vercel `has`-header rewrites for link-preview bots and the CSP header; Lighthouse scores; real-browser layout and screen-reader behaviour. All are covered by the first-deploy checklist above.
- **Testimonials** are not implemented (the setting exists but has no section yet).
- **Analytics** count page loads, not unique people, and don't filter bots.
- **Experience** and **Education** are date-ordered; manual reordering is offered for Projects and Skills only.
- **Admin lists** (Projects up to 50, Blog up to 30) search and paginate in the browser. Plenty for a portfolio, not for hundreds of items.
- **Single admin account** by design.
- **GitHub contribution graph** needs `GITHUB_TOKEN`; without one you still get repositories, languages and recent activity.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Admin login works locally but not in production | `CLIENT_ORIGINS` doesn't include your exact site origin (scheme + host, no trailing slash), or the `/api` rewrite in `vercel.json` still has the placeholder host |
| Every visitor hits "Too many requests" | `TRUST_PROXY` is too low; check `/api/health/ip` |
| Resume uploads but won't open | Enable "Allow delivery of PDF and ZIP files" in Cloudinary Security settings |
| No email arrives | Gmail needs an App Password; check Render logs for "Contact notification email failed"; the message is still in Admin → Messages |
| First request after idle is very slow | Render free tier wake-up; use an uptime monitor |
| Sitemap returns 404 | Set the Site URL in Site Settings or `SITE_URL` |
| CSP violations in the console | Expected only with report-only; adjust `client/vercel.json` before enforcing |
