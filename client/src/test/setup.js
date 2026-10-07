import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.dataset.theme = 'dark';
  document.documentElement.style.removeProperty('--accent-base');
});

// jsdom lacks these; motion's whileInView and the theme code use them
globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
window.matchMedia ||= (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
window.scrollTo = () => {};
Element.prototype.scrollIntoView = () => {};
