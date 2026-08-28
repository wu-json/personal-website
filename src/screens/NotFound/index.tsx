import type { CSSProperties } from 'react';
import { useJitter } from 'src/hooks/useJitter';
import { Link } from 'wouter';

// Starts as the healthy five-petal flower (same 0/72/144/216/288deg
// geometry as MenuToggle in RootLayout), then sheds — staggered delays
// drop a different petal every few seconds until only the bare center
// is left. Fall order hops around the bloom rather than going in a
// circle, and `dx`/`spin` give each fall its own tilt and side so no
// two petals replay the same path.
const SHED_PETALS = [
  { angle: 0, delay: 14800, dx: -8, spin: -80 },
  { angle: 72, delay: 4600, dx: 14, spin: 65 },
  { angle: 144, delay: 11400, dx: 10, spin: 75 },
  { angle: 216, delay: 1200, dx: -12, spin: -70 },
  { angle: 288, delay: 8000, dx: -16, spin: -60 },
];

const WiltedFlower = () => (
  <svg
    width='64'
    height='64'
    viewBox='0 0 100 100'
    fill='none'
    aria-hidden
    className='menu-flower menu-flower-glow text-[var(--color-ink)]'
  >
    {SHED_PETALS.map(p => (
      <ellipse
        key={p.angle}
        cx='50'
        cy='22'
        rx='10'
        ry='22'
        fill='currentColor'
        className='petal-shed'
        style={
          {
            '--shed-from': `${p.angle}deg`,
            '--shed-delay': `${p.delay}ms`,
            '--shed-dx': `${p.dx}px`,
            '--shed-spin': `${p.spin}deg`,
          } as CSSProperties
        }
      />
    ))}
    <circle cx='50' cy='50' r='8' fill='currentColor' opacity='0.9' />
  </svg>
);

const NotFoundScreen = () => {
  const jitter = useJitter();

  return (
    <div className='w-full min-h-screen bg-black flex items-center justify-center md:pr-40'>
      <div className='flex flex-col items-center gap-3 px-6 text-center'>
        <div className='bio-glitch mb-5' style={jitter()}>
          <WiltedFlower />
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
