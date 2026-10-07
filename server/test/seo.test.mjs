import './setup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRobots, buildSitemap, renderSharePage, jsonForScript, personLd, blogPostingLd, esc } from '../utils/seo.js';

test('robots.txt allows crawling, hides /admin and points at the sitemap', () => {
  const r = buildRobots({ base: 'https://asha.dev', allowIndexing: true });
  assert.match(r, /User-agent: \*\nAllow: \//);
  assert.match(r, /Disallow: \/admin/);
  assert.match(r, /Sitemap: https:\/\/asha\.dev\/sitemap\.xml/);
});

test('robots.txt blocks everything when indexing is switched off', () => {
  assert.equal(buildRobots({ base: 'https://asha.dev', allowIndexing: false }), 'User-agent: *\nDisallow: /\n');
});

test('sitemap lists home, blog, posts and projects with lastmod, and escapes XML', () => {
  const xml = buildSitemap({
    base: 'https://asha.dev',
    projects: [{ slug: 'electro-hub', updatedAt: '2026-09-02T10:00:00Z' }],
    posts: [{ slug: 'hello-mern', updatedAt: '2026-09-05T10:00:00Z' }],
  });
  assert.match(xml, /<loc>https:\/\/asha\.dev\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/asha\.dev\/blog\/hello-mern<\/loc>\s*<lastmod>2026-09-05<\/lastmod>/);
  assert.match(xml, /<loc>https:\/\/asha\.dev\/projects\/electro-hub<\/loc>/);
  assert.match(xml, /<loc>https:\/\/asha\.dev\/blog<\/loc>/);
  assert.ok(buildSitemap({ base: 'https://a.dev/?a=1&b=2', projects: [], posts: [] }).includes('&amp;b=2'));
});

test('sitemap omits blog URLs when the blog is switched off', () => {
  const xml = buildSitemap({ base: 'https://asha.dev', projects: [], posts: [{ slug: 'x', updatedAt: '2026-01-01' }], showBlog: false });
  assert.ok(!xml.includes('/blog'));
});

test('JSON-LD cannot break out of its <script> tag', () => {
  const out = jsonForScript({ name: '</script><script>alert(1)</script>', note: '<!--' });
  assert.ok(!out.includes('<'));
  assert.deepEqual(JSON.parse(out), { name: '</script><script>alert(1)</script>', note: '<!--' }); // data survives intact
});

test('Person JSON-LD only links http(s) profiles, never mailto: or javascript:', () => {
  const ld = personLd({ base: 'https://asha.dev', profile: { name: 'Asha', title: 'Dev', socialLinks: [{ url: 'https://github.com/asha' }, { url: 'mailto:a@b.co' }, { url: 'javascript:1' }], primaryTechnologies: ['React'] } });
  assert.deepEqual(ld.sameAs, ['https://github.com/asha']);
  assert.equal(ld['@type'], 'Person');
  assert.deepEqual(ld.knowsAbout, ['React']);
});

test('BlogPosting JSON-LD carries dates, author and canonical URL', () => {
  const ld = blogPostingLd({ base: 'https://asha.dev', profile: { name: 'Asha' }, post: { title: 'Hi', slug: 'hi', publishedAt: '2026-09-01T00:00:00Z', tags: ['a', 'b'] } });
  assert.equal(ld.mainEntityOfPage, 'https://asha.dev/blog/hi');
  assert.equal(ld.datePublished, '2026-09-01T00:00:00.000Z');
  assert.equal(ld.keywords, 'a, b');
  assert.equal(ld.author.name, 'Asha');
});

test('share page carries Open Graph + Twitter tags and escapes hostile content', () => {
  const html = renderSharePage({
    siteName: 'Asha', title: 'Post "one" <b>', description: 'desc & more', image: 'https://x.test/i.png', url: 'https://asha.dev/blog/one',
    type: 'article', publishedAt: '2026-09-01T00:00:00Z', tags: ['react'], jsonLd: [{ '@type': 'BlogPosting', headline: '</script><script>alert(1)' }],
  });
  assert.match(html, /<meta property="og:title" content="Post &quot;one&quot; &lt;b&gt;">/);
  assert.match(html, /<meta property="og:image" content="https:\/\/x\.test\/i\.png">/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
  assert.match(html, /<meta property="article:tag" content="react">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/asha\.dev\/blog\/one">/);
  assert.equal((html.match(/<script/g) || []).length, 1); // only the JSON-LD block, nothing injected
  assert.ok(!html.includes('<b>'));
  assert.equal(esc(`<>&"'`), '&lt;&gt;&amp;&quot;&#39;');
});

test('share page without an image falls back to a plain summary card', () => {
  const html = renderSharePage({ siteName: 'A', title: 'T', description: 'D', url: 'https://a.dev' });
  assert.match(html, /twitter:card" content="summary"/);
  assert.ok(!html.includes('og:image'));
});
