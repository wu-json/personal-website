import { type CSSProperties, useEffect, useState } from 'react';
import { useJitter } from 'src/hooks/useJitter';
import { Link } from 'wouter';

// Starts as the healthy five-petal flower (same 0/72/144/216/288deg
// geometry as MenuToggle in RootLayout), then sheds — staggered delays
// drop a different petal every few seconds until only the bare center
// is left. Fall order hops around the bloom rather than going in a
// circle, and `dx`/`spin` give each fall its own tilt and side so no
// two petals replay the same path. `dx` is CSS px on the 64px box.
const SHED_PETALS = [
  { angle: 0, delay: 14800, dx: -5, spin: -80 },
  { angle: 72, delay: 4600, dx: 9, spin: 65 },
  { angle: 144, delay: 11400, dx: 6, spin: 75 },
  { angle: 216, delay: 1200, dx: -8, spin: -70 },
  { angle: 288, delay: 8000, dx: -10, spin: -60 },
];

const SHED_FALL_MS = 3800; // keep in sync with petal-shed in index.css
const BARE_PAUSE_MS = 1400;
// Full loop: last petal lands, the bare center holds a beat, then the
// flower glitches back in and sheds again.
const CYCLE_MS =
  Math.max(...SHED_PETALS.map(p => p.delay)) + SHED_FALL_MS + BARE_PAUSE_MS;

// Each petal is its own absolutely-stacked <svg> so the shed animation
// runs on HTML elements, where transform/opacity stay on the
// compositor — the same animation on SVG child nodes repaints the
// whole graphic every frame. The glow is a radial-gradient halo whose
// opacity pulses, replacing menu-flower-glow's animated drop-shadow
// filter: that re-rasterizes per frame for the life of the page, the
// kind of sustained filter work the home lily also avoids.
// text-white matches this screen's idiom (the light theme remaps
// bg-black/text-white utilities globally, so it flips with the rest).
const SheddingFlower = () => (
  <div aria-hidden className='relative h-16 w-16 text-white'>
    <div className='flower-halo absolute -inset-4' />
    {SHED_PETALS.map(p => (
      <svg
        key={p.angle}
        viewBox='0 0 100 100'
        fill='none'
        className='petal-shed absolute inset-0 h-full w-full'
        style={
          {
            '--shed-from': `${p.angle}deg`,
            '--shed-delay': `${p.delay}ms`,
            '--shed-dx': `${p.dx}px`,
            '--shed-spin': `${p.spin}deg`,
          } as CSSProperties
        }
      >
        <ellipse cx='50' cy='22' rx='10' ry='22' fill='currentColor' />
      </svg>
    ))}
    <svg viewBox='0 0 100 100' fill='none' className='h-full w-full'>
      {/* Dimmer than the petals so the core reads as its own element —
          both against the full bloom and once it's all that's left. */}
      <circle cx='50' cy='50' r='8' fill='currentColor' opacity='0.55' />
    </svg>
  </div>
);

const NotFoundScreen = () => {
  const jitter = useJitter();
  // Remounting the content block via `key` at the end of each shed cycle
  // restarts every CSS animation inside it: the petals re-attach for the
  // next shed, and the bio-glitch entrance replays across the flower,
  // the 404 headline, the subtitle, and the link — the same glitch the
  // page plays on load.
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setCycle(c => c + 1), CYCLE_MS);
    return () => clearTimeout(timer);
  }, [cycle]);

  return (
    <div className='w-full min-h-screen bg-black flex items-center justify-center lg:pr-40'>
      <div
        key={cycle}
        className='flex flex-col items-center gap-3 px-6 text-center'
      >
        <div className='bio-glitch mb-5' style={jitter()}>
          <SheddingFlower />
        </div>
        <h1
          className='bio-glitch text-white text-6xl sm:text-7xl font-pixel leading-none'
          style={jitter()}
        >
          404
        </h1>
        <p
          className='bio-glitch text-white/25 text-sm font-pixel tracking-widest'
          style={jitter()}
        >
          ページが見つかりません
        </p>
        <Link
          to='/'
          className='bio-glitch mt-5 text-white/30 text-xs sm:text-[10px] font-mono uppercase tracking-widest hover:text-white hover:[text-shadow:0_0_6px_rgba(255,255,255,0.3)] transition-all duration-300'
          style={jitter()}
        >
          {'< return home'}
        </Link>
      </div>
    </div>
  );
};

export { NotFoundScreen };
