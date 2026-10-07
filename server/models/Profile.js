import mongoose from 'mongoose';

const socialLinkSchema = new mongoose.Schema(
  {
    platform: { type: String, required: true, trim: true }, // github, linkedin, twitter, email, custom...
    label: { type: String, trim: true },
    url: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

const imageSchema = new mongoose.Schema(
  { url: String, publicId: String },
  { _id: false }
);

const profileSchema = new mongoose.Schema(
  {
    // Singleton: only one document is ever used (see Profile.getSingleton)
    key: { type: String, default: 'main', unique: true, immutable: true },
    name: { type: String, default: 'Your Name', trim: true, maxlength: 80 },
    title: { type: String, default: 'Software Engineer / MERN Stack Developer', trim: true, maxlength: 120 },
    tagline: { type: String, default: 'Building scalable, responsive and user-focused web applications.', maxlength: 240 },
    bio: { type: String, default: 'Placeholder bio. Replace this from the admin panel.', maxlength: 3000 },
    summary: { type: String, maxlength: 3000 },
    careerObjective: { type: String, maxlength: 1500 },
    currentFocus: { type: String, maxlength: 1000 },
    philosophy: { type: String, maxlength: 1500 },
    location: { type: String, trim: true, maxlength: 120 },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    avatar: imageSchema,
    availability: {
      isOpenToWork: { type: Boolean, default: true },
      label: { type: String, default: 'Open to Software Engineering Opportunities', maxlength: 120 },
    },
    currentRole: { type: String, trim: true, maxlength: 120 },
    primaryTechnologies: [{ type: String, trim: true }],
    currentlyLearning: [{ type: String, trim: true }],
    resume: {
      url: String,
      publicId: String,
      fileName: String,
      uploadedAt: Date,
      downloadCount: { type: Number, default: 0 },
    },
    socialLinks: [socialLinkSchema],
    github: {
      enabled: { type: Boolean, default: false },
      username: { type: String, trim: true },
    },
  },
  { timestamps: true }
);

profileSchema.statics.getSingleton = async function getSingleton() {
  return this.findOneAndUpdate(
    { key: 'main' },
    { $setOnInsert: { key: 'main' } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

export default mongoose.model('Profile', profileSchema);
