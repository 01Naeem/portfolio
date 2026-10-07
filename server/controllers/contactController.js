import crypto from 'node:crypto';
import Message from '../models/Message.js';
import Profile from '../models/Profile.js';
import SiteSettings from '../models/SiteSettings.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/respond.js';
import { env } from '../config/env.js';
import { sendContactNotification } from '../services/mailService.js';

const THANKS = { message: "Thanks for reaching out! I'll get back to you soon." };

async function resolveRecipient() {
  const settings = await SiteSettings.getSingleton();
  if (settings.contact?.notificationEmail) return settings.contact.notificationEmail;
  if (env.adminNotifyEmail) return env.adminNotifyEmail;
  return (await Profile.getSingleton()).email || null;
}

async function notifyAdmin(msg) {
  try {
    const to = await resolveRecipient();
    if (await sendContactNotification(msg, to)) await Message.updateOne({ _id: msg._id }, { emailNotified: true });
  } catch (err) {
    // The message is already safely stored; a mail outage must not surface to the visitor.
    console.error('Contact notification email failed:', err.message);
  }
}

export const submitContact = asyncHandler(async (req, res) => {
  const { website, ...data } = req.body;
  if (website) return ok(res, THANKS, { status: 201 }); // honeypot hit: pretend success, store nothing

  // Hash only, never the raw IP: enough to spot repeat abuse without keeping personal data.
  const ipHash = crypto.createHash('sha256').update(`${env.ipHashSalt}:${req.ip}`).digest('hex');
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  if (await Message.exists({ ipHash, message: data.message, createdAt: { $gte: hourAgo } })) {
    return ok(res, THANKS, { status: 201 }); // identical resubmission (double click / replay)
  }

  const msg = await Message.create({ ...data, ipHash });
  notifyAdmin(msg); // intentionally not awaited: the visitor shouldn't wait on SMTP
  ok(res, THANKS, { status: 201 });
});
