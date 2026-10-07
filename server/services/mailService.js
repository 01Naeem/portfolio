import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter;
const getTransporter = () => {
  if (!env.smtp.enabled) return null;
  transporter ||= nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
    connectionTimeout: 10000,
    socketTimeout: 15000,
  });
  return transporter;
};

const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Pure function (easy to test). The visitor's address goes in Reply-To, never in From,
// so the mail passes SPF/DKIM and "Reply" still goes to the visitor.
export function buildContactEmail(msg, { to, from }) {
  const received = new Date(msg.createdAt || Date.now()).toUTCString();
  return {
    from,
    to,
    replyTo: { name: msg.name, address: msg.email },
    subject: `[Portfolio] ${msg.subject}`,
    text: `New message from your portfolio\n\nName: ${msg.name}\nEmail: ${msg.email}\nReceived: ${received}\n\n${msg.message}\n`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:560px">
<h2 style="margin:0 0 12px">New portfolio message</h2>
<p style="margin:0 0 4px"><strong>${esc(msg.name)}</strong> &lt;${esc(msg.email)}&gt;</p>
<p style="margin:0 0 16px;color:#666;font-size:13px">${esc(received)}</p>
<p style="margin:0 0 8px"><strong>${esc(msg.subject)}</strong></p>
<div style="white-space:pre-wrap;border-left:3px solid #ddd;padding-left:12px">${esc(msg.message)}</div>
</div>`,
  };
}

// Returns true if sent, false if SMTP isn't configured. Throws on delivery errors.
export async function sendContactNotification(msg, to) {
  const t = getTransporter();
  if (!t || !to) return false;
  await t.sendMail(buildContactEmail(msg, { to, from: env.smtp.from }));
  return true;
}
