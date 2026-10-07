import BlogPost from '../models/BlogPost.js';
import Project from '../models/Project.js';
import Profile from '../models/Profile.js';
import SiteSettings from '../models/SiteSettings.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { blogPostingLd, buildRobots, buildSitemap, esc, personLd, renderSharePage, websiteLd } from '../utils/seo.js';

// Admin-set Site URL wins, then SITE_URL, then the first non-local CLIENT_ORIGINS entry.
async function siteBase() {
  const settings = await SiteSettings.getSingleton();
  const fromOrigins = env.clientOrigins.find((o) => /^https:\/\//.test(o));
  const base = (settings.canonicalUrl || env.siteUrl || fromOrigins || '').replace(/\/+$/, '');
  return { base, settings };
}

const liveFilter = () => ({ status: 'published', publishedAt: { $lte: new Date() } });
const asText = (res, type, body, maxAge = 3600) => res.type(type).set('Cache-Control', `public, max-age=${maxAge}`).send(body);

export const robotsTxt = asyncHandler(async (req, res) => {
  const { base, settings } = await siteBase();
  asText(res, 'text/plain', buildRobots({ base, allowIndexing: settings.seo?.robotsIndex !== false }));
});

export const sitemapXml = asyncHandler(async (req, res) => {
  const { base, settings } = await siteBase();
  if (!base) throw new ApiError(404, 'Set the Site URL in Site Settings (or SITE_URL) to generate a sitemap');
  if (settings.seo?.robotsIndex === false) throw new ApiError(404, 'Indexing is disabled');
  const showBlog = settings.sections?.showBlog !== false;
  const [projects, posts] = await Promise.all([
    Project.find({ published: true }).select('slug updatedAt').lean(),
    showBlog ? BlogPost.find(liveFilter()).select('slug updatedAt').lean() : [],
  ]);
  asText(res, 'application/xml', buildSitemap({ base, projects, posts, showBlog }));
});

// ---- crawler-facing pages (Vercel rewrites social-media bots here; humans get the normal SPA)
async function shareContext() {
  const { base, settings } = await siteBase();
  if (!base) throw new ApiError(404, 'Site URL not configured');
  const profile = (await Profile.getSingleton()).toObject();
  return { base, settings, profile, siteName: settings.siteTitle?.split('|')[0].trim() || profile.name };
}

export const shareHome = asyncHandler(async (req, res) => {
  const { base, settings, profile, siteName } = await shareContext();
  const description = settings.metaDescription || profile.tagline || '';
  asText(res, 'text/html', renderSharePage({
    siteName, title: settings.siteTitle || siteName, description, image: settings.ogImage?.url || profile.avatar?.url, url: base,
    jsonLd: [personLd({ profile, base }), websiteLd({ settings, profile, base })],
    heading: profile.name, body: `<p>${esc(settings.hero?.title || profile.title || '')}</p>`,
  }), 300);
});

export const shareProject = asyncHandler(async (req, res) => {
  const { base, profile, siteName } = await shareContext();
  const p = await Project.findOne({ slug: req.params.slug, published: true }).lean();
  if (!p) throw new ApiError(404, 'Project not found');
  asText(res, 'text/html', renderSharePage({
    siteName, title: `${p.title} | ${siteName}`, description: p.shortDescription, image: p.coverImage?.url, url: `${base}/projects/${p.slug}`, type: 'article',
    jsonLd: [personLd({ profile, base })], heading: p.title,
    body: p.technologies?.length ? `<p>Built with ${esc(p.technologies.join(', '))}</p>` : '',
  }), 300);
});

export const sharePost = asyncHandler(async (req, res) => {
  const { base, profile, siteName } = await shareContext();
  const post = await BlogPost.findOne({ slug: req.params.slug, ...liveFilter() }).lean();
  if (!post) throw new ApiError(404, 'Post not found');
  asText(res, 'text/html', renderSharePage({
    siteName, title: `${post.seo?.title || post.title} | ${siteName}`, description: post.seo?.description || post.excerpt || '', image: post.coverImage?.url,
    url: `${base}/blog/${post.slug}`, type: 'article', publishedAt: post.publishedAt, tags: post.tags,
    jsonLd: [blogPostingLd({ post, profile, base })], heading: post.title,
  }), 300);
});
