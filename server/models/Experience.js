import mongoose from 'mongoose';

const experienceSchema = new mongoose.Schema(
  {
    organization: { type: String, required: true, trim: true, maxlength: 120 },
    position: { type: String, required: true, trim: true, maxlength: 120 },
    type: { type: String, enum: ['Job', 'Internship', 'Training', 'Freelance', 'Open Source'], default: 'Training' },
    startDate: { type: Date, required: true },
    endDate: Date,
    current: { type: Boolean, default: false },
    description: { type: String, maxlength: 2000 },
    responsibilities: [{ type: String, trim: true }],
    technologies: [{ type: String, trim: true }],
    certificateUrl: { type: String, trim: true },
    logo: { url: String, publicId: String },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

experienceSchema.pre('validate', function checkDates(next) {
  if (this.endDate && this.endDate < this.startDate) {
    return next(new Error('End date cannot be before start date'));
  }
  if (this.current) this.endDate = undefined;
  next();
});

export default mongoose.model('Experience', experienceSchema);
