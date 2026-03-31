import { useState } from 'react';
import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { Link } from 'wouter';

import { ProgressiveImage } from '../../components/ProgressiveImage';
import { transmissions } from './data';
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

const TransmissionsScreen = () => (
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
          const collapsed = shouldCollapseTransmissionList(t.expanded, t.body);
          const hero = parseFirstImgFromTransmissionBody(t.body);
          const excerpt = transmissionPlainExcerpt(t.body);

          return (
            <article
              key={t.id}
              className='bio-glitch group border-t border-white/5 py-6'
              style={{ animationDelay: `${i * 40}ms` }}
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

              <div className='transmission-prose text-white/60 text-xs sm:text-sm font-mono leading-relaxed'>
                {collapsed ? (
                  <>
                    {hero && (
                      <CollapsedListHeroImage src={hero.src} alt={hero.alt} />
                    )}
                    {excerpt ? (
                      <p className='text-white/50 leading-relaxed'>{excerpt}</p>
                    ) : (
                      <p className='text-white/25 text-[10px] font-mono'>
                        {'// preview truncated — open for full signal'}
                      </p>
                    )}
                  </>
                ) : (
                  <Markdown
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      img: ({
                        src,
                        alt,
                        width,
                        height,
                      }: {
                        src?: string;
                        alt?: string;
                        width?: string | number;
                        height?: string | number;
                      }) => {
                        if (!src || !width || !height)
                          return <img src={src} alt={alt} />;
                        return (
                          <ProgressiveImage
                            placeholderSrc={src.replace(
                              /-full\.webp$/,
                              '-placeholder.webp',
                            )}
                            src={src}
                            alt={alt ?? ''}
                            width={Number(width)}
                            height={Number(height)}
                            className='construct-body-img'
                          />
                        );
                      },
                    }}
                  >
                    {t.body}
                  </Markdown>
                )}
              </div>

              <Link
                to={`/transmissions/${t.id}`}
                className='inline-block mt-3 text-white/30 text-[10px] font-mono uppercase tracking-widest hover:text-white hover:[text-shadow:0_0_6px_rgba(255,255,255,0.3)] transition-all duration-300'
              >
                {'> open'}
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  </div>
);

export { TransmissionsScreen };
