import mongoose from 'mongoose';

const skillSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    category: {
      type: String,
      required: true,
      enum: ['Frontend', 'Backend', 'Database', 'Tools', 'Other'],
    },
    // Lucide icon name or a Simple Icons slug; resolved on the frontend
    icon: { type: String, trim: true },
    // Descriptive level only. No fake percentages.
    level: { type: String, enum: ['Learning', 'Comfortable', 'Proficient', 'Advanced', ''], default: '' },
    years: { type: Number, min: 0, max: 50 },
    description: { type: String, maxlength: 300 },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

skillSchema.index({ category: 1, order: 1 });

export default mongoose.model('Skill', skillSchema);
