import { z } from 'zod';
import { httpUrl, optionalHttpUrl, socialUrl, image, tagList, order, date } from './common.js';
import { isReservedSlug } from '../utils/slugify.js';

const str = (max, min = 0) => z.string().trim().min(min).max(max);

export const projectSchema = z.object({
  title: str(120, 1),
  shortDescription: str(300, 1),
  description: str(8000).optional(),
  technologies: tagList(),
  categories: z.array(z.enum(['Frontend', 'Backend', 'Full Stack'])).max(3),
  githubUrl: optionalHttpUrl,
  liveUrl: optionalHttpUrl,
  coverImage: image.nullable(),
  screenshots: z.array(image).max(12),
  features: tagList(30, 200),
  challenges: tagList(20, 500),
  solutions: tagList(20, 500),
  completedAt: date,
  featured: z.boolean(),
  published: z.boolean(),
  order,
});
export const projectCreate = projectSchema.partial().required({ title: true, shortDescription: true });
export const projectUpdate = projectSchema.partial();

export const skillSchema = z.object({
  name: str(60, 1),
  category: z.enum(['Frontend', 'Backend', 'Database', 'Tools', 'Other']),
  icon: str(60),
  level: z.enum(['Learning', 'Comfortable', 'Proficient', 'Advanced', '']),
  years: z.number().min(0).max(50),
  description: str(300),
  order,
});
export const skillCreate = skillSchema.partial().required({ name: true, category: true });
export const skillUpdate = skillSchema.partial();

export const experienceSchema = z.object({
  organization: str(120, 1),
  position: str(120, 1),
  type: z.enum(['Job', 'Internship', 'Training', 'Freelance', 'Open Source']),
  startDate: z.coerce.date(),
  endDate: date,
  current: z.boolean(),
  description: str(2000),
  responsibilities: tagList(30, 400),
  technologies: tagList(),
  certificateUrl: optionalHttpUrl,
  logo: image.nullable(),
  order,
});
export const experienceCreate = experienceSchema.partial().required({ organization: true, position: true, startDate: true });
export const experienceUpdate = experienceSchema.partial();

const year = z.number().int().min(1980).max(2100);
export const educationSchema = z.object({
  degree: str(120, 1),
  fieldOfStudy: str(120),
  institution: str(160, 1),
  university: str(160),
  startYear: year,
  graduationYear: year.nullable(),
  ongoing: z.boolean(),
  coursework: tagList(40, 120),
  description: str(1500),
  order,
});
export const educationCreate = educationSchema.partial().required({ degree: true, institution: true, startYear: true });
export const educationUpdate = educationSchema.partial();

export const certificateSchema = z.object({
  name: str(160, 1),
  issuer: str(120, 1),
  issueDate: date,
  credentialId: str(120),
  credentialUrl: optionalHttpUrl,
  image: image.nullable(),
  order,
});
export const certificateCreate = certificateSchema.partial().required({ name: true, issuer: true });
export const certificateUpdate = certificateSchema.partial();

const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, numbers and hyphens only').max(80).refine((v) => !isReservedSlug(v), 'This slug is reserved, please choose another');
export const blogSchema = z.object({
  title: str(160, 1),
  slug,
  excerpt: str(300),
  content: z.string().min(1).max(100000),
  coverImage: image.nullable(),
  tags: tagList(10, 30),
  category: str(60),
  status: z.enum(['draft', 'published']),
  publishedAt: date,
  seo: z.object({ title: str(70), description: str(170) }).partial(),
});
export const blogCreate = blogSchema.partial().required({ title: true, content: true });
export const blogUpdate = blogSchema.partial();

export const profileSchema = z
  .object({
    name: str(80, 1),
    title: str(120),
    tagline: str(240),
    bio: str(3000),
    summary: str(3000),
    careerObjective: str(1500),
    currentFocus: str(1000),
    philosophy: str(1500),
    location: str(120),
    email: z.union([z.string().trim().toLowerCase().email(), z.literal('')]),
    phone: str(30),
    avatar: image.nullable(),
    availability: z.object({ isOpenToWork: z.boolean(), label: str(120) }).partial(),
    currentRole: str(120),
    primaryTechnologies: tagList(),
    currentlyLearning: tagList(),
    socialLinks: z
      .array(z.object({ platform: str(40, 1), label: str(60).optional(), url: socialUrl, order: order.optional() }))
      .max(20),
    github: z
      .object({
        enabled: z.boolean(),
        username: z.string().trim().regex(/^([a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38})?$/i, 'Invalid GitHub username'),
      })
      .partial(),
  })
  .partial();

export const settingsSchema = z
  .object({
    siteTitle: str(70),
    metaDescription: str(170),
    canonicalUrl: optionalHttpUrl,
    favicon: image.nullable(),
    ogImage: image.nullable(),
    hero: z.object({ title: str(120), subtitle: str(240) }).partial(),
    contact: z
      .object({
        email: z.union([z.string().trim().email(), z.literal('')]),
        notificationEmail: z.union([z.string().trim().email(), z.literal('')]),
        showPhone: z.boolean(),
      })
      .partial(),
    theme: z
      .object({
        defaultMode: z.enum(['dark', 'light', 'system']),
        accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a 6-digit hex color'),
      })
      .partial(),
    animations: z.object({ enabled: z.boolean(), intensity: z.enum(['subtle', 'normal']) }).partial(),
    sections: z
      .object({ showBlog: z.boolean(), showGithub: z.boolean(), showCertificates: z.boolean(), showTestimonials: z.boolean() })
      .partial(),
    analytics: z.object({ enabled: z.boolean() }).partial(),
    seo: z.object({ robotsIndex: z.boolean(), twitterHandle: str(40) }).partial(),
  })
  .partial();

export const messageUpdate = z.object({ read: z.boolean() });
