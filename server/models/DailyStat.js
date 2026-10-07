import mongoose from 'mongoose';

// Privacy-friendly analytics: one counter per (UTC day, page). No IP, no cookie, no visitor id.
const dailyStatSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // YYYY-MM-DD (UTC)
    path: { type: String, required: true, maxlength: 120 },
    views: { type: Number, default: 0 },
  },
  { timestamps: false }
);
dailyStatSchema.index({ date: 1, path: 1 }, { unique: true });

export default mongoose.model('DailyStat', dailyStatSchema);
