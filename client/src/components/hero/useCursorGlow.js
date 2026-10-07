import { useEffect } from 'react';

const SIZE = 520;

// A soft light that follows the pointer inside the hero. It only moves a single element with a compositor-friendly
// transform, coalesced to one update per frame, and it is skipped entirely on touch devices and for people who
// prefer reduced motion.
export function useCursorGlow(rootRef, glowRef, enabled) {
  useEffect(() => {
    const root = rootRef.current;
    const glow = glowRef.current;
    if (!enabled || !root || !glow) return undefined;
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    let raf = 0;
    let cx = 0;
    let cy = 0;
    const paint = () => {
      raf = 0;
      const r = root.getBoundingClientRect();
      glow.style.transform = `translate3d(${cx - r.left - SIZE / 2}px, ${cy - r.top - SIZE / 2}px, 0)`;
    };
    const move = (e) => {
      cx = e.clientX;
      cy = e.clientY;
      glow.style.opacity = '1';
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const leave = () => { glow.style.opacity = '0'; };
    root.addEventListener('pointermove', move, { passive: true });
    root.addEventListener('pointerleave', leave);
    return () => {
      root.removeEventListener('pointermove', move);
      root.removeEventListener('pointerleave', leave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [rootRef, glowRef, enabled]);
}
