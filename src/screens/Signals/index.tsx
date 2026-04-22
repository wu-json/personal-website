import type { KeyboardEvent, MouseEvent } from 'react';

import { useState } from 'react';
import { useInfiniteList } from 'src/hooks/useInfiniteList';
import { useLocation } from 'wouter';

import { signals } from './data';
import { MarkdownBody } from './MarkdownBody';
import {
  parseFirstImgFromSignalBody,
  shouldCollapseSignalList,
  signalPlainExcerpt,
} from './preview';

const jitter = () => ({ animationDelay: `${Math.random() * 120}ms` });

/** Fixed 4:3 frame + centered cover — avoids max-height clipping that made previews a thin strip. */
const CollapsedListHeroImage = ({ src, alt }: { src: string; alt: string }) => {
  const [loaded, setLoaded] = useState(false);
  const placeholderSrc = src.replace(/-full\.webp$/, '-placeholder.webp');

  return (
    <div className='construct-body-img relative aspect-[4/3] w-full overflow-hidden rounded-sm border border-white/5 bg-white/5 !my-3'>
      <img
        src={placeholderSrc}
        alt=''
        aria-hidden
        className={`absolute inset-0 h-full w-full object-cover object-center blur-md transition-opacity duration-500 ${
          loaded ? 'opacity-0' : 'opacity-100'
        }`}
      />
      <img
        src={src}
        alt={alt}
        loading='lazy'
        decoding='async'
        className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-500 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
};

const SignalsScreen = () => {
  const [, navigate] = useLocation();
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

                  <div className='signal-prose signal-entry signal-list text-white/60 text-xs sm:text-sm font-mono'>
                    {collapsed ? (
                      <>
                        {hero && (
                          <CollapsedListHeroImage
                            src={hero.src}
                            alt={hero.alt}
                          />
                        )}
                        {excerpt ? (
                          <p className='text-white/50 leading-relaxed'>
                            {excerpt}
                          </p>
                        ) : (
                          <p className='text-white/25 text-[10px] font-mono'>
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
