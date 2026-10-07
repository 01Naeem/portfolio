import mongoose from 'mongoose';

const siteSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true, immutable: true },
    siteTitle: { type: String, default: 'Portfolio | Software Engineer', maxlength: 70 },
    metaDescription: { type: String, default: 'Portfolio of a MERN stack developer.', maxlength: 170 },
    canonicalUrl: { type: String, trim: true },
    favicon: { url: String, publicId: String },
    ogImage: { url: String, publicId: String },
    hero: {
      title: { type: String, default: '' }, // optional: overrides Profile title in the hero
      subtitle: { type: String, default: '' }, // optional: overrides Profile tagline in the hero
    },
    contact: {
      email: String,
      notificationEmail: String, // where contact-form alerts are sent
      showPhone: { type: Boolean, default: false },
    },
    theme: {
      defaultMode: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
      accentColor: { type: String, default: '#6366f1', match: /^#[0-9a-fA-F]{6}$/ },
    },
    animations: {
      enabled: { type: Boolean, default: true },
      intensity: { type: String, enum: ['subtle', 'normal'], default: 'subtle' },
    },
    sections: {
      showBlog: { type: Boolean, default: true },
      showGithub: { type: Boolean, default: false },
      showCertificates: { type: Boolean, default: true },
      showTestimonials: { type: Boolean, default: false },
    },
    analytics: { enabled: { type: Boolean, default: true } },
    seo: {
      robotsIndex: { type: Boolean, default: true },
      twitterHandle: String,
    },
  },
  { timestamps: true }
);

siteSettingsSchema.statics.getSingleton = async function getSingleton() {
  return this.findOneAndUpdate(
    { key: 'main' },
    { $setOnInsert: { key: 'main' } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

export default mongoose.model('SiteSettings', siteSettingsSchema);
