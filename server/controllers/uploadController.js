import { z } from 'zod';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/respond.js';
import { uploadBuffer, destroyAsset } from '../services/uploadService.js';

const FOLDERS = ['projects', 'certificates', 'profile', 'blog', 'experience', 'site'];

// Caps dimensions and lets Cloudinary pick quality/format, so huge phone photos don't ship to visitors.
const OPTIMIZE = [{ width: 2000, height: 2000, crop: 'limit', quality: 'auto', fetch_format: 'auto' }];

export const uploadImage = asyncHandler(async (req, res) => {
  const folder = FOLDERS.includes(req.body?.folder) ? req.body.folder : 'misc';
  if (req.fileType === 'ico' && folder !== 'site') throw new ApiError(400, 'ICO files are only allowed for the site favicon');
  const result = await uploadBuffer(req.file.buffer, {
    folder,
    transformation: ['jpeg', 'png', 'webp'].includes(req.fileType) ? OPTIMIZE : undefined,
  });
  ok(
    res,
    { url: result.secure_url, publicId: result.public_id, width: result.width, height: result.height, bytes: result.bytes },
    { status: 201 }
  );
});

export const deleteImageSchema = z.object({ publicId: z.string().max(200).startsWith('portfolio/') });

// For discarding an upload the admin never saved (e.g. closed the form).
export const deleteImage = asyncHandler(async (req, res) => {
  await destroyAsset(req.body.publicId);
  ok(res, { message: 'Image removed' });
});
