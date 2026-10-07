import Profile from '../models/Profile.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/respond.js';
import { getGithubSummary } from '../services/githubService.js';

// Public, but the username comes from the admin's saved profile, never from the request,
// so visitors can't use this endpoint to burn the API quota on arbitrary accounts.
export const getGithub = asyncHandler(async (req, res) => {
  const { github } = await Profile.getSingleton();
  if (!github?.enabled || !github?.username) throw new ApiError(404, 'GitHub integration is not enabled');
  ok(res, await getGithubSummary(github.username));
});
