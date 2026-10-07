import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, match: [/^\S+@\S+\.\S+$/, 'Invalid email'] },
    subject: { type: String, required: true, trim: true, maxlength: 150 },
    message: { type: String, required: true, trim: true, maxlength: 3000 },
    read: { type: Boolean, default: false },
    // Stored as a hash only (privacy-conscious abuse tracking)
    ipHash: { type: String, select: false },
    emailNotified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

messageSchema.index({ read: 1, createdAt: -1 });

export default mongoose.model('Message', messageSchema);
