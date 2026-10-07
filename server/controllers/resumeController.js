import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import Profile from '../models/Profile.js';
import SiteSettings from '../models/SiteSettings.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/respond.js';
import { uploadBuffer, destroyAsset, explainDeliveryFailure } from '../services/uploadService.js';

const safeName = (name = '') => {
  const base = name.replace(/\.pdf$/i, '').replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
  return `${base || 'Resume'}.pdf`;
};

// Metadata only. The file itself is served by getResumeFile so downloads can be counted.
export const getResumeInfo = asyncHandler(async (req, res) => {
  const { resume } = await Profile.getSingleton();
  ok(res, {
    available: Boolean(resume?.url),
    fileName: resume?.fileName || null,
    uploadedAt: resume?.uploadedAt || null,
    ...(req.user ? { downloadCount: resume?.downloadCount || 0 } : {}),
  });
});

export const uploadResume = asyncHandler(async (req, res) => {
  const fileName = safeName(req.file.originalname);
  const result = await uploadBuffer(req.file.buffer, {
    folder: 'resume',
    resourceType: 'raw',
    publicId: `resume-${Date.now()}.pdf`, // raw assets keep their extension in the public id
  });

  const before = await Profile.getSingleton();
  const oldId = before.resume?.publicId;
  const profile = await Profile.findOneAndUpdate(
    { key: 'main' },
    { $set: { 'resume.url': result.secure_url, 'resume.publicId': result.public_id, 'resume.fileName': fileName, 'resume.uploadedAt': new Date() } },
    { new: true }
  );
  if (oldId) await destroyAsset(oldId, 'raw'); // replace = remove the previous file
  ok(res, profile.resume, { status: 201 });
});

export const deleteResume = asyncHandler(async (req, res) => {
  const profile = await Profile.getSingleton();
  if (!profile.resume?.url) throw new ApiError(404, 'No resume uploaded');
  const oldId = profile.resume.publicId;
  await Profile.updateOne(
    { key: 'main' },
    { $unset: { 'resume.url': 1, 'resume.publicId': 1, 'resume.fileName': 1, 'resume.uploadedAt': 1 } }
  );
  if (oldId) await destroyAsset(oldId, 'raw');
  ok(res, { message: 'Resume deleted' });
});

// GET /api/resume/file            -> opens inline (View Resume / open in new tab)
// GET /api/resume/file?download=1 -> attachment, and counts as a download
export const getResumeFile = asyncHandler(async (req, res) => {
  const { resume } = await Profile.getSingleton();
  if (!resume?.url) throw new ApiError(404, 'Resume not available');

  let upstream;
  try {
    upstream = await fetch(resume.url, { signal: AbortSignal.timeout(15000) });
  } catch (err) {
    console.error(`Resume fetch failed: ${err.cause?.code || err.message}`);
    throw new ApiError(502, 'Could not reach Cloudinary to load the resume. Check the server\'s internet access and try again.');
  }
  if (!upstream.ok || !upstream.body) {
    const cldError = upstream.headers.get('x-cld-error') || '';
    console.error(`Resume fetch failed: HTTP ${upstream.status} x-cld-error="${cldError}" url=${resume.url}`);
    throw new ApiError(502, explainDeliveryFailure(upstream.status, cldError));
  }

  const download = req.query.download === '1';
  if (download) {
    const settings = await SiteSettings.getSingleton();
    if (settings.analytics?.enabled) await Profile.updateOne({ key: 'main' }, { $inc: { 'resume.downloadCount': 1 } });
  }

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${safeName(resume.fileName)}"`,
    'Cache-Control': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
    ...(upstream.headers.get('content-length') ? { 'Content-Length': upstream.headers.get('content-length') } : {}),
  });
  await pipeline(Readable.fromWeb(upstream.body), res);
});
