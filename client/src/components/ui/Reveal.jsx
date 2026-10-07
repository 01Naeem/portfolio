import { m } from 'motion/react';

// Scroll-reveal wrapper. Durations stay in the 300-700ms range; MotionConfig at the app root
// (reducedMotion="user") strips the movement for visitors who prefer reduced motion.
const EASE = [0.22, 1, 0.36, 1];

export function Reveal({ children, delay = 0, y = 16, className, as = 'div', ...rest }) {
  const Tag = m[as] || m.div;
  return (
    <Tag
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: EASE, delay }}
      className={className}
      {...rest}
    >
      {children}
    </Tag>
  );
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } } };

export const Stagger = ({ children, className, as = 'div' }) => {
  const Tag = m[as] || m.div;
  return (
    <Tag variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} className={className}>
      {children}
    </Tag>
  );
};
export const StaggerItem = ({ children, className, as = 'div' }) => {
  const Tag = m[as] || m.div;
  return <Tag variants={item} className={className}>{children}</Tag>;
};
