import './setup.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePath, fillSeries } from '../utils/analytics.js';
import { slugify, isReservedSlug } from '../utils/slugify.js';
import { flatten } from '../utils/flatten.js';
import { sniffType } from '../middleware/upload.js';
import { buildContactEmail } from '../services/mailService.js';
import { projectCreate, skillCreate, profileSchema, blogUpdate, settingsSchema } from '../validators/content.js';
import { passwordRule } from '../validators/auth.js';
import { contactSchema } from '../validators/contact.js';

test('analytics only counts real public routes', () => {
  assert.equal(normalizePath('/'), '/');
  assert.equal(normalizePath('/blog/?utm=1#x'), '/blog');
  assert.equal(normalizePath('/blog/my-post'), '/blog/my-post');
  for (const bad of ['/admin/x', '/wp-login.php', '/blog/<script>', '/blog/Bad', '/blog/' + 'a'.repeat(200), null, { a: 1 }]) assert.equal(normalizePath(bad), null);
});

test('analytics series has one entry per day, gaps filled with zero', () => {
  const s = fillSeries([{ _id: '2026-10-10', views: 5 }, { _id: '2026-10-08', views: 2 }], 3, new Date('2026-10-10T12:00:00Z'));
  assert.deepEqual(s, [{ date: '2026-10-08', views: 2 }, { date: '2026-10-09', views: 0 }, { date: '2026-10-10', views: 5 }]);
});

test('slugs: sanitised, and reserved API sub-routes are protected', () => {
  assert.equal(slugify('  Hello, World! 2026 '), 'hello-world-2026');
  assert.ok(isReservedSlug('meta') && isReservedSlug('by-id') && !isReservedSlug('my-post'));
  assert.equal(blogUpdate.safeParse({ slug: 'meta' }).success, false);
  assert.equal(blogUpdate.safeParse({ slug: 'Bad Slug' }).success, false);
  assert.equal(blogUpdate.safeParse({ slug: 'good-slug' }).success, true);
});

test('flatten keeps sibling fields safe on nested partial updates', () => {
  assert.deepEqual(Object.keys(flatten({ hero: { title: 'A' }, tags: ['x'] })).sort(), ['hero.title', 'tags']);
  assert.equal(flatten({ d: new Date(0) }).d instanceof Date, true);
  assert.deepEqual(flatten({ e: {} }), { e: {} });
});

test('flatten writes image objects as ONE value (regression: PathNotViable when the stored image was null)', () => {
  const img = { url: 'https://res.cloudinary.com/x/a.png', publicId: 'portfolio/profile/a', alt: '' };
  // A profile save: nested containers are split into dotted paths, the avatar is not.
  const update = flatten({ title: 'Dev', availability: { isOpenToWork: true, label: 'Open' }, avatar: img }, { replace: ['avatar'] });
  assert.deepEqual(update, { title: 'Dev', 'availability.isOpenToWork': true, 'availability.label': 'Open', avatar: img });
  assert.ok(!Object.keys(update).some((k) => k.startsWith('avatar.')), 'must never emit avatar.url / avatar.publicId');
  // Removing the image stays a plain null
  assert.deepEqual(flatten({ avatar: null }, { replace: ['avatar'] }), { avatar: null });
  // Settings: two image fields, plus nested groups that must still merge
  const s = flatten({ favicon: img, ogImage: null, theme: { accentColor: '#112233' } }, { replace: ['favicon', 'ogImage'] });
  assert.deepEqual(s, { favicon: img, ogImage: null, 'theme.accentColor': '#112233' });
});

test('uploads are identified by content, not by name or declared type', () => {
  const pad = Buffer.alloc(32);
  assert.equal(sniffType(Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), pad])), 'png');
  assert.equal(sniffType(Buffer.concat([Buffer.from('ffd8ffe0', 'hex'), pad])), 'jpeg');
  assert.equal(sniffType(Buffer.concat([Buffer.from('%PDF-1.7\n'), pad])), 'pdf');
  assert.equal(sniffType(Buffer.concat([Buffer.from('MZ'), pad])), null); // an .exe renamed .png
  assert.equal(sniffType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>')), null);
});

test('contact email: visitor goes in Reply-To (never From), HTML escaped', () => {
  const m = buildContactEmail({ name: 'Eve <script>', email: 'eve@x.com', subject: 'Hi', message: '<img src=x onerror=alert(1)>\nline2', createdAt: new Date(0) }, { to: 'me@x.com', from: 'Portfolio <p@x.com>' });
  assert.deepEqual(m.replyTo, { name: 'Eve <script>', address: 'eve@x.com' });
  assert.equal(m.from, 'Portfolio <p@x.com>');
  assert.ok(!m.html.includes('<img') && !m.html.includes('<script>'));
});

test('validators reject script-scheme URLs, mass assignment, fake percentages and weak passwords', () => {
  assert.equal(projectCreate.safeParse({ title: 'a', shortDescription: 'b', githubUrl: 'javascript:alert(1)' }).success, false);
  assert.equal(projectCreate.safeParse({ title: 'a', shortDescription: 'b', liveUrl: 'data:text/html,x' }).success, false);
  assert.deepEqual(Object.keys(projectCreate.parse({ title: 'a', shortDescription: 'b', isAdmin: true, clicks: 999 })), ['title', 'shortDescription']);
  assert.equal('percentage' in skillCreate.parse({ name: 'React', category: 'Frontend', percentage: 95 }), false);
  assert.equal(profileSchema.safeParse({ socialLinks: [{ platform: 'x', url: 'javascript:1' }] }).success, false);
  assert.equal(profileSchema.safeParse({ socialLinks: [{ platform: 'email', url: 'mailto:a@b.co' }] }).success, true);
  assert.equal(settingsSchema.safeParse({ theme: { accentColor: 'red' } }).success, false);
  assert.equal(passwordRule.safeParse('password').success, false);
  assert.equal(passwordRule.safeParse('Str0ngPassw0rd!').success, true);
});

test('contact schema blocks header injection and over-long input', () => {
  const ok = { name: 'Asha', email: 'a@b.co', subject: 'Hello', message: 'A long enough message.' };
  assert.equal(contactSchema.safeParse(ok).success, true);
  assert.equal(contactSchema.safeParse({ ...ok, subject: 'Hi\r\nBcc: victim@x.com' }).success, false);
  assert.equal(contactSchema.safeParse({ ...ok, name: 'A\nB' }).success, false);
  assert.equal(contactSchema.safeParse({ ...ok, message: 'x'.repeat(3001) }).success, false);
});

test('Cloudinary SDK failures become clear, actionable API errors (not a bare 500)', async () => {
  const { mapCloudinaryError } = await import('../services/uploadService.js');
  const realFetch = globalThis.fetch;
  const reply = (status, type, body) => async () => new Response(body, { status, headers: { 'content-type': type } });
  try {
    const sdk403 = { message: 'Server returned unexpected status code - 403', http_code: 403, name: 'UnexpectedResponse' };

    // a middlebox answered (plain text): blame the network, not the credentials
    globalThis.fetch = reply(403, 'text/plain', 'Host not in allowlist: api.cloudinary.com.');
    const filtered = await mapCloudinaryError(sdk403);
    assert.equal(filtered.statusCode, 502);
    assert.match(filtered.message, /Something between this server and Cloudinary/);
    assert.match(filtered.message, /Host not in allowlist/);
    assert.match(filtered.message, /not a problem with your credentials/);

    // Cloudinary answered in JSON: relay its own reason
    globalThis.fetch = reply(403, 'application/json', '{"error":{"message":"Account is disabled"}}');
    const refused = await mapCloudinaryError(sdk403);
    assert.match(refused.message, /Cloudinary refused the request \(HTTP 403\)/);
    assert.match(refused.message, /Account is disabled/);

    // valid credentials, but the key lacks the create permission (what a restricted API key returns)
    globalThis.fetch = reply(403, 'application/json', '{"error":{"message":"[prodenv:abc] Request forbidden due to missing permissions (actions=[\\"create\\"])"}}');
    const restricted = await mapCloudinaryError(sdk403);
    assert.match(restricted.message, /valid but is not allowed to upload/);
    assert.match(restricted.message, /new key with full access/);

    // couldn't even reach it to ask
    globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
    assert.match((await mapCloudinaryError(sdk403)).message, /could not be reached to explain/);

    assert.match((await mapCloudinaryError({ http_code: 401 })).message, /rejected the credentials/);
    assert.match((await mapCloudinaryError({ http_code: 404 })).message, /cloud name not found/i);
    assert.match((await mapCloudinaryError({ code: 'ENOTFOUND' })).message, /Could not reach Cloudinary/);
    assert.equal((await mapCloudinaryError({ http_code: 400, message: 'Invalid image file' })).statusCode, 400);
    assert.equal((await mapCloudinaryError(new Error('boom'))).statusCode, 502);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('resume delivery failures point at the Cloudinary PDF setting, with the real status', async () => {
  const { explainDeliveryFailure } = await import('../services/uploadService.js');
  const blocked = explainDeliveryFailure(401, 'Customer is marked as untrusted');
  assert.match(blocked, /HTTP 401/);
  assert.match(blocked, /Customer is marked as untrusted/);
  assert.match(blocked, /PDF and ZIP files delivery/);
  assert.match(explainDeliveryFailure(403), /Settings > Security/);
  assert.match(explainDeliveryFailure(404), /Upload the resume again/);
  assert.match(explainDeliveryFailure(500), /HTTP 500/);
});
