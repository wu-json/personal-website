import { useJitter } from 'src/hooks/useJitter';
import { Link, useLocation } from 'wouter';

// The healthy five-petal flower (see MenuToggle in RootLayout) sits at
// 0/72/144/216/288deg. Here one petal is gone — it's the loose one
// drifting below — and the rest sag toward the bottom of the bloom.
const WILTED_PETALS = [
  { angle: 118, opacity: 0.4 },
  { angle: 158, opacity: 0.7 },
  { angle: 202, opacity: 0.85 },
  { angle: 244, opacity: 0.55 },
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
    {WILTED_PETALS.map(p => (
      <ellipse
        key={p.angle}
        cx='50'
        cy='22'
        rx='10'
        ry='22'
        fill='currentColor'
        style={{
          transform: `rotate(${p.angle}deg)`,
          transformOrigin: '50px 50px',
          opacity: p.opacity,
        }}
      />
    ))}
    <ellipse
      cx='50'
      cy='22'
      rx='10'
      ry='22'
      fill='currentColor'
      className='petal-loose'
    />
    <circle cx='50' cy='50' r='8' fill='currentColor' opacity='0.9' />
  </svg>
);

const NotFoundScreen = () => {
  const jitter = useJitter();
  const [path] = useLocation();
  const shownPath = path.length > 40 ? `${path.slice(0, 40)}…` : path;

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
        <p
          className='bio-glitch text-white/30 text-xs font-mono break-all max-w-xs sm:max-w-md'
          style={jitter()}
        >
          {`// no record of ${shownPath} in the atlas`}
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
