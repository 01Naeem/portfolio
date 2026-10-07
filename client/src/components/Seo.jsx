import { useSite } from '../context/SiteContext.jsx';

// React 19 hoists <title>/<meta>/<link> rendered anywhere into <head>, so no helmet library is needed.
export default function Seo({ title, description, path = '', image, noindex = false, type = 'website', publishedAt, tags = [] }) {
  const { settings } = useSite();
  const siteTitle = settings?.siteTitle || 'Portfolio | Software Engineer';
  const fullTitle = title ? `${title} | ${siteTitle.split('|')[0].trim()}` : siteTitle;
  const desc = description || settings?.metaDescription || '';
  const base = (settings?.canonicalUrl || import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, '');
  const img = image || settings?.ogImage?.url;
  const hide = noindex || settings?.seo?.robotsIndex === false;

  return (
    <>
      <title>{fullTitle}</title>
      {desc && <meta name="description" content={desc} />}
      <link rel="canonical" href={`${base}${path}`} />
      {hide && <meta name="robots" content="noindex,nofollow" />}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      {desc && <meta property="og:description" content={desc} />}
      <meta property="og:url" content={`${base}${path}`} />
      {img && <meta property="og:image" content={img} />}
      {publishedAt && <meta property="article:published_time" content={new Date(publishedAt).toISOString()} />}
      {tags.map((t) => <meta key={t} property="article:tag" content={t} />)}
      <meta name="twitter:card" content={img ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={fullTitle} />
      {desc && <meta name="twitter:description" content={desc} />}
      {settings?.seo?.twitterHandle && <meta name="twitter:site" content={settings.seo.twitterHandle} />}
    </>
  );
}

export const useSiteBase = () => {
  const { settings } = useSite();
  return (settings?.canonicalUrl || import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, '');
};
