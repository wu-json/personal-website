import type { KeyboardEvent, MouseEvent } from 'react';

import { Rss } from 'lucide-react';
import { ProgressiveImage } from 'src/components/ProgressiveImage';
import { useInfiniteList } from 'src/hooks/useInfiniteList';
import { useJitter } from 'src/hooks/useJitter';
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
          <a
            href='/signals/feed.xml'
            className='bio-glitch text-white/30 hover:text-white/50 text-xs font-mono uppercase tracking-widest flex items-center gap-1.5 leading-none no-underline transition-colors cursor-pointer'
            style={jitter()}
            aria-label='RSS feed'
          >
            <span className='inline-flex items-center leading-none'>
              {'// live'}
            </span>
            <Rss className='w-3 h-3 translate-y-[-1px]' />
          </a>
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
                    <span className='text-white/20 text-xs font-mono shrink-0 transition-colors duration-300 group-hover:text-white/40'>
                      [{s.id}]
                    </span>
                    <span className='text-white/30 text-xs font-mono shrink-0 transition-colors duration-300 group-hover:text-white/45'>
                      {s.timestamp}
                    </span>
                    {s.location && (
                      <span className='text-white/20 text-xs font-mono shrink-0 transition-colors duration-300 group-hover:text-white/40'>
                        — {s.location}
                      </span>
                    )}
                  </div>

                  {s.title && (
                    <h2 className='text-white text-sm font-pixel uppercase tracking-wide mb-2'>
                      {s.title}
                    </h2>
                  )}

                  <div className='signal-prose signal-entry signal-list text-white/70 text-sm font-mono'>
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
                          <p className='text-white/25 text-xs sm:text-[10px] font-mono'>
                            {'// preview truncated — open for full signal'}
                          </p>
                        )}
                      </>
                    ) : (
                      <MarkdownBody>{s.body}</MarkdownBody>
                    )}
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
            <span className='text-white/20 text-xs sm:text-[10px] font-mono uppercase tracking-widest'>
              {'// loading more signal…'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export { SignalsScreen };
