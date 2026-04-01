import type { KeyboardEvent, MouseEvent } from 'react';

import { useState } from 'react';
import { useLocation } from 'wouter';

import { transmissions } from './data';
import { MarkdownBody } from './MarkdownBody';
import { PretextLineBlock } from './PretextLineBlock';
import {
  parseFirstImgFromTransmissionBody,
  shouldCollapseTransmissionList,
  transmissionPlainExcerpt,
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

const TransmissionsScreen = () => {
  const [, navigate] = useLocation();

  return (
    <div className='w-full min-h-screen bg-black md:pr-40'>
      <div className='max-w-2xl mx-auto px-6 py-16'>
        <header className='mb-16'>
          <h1
            className='bio-glitch text-white text-2xl sm:text-4xl font-pixel mb-2'
            style={jitter()}
          >
            Transmissions
          </h1>
          <p
            className='bio-glitch text-white/30 text-xs font-mono uppercase tracking-widest'
            style={jitter()}
          >
            {'// stream open'}
          </p>
        </header>

        <div className='flex flex-col gap-px'>
          {transmissions.map((t, i) => {
            const collapsed = shouldCollapseTransmissionList(
              t.expanded,
              t.body,
            );
            const hero = parseFirstImgFromTransmissionBody(t.body);
            const excerpt = transmissionPlainExcerpt(t.body);

            const go = () => navigate(`/transmissions/${t.id}`);

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
                key={t.id}
                className='bio-glitch group border-t border-white/5 py-6'
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div
                  tabIndex={0}
                  aria-label={`View full transmission: ${t.title}`}
                  className='cursor-pointer rounded-sm -mx-2 px-2 py-1 -my-1 transition-colors hover:bg-white/[0.03] outline-none focus-visible:ring-1 focus-visible:ring-white/25 focus-visible:ring-offset-2 focus-visible:ring-offset-black'
                  onClick={onPreviewClick}
                  onKeyDown={onPreviewKeyDown}
                >
                  <div className='flex items-baseline gap-3 mb-2 flex-wrap'>
                    <span className='text-white/20 text-[10px] font-mono shrink-0'>
                      [{t.id}]
                    </span>
                    <span className='text-white/30 text-[10px] font-mono shrink-0'>
                      {t.timestamp}
                    </span>
                    {t.location && (
                      <span className='text-white/20 text-[10px] font-mono shrink-0'>
                        — {t.location}
                      </span>
                    )}
                  </div>

                  <h2 className='text-white text-xs sm:text-sm font-pixel uppercase tracking-wide mb-2'>
                    {t.title}
                  </h2>

                  <div className='transmission-prose transmission-entry text-white/60 text-xs sm:text-sm font-mono'>
                    {collapsed ? (
                      <>
                        {hero && (
                          <CollapsedListHeroImage
                            src={hero.src}
                            alt={hero.alt}
                          />
                        )}
                        {excerpt ? (
                          <PretextLineBlock
                            as='p'
                            text={excerpt}
                            className='text-white/50 leading-relaxed'
                          />
                        ) : (
                          <p className='text-white/25 text-[10px] font-mono'>
                            {'// preview truncated — open for full signal'}
                          </p>
                        )}
                      </>
                    ) : (
                      <MarkdownBody>{t.body}</MarkdownBody>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export { TransmissionsScreen };
