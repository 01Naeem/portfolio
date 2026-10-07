import mongoose from 'mongoose';
import Project from '../models/Project.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/respond.js';
import { snapshotAssets, cleanupRemoved, destroyAllIn } from '../services/uploadService.js';
import { getPagination, pageMeta } from '../utils/paginate.js';
import { escapeRegex } from '../utils/escapeRegex.js';

const str = (v) => (typeof v === 'string' ? v.trim() : '');

export const listProjects = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 12, maxLimit: 50 });
  const filter = {};
  if (!(req.user && req.query.all === 'true')) filter.published = true;

  const category = str(req.query.category);
  if (['Frontend', 'Backend', 'Full Stack'].includes(category)) filter.categories = category;
  const tech = str(req.query.tech);
  if (tech) filter.technologies = new RegExp(`^${escapeRegex(tech)}$`, 'i');
  if (req.query.featured === 'true') filter.featured = true;
  const q = str(req.query.q).slice(0, 80);
  if (q) filter.$text = { $search: q };

  const [items, total] = await Promise.all([
    Project.find(filter)
      .select('-description -challenges -solutions -screenshots')
      .sort({ featured: -1, order: 1, completedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Project.countDocuments(filter),
  ]);
  ok(res, items, { meta: pageMeta(total, page, limit) });
});

// :idOrSlug — public pages use the slug, the admin editor uses the id
export const getProject = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const query = mongoose.isValidObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };
  const project = await Project.findOne(query).lean();
  if (!project || (!project.published && !req.user)) throw new ApiError(404, 'Project not found');
  ok(res, project);
});

export const createProject = asyncHandler(async (req, res) => {
  const count = await Project.countDocuments();
  ok(res, await Project.create({ order: count, ...req.body }), { status: 201 });
});

export const updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new ApiError(404, 'Project not found');
  const before = snapshotAssets(project);
  project.set(req.body);
  await project.save();
  await cleanupRemoved(before, project);
  ok(res, project);
});

export const toggleFeatured = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new ApiError(404, 'Project not found');
  project.featured = !project.featured;
  await project.save();
  ok(res, project);
});

export const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findByIdAndDelete(req.params.id);
  if (!project) throw new ApiError(404, 'Project not found');
  await destroyAllIn(project);
  ok(res, { message: 'Project deleted' });
});

// Privacy-friendly counter: no IP, no cookie, just an integer.
export const trackClick = asyncHandler(async (req, res) => {
  await Project.updateOne({ _id: req.params.id, published: true }, { $inc: { clicks: 1 } });
  ok(res, { tracked: true });
});
