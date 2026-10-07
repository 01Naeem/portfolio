// Tiny className joiner (no dependency needed for this).
export const cn = (...parts) => parts.flat().filter(Boolean).join(' ');
