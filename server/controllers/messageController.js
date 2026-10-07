import Message from '../models/Message.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/respond.js';
import { getPagination, pageMeta } from '../utils/paginate.js';
import { escapeRegex } from '../utils/escapeRegex.js';

export const listMessages = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 15, maxLimit: 50 });
  const filter = {};
  if (req.query.status === 'read') filter.read = true;
  if (req.query.status === 'unread') filter.read = false;
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : '';
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { subject: rx }, { message: rx }];
  }
  const [items, total, unread] = await Promise.all([
    Message.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Message.countDocuments(filter),
    Message.countDocuments({ read: false }),
  ]);
  ok(res, items, { meta: { ...pageMeta(total, page, limit), unread } });
});

export const getMessage = asyncHandler(async (req, res) => {
  const msg = await Message.findById(req.params.id).lean();
  if (!msg) throw new ApiError(404, 'Message not found');
  ok(res, msg);
});

export const setRead = asyncHandler(async (req, res) => {
  const msg = await Message.findByIdAndUpdate(req.params.id, { read: req.body.read }, { new: true });
  if (!msg) throw new ApiError(404, 'Message not found');
  ok(res, msg);
});

export const markAllRead = asyncHandler(async (req, res) => {
  const r = await Message.updateMany({ read: false }, { read: true });
  ok(res, { modified: r.modifiedCount });
});

export const deleteMessage = asyncHandler(async (req, res) => {
  const msg = await Message.findByIdAndDelete(req.params.id);
  if (!msg) throw new ApiError(404, 'Message not found');
  ok(res, { message: 'Message deleted' });
});
