import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/respond.js';
import { signToken, setAuthCookie, clearAuthCookie } from '../utils/token.js';

const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;
// Compared against when the email is unknown so response time doesn't reveal valid emails.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role });

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    throw new ApiError(401, 'Invalid email or password');
  }
  if (user.isLocked) throw new ApiError(429, 'Too many failed attempts. Try again later.');

  if (!(await user.comparePassword(password))) {
    const attempts = user.failedLoginAttempts + 1;
    await User.updateOne(
      { _id: user._id },
      attempts >= MAX_ATTEMPTS
        ? { $set: { failedLoginAttempts: 0, lockUntil: new Date(Date.now() + LOCK_MS) } }
        : { $set: { failedLoginAttempts: attempts } }
    );
    throw new ApiError(401, 'Invalid email or password');
  }

  await User.updateOne(
    { _id: user._id },
    { $set: { failedLoginAttempts: 0, lastLoginAt: new Date() }, $unset: { lockUntil: 1 } }
  );
  setAuthCookie(res, signToken(user));
  ok(res, publicUser(user));
});

export const logout = (req, res) => {
  clearAuthCookie(res);
  ok(res, { message: 'Logged out' });
};

export const me = (req, res) => ok(res, publicUser(req.user));

// Invalidates every existing token for this admin (all devices), including the current one.
export const logoutAll = asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
  clearAuthCookie(res);
  ok(res, { message: 'Logged out of all devices' });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) throw new ApiError(400, 'Current password is incorrect');
  if (currentPassword === newPassword) throw new ApiError(400, 'New password must be different');

  user.password = newPassword; // pre-save hook hashes it and bumps tokenVersion
  await user.save();
  setAuthCookie(res, signToken(user)); // keep this session alive, kill all others
  ok(res, { message: 'Password updated' });
});
