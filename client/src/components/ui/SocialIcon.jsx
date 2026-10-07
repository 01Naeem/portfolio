import { Globe, Link as LinkIcon, Mail } from 'lucide-react';

// lucide-react v1 dropped brand logos, so the few we need are drawn here.
const svg = { viewBox: '0 0 24 24', 'aria-hidden': true, focusable: false };

const Github = (p) => (
  <svg {...svg} fill="currentColor" {...p}>
    <path transform="scale(1.5)" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
  </svg>
);
const Linkedin = (p) => (
  <svg {...svg} fill="currentColor" {...p}>
    <rect x="2.5" y="9" width="4" height="12" rx="0.5" />
    <circle cx="4.5" cy="4.5" r="2.2" />
    <path d="M9.5 9h3.8v1.8c.6-1.1 2-2.1 4-2.1 3.6 0 4.2 2.4 4.2 5.4V21h-4v-6.2c0-1.5-.1-2.8-1.8-2.8s-2.2 1.3-2.2 2.8V21h-4z" />
  </svg>
);
const XLogo = (p) => (
  <svg {...svg} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
    <path d="M4 4l16 16M20 4L4 20" />
  </svg>
);
const Instagram = (p) => (
  <svg {...svg} fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const MAP = { github: Github, linkedin: Linkedin, twitter: XLogo, x: XLogo, instagram: Instagram, email: Mail, mail: Mail, website: Globe, portfolio: Globe };

export default function SocialIcon({ platform = '', className = 'size-5' }) {
  const Icon = MAP[platform.toLowerCase()] || LinkIcon;
  return <Icon className={className} />;
}
