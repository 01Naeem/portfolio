import mongoose from 'mongoose';
import { slugify } from '../utils/slugify.js';

const imageSchema = new mongoose.Schema(
  { url: { type: String, required: true }, publicId: String, alt: { type: String, default: '' } },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, unique: true, index: true },
    shortDescription: { type: String, required: true, maxlength: 300 },
    description: { type: String, maxlength: 8000 },
    technologies: [{ type: String, trim: true }],
    categories: [{ type: String, enum: ['Frontend', 'Backend', 'Full Stack'] }],
    githubUrl: { type: String, trim: true },
    liveUrl: { type: String, trim: true },
    coverImage: imageSchema,
    screenshots: [imageSchema],
    features: [{ type: String, trim: true }],
    challenges: [{ type: String, trim: true }],
    solutions: [{ type: String, trim: true }],
    completedAt: Date,
    featured: { type: Boolean, default: false },
    published: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
  },
  { timestamps: true }
);

projectSchema.index({ title: 'text', shortDescription: 'text', technologies: 'text' });

projectSchema.pre('validate', async function makeSlug(next) {
  if (!this.isModified('title') && this.slug) return next();
  const base = slugify(this.title) || 'project';
  let candidate = base;
  let i = 1;
  // ensure uniqueness
  // eslint-disable-next-line no-await-in-loop
  while (await this.constructor.exists({ slug: candidate, _id: { $ne: this._id } })) {
    i += 1;
    candidate = `${base}-${i}`;
  }
  this.slug = candidate;
  next();
});

export default mongoose.model('Project', projectSchema);
