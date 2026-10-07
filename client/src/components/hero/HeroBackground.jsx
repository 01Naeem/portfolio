// Decorative only (aria-hidden). Everything animates with transform/opacity so it stays on the GPU compositor;
// there are no filters, no canvas and no JavaScript in the animation loop.
export default function HeroBackground() {
  return (
    <div aria-hidden="true" className="hero-bg pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="hero-grid absolute inset-0" />
      <div className="hero-orb hero-orb-a" />
      <div className="hero-orb hero-orb-b" />
      <div className="hero-orb hero-orb-c" />
      <div className="hero-fade absolute inset-x-0 bottom-0 h-40" />
    </div>
  );
}
