// Pure builders for robots.txt, sitemap.xml and the crawler-facing share page, so they are easy to test.
const ESC = { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&#39;', '"': '&quot;' };
export const esc = (s) => String(s ?? '').replace(/[<>&'"]/g, (c) => ESC[c]);

// JSON inside <script> must never contain a literal "</script>" or "<!--": escape every "<".
export const jsonForScript = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : undefined);

export function buildRobots({ base, allowIndexing }) {
  if (!allowIndexing) return 'User-agent: *\nDisallow: /\n';
  return ['User-agent: *', 'Allow: /', 'Disallow: /admin', ...(base ? ['', `Sitemap: ${base}/sitemap.xml`] : []), ''].join('\n');
}

export function buildSitemap({ base, projects = [], posts = [], showBlog = true }) {
  const dates = [...projects, ...posts].map((x) => x.updatedAt).filter(Boolean).sort();
  const entries = [{ path: '/', lastmod: day(dates.at(-1)), priority: '1.0' }];
  if (showBlog) {
    entries.push({ path: '/blog', lastmod: day(posts.map((p) => p.updatedAt).filter(Boolean).sort().at(-1)), priority: '0.7' });
    for (const p of posts) entries.push({ path: `/blog/${p.slug}`, lastmod: day(p.updatedAt), priority: '0.6' });
  }
  for (const p of projects) entries.push({ path: `/projects/${p.slug}`, lastmod: day(p.updatedAt), priority: '0.8' });
  const urls = entries
    .map((e) => `  <url>\n    <loc>${esc(base + e.path)}</loc>${e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : ''}\n    <priority>${e.priority}</priority>\n  </url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export const personLd = ({ profile, base }) => ({
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: profile.name,
  ...(profile.title && { jobTitle: profile.title }),
  url: base,
  ...(profile.avatar?.url && { image: profile.avatar.url }),
  ...(profile.location && { address: { '@type': 'PostalAddress', addressLocality: profile.location } }),
  sameAs: (profile.socialLinks || []).map((l) => l.url).filter((u) => /^https?:\/\//i.test(u)),
  ...(profile.primaryTechnologies?.length && { knowsAbout: profile.primaryTechnologies }),
});

export const websiteLd = ({ settings, profile, base }) => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: settings?.siteTitle?.split('|')[0].trim() || profile?.name,
  url: base,
});

export const blogPostingLd = ({ post, profile, base }) => ({
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: post.title,
  ...(post.excerpt && { description: post.excerpt }),
  ...(post.coverImage?.url && { image: post.coverImage.url }),
  ...(post.publishedAt && { datePublished: new Date(post.publishedAt).toISOString() }),
  ...(post.updatedAt && { dateModified: new Date(post.updatedAt).toISOString() }),
  ...(post.tags?.length && { keywords: post.tags.join(', ') }),
  mainEntityOfPage: `${base}/blog/${post.slug}`,
  author: { '@type': 'Person', name: profile?.name, url: base },
});

// Minimal, fully server-rendered HTML for link-preview bots (LinkedIn, Slack, WhatsApp, X...) that don't run JavaScript.
export function renderSharePage({ siteName, title, description, image, url, type = 'website', publishedAt, tags = [], jsonLd = [], heading, body }) {
  const meta = [
    ['property', 'og:type', type], ['property', 'og:site_name', siteName], ['property', 'og:title', title], ['property', 'og:description', description],
    ['property', 'og:url', url], ['property', 'og:image', image], ['name', 'twitter:card', image ? 'summary_large_image' : 'summary'],
    ['name', 'twitter:title', title], ['name', 'twitter:description', description], ['name', 'twitter:image', image],
    ['property', 'article:published_time', publishedAt && new Date(publishedAt).toISOString()], ...tags.map((t) => ['property', 'article:tag', t]),
  ].filter(([, , v]) => v);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title>
<meta name="description" content="${esc(description)}"><link rel="canonical" href="${esc(url)}">
${meta.map(([k, n, v]) => `<meta ${k}="${n}" content="${esc(v)}">`).join('\n')}
${jsonLd.map((o) => `<script type="application/ld+json">${jsonForScript(o)}</script>`).join('\n')}
</head><body><main><h1>${esc(heading || title)}</h1><p>${esc(description)}</p>${body || ''}<p><a href="${esc(url)}">View the page</a></p></main></body></html>`;
}
