import DailyStat from '../models/DailyStat.js';
import Project from '../models/Project.js';
import Profile from '../models/Profile.js';
import Message from '../models/Message.js';
import SiteSettings from '../models/SiteSettings.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/respond.js';
import { MAX_PATHS_PER_DAY, fillSeries, normalizePath, utcDay } from '../utils/analytics.js';

export const trackView = asyncHandler(async (req, res) => {
  const settings = await SiteSettings.getSingleton();
  let path = normalizePath(req.body.path);
  if (!path || settings.analytics?.enabled === false) return ok(res, { tracked: false });

  const date = utcDay();
  // Cap distinct paths per day; overflow is folded into one bucket instead of growing forever
  if (!(await DailyStat.exists({ date, path })) && (await DailyStat.countDocuments({ date })) >= MAX_PATHS_PER_DAY) path = '/other';
  await DailyStat.updateOne({ date, path }, { $inc: { views: 1 } }, { upsert: true });
  ok(res, { tracked: true });
});

const RANGES = [7, 30, 90];

export const getAnalytics = asyncHandler(async (req, res) => {
  const days = RANGES.includes(Number(req.query.days)) ? Number(req.query.days) : 30;
  const since = utcDay(new Date(Date.now() - (days - 1) * 86400000));
  const sinceDate = new Date(`${since}T00:00:00Z`);

  const [daily, topPages, allTime, topProjects, profile, contactInRange, messagesTotal] = await Promise.all([
    DailyStat.aggregate([{ $match: { date: { $gte: since } } }, { $group: { _id: '$date', views: { $sum: '$views' } } }]),
    DailyStat.aggregate([
      { $match: { date: { $gte: since } } },
      { $group: { _id: '$path', views: { $sum: '$views' } } },
      { $sort: { views: -1 } },
      { $limit: 10 },
    ]),
    DailyStat.aggregate([{ $group: { _id: null, views: { $sum: '$views' } } }]),
    Project.find({ clicks: { $gt: 0 } }).sort({ clicks: -1 }).limit(5).select('title slug clicks').lean(),
    Profile.findOne({ key: 'main' }).select('resume.downloadCount').lean(),
    Message.countDocuments({ createdAt: { $gte: sinceDate } }),
    Message.countDocuments(),
  ]);

  const series = fillSeries(daily, days);
  ok(res, {
    days,
    series,
    viewsInRange: series.reduce((n, d) => n + d.views, 0),
    viewsAllTime: allTime[0]?.views || 0,
    topPages: topPages.map((p) => ({ path: p._id, views: p.views })),
    topProjects,
    resumeDownloads: profile?.resume?.downloadCount || 0,
    contactSubmissions: contactInRange,
    messagesTotal,
  });
});
