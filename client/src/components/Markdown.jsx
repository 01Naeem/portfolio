import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { isExternal, safeUrl } from '../utils/safeUrl.js';

// react-markdown builds React elements (never innerHTML) and ignores raw HTML, so a post can't inject
// script or event handlers. Link/image URLs are additionally scheme-checked.
//
// The post title is the page's <h1>, so the shallowest heading in the body is shown as an <h2> and the rest
// keep their relative depth. (A body that starts at "##" must not jump from h1 to h3.)
export function shallowestHeading(src = '') {
  const text = src.replace(/(```|~~~)[\s\S]*?\1/g, ''); // "# comment" lines inside code blocks are not headings
  const levels = [...text.matchAll(/^ {0,3}(#{1,6})\s/gm)].map((m) => m[1].length);
  return levels.length ? Math.min(...levels) : 2;
}
const heading = (level, offset) => {
  const Tag = `h${Math.min(6, level + offset)}`;
  return function Heading({ node, children, ...rest }) { // eslint-disable-line no-unused-vars
    return <Tag {...rest}>{children}</Tag>;
  };
};

const buildComponents = (offset) => ({
  h1: heading(1, offset), h2: heading(2, offset), h3: heading(3, offset), h4: heading(4, offset), h5: heading(5, offset), h6: heading(6, offset),
  a({ node, href, children, ...rest }) { // eslint-disable-line no-unused-vars
    const url = safeUrl(href);
    const external = isExternal(url);
    return <a href={url} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} {...rest}>{children}</a>;
  },
  img({ node, src, alt, ...rest }) { // eslint-disable-line no-unused-vars
    return <img src={safeUrl(src)} alt={alt || ''} loading="lazy" decoding="async" {...rest} />;
  },
  // wide tables scroll inside their own box instead of widening the page
  table({ node, children, ...rest }) { // eslint-disable-line no-unused-vars
    return <div className="overflow-x-auto"><table {...rest}>{children}</table></div>;
  },
});

export default function Markdown({ children }) {
  const components = useMemo(() => buildComponents(2 - shallowestHeading(children)), [children]);
  return (
    <div className="prose-lite">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{children}</ReactMarkdown>
    </div>
  );
}
