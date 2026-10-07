// Diagnoses Cloudinary upload problems by showing the RAW reply (the SDK hides the body on errors like 403).
// Usage (from server/):  node scripts/checkCloudinary.js      or      npm run check:cloudinary
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();
const raw = {
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
};

const mask = (v) => (!v ? '(missing)' : v.length <= 6 ? '*'.repeat(v.length) : `${v.slice(0, 3)}…${v.slice(-2)} (${v.length} chars)`);
const problems = [];
console.log('1) Configuration (secrets are masked)');
for (const [k, v] of Object.entries(raw)) {
  console.log(`   ${k.padEnd(24)} ${k === 'CLOUDINARY_CLOUD_NAME' ? v ?? '(missing)' : mask(v)}`);
  if (!v) problems.push(`${k} is not set`);
  else {
    if (v !== v.trim()) problems.push(`${k} has leading/trailing whitespace`);
    if (/^["'].*["']$/.test(v)) problems.push(`${k} is wrapped in quotes; remove them in .env (the quotes become part of the value on some hosts)`);
    if (/\s/.test(v.trim())) problems.push(`${k} contains a space`);
  }
}
if (raw.CLOUDINARY_API_KEY && !/^\d{10,20}$/.test(raw.CLOUDINARY_API_KEY.trim())) problems.push('CLOUDINARY_API_KEY is normally 15 digits; it does not look like one');
if (raw.CLOUDINARY_CLOUD_NAME && /[A-Z\s]/.test(raw.CLOUDINARY_CLOUD_NAME.trim())) problems.push('CLOUDINARY_CLOUD_NAME should be the lowercase "cloud name" from the dashboard, not your display/account name');
problems.forEach((p) => console.log(`   ⚠  ${p}`));
if (!raw.CLOUDINARY_CLOUD_NAME || !raw.CLOUDINARY_API_KEY || !raw.CLOUDINARY_API_SECRET) process.exit(1);

const cloud = raw.CLOUDINARY_CLOUD_NAME.trim();
const key = raw.CLOUDINARY_API_KEY.trim();
const secret = raw.CLOUDINARY_API_SECRET.trim();
const show = async (label, res) => {
  const text = await res.text();
  const type = res.headers.get('content-type') || '';
  console.log(`   HTTP ${res.status} ${res.statusText}   content-type: ${type || '(none)'}   server: ${res.headers.get('server') || '(none)'}`);
  console.log(`   body: ${text.slice(0, 400).replace(/\s+/g, ' ') || '(empty)'}`);
  const date = res.headers.get('date');
  if (date) {
    const skew = Math.round((Date.now() - new Date(date).getTime()) / 1000);
    if (Math.abs(skew) > 300) console.log(`   ⚠  your computer's clock is ${skew}s away from the server's; signed requests can fail. Sync your system time.`);
  }
  return { status: res.status, text, type };
};
const explain = ({ status, text, type }) => {
  if (status === 200) return 'OK';
  const isJson = /json/i.test(type);
  // Cloudinary always answers in JSON. Plain text/HTML means a firewall, proxy, VPN or hosting egress filter replied instead.
  if (!isJson) return 'This reply is NOT from Cloudinary (Cloudinary always answers with JSON). A firewall, proxy, VPN, antivirus HTTPS scanner, college/office network or hosting-environment egress filter is blocking api.cloudinary.com. Try another network (e.g. a phone hotspot), turn off the VPN/proxy, or add api.cloudinary.com to the allowed hosts. Your credentials may be perfectly fine.';
  let msg = '';
  try { msg = JSON.parse(text)?.error?.message || ''; } catch { /* keep generic */ }
  if (status === 401) return `Cloudinary rejected the credentials${msg ? ` ("${msg}")` : ''}: cloud name, API key and secret must all come from the SAME dashboard environment, with no typos.`;
  if (status === 403 && /missing permissions/i.test(msg)) return `Your credentials are VALID but this API key is not allowed to do that action ("${msg.replace(/^\[[^\]]*\]\s*/, '')}"). Reads work, uploads don't. In the Cloudinary console, edit the key's permissions to allow creating and deleting assets, or create a new key with full access, then update CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in server/.env and restart the server.`;
  if (status === 403) return `Cloudinary itself refused this key/account${msg ? `: "${msg}"` : ''}. In the dashboard check: the API key is Active and not restricted, the account isn't suspended/disabled, and Settings > Security has no rule blocking uploads. Creating a fresh API key often fixes it.`;
  if (status === 404) return `Cloud name not found${msg ? ` ("${msg}")` : ''}: re-copy it from the dashboard ("Cloud name", top-left).`;
  if (status === 420 || status === 429) return 'Rate or quota limit reached on the Cloudinary account.';
  return `Unexpected status${msg ? `: "${msg}"` : ''}; the body above is Cloudinary's own explanation.`;
};

const run = async () => {
  console.log('\n2) Admin API ping  (GET /v1_1/<cloud>/ping, Basic auth)');
  let ping;
  try {
    ping = await show('ping', await fetch(`https://api.cloudinary.com/v1_1/${cloud}/ping`, { headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}` }, signal: AbortSignal.timeout(15000) }));
  } catch (e) {
    console.log(`   Could not reach api.cloudinary.com: ${e.cause?.code || e.message}`);
    console.log('   → DNS/firewall/proxy/VPN problem on this machine or network. Try another network.');
    process.exit(2);
  }
  console.log(`   → ${explain(ping)}`);

  console.log('\n3) Signed test upload (a 1×1 PNG, into portfolio/diagnostics, deleted right after)');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = 'portfolio/diagnostics';
  const signature = crypto.createHash('sha1').update(`folder=${folder}&timestamp=${timestamp}${secret}`).digest('hex');
  const form = new FormData();
  form.append('file', new Blob([png], { type: 'image/png' }), 'pixel.png');
  Object.entries({ api_key: key, timestamp, folder, signature }).forEach(([k, v]) => form.append(k, String(v)));
  const up = await show('upload', await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: 'POST', body: form, signal: AbortSignal.timeout(30000) }));
  console.log(`   → ${explain(up)}`);

  if (up.status === 200) {
    cloudinary.config({ cloud_name: cloud, api_key: key, api_secret: secret, secure: true });
    try {
      await cloudinary.uploader.destroy(JSON.parse(up.text).public_id);
      console.log('   test image removed.');
    } catch { /* cleanup is best effort */ }

    // The resume is a PDF, and Cloudinary blocks PDF *delivery* on new accounts until a setting is enabled.
    console.log('\n4) PDF round trip (upload a tiny PDF, then download it the way the resume page does)');
    const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 10 10]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');
    const ts = Math.floor(Date.now() / 1000);
    const publicId = `diag-${ts}.pdf`;
    const sig = crypto.createHash('sha1').update(`folder=${folder}&public_id=${publicId}&timestamp=${ts}${secret}`).digest('hex');
    const f2 = new FormData();
    f2.append('file', new Blob([pdf], { type: 'application/pdf' }), 'diag.pdf');
    Object.entries({ api_key: key, timestamp: ts, folder, public_id: publicId, signature: sig }).forEach(([k, v]) => f2.append(k, String(v)));
    const pdfUp = await show('pdf upload', await fetch(`https://api.cloudinary.com/v1_1/${cloud}/raw/upload`, { method: 'POST', body: f2, signal: AbortSignal.timeout(30000) }));
    if (pdfUp.status !== 200) { console.log(`   → ${explain(pdfUp)}`); process.exit(3); }
    const stored = JSON.parse(pdfUp.text);
    console.log(`   downloading ${stored.secure_url}`);
    const dl = await fetch(stored.secure_url, { signal: AbortSignal.timeout(20000) });
    console.log(`   HTTP ${dl.status}   content-type: ${dl.headers.get('content-type')}   x-cld-error: ${dl.headers.get('x-cld-error') || '(none)'}`);
    try { await cloudinary.uploader.destroy(stored.public_id, { resource_type: 'raw' }); console.log('   test PDF removed.'); } catch { /* best effort */ }
    if (dl.ok) {
      console.log('   → PDF delivery works.');
      console.log('\nCloudinary works from this machine. If the app still fails, restart the server so it reloads .env, and re-check the variable names.');
    } else {
      console.log('   → Uploads work but Cloudinary refuses to DELIVER the PDF. In the Cloudinary console open Settings > Security, find "Restricted media types", and enable "PDF and ZIP files delivery". Then run this check again.');
      process.exit(5);
    }
  } else {
    console.log('\nShare the HTTP status and the "body:" line above (they contain no secrets) if you need more help.');
    process.exit(3);
  }
};
run().catch((e) => { console.error('Diagnostic failed:', e.message); process.exit(4); });
