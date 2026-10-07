import Profile from '../models/Profile.js';
import SiteSettings from '../models/SiteSettings.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/respond.js';
import { flatten } from '../utils/flatten.js';
import { snapshotAssets, cleanupRemoved, destroyAllIn } from '../services/uploadService.js';

export const getProfile = asyncHandler(async (req, res) => {
  const profile = (await Profile.getSingleton()).toObject();
  if (!req.user) {
    const settings = await SiteSettings.getSingleton();
    if (!settings.contact?.showPhone) delete profile.phone;
    delete profile.resume?.publicId;
  }
  ok(res, profile);
});

export const updateProfile = asyncHandler(async (req, res) => {
  const before = snapshotAssets(await Profile.getSingleton());
  const profile = await Profile.findOneAndUpdate(
    { key: 'main' },
    { $set: flatten(req.body, { replace: ['avatar'] }) }, // the image is written as one unit
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  // Resume is managed by /api/resume (raw asset), so only image assets are diffed here
  const keepResume = profile.resume?.publicId;
  before.delete(keepResume);
  await cleanupRemoved(before, profile);
  ok(res, profile);
});

export const getSettings = asyncHandler(async (req, res) => {
  const settings = (await SiteSettings.getSingleton()).toObject();
  if (!req.user) delete settings.contact?.notificationEmail; // admin-only
  ok(res, settings);
});

export const updateSettings = asyncHandler(async (req, res) => {
  const before = snapshotAssets(await SiteSettings.getSingleton());
  const settings = await SiteSettings.findOneAndUpdate(
    { key: 'main' },
    { $set: flatten(req.body, { replace: ['favicon', 'ogImage'] }) },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  await cleanupRemoved(before, settings);
  ok(res, settings);
});
