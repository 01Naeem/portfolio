import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, EyeOff } from 'lucide-react';
import { useApi } from '../hooks/useApi.js';
import { useSite } from '../context/SiteContext.jsx';
import { publicApi } from '../services/endpoints.js';
import { formatDate } from '../utils/format.js';
import { optimizeImage, srcSet } from '../utils/image.js';
import Seo, { useSiteBase } from '../components/Seo.jsx';
import JsonLd from '../components/JsonLd.jsx';
import { blogPostingLd } from '../utils/jsonLd.js';
import Markdown from '../components/Markdown.jsx';
import PostCard from '../components/PostCard.jsx';
import { Badge, Container, Skeleton } from '../components/ui/Primitives.jsx';
import { ErrorState } from '../components/ui/States.jsx';
import { Reveal } from '../components/ui/Reveal.jsx';
import NotFound from './NotFound.jsx';

function Related({ post }) {
  const tag = post.tags?.[0];
  const { data } = useApi(`blog-related:${post.slug}`, () => publicApi.blog({ limit: 4, ...(tag ? { tag } : post.category ? { category: post.category } : {}) }), { ttl: 120_000, enabled: Boolean(tag || post.category) });
  const items = (data || []).filter((p) => p.slug !== post.slug).slice(0, 3);
  if (!items.length) return null;
  return (
    <section aria-labelledby="related" className="mt-16 border-t border-line pt-10">
      <h2 id="related" className="mb-6 font-display text-2xl font-bold">Keep reading</h2>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map((p) => <li key={p._id}><PostCard post={p} /></li>)}</ul>
    </section>
  );
}

export default function BlogPost() {
  const { slug } = useParams();
  const { settings, profile } = useSite();
  const base = useSiteBase();
  const enabled = settings?.sections?.showBlog !== false;
  const { data: post, loading, error, refetch } = useApi(`post:${slug}`, () => publicApi.post(slug), { ttl: 60_000, enabled });

  if (!enabled || error?.status === 404) return <NotFound />;

  return (
    <Container className="pb-24 pt-28 sm:pt-32">
      <Link to="/blog" className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden="true" /> All posts
      </Link>

      {error && !post ? <ErrorState error={error} onRetry={refetch} title="Couldn't load this post" />
        : loading && !post ? <div aria-busy="true" className="mx-auto max-w-3xl space-y-4"><Skeleton className="h-12 w-4/5" /><Skeleton className="h-5 w-1/3" /><Skeleton className="aspect-[16/9] w-full" /></div>
        : post && (
          <article className="mx-auto max-w-3xl">
            <Seo title={post.seo?.title || post.title} description={post.seo?.description || post.excerpt} path={`/blog/${post.slug}`} image={post.coverImage?.url}
              type="article" publishedAt={post.publishedAt} tags={post.tags} noindex={post.status === 'draft'} />

            {post.status !== 'draft' && <JsonLd data={blogPostingLd(post, profile, base)} />}

            {post.status === 'draft' && (
              <p role="status" className="mb-6 flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
                <EyeOff className="size-4 shrink-0" aria-hidden="true" /> Draft preview: only you can see this post.
              </p>
            )}

            <Reveal>
              <p className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                {post.category && <span className="font-medium text-accent">{post.category}</span>}
                {post.publishedAt && <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, { day: 'numeric', month: 'long', year: 'numeric' })}</time>}
                {post.readingTimeMinutes ? <span className="inline-flex items-center gap-1"><Clock className="size-3.5" aria-hidden="true" />{post.readingTimeMinutes} min read</span> : null}
              </p>
              <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">{post.title}</h1>
              {post.excerpt && <p className="mt-4 text-lg text-muted">{post.excerpt}</p>}
            </Reveal>

            {post.coverImage?.url && (
              <Reveal className="mt-8 overflow-hidden rounded-card border border-line bg-raised">
                <img src={optimizeImage(post.coverImage.url, 1200)} srcSet={srcSet(post.coverImage.url)} sizes="(min-width:768px) 768px, 100vw" alt={post.coverImage.alt || ''} decoding="async" className="w-full" />
              </Reveal>
            )}

            <div className="mt-10"><Markdown>{post.content}</Markdown></div>

            {post.tags?.length > 0 && (
              <ul className="mt-10 flex flex-wrap gap-2" aria-label="Tags">
                {post.tags.map((t) => <li key={t}><Link to={`/blog?tag=${encodeURIComponent(t)}`}><Badge className="transition-colors hover:border-accent/50">#{t}</Badge></Link></li>)}
              </ul>
            )}
            <Related post={post} />
          </article>
        )}
    </Container>
  );
}
