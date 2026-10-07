export function slugify(text = '') {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

// These are real API sub-routes under /api/blog, so a post slug must never collide with them.
export const RESERVED_BLOG_SLUGS = ['meta', 'by-id'];
export const isReservedSlug = (slug) => RESERVED_BLOG_SLUGS.includes(slug);
