// schema.org structured data. Mirrors server/utils/seo.js (which serves the same data to link-preview bots).
const web = (u) => /^https?:\/\//i.test(u || '');

export const personLd = (profile, base) => ({
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: profile.name,
  ...(profile.title && { jobTitle: profile.title }),
  url: base,
  ...(profile.avatar?.url && { image: profile.avatar.url }),
  ...(profile.location && { address: { '@type': 'PostalAddress', addressLocality: profile.location } }),
  sameAs: (profile.socialLinks || []).map((l) => l.url).filter(web),
  ...(profile.primaryTechnologies?.length && { knowsAbout: profile.primaryTechnologies }),
});

export const websiteLd = (settings, profile, base) => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: settings?.siteTitle?.split('|')[0].trim() || profile?.name,
  url: base,
});

export const blogPostingLd = (post, profile, base) => ({
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

export const projectLd = (p, profile, base) => ({
  '@context': 'https://schema.org',
  '@type': 'CreativeWork',
  name: p.title,
  description: p.shortDescription,
  url: `${base}/projects/${p.slug}`,
  ...(p.coverImage?.url && { image: p.coverImage.url }),
  ...(p.completedAt && { dateCreated: new Date(p.completedAt).toISOString() }),
  ...(p.technologies?.length && { keywords: p.technologies.join(', ') }),
  author: { '@type': 'Person', name: profile?.name, url: base },
});
