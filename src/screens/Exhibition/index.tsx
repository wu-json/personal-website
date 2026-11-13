import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { LINEAR_SEGMENTS } from 'src/screens/Home/sections/MainBanner/LinearMark';
import { fragments } from 'src/screens/Memories/data';
import { FragmentDetail } from 'src/screens/Memories/FragmentDetail';
import { Link } from 'wouter';

import { X_HANDLE, XLogo, XQrDialog } from './XQrDialog';

const GalleryScreen = lazy(() =>
  import('src/screens/Gallery').then(m => ({ default: m.GalleryScreen })),
);

type Mode = '2d' | '3d';

type KeyboardLock = {
  lock: (keys: string[]) => Promise<void>;
  unlock: () => void;
};

const escapeLock =
  typeof navigator === 'undefined'
    ? undefined
    : (navigator as Navigator & { keyboard?: Partial<KeyboardLock> }).keyboard
          ?.lock
      ? (navigator as Navigator & { keyboard: KeyboardLock }).keyboard
      : undefined;

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

const ExhibitionScreen = ({ id, sub }: { id?: string; sub?: string }) => {
  const routed = fragments.find(f => f.id === id);
  const active = routed ?? fragments[0];
  const mode: Mode = routed && sub === '3d' ? '3d' : '2d';
  const photo = routed && mode === '2d' ? sub : undefined;
  const pathFor = mode === '3d' ? galleryPath : albumPath;
  const [qrOpen, setQrOpen] = useState(false);
  const [galleryId, setGalleryId] = useState<string | null>(null);
  const showGallery = mode === '3d' || (routed && galleryId === routed.id);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const canFullscreen =
    typeof document !== 'undefined' && document.fullscreenEnabled;

  useEffect(() => {
    if (mode === '3d') setGalleryId(active.id);
  }, [mode, active.id]);

  useEffect(() => {
    const previous = document.title;
    document.title = 'Memories — Jason Wu';
    return () => {
      document.title = previous;
    };
  }, []);

  useEffect(() => {
    const sync = () => {
      const fullscreen = document.fullscreenElement !== null;
      setIsFullscreen(fullscreen);
      if (fullscreen) escapeLock?.lock(['Escape']).catch(() => {});
      else escapeLock?.unlock();
    };
    sync();
    document.addEventListener('fullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      escapeLock?.unlock();
    };
  }, []);

  useEffect(() => {
    if (!isFullscreen || !escapeLock) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (document.pointerLockElement) document.exitPointerLock();
      else setQrOpen(false);
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [isFullscreen]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenEnabled) return;
    const change = document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen();
    change.catch(() => {});
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyF' || e.repeat) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      toggleFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleFullscreen]);

  return (
    <div className='exhibition fixed inset-0 z-50 overflow-y-auto lg:overflow-hidden lg:grid lg:grid-cols-[minmax(20rem,26rem)_1fr] lg:grid-rows-[auto_minmax(0,1fr)]'>
      <header className='px-6 pt-8 pb-6 sm:px-8 lg:col-start-1 lg:row-start-1 lg:pt-10'>
        <h1 className='bio-glitch font-pixel text-4xl uppercase leading-none tracking-wide text-[var(--color-ink)] sm:text-5xl'>
          Memories
        </h1>
        <div className='bio-glitch mt-7 grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-y-2 border-t border-[var(--color-ink-trace)] pt-5 font-pixel text-sm tracking-wide text-[var(--color-ink-muted)]'>
          <p className='pr-4 text-lg leading-none text-[var(--color-ink)]'>
            Jason Wu
          </p>
          <a
            href='https://linear.app'
            target='_blank'
            rel='noopener noreferrer'
            className='col-span-2 grid grid-cols-subgrid items-center transition-colors duration-300 hover:text-[var(--color-ink)]'
          >
            <LinearLogo className='mr-2 h-[0.8em] w-[0.8em]' />
            <span>Linear</span>
          </a>
          <p className='pr-4'>Member of Technical Staff</p>
          <button
            type='button'
            onClick={() => setQrOpen(true)}
            aria-haspopup='dialog'
            className='col-span-2 grid cursor-pointer grid-cols-subgrid items-center text-left transition-colors duration-300 hover:text-[var(--color-ink)]'
          >
            <XLogo className='mr-2 h-[0.8em] w-[0.8em]' />
            <span>{X_HANDLE}</span>
          </button>
        </div>
      </header>

      <XQrDialog open={qrOpen} onClose={() => setQrOpen(false)} />

      <section
        aria-label={active.title}
        className={`exhibition-stage fixed inset-0 z-20 lg:relative lg:z-10 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:block lg:h-full ${routed ? '' : 'hidden'}`}
      >
        {showGallery && (
          <div
            aria-hidden={mode !== '3d'}
            className={`absolute inset-0 ${mode === '3d' ? '' : 'pointer-events-none invisible'}`}
          >
            <Suspense fallback={null}>
              <GalleryScreen
                key={active.id}
                fragmentId={active.id}
                embedded
                active={mode === '3d'}
              />
            </Suspense>
          </div>
        )}

        {mode === '2d' && (
          <div className='absolute inset-0 flex flex-col [transform:translateZ(0)]'>
            <header className='shrink-0 px-6 pt-8 pb-6 sm:px-8 lg:pt-10'>
              <div className='h-9 sm:h-12' />
              <div
                key={active.id}
                className='bio-glitch mt-7 grid gap-y-2 border-t border-[var(--color-ink-trace)] pt-5 font-pixel text-sm tracking-wide text-[var(--color-ink-muted)]'
              >
                <h2 className='flex h-5 items-center truncate text-lg leading-none uppercase text-[var(--color-ink)]'>
                  {active.title}
                </h2>
                <p className='truncate'>
                  {active.date} — {active.location}
                </p>
              </div>
            </header>
            <div key={active.id} className='min-h-0 flex-1 overflow-y-auto'>
              <FragmentDetail id={active.id} photo={photo} exhibition />
            </div>
          </div>
        )}

        {!photo && (
          <div className='pointer-events-none absolute inset-x-0 top-0 z-20 px-6 pt-8 sm:px-8 lg:pt-10'>
            <div className='flex h-9 items-center justify-between gap-3 sm:h-12'>
              <div className='exhibition-toggle pointer-events-auto flex font-pixel text-xs uppercase tracking-[0.2em]'>
                <Link
                  to={albumPath(active.id)}
                  data-active={mode === '2d'}
                  aria-current={mode === '2d' ? 'page' : undefined}
                >
                  2D
                </Link>
                <Link
                  to={galleryPath(active.id)}
                  data-active={mode === '3d'}
                  aria-current={mode === '3d' ? 'page' : undefined}
                >
                  3D
                </Link>
              </div>
              <Link
                to='/exhibition'
                className='exhibition-toggle pointer-events-auto font-pixel text-xs uppercase tracking-[0.2em] lg:hidden'
              >
                <span>← Index</span>
              </Link>
            </div>
          </div>
        )}
        {canFullscreen && !photo && (
          <button
            type='button'
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            aria-pressed={isFullscreen}
            title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
            className='exhibition-toggle absolute right-6 bottom-6 z-20 flex h-9 w-9 cursor-pointer items-center justify-center outline-none transition-colors duration-300 hover:text-[var(--color-ink)] focus-visible:text-[var(--color-ink)] sm:right-8 sm:bottom-8'
          >
            <svg
              viewBox='0 0 14 14'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.25'
              aria-hidden='true'
              className='h-3.5 w-3.5'
            >
              <path
                d={
                  isFullscreen
                    ? 'M5 1v4H1M9 1v4h4M5 13V9H1M9 13V9h4'
                    : 'M1 5V1h4M13 5V1H9M1 9v4h4M13 9v4H9'
                }
              />
            </svg>
          </button>
        )}
      </section>

      <nav
        aria-label='Albums'
        className='min-h-0 pb-6 pt-4 lg:col-start-1 lg:pt-0 lg:row-start-2 lg:overflow-y-auto'
      >
        <ol>
          {fragments.map(f => {
            const isActive = f.id === active.id;
            return (
              <li key={f.id}>
                <Link
                  to={pathFor(f.id)}
                  data-active={isActive}
                  aria-current={isActive ? 'true' : undefined}
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
                  <span className='font-mono text-[10px] uppercase tabular-nums tracking-[0.15em] text-[var(--color-ink-ghost)]'>
                    {f.date.slice(0, 7)}
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
