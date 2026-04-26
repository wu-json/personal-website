import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';

import { useCallback, useEffect, useRef } from 'react';
import { ProgressiveImage } from 'src/components/ProgressiveImage';
import { useInfiniteList } from 'src/hooks/useInfiniteList';
import { useJitter } from 'src/hooks/useJitter';
import { useNearViewport } from 'src/hooks/useNearViewport';
import { useLocation } from 'wouter';

import { signals } from './data';
import { MarkdownBody } from './MarkdownBody';
import {
  parseFirstImgFromSignalBody,
  shouldCollapseSignalList,
  signalPlainExcerpt,
} from './preview';

/** Fixed 4:3 frame + centered cover — avoids max-height clipping that made
 *  previews a thin strip. Width=4/Height=3 drives ProgressiveImage's
 *  --ar so the wrapper is a 4:3 box regardless of the photo's natural
 *  aspect; the single <img> inside `object-cover`s to fit. */
const CollapsedListHeroImage = ({ src, alt }: { src: string; alt: string }) => {
  const placeholderSrc = src.replace(/-full\.webp$/, '-placeholder.webp');
  const smallSrc = src.replace(/-full\.webp$/, '-small.webp');
  const thumbSrc = src.replace(/-full\.webp$/, '-thumb.webp');
  return (
    <ProgressiveImage
      placeholderSrc={placeholderSrc}
      src={thumbSrc}
      srcSet={`${smallSrc} 480w, ${thumbSrc} 800w`}
      sizes='(min-width: 768px) 672px, 100vw'
      alt={alt}
      width={4}
      height={3}
      loading='lazy'
      className='construct-body-img w-full rounded-sm border border-white/5 !my-3'
    />
  );
};

/**
 * Unmount a signal card's heavy body once it's scrolled well past the
 * viewport, and swap back to a sized placeholder that preserves the scroll
 * offset. Uses `ResizeObserver` on the live node so the cached height
 * tracks images as they load — guarantees the placeholder never collapses
 * the article underneath the user's scroll position.
 *
 * `initialVisible` keeps the first batch mounted live on first paint so the
 * user never sees placeholders flash in as the IO observer bootstraps.
 *
 * `rootMargin` is widened to ~3 viewports on each side so browser
 * find-in-page (Cmd+F) still matches text in nearby culled entries — the
 * pre-cull `/signals` page was greppable as a single page; this keeps that
 * affordance for the bulk of typical scroll positions while still
 * unmounting bodies that are far away.
 *
 * On viewport-width changes (window resize, mobile rotation, devtools
 * toggle) the cached pixel height is stale — text reflows at a different
 * width — so we invalidate `heightRef` on `resize`/`orientationchange`.
 * The placeholder will be remeasured next time the article enters the
 * observer's expanded root rect.
 */
const CullableBody = ({
  initialVisible,
  children,
}: {
  initialVisible: boolean;
  children: ReactNode;
}) => {
  const [ioRef, visible] = useNearViewport<HTMLDivElement>({
    initial: initialVisible,
    rootMargin: '300% 0px',
  });
  const heightRef = useRef<number | null>(null);
  const liveRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!visible) return;
    const node = liveRef.current;
    if (!node || typeof ResizeObserver === 'undefined') {
      if (node) heightRef.current = node.offsetHeight || heightRef.current;
      return;
    }
    const ro = new ResizeObserver(() => {
      const h = node.offsetHeight;
      if (h > 0) heightRef.current = h;
    });
    ro.observe(node);
    heightRef.current = node.offsetHeight || heightRef.current;
    return () => ro.disconnect();
  }, [visible]);

  // Invalidate the cached pixel height whenever the viewport width changes
  // — the previously-measured height was for a different reflow width.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let lastWidth = window.innerWidth;
    const onResize = () => {
      if (window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      heightRef.current = null;
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  const composedRef = useCallback(
    (node: HTMLDivElement | null) => {
      ioRef(node);
      liveRef.current = node;
    },
    [ioRef],
  );

  if (visible) {
    return <div ref={composedRef}>{children}</div>;
  }

  return (
    <div
      ref={ioRef}
      style={{ height: heightRef.current ?? undefined }}
      aria-hidden='true'
    />
  );
};

const SignalsScreen = () => {
  const [, navigate] = useLocation();
  const jitter = useJitter();
  const { visibleCount, sentinelRef, done } = useInfiniteList(signals.length, {
    pageSize: 6,
  });

  return (
    <div className='w-full min-h-screen bg-black md:pr-40'>
      <div className='max-w-2xl mx-auto px-6 py-16'>
        <header className='mb-16'>
          <h1
            className='bio-glitch text-white text-2xl sm:text-4xl font-pixel mb-2'
            style={jitter()}
          >
            Signals
          </h1>
          <p
            className='bio-glitch text-white/30 text-xs font-mono uppercase tracking-widest'
            style={jitter()}
          >
            {'// live'}
          </p>
        </header>

        <div className='flex flex-col gap-px'>
          {signals.slice(0, visibleCount).map((s, i) => {
            const collapsed = shouldCollapseSignalList(s.expanded, s.body);
            const hero = parseFirstImgFromSignalBody(s.body);
            const excerpt = signalPlainExcerpt(s.body);

            const go = () => navigate(`/signals/${s.id}`);

            const onPreviewClick = (e: MouseEvent<HTMLDivElement>) => {
              if ((e.target as HTMLElement).closest('a, button')) return;
              go();
            };

            const onPreviewKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                go();
              }
            };

            return (
              <article
                key={s.id}
                className='bio-glitch group border-t border-white/5 py-6'
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div
                  tabIndex={0}
                  aria-label={`View full signal${s.title ? `: ${s.title}` : ` ${s.id}`}`}
                  className='signal-list-item cursor-pointer rounded-sm -mx-2 px-2 py-1 -my-1 transition-colors outline-none focus-visible:ring-1 focus-visible:ring-white/25 focus-visible:ring-offset-2 focus-visible:ring-offset-black'
                  onClick={onPreviewClick}
                  onKeyDown={onPreviewKeyDown}
                >
                  <div
                    className={`flex items-baseline gap-3 flex-wrap ${s.title ? 'mb-2' : 'mb-1'}`}
                  >
                    <span className='text-white/20 text-[10px] font-mono shrink-0'>
                      [{s.id}]
                    </span>
                    <span className='text-white/30 text-[10px] font-mono shrink-0'>
                      {s.timestamp}
                    </span>
                    {s.location && (
                      <span className='text-white/20 text-[10px] font-mono shrink-0'>
                        — {s.location}
                      </span>
                    )}
                  </div>

                  {s.title && (
                    <h2 className='text-white text-xs sm:text-sm font-pixel uppercase tracking-wide mb-2'>
                      {s.title}
                    </h2>
                  )}

                  <div className='signal-prose signal-entry signal-list text-white/70 text-xs sm:text-sm font-mono'>
                    <CullableBody initialVisible={true}>
                      {collapsed ? (
                        <>
                          {hero && (
                            <CollapsedListHeroImage
                              src={hero.src}
                              alt={hero.alt}
                            />
                          )}
                          {excerpt ? (
                            <p className='leading-relaxed'>{excerpt}</p>
                          ) : (
                            <p className='text-white/25 text-[10px] font-mono'>
                              {'// preview truncated — open for full signal'}
                            </p>
                          )}
                        </>
                      ) : (
                        <MarkdownBody>{s.body}</MarkdownBody>
                      )}
                    </CullableBody>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {!done && (
          <div
            ref={sentinelRef}
            className='mt-8 flex justify-center'
            aria-hidden
          >
            <span className='text-white/20 text-[10px] font-mono uppercase tracking-widest'>
              {'// loading more signal…'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export { SignalsScreen };
