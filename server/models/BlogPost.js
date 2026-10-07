import mongoose from 'mongoose';
import { isReservedSlug, slugify } from '../utils/slugify.js';

const blogPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, unique: true, index: true },
    excerpt: { type: String, maxlength: 300 },
    content: { type: String, required: true },
    coverImage: { url: String, publicId: String, alt: String },
    tags: [{ type: String, trim: true, lowercase: true }],
    category: { type: String, trim: true },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    publishedAt: Date,
    readingTimeMinutes: Number,
    seo: { title: String, description: String },
  },
  { timestamps: true }
);

blogPostSchema.index({ title: 'text', content: 'text', tags: 'text' });

blogPostSchema.pre('validate', async function prepare(next) {
  if (this.isModified('title') || !this.slug) {
    let base = slugify(this.slug || this.title) || 'post';
    if (isReservedSlug(base)) base = `${base}-post`;
    let candidate = base;
    let i = 1;
    // eslint-disable-next-line no-await-in-loop
    while (await this.constructor.exists({ slug: candidate, _id: { $ne: this._id } })) {
      i += 1;
      candidate = `${base}-${i}`;
    }
    this.slug = candidate;
  }
  if (this.status === 'published' && !this.publishedAt) this.publishedAt = new Date();
  if (this.isModified('content')) {
    const words = this.content.trim().split(/\s+/).length;
    this.readingTimeMinutes = Math.max(1, Math.ceil(words / 200));
  }
  next();
});

export default mongoose.model('BlogPost', blogPostSchema);
