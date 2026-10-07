import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

const MAX_MB = 5;

// Files stay in memory and are streamed straight to Cloudinary; nothing touches disk.
const single = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MB * 1024 * 1024, files: 1, fields: 5, fieldSize: 1024 },
}).single('file');

// Never trust the client's mimetype or extension: identify the file by its leading bytes.
// SVG is intentionally unsupported (it can carry scripts).
export function sniffType(buf) {
  if (!buf || buf.length < 12) return null;
  const hex = buf.subarray(0, 12).toString('hex');
  if (hex.startsWith('ffd8ff')) return 'jpeg';
  if (hex.startsWith('89504e470d0a1a0a')) return 'png';
  if (buf.subarray(0, 6).toString('ascii').startsWith('GIF8')) return 'gif';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  if (hex.startsWith('00000100')) return 'ico';
  if (buf.subarray(0, 5).toString('ascii') === '%PDF-') return 'pdf';
  return null;
}

const IMAGE_TYPES = new Set(['jpeg', 'png', 'gif', 'webp', 'ico']);

export const ensureCloudinary = (req, res, next) =>
  env.cloudinary.enabled
    ? next()
    : next(new ApiError(503, 'Media uploads are not configured. Add the Cloudinary variables to the server environment.'));

const parse = (req, res, next) => single(req, res, next);

const check = (allowed, label) => (req, res, next) => {
  if (!req.file) return next(new ApiError(400, 'No file uploaded (field name must be "file")'));
  const type = sniffType(req.file.buffer);
  if (!type || !allowed.has(type)) return next(new ApiError(400, `File is not a valid ${label}`));
  req.fileType = type;
  next();
};

export const imageUpload = [ensureCloudinary, parse, check(IMAGE_TYPES, 'image (JPG, PNG, WebP, GIF or ICO)')];
export const pdfUpload = [ensureCloudinary, parse, check(new Set(['pdf']), 'PDF')];
