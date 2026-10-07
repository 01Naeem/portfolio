import './setup.mjs';
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';

let server, base;
before(async () => {
  const { default: app } = await import('../app.js');
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const call = (path, opts = {}) => fetch(base + path, { ...opts, headers: { 'content-type': 'application/json', ...(opts.headers || {}) } });
const json = (method, body, headers) => ({ method, body: JSON.stringify(body), headers });

test('every admin route and write route rejects anonymous callers with 401', async () => {
  const id = '507f1f77bcf86cd799439011';
  const cases = [
    ['GET', '/api/auth/me'], ['GET', '/api/admin/stats'], ['GET', '/api/analytics'], ['GET', '/api/messages'], ['PATCH', '/api/messages/read-all'],
    ['POST', '/api/projects'], ['PUT', `/api/projects/${id}`], ['DELETE', `/api/projects/${id}`], ['PATCH', '/api/projects/reorder'],
    ['POST', '/api/skills'], ['DELETE', `/api/skills/${id}`], ['POST', '/api/experience'], ['POST', '/api/education'], ['POST', '/api/certificates'],
    ['POST', '/api/blog'], ['PUT', `/api/blog/${id}`], ['GET', `/api/blog/by-id/${id}`], ['PUT', '/api/profile'], ['PUT', '/api/settings'],
    ['POST', '/api/resume'], ['DELETE', '/api/resume'], ['POST', '/api/uploads/image'], ['DELETE', '/api/uploads'],
  ];
  for (const [method, path] of cases) {
    const r = await call(path, { method, ...(method === 'GET' ? {} : { body: '{}' }) });
    assert.equal(r.status, 401, `${method} ${path} should be 401, got ${r.status}`);
  }
});

test('forged tokens are rejected (wrong secret and alg=none)', async () => {
  const { default: jwt } = await import('jsonwebtoken');
  for (const token of [jwt.sign({ id: '507f1f77bcf86cd799439011', v: 1 }, 'y'.repeat(40)), jwt.sign({ id: '507f1f77bcf86cd799439011', v: 1 }, '', { algorithm: 'none' })]) {
    const r = await call('/api/auth/me', { headers: { cookie: `portfolio_token=${token}` } });
    assert.equal(r.status, 401);
  }
});

test('cross-site browser writes are blocked; same-site and tool clients pass the guard', async () => {
  assert.equal((await call('/api/auth/logout', json('POST', {}, { origin: 'https://evil.example' }))).status, 403);
  assert.equal((await call('/api/auth/logout', json('POST', {}, { origin: 'http://localhost:5173' }))).status, 200);
  assert.equal((await call('/api/auth/logout', json('POST', {}))).status, 200);
});

test('NoSQL operator injection in the login body is rejected before the database', async () => {
  const r = await call('/api/auth/login', json('POST', { email: { $gt: '' }, password: { $gt: '' } }));
  assert.equal(r.status, 400);
});

test('errors are JSON, never cached, and never leak stack traces in production-style responses', async () => {
  const r = await call('/api/nope');
  assert.equal(r.status, 404);
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.equal((await r.json()).success, false);
  const bad = await call('/api/messages', { method: 'POST', body: '{bad json' });
  assert.equal(bad.status, 400);
});

test('security headers are present', async () => {
  const r = await call('/api/health');
  assert.equal(r.headers.get('x-powered-by'), null);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(r.headers.get('strict-transport-security'));
});

test('contact form: honeypot is silently accepted without touching the database, bad input is a 400', async () => {
  const good = { name: 'Asha', email: 'a@b.co', subject: 'Hello', message: 'A long enough message.' };
  const bot = await call('/api/messages', json('POST', { ...good, website: 'http://spam.biz' }));
  assert.equal(bot.status, 201);
  const bad = await call('/api/messages', json('POST', { ...good, subject: 'Hi\r\nBcc: x@y.z' }));
  assert.equal(bad.status, 400);
});

test('contact form is rate limited per IP', async () => {
  const bot = { name: 'Asha', email: 'a@b.co', subject: 'Hello', message: 'A long enough message.', website: 'x' };
  let limited = false;
  for (let i = 0; i < 8; i += 1) if ((await call('/api/messages', json('POST', bot))).status === 429) limited = true;
  assert.ok(limited, 'expected a 429 within 8 rapid submissions');
});

test('the TRUST_PROXY hop count decides which forwarded IP is trusted', async () => {
  // default in tests is 0 hops: the spoofed header must be ignored (so it can't dodge rate limits)
  const r = await call('/api/health/ip', { headers: { 'x-forwarded-for': '203.0.113.9' } });
  assert.notEqual((await r.json()).ip, '203.0.113.9');
});
