import { Router } from 'express';
import Skill from '../models/Skill.js';
import Experience from '../models/Experience.js';
import Education from '../models/Education.js';
import Certificate from '../models/Certificate.js';
import Project from '../models/Project.js';
import { createCrud, reorderHandler } from '../controllers/crudFactory.js';
import * as projects from '../controllers/projectController.js';
import * as blog from '../controllers/blogController.js';
import * as singleton from '../controllers/singletonController.js';
import * as messages from '../controllers/messageController.js';
import { getStats } from '../controllers/adminController.js';
import { optionalAuth, protect, adminOnly, publicCache } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { reorderSchema } from '../validators/common.js';
import * as v from '../validators/content.js';
import { buildCrudRouter } from './crudRoutes.js';
import authRoutes from './authRoutes.js';
import { contactLimiter, viewLimiter } from '../middleware/rateLimiters.js';
import { z } from 'zod';
import { trackView, getAnalytics } from '../controllers/analyticsController.js';
import { imageUpload, pdfUpload } from '../middleware/upload.js';
import { contactSchema } from '../validators/contact.js';
import { submitContact } from '../controllers/contactController.js';
import { uploadImage, deleteImage, deleteImageSchema } from '../controllers/uploadController.js';
import * as seo from '../controllers/seoController.js';
import { getResumeInfo, getResumeFile, uploadResume, deleteResume } from '../controllers/resumeController.js';
import { getGithub } from '../controllers/githubController.js';

const router = Router();
const admin = [protect, adminOnly];

router.use('/auth', authRoutes);

// ---- simple ordered collections
router.use('/skills', buildCrudRouter(createCrud({ Model: Skill, name: 'Skill', sort: { category: 1, order: 1 }, filterFields: ['category'] }), { create: v.skillCreate, update: v.skillUpdate }));
router.use('/experience', buildCrudRouter(createCrud({ Model: Experience, name: 'Experience', sort: { startDate: -1 } }), { create: v.experienceCreate, update: v.experienceUpdate }));
router.use('/education', buildCrudRouter(createCrud({ Model: Education, name: 'Education', sort: { startYear: -1 } }), { create: v.educationCreate, update: v.educationUpdate }));
router.use('/certificates', buildCrudRouter(createCrud({ Model: Certificate, name: 'Certificate', sort: { issueDate: -1 } }), { create: v.certificateCreate, update: v.certificateUpdate }));

// ---- projects
const projectRouter = Router();
projectRouter.get('/', optionalAuth, publicCache(60), projects.listProjects);
projectRouter.patch('/reorder', ...admin, validate(reorderSchema), reorderHandler(Project));
projectRouter.post('/', ...admin, validate(v.projectCreate), projects.createProject);
projectRouter.post('/:id/click', projects.trackClick);
projectRouter.patch('/:id/featured', ...admin, projects.toggleFeatured);
projectRouter.get('/:idOrSlug', optionalAuth, publicCache(60), projects.getProject);
projectRouter.put('/:id', ...admin, validate(v.projectUpdate), projects.updateProject);
projectRouter.delete('/:id', ...admin, projects.deleteProject);
router.use('/projects', projectRouter);

// ---- blog
const blogRouter = Router();
blogRouter.get('/', optionalAuth, publicCache(60), blog.listPosts);
blogRouter.get('/meta', optionalAuth, publicCache(60), blog.getBlogMeta); // before /:slug
blogRouter.get('/by-id/:id', ...admin, blog.getPostById);
blogRouter.get('/:slug', optionalAuth, publicCache(60), blog.getPostBySlug);
blogRouter.post('/', ...admin, validate(v.blogCreate), blog.createPost);
blogRouter.put('/:id', ...admin, validate(v.blogUpdate), blog.updatePost);
blogRouter.delete('/:id', ...admin, blog.deletePost);
router.use('/blog', blogRouter);

// ---- profile & settings (singletons)
router.get('/profile', optionalAuth, publicCache(60), singleton.getProfile);
router.put('/profile', ...admin, validate(v.profileSchema), singleton.updateProfile);
router.get('/settings', optionalAuth, publicCache(60), singleton.getSettings);
router.put('/settings', ...admin, validate(v.settingsSchema), singleton.updateSettings);

// ---- messages: public contact form POST, everything else admin-only
const messageRouter = Router();
messageRouter.post('/', contactLimiter, validate(contactSchema), submitContact);
messageRouter.get('/', ...admin, messages.listMessages);
messageRouter.patch('/read-all', ...admin, messages.markAllRead);
messageRouter.get('/:id', ...admin, messages.getMessage);
messageRouter.patch('/:id', ...admin, validate(v.messageUpdate), messages.setRead);
messageRouter.delete('/:id', ...admin, messages.deleteMessage);
router.use('/messages', messageRouter);

// ---- uploads (admin)
router.post('/uploads/image', ...admin, ...imageUpload, uploadImage);
router.delete('/uploads', ...admin, validate(deleteImageSchema), deleteImage);

// ---- resume
router.get('/resume', optionalAuth, getResumeInfo);
router.get('/resume/file', getResumeFile);
router.post('/resume', ...admin, ...pdfUpload, uploadResume);
router.delete('/resume', ...admin, deleteResume);

// ---- GitHub (optional integration, username comes from the saved profile)
router.get('/github', optionalAuth, publicCache(600), getGithub);

// ---- SEO (public). Vercel maps /robots.txt and /sitemap.xml to these; see client/vercel.json
router.get('/robots.txt', seo.robotsTxt);
router.get('/sitemap.xml', seo.sitemapXml);
router.get('/share/home', seo.shareHome);
router.get('/share/projects/:slug', seo.shareProject);
router.get('/share/blog/:slug', seo.sharePost);

router.get('/admin/stats', ...admin, getStats);

// ---- analytics: public privacy-friendly view counter + admin report
router.post('/analytics/view', viewLimiter, validate(z.object({ path: z.string().max(200) })), trackView);
router.get('/analytics', ...admin, getAnalytics);

export default router;
