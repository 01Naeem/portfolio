import mongoose from 'mongoose';

const educationSchema = new mongoose.Schema(
  {
    degree: { type: String, required: true, trim: true, maxlength: 120 },
    fieldOfStudy: { type: String, trim: true, maxlength: 120 },
    institution: { type: String, required: true, trim: true, maxlength: 160 },
    university: { type: String, trim: true, maxlength: 160 },
    startYear: { type: Number, required: true, min: 1980, max: 2100 },
    graduationYear: { type: Number, min: 1980, max: 2100 },
    ongoing: { type: Boolean, default: false },
    coursework: [{ type: String, trim: true }],
    description: { type: String, maxlength: 1500 },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Education', educationSchema);
