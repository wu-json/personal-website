import {
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { LINEAR_SEGMENTS } from 'src/screens/Home/sections/MainBanner/LinearMark';
import { fragments, photoUrl } from 'src/screens/Memories/data';
import type { Fragment } from 'src/screens/Memories/types';
import { Link, useLocation, useSearch } from 'wouter';

const IDLE_BEFORE_ATTRACT_MS = 20000;
const ATTRACT_INTERVAL_MS = 7000;

const galleryPath = (id: string) => `/exhibition/${id}/3d`;
const albumPath = (id: string) => `/exhibition/${id}`;

const pad = (n: number) => String(n).padStart(2, '0');

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

const ExhibitionScreen = () => {
  const [, navigate] = useLocation();
  const search = useSearch();
  const [activeId, setActiveId] = useState(() => {
    const room = new URLSearchParams(search).get('room');
    return fragments.some(f => f.id === room) ? room! : fragments[0].id;
  });
  const lastInputAt = useRef(0);
  const lastPointerType = useRef('mouse');
  const rowRefs = useRef(new Map<string, HTMLAnchorElement>());
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  const activeIndex = fragments.findIndex(f => f.id === activeId);
  const active = fragments[activeIndex];
  const total = fragments.length;
  const photoCount = useMemo(
    () => fragments.reduce((n, f) => n + f.photos.length, 0),
    [],
  );

  const step = useCallback((delta: number, reveal: boolean) => {
    setActiveId(current => {
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
    document.title = 'Memories — Jason Wu @ Linear';
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

  const onRowClick = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    if (lastPointerType.current !== 'touch' || id === activeId) return;
    e.preventDefault();
    setActiveId(id);
  };

  return (
    <div className='exhibition fixed inset-0 z-50 overflow-y-auto lg:overflow-hidden lg:grid lg:grid-cols-[minmax(20rem,26rem)_1fr] lg:grid-rows-[auto_minmax(0,1fr)_auto]'>
      <header className='px-6 pt-8 pb-6 sm:px-8 lg:col-start-1 lg:row-start-1 lg:pt-10'>
        <p className='bio-glitch font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-faint)]'>
          Gumloop × Linear — Design Gallery Vol. 2
        </p>
        <h1 className='bio-glitch mt-5 font-pixel text-4xl uppercase tracking-wide text-[var(--color-ink)] sm:text-5xl'>
          Memories
        </h1>
        <p className='bio-glitch mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-[var(--color-ink-muted)]'>
          <span>Photographs by Jason Wu</span>
          <span className='text-[var(--color-ink-ghost)]'>@</span>
          <a
            href='https://linear.app'
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-1.5 text-[var(--color-ink)] transition-opacity duration-300 hover:opacity-70'
          >
            <LinearLogo className='h-3.5 w-3.5' />
            <span className='font-sans text-sm font-medium tracking-tight'>
              Linear
            </span>
          </a>
        </p>
      </header>

      <section
        aria-label={active.title}
        className='exhibition-stage sticky top-0 z-10 aspect-[4/3] w-full sm:aspect-[16/9] lg:relative lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:aspect-auto lg:h-full'
      >
        {fragments.map((f, i) => (
          <Cover
            key={f.id}
            fragment={f}
            active={f.id === activeId}
            eager={i === activeIndex}
          />
        ))}
        <div className='exhibition-scrim' />

        <div className='absolute right-5 top-5 hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] opacity-60 lg:flex'>
          <LinearLogo className='h-3 w-3' />
          <span>
            Room {pad(total - activeIndex)} / {pad(total)}
          </span>
        </div>

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
      </section>

      <nav
        aria-label='Albums'
        className='min-h-0 pb-4 lg:col-start-1 lg:row-start-2 lg:overflow-y-auto'
      >
        <p className='px-6 pb-3 pt-6 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--color-ink-ghost)] sm:px-8 lg:pt-2'>
          {'// index'}
        </p>
        <ol>
          {fragments.map((f, i) => {
            const isActive = f.id === activeId;
            return (
              <li key={f.id}>
                <Link
                  to={galleryPath(f.id)}
                  ref={(el: HTMLAnchorElement | null) => {
                    if (el) rowRefs.current.set(f.id, el);
                    else rowRefs.current.delete(f.id);
                  }}
                  data-active={isActive}
                  aria-current={isActive ? 'true' : undefined}
                  onPointerEnter={e => {
                    if (e.pointerType !== 'touch') setActiveId(f.id);
                  }}
                  onFocus={() => setActiveId(f.id)}
                  onClick={e => onRowClick(e, f.id)}
                  className='exhibition-row grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-baseline gap-x-3 px-6 py-3 sm:px-8'
                >
                  <span className='font-mono text-[10px] tabular-nums text-[var(--color-ink-ghost)]'>
                    {pad(total - i)}
                  </span>
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
                      Enter →
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>

      <footer className='flex items-center justify-between gap-4 border-t border-[var(--color-ink-hair)] px-6 py-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-ghost)] sm:px-8 lg:col-start-1 lg:row-start-3'>
        <span>
          {total} rooms · {photoCount} photographs
        </span>
        <Link
          to='/'
          className='transition-colors duration-300 hover:text-[var(--color-ink)]'
        >
          jasonwu.ink
        </Link>
      </footer>
    </div>
  );
};

export { ExhibitionScreen };
