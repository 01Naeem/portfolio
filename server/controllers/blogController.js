import mongoose from 'mongoose';
import BlogPost from '../models/BlogPost.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/respond.js';
import { snapshotAssets, cleanupRemoved, destroyAllIn } from '../services/uploadService.js';
import { getPagination, pageMeta } from '../utils/paginate.js';

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const liveFilter = () => ({ status: 'published', publishedAt: { $lte: new Date() } });

export const listPosts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 9, maxLimit: 30 });
  const isAdminAll = Boolean(req.user) && req.query.all === 'true';
  const filter = isAdminAll ? {} : liveFilter();

  if (isAdminAll && ['draft', 'published'].includes(req.query.status)) filter.status = req.query.status;
  const tag = str(req.query.tag).toLowerCase();
  if (tag) filter.tags = tag;
  const category = str(req.query.category);
  if (category) filter.category = category;
  const q = str(req.query.q).slice(0, 80);
  if (q) filter.$text = { $search: q };

  const [items, total] = await Promise.all([
    BlogPost.find(filter).select('-content').sort({ publishedAt: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    BlogPost.countDocuments(filter),
  ]);
  ok(res, items, { meta: pageMeta(total, page, limit) });
});

export const getPostBySlug = asyncHandler(async (req, res) => {
  const filter = req.user ? { slug: req.params.slug } : { slug: req.params.slug, ...liveFilter() };
  const post = await BlogPost.findOne(filter).lean();
  if (!post) throw new ApiError(404, 'Post not found');
  ok(res, post);
});

export const getPostById = asyncHandler(async (req, res) => {
  const post = await BlogPost.findById(req.params.id).lean();
  if (!post) throw new ApiError(404, 'Post not found');
  ok(res, post);
});

export const createPost = asyncHandler(async (req, res) => ok(res, await BlogPost.create(req.body), { status: 201 }));

export const updatePost = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid id');
  const post = await BlogPost.findById(req.params.id);
  if (!post) throw new ApiError(404, 'Post not found');
  const before = snapshotAssets(post);
  post.set(req.body);
  await post.save();
  await cleanupRemoved(before, post);
  ok(res, post);
});

export const deletePost = asyncHandler(async (req, res) => {
  const post = await BlogPost.findByIdAndDelete(req.params.id);
  if (!post) throw new ApiError(404, 'Post not found');
  await destroyAllIn(post);
  ok(res, { message: 'Post deleted' });
});

// Tags and categories that actually have published posts, for the public filter chips.
export const getBlogMeta = asyncHandler(async (req, res) => {
  const match = { $match: liveFilter() };
  const [tags, categories] = await Promise.all([
    BlogPost.aggregate([match, { $unwind: '$tags' }, { $group: { _id: '$tags', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }, { $limit: 30 }]),
    BlogPost.aggregate([match, { $match: { category: { $nin: [null, ''] } } }, { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }, { $limit: 20 }]),
  ]);
  ok(res, {
    tags: tags.map((t) => ({ name: t._id, count: t.count })),
    categories: categories.map((c) => ({ name: c._id, count: c.count })),
  });
});
