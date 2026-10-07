import Project from '../models/Project.js';
import Skill from '../models/Skill.js';
import Certificate from '../models/Certificate.js';
import Message from '../models/Message.js';
import Experience from '../models/Experience.js';
import Education from '../models/Education.js';
import BlogPost from '../models/BlogPost.js';
import Profile from '../models/Profile.js';
import DailyStat from '../models/DailyStat.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/respond.js';

export const getStats = asyncHandler(async (req, res) => {
  const [projects, skills, certificates, messages, unreadMessages, experience, education, posts, draftPosts, clicks, profile, views] =
    await Promise.all([
      Project.countDocuments(),
      Skill.countDocuments(),
      Certificate.countDocuments(),
      Message.countDocuments(),
      Message.countDocuments({ read: false }),
      Experience.countDocuments(),
      Education.countDocuments(),
      BlogPost.countDocuments(),
      BlogPost.countDocuments({ status: 'draft' }),
      Project.aggregate([{ $group: { _id: null, total: { $sum: '$clicks' } } }]),
      Profile.findOne({ key: 'main' }).select('resume.downloadCount').lean(),
      DailyStat.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]),
    ]);
  ok(res, {
    projects,
    skills,
    certificates,
    messages,
    unreadMessages,
    experience,
    education,
    posts,
    draftPosts,
    projectClicks: clicks[0]?.total || 0,
    resumeDownloads: profile?.resume?.downloadCount || 0,
    pageViews: views[0]?.total || 0,
  });
});
