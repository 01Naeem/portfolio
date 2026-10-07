import mongoose from 'mongoose';

const certificateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    issuer: { type: String, required: true, trim: true, maxlength: 120 },
    issueDate: Date,
    credentialId: { type: String, trim: true },
    credentialUrl: { type: String, trim: true },
    image: { url: String, publicId: String },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Certificate', certificateSchema);
