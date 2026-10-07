import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const API = 'https://api.github.com';
const TTL_MS = 10 * 60 * 1000; // unauthenticated limit is 60 req/hour/IP, so cache hard
const USERNAME_RE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const cache = new Map(); // username(lowercase) -> { at, data }

async function gh(path, { body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method: body ? 'POST' : 'GET',
    signal: AbortSignal.timeout(8000),
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'portfolio-server',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(env.githubToken ? { Authorization: `Bearer ${env.githubToken}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (res.status === 404) throw new ApiError(404, 'GitHub user not found');
  if (!res.ok) throw new ApiError(502, `GitHub API error (${res.status})`);
  return res.json();
}

async function fetchContributions(username) {
  if (!env.githubToken) return null; // the contribution calendar is only available through GraphQL, which needs a token
  try {
    const data = await gh('/graphql', {
      body: {
        query: `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}`,
        variables: { login: username },
      },
    });
    const cal = data?.data?.user?.contributionsCollection?.contributionCalendar;
    if (!cal) return null;
    return {
      total: cal.totalContributions,
      days: cal.weeks.flatMap((w) => w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount }))),
    };
  } catch {
    return null; // optional extra, never fail the whole response for it
  }
}

function summarize(user, repos, events, contributions) {
  const own = repos.filter((r) => !r.fork && !r.archived);
  const languages = {};
  for (const r of own) if (r.language) languages[r.language] = (languages[r.language] || 0) + 1;

  const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const pushes = events.filter((e) => e.type === 'PushEvent' && new Date(e.created_at).getTime() >= since);

  return {
    profile: {
      login: user.login,
      name: user.name,
      bio: user.bio,
      avatarUrl: user.avatar_url,
      url: user.html_url,
      followers: user.followers,
      following: user.following,
      publicRepos: user.public_repos,
    },
    stats: {
      totalStars: own.reduce((n, r) => n + r.stargazers_count, 0),
      totalForks: own.reduce((n, r) => n + r.forks_count, 0),
      repoCount: own.length,
    },
    // Number of repositories per primary language (a fact, not a skill rating)
    languages: Object.entries(languages)
      .map(([name, repoCount]) => ({ name, repoCount }))
      .sort((a, b) => b.repoCount - a.repoCount),
    recentRepos: own
      .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
      .slice(0, 8)
      .map((r) => ({
        name: r.name,
        description: r.description,
        url: r.html_url,
        homepage: r.homepage || null,
        language: r.language,
        stars: r.stargazers_count,
        forks: r.forks_count,
        topics: r.topics || [],
        pushedAt: r.pushed_at,
      })),
    activity: {
      pushesLast30Days: pushes.length,
      activeReposLast30Days: new Set(pushes.map((e) => e.repo?.name)).size,
    },
    contributions, // null without GITHUB_TOKEN
    fetchedAt: new Date().toISOString(),
  };
}

export async function getGithubSummary(username) {
  if (!USERNAME_RE.test(username || '')) throw new ApiError(400, 'Invalid GitHub username');
  const key = username.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;

  try {
    const [user, repos, events, contributions] = await Promise.all([
      gh(`/users/${username}`),
      gh(`/users/${username}/repos?per_page=100&sort=pushed&type=owner`),
      gh(`/users/${username}/events/public?per_page=100`).catch(() => []),
      fetchContributions(username),
    ]);
    const data = summarize(user, repos, events, contributions);
    cache.set(key, { at: Date.now(), data });
    return data;
  } catch (err) {
    // Rate-limited or GitHub down: serve the last good copy rather than breaking the page
    if (hit && err.statusCode !== 404) return { ...hit.data, stale: true };
    if (err instanceof ApiError) throw err;
    throw new ApiError(502, 'GitHub is currently unavailable');
  }
}
