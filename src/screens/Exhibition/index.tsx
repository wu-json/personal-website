import {
  lazy,
  type MouseEvent,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { LINEAR_SEGMENTS } from 'src/screens/Home/sections/MainBanner/LinearMark';
import { fragments, photoUrl } from 'src/screens/Memories/data';
import { FragmentDetail } from 'src/screens/Memories/FragmentDetail';
import type { Fragment } from 'src/screens/Memories/types';
import { Link, useLocation } from 'wouter';

const GalleryScreen = lazy(() =>
  import('src/screens/Gallery').then(m => ({ default: m.GalleryScreen })),
);

type Mode = 'cover' | '2d' | '3d';

const IDLE_BEFORE_ATTRACT_MS = 20000;
const ATTRACT_INTERVAL_MS = 7000;

const galleryPath = (id: string) => `/exhibition/${id}/3d`;
const albumPath = (id: string) => `/exhibition/${id}`;

const LinearLogo = ({ className }: { className?: string }) => (
  <svg
    viewBox='0 0 100 100'
    fill='currentColor'
    aria-hidden='true'
    className={className}
  >
    <path d={LINEAR_SEGMENTS.join('')} />
  </svg>
);

const Cover = ({
  fragment,
  active,
  eager,
}: {
  fragment: Fragment;
  active: boolean;
  eager: boolean;
}) => {
  const [seen, setSeen] = useState(active);
  const [sharp, setSharp] = useState(false);

  useEffect(() => {
    if (active) setSeen(true);
  }, [active]);

  const tone = fragment.coverClassName ?? '';

  return (
    <div className='exhibition-cover' data-active={active}>
      <img
        src={photoUrl(fragment.id, fragment.cover, 'thumb')}
        alt=''
        loading={eager ? 'eager' : 'lazy'}
        className={tone}
      />
      {seen && (
        <img
          src={photoUrl(fragment.id, fragment.cover, 'full')}
          alt=''
          onLoad={() => setSharp(true)}
          className={`transition-opacity duration-700 ${sharp ? 'opacity-100' : 'opacity-0'} ${tone}`}
        />
      )}
    </div>
  );
};

const ExhibitionScreen = ({ id, sub }: { id?: string; sub?: string }) => {
  const [, navigate] = useLocation();
  const routed = fragments.find(f => f.id === id);
  const mode: Mode = !routed ? 'cover' : sub === '3d' ? '3d' : '2d';
  const photo = mode === '2d' ? sub : undefined;
  const [previewId, setPreviewId] = useState(fragments[0].id);
  const activeId = routed?.id ?? previewId;
  const setActiveId = setPreviewId;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    if (routed) setPreviewId(routed.id);
  }, [routed]);
  const lastInputAt = useRef(0);
  const lastPointerType = useRef('mouse');
  const rowRefs = useRef(new Map<string, HTMLAnchorElement>());
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  const activeIndex = fragments.findIndex(f => f.id === activeId);
  const active = fragments[activeIndex];

  const step = useCallback((delta: number, reveal: boolean) => {
    if (modeRef.current !== 'cover') return;
    setPreviewId(current => {
      const i = fragments.findIndex(f => f.id === current);
      const next =
        fragments[(i + delta + fragments.length) % fragments.length].id;
      if (reveal) {
        rowRefs.current.get(next)?.scrollIntoView({ block: 'nearest' });
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const previous = document.title;
    document.title = 'Memories — Jason Wu';
    return () => {
      document.title = previous;
    };
  }, []);

  useEffect(() => {
    const touch = () => {
      lastInputAt.current = Date.now();
    };
    touch();
    const onPointerDown = (e: PointerEvent) => {
      lastPointerType.current = e.pointerType;
      touch();
    };
    const onKey = (e: KeyboardEvent) => {
      touch();
      if (modeRef.current !== 'cover') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        step(1, true);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        step(-1, true);
      } else if (e.key === 'Enter' && e.target === document.body) {
        navigate(galleryPath(activeIdRef.current));
      }
    };
    window.addEventListener('pointermove', touch);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('wheel', touch, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointermove', touch);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('wheel', touch);
      window.removeEventListener('keydown', onKey);
    };
  }, [step, navigate]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      if (Date.now() - lastInputAt.current < IDLE_BEFORE_ATTRACT_MS) return;
      step(1, true);
    }, ATTRACT_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [step]);

  const onRowClick = (e: MouseEvent<HTMLAnchorElement>, rowId: string) => {
    if (mode !== 'cover') return;
    if (lastPointerType.current !== 'touch' || rowId === activeId) return;
    e.preventDefault();
    setActiveId(rowId);
  };

  return (
    <div className='exhibition fixed inset-0 z-50 overflow-y-auto lg:overflow-hidden lg:grid lg:grid-cols-[minmax(20rem,26rem)_1fr] lg:grid-rows-[auto_minmax(0,1fr)]'>
      <header className='px-6 pt-8 pb-6 sm:px-8 lg:col-start-1 lg:row-start-1 lg:pt-10'>
        <h1 className='bio-glitch font-pixel text-4xl uppercase tracking-wide text-[var(--color-ink)] sm:text-5xl'>
          Memories
        </h1>
        <p className='bio-glitch mt-3 font-pixel text-xl tracking-wide text-[var(--color-ink-soft)] sm:text-2xl'>
          Jason Wu
        </p>
        <p className='bio-glitch mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-pixel text-sm tracking-wide text-[var(--color-ink-muted)]'>
          <span>Member of Technical Staff</span>
          <a
            href='https://linear.app'
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-1.5 transition-colors duration-300 hover:text-[var(--color-ink)]'
          >
            <LinearLogo className='h-[0.8em] w-[0.8em]' />
            <span>Linear</span>
          </a>
        </p>
      </header>

      <section
        aria-label={active.title}
        data-mode={mode}
        className={`exhibition-stage lg:relative lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-full ${mode === 'cover' ? 'sticky top-0 z-10 aspect-[4/3] w-full sm:aspect-[16/9] lg:aspect-auto' : 'fixed inset-0 z-20 lg:z-10'}`}
      >
        {mode === 'cover' && (
          <>
            {fragments.map((f, i) => (
              <Cover
                key={f.id}
                fragment={f}
                active={f.id === activeId}
                eager={i === activeIndex}
              />
            ))}
            <div className='exhibition-scrim' />

            <div
              key={active.id}
              className='exhibition-caption absolute inset-x-0 bottom-0 flex flex-col gap-4 p-5 sm:p-8 lg:gap-6 lg:p-12'
            >
              <div>
                <p className='font-mono text-[10px] uppercase tracking-[0.25em] opacity-60'>
                  {active.date} — {active.location}
                </p>
                <h2 className='mt-2 font-pixel text-3xl uppercase leading-tight tracking-wide sm:text-5xl lg:text-6xl'>
                  {active.title}
                </h2>
              </div>
              <div className='flex flex-wrap items-center gap-x-5 gap-y-3'>
                <Link
                  to={galleryPath(active.id)}
                  className='exhibition-enter group inline-flex items-center gap-3 px-5 py-3 font-pixel text-xs uppercase tracking-[0.2em] sm:px-7 sm:py-4 sm:text-sm'
                >
                  <span>Walk the 3D gallery</span>
                  <span
                    aria-hidden
                    className='transition-transform duration-300 group-hover:translate-x-1'
                  >
                    →
                  </span>
                </Link>
                <Link
                  to={albumPath(active.id)}
                  className='font-mono text-[11px] uppercase tracking-[0.2em] underline decoration-white/30 underline-offset-4 opacity-70 transition-opacity duration-300 hover:opacity-100'
                >
                  View {active.photos.length} photos in 2D
                </Link>
              </div>
            </div>
          </>
        )}

        {mode === '3d' && (
          <Suspense fallback={null}>
            <GalleryScreen key={active.id} fragmentId={active.id} embedded />
          </Suspense>
        )}

        {mode === '2d' && (
          <div className='absolute inset-0 [transform:translateZ(0)]'>
            <div key={active.id} className='h-full overflow-y-auto pt-10'>
              <FragmentDetail id={active.id} photo={photo} exhibition />
            </div>
          </div>
        )}

        {mode !== 'cover' && !photo && (
          <div className='pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 p-4 sm:p-5'>
            <div className='exhibition-toggle pointer-events-auto flex font-pixel text-xs uppercase tracking-[0.2em]'>
              <Link
                to={galleryPath(active.id)}
                data-active={mode === '3d'}
                aria-current={mode === '3d' ? 'page' : undefined}
              >
                3D
              </Link>
              <Link
                to={albumPath(active.id)}
                data-active={mode === '2d'}
                aria-current={mode === '2d' ? 'page' : undefined}
              >
                2D
              </Link>
            </div>
            <Link
              to='/exhibition'
              className='exhibition-toggle pointer-events-auto font-pixel text-xs uppercase tracking-[0.2em]'
            >
              <span>Close ×</span>
            </Link>
          </div>
        )}
      </section>

      <nav
        aria-label='Albums'
        className='min-h-0 pb-6 pt-4 lg:col-start-1 lg:pt-0 lg:row-start-2 lg:overflow-y-auto'
      >
        <ol>
          {fragments.map(f => {
            const isActive = f.id === activeId;
            return (
              <li key={f.id}>
                <Link
                  to={mode === '2d' ? albumPath(f.id) : galleryPath(f.id)}
                  ref={(el: HTMLAnchorElement | null) => {
                    if (el) rowRefs.current.set(f.id, el);
                    else rowRefs.current.delete(f.id);
                  }}
                  data-active={isActive}
                  aria-current={isActive ? 'true' : undefined}
                  onPointerEnter={e => {
                    if (mode === 'cover' && e.pointerType !== 'touch') {
                      setActiveId(f.id);
                    }
                  }}
                  onFocus={() => {
                    if (mode === 'cover') setActiveId(f.id);
                  }}
                  onClick={e => onRowClick(e, f.id)}
                  className='exhibition-row grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 px-6 py-3 sm:px-8'
                >
                  <span className='min-w-0'>
                    <span className='exhibition-row-title block truncate font-pixel text-sm uppercase tracking-wide'>
                      {f.title}
                    </span>
                    <span className='mt-1 block truncate font-mono text-[10px] text-[var(--color-ink-faint)]'>
                      {f.location}
                    </span>
                  </span>
                  <span className='exhibition-row-meta font-mono text-[10px] uppercase tabular-nums tracking-[0.15em]'>
                    <span className='exhibition-row-date'>
                      {f.date.slice(0, 7)}
                    </span>
                    <span className='exhibition-row-enter' aria-hidden>
                      {mode === 'cover' ? 'Enter →' : 'Viewing'}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
};

export { ExhibitionScreen };
