import { Code2, Server } from 'lucide-react';
import { techKey } from './heroData.js';

// lucide has no brand logos, so the four MERN marks are simple line drawings; everything else gets a neutral glyph.
const svg = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: false };

export default function TechIcon({ name, className = 'size-4' }) {
  switch (techKey(name)) {
    case 'react':
      return (
        <svg {...svg} className={className}>
          <circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" />
          <ellipse cx="12" cy="12" rx="9.5" ry="3.7" />
          <ellipse cx="12" cy="12" rx="9.5" ry="3.7" transform="rotate(60 12 12)" />
          <ellipse cx="12" cy="12" rx="9.5" ry="3.7" transform="rotate(120 12 12)" />
        </svg>
      );
    case 'node':
      return (
        <svg {...svg} className={className}>
          <path d="M12 2.5 20.5 7.3v9.4L12 21.5l-8.5-4.8V7.3z" />
          <path d="M9.2 9.2v5.6M9.2 9.2l5.6 5.6M14.8 9.2v5.6" opacity="0.7" />
        </svg>
      );
    case 'mongodb':
      return (
        <svg {...svg} className={className}>
          <path d="M12 2.5c-2.8 3.3-5 6.3-5 9.8a5 5 0 0 0 10 0c0-3.5-2.2-6.5-5-9.8z" />
          <path d="M12 12.5v9" />
        </svg>
      );
    case 'express':
      return <Server className={className} strokeWidth={1.5} aria-hidden="true" />;
    default:
      return <Code2 className={className} strokeWidth={1.5} aria-hidden="true" />;
  }
}
