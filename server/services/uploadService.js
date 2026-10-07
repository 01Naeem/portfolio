import cloudinary from '../config/cloudinary.js';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

const ROOT = 'portfolio';

// The SDK only understands Cloudinary replies with status 200/400/401/404/420/429/500. Anything else (notably 403)
// becomes { name: 'UnexpectedResponse' } with the response body thrown away, so it can't distinguish "Cloudinary
// refused this key" from "a firewall/proxy answered instead". We ask Cloudinary's ping endpoint ourselves to read
// the real body, which is what makes the error message useful.
async function probeCloudinary() {
  const { cloudName, apiKey, apiSecret } = env.cloudinary;
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/ping`, {
      headers: { Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}` },
      signal: AbortSignal.timeout(5000),
    });
    const body = (await res.text()).replace(/\s+/g, ' ').trim().slice(0, 200);
    return { status: res.status, body, json: /json/i.test(res.headers.get('content-type') || '') };
  } catch {
    return null;
  }
}

export async function mapCloudinaryError(err) {
  const code = err?.http_code || err?.error?.http_code;
  const detail = err?.message || String(err);
  console.error(`Cloudinary error: http_code=${code ?? 'n/a'} name=${err?.name ?? 'n/a'} message=${detail}`);
  const network = err?.code || err?.cause?.code;
  if (['ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN'].includes(network)) {
    return new ApiError(502, "Could not reach Cloudinary from the server (network problem). Check the server's internet access, then try again.");
  }
  const hint = 'Run "npm run check:cloudinary" in the server folder for the full picture.';
  if (code === 401) return new ApiError(502, `Cloudinary rejected the credentials (401). Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET. ${hint}`);
  if (code === 403) {
    const probe = await probeCloudinary();
    console.error(`Cloudinary 403 probe: ${probe ? `status=${probe.status} json=${probe.json} body=${probe.body}` : 'unreachable'}`);
    if (probe && !probe.json) {
      return new ApiError(502, `Something between this server and Cloudinary is answering instead of Cloudinary (HTTP ${probe.status}: "${probe.body}"). This is a firewall, proxy, VPN or hosting egress filter, not a problem with your credentials. Try another network or allow api.cloudinary.com. ${hint}`);
    }
    if (probe && probe.json && /missing permissions/i.test(probe.body)) {
      return new ApiError(502, `This Cloudinary API key is valid but is not allowed to upload (${probe.body}). In the Cloudinary console, edit the key's permissions to allow creating and deleting assets, or create a new key with full access and update CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET.`);
    }
    if (probe && probe.json) {
      return new ApiError(502, `Cloudinary refused the request (HTTP ${probe.status}): ${probe.body}. Check the API key and account status in the Cloudinary dashboard. ${hint}`);
    }
    return new ApiError(502, `Cloudinary refused the request (403) and could not be reached to explain why. ${hint}`);
  }
  if (code === 404) return new ApiError(502, `Cloudinary cloud name not found (404). Check CLOUDINARY_CLOUD_NAME. ${hint}`);
  if (code === 420 || code === 429) return new ApiError(502, 'Cloudinary rate or quota limit reached. Try again later.');
  if (code === 400) return new ApiError(400, `Cloudinary could not process this file: ${detail}`);
  return new ApiError(502, `Image storage failed: ${detail}. ${hint}`);
}

export function uploadBuffer(buffer, { folder, resourceType = 'image', publicId, transformation } = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `${ROOT}/${folder}`,
        resource_type: resourceType,
        public_id: publicId,
        overwrite: false,
        ...(transformation ? { transformation } : {}),
      },
      (err, result) => (err ? mapCloudinaryError(err).then(reject) : resolve(result))
    );
    stream.end(buffer);
  });
}

// Best-effort: a failed cleanup must never break the request that triggered it.
export async function destroyAsset(publicId, resourceType = 'image') {
  if (!publicId || !publicId.startsWith(`${ROOT}/`)) return; // only touch assets this app created
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true });
  } catch (err) {
    console.error(`Cloudinary cleanup failed for ${publicId}:`, err.message);
  }
}

// Finds every `publicId` in a document (cover images, screenshots, logos...) regardless of nesting.
export function collectPublicIds(value, out = new Set()) {
  if (Array.isArray(value)) value.forEach((v) => collectPublicIds(v, out));
  else if (value && typeof value === 'object' && !(value instanceof Date) && !value._bsontype) {
    for (const [k, v] of Object.entries(value)) {
      if (k === 'publicId' && typeof v === 'string' && v) out.add(v);
      else collectPublicIds(v, out);
    }
  }
  return out;
}

export const snapshotAssets = (doc) => collectPublicIds(doc?.toObject ? doc.toObject() : doc);

// Deletes assets that were referenced before an update and aren't any more.
export async function cleanupRemoved(beforeIds, afterDoc) {
  const after = snapshotAssets(afterDoc);
  await Promise.all([...beforeIds].filter((id) => !after.has(id)).map((id) => destroyAsset(id)));
}

export const destroyAllIn = (doc) => Promise.all([...snapshotAssets(doc)].map((id) => destroyAsset(id)));

// Why Cloudinary would refuse to DELIVER a file it happily accepted (the classic one: new accounts have PDF delivery switched off).
export function explainDeliveryFailure(status, cldError = '') {
  const header = cldError ? ` (Cloudinary says: "${cldError}")` : '';
  if (status === 401 || status === 403 || /untrusted|deny|acl/i.test(cldError)) {
    return `Cloudinary is blocking delivery of this PDF (HTTP ${status})${header}. This is almost always an account setting, not a bug: in the Cloudinary console go to Settings > Security, find "Restricted media types" and enable "PDF and ZIP files delivery". Then try again (no re-upload needed).`;
  }
  if (status === 404) return `Cloudinary no longer has this file (HTTP 404)${header}. Upload the resume again from Admin > Resume.`;
  return `Could not retrieve the resume file from Cloudinary (HTTP ${status})${header}.`;
}
