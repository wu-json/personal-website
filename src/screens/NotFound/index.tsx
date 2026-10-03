import { type CSSProperties, useEffect, useState } from 'react';
import { useJitter } from 'src/hooks/useJitter';
import { Link } from 'wouter';

const SHED_PETALS = [
  { angle: 0, delay: 14800, dx: -5, spin: -80 },
  { angle: 72, delay: 4600, dx: 9, spin: 65 },
  { angle: 144, delay: 11400, dx: 6, spin: 75 },
  { angle: 216, delay: 1200, dx: -8, spin: -70 },
  { angle: 288, delay: 8000, dx: -10, spin: -60 },
];

const SHED_FALL_MS = 3800;
const BARE_PAUSE_MS = 1400;
const CYCLE_MS =
  Math.max(...SHED_PETALS.map(p => p.delay)) + SHED_FALL_MS + BARE_PAUSE_MS;

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
      <circle cx='50' cy='50' r='8' fill='currentColor' opacity='0.55' />
    </svg>
  </div>
);

const NotFoundScreen = () => {
  const jitter = useJitter();
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setCycle(c => c + 1), CYCLE_MS);
    return () => clearTimeout(timer);
  }, [cycle]);

  return (
    <div className='w-full min-h-screen bg-black flex items-center justify-center md:pr-40'>
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
