'use client';

import Link from 'next/link';
import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { useJitter } from 'src/hooks/useJitter';

import type { Construct } from './types';

import { ProgressiveImage } from '../../components/ProgressiveImage';

const ConstructDetail = ({ construct: c }: { construct: Construct }) => {
  const jitter = useJitter();

  return (
    <div className='w-full min-h-screen bg-black md:pr-40'>
      <div className='max-w-2xl mx-auto px-6 py-16 pb-32'>
        <Link
          href='/constructs'
          className='bio-glitch inline-block mb-8 text-white/30 text-xs sm:text-[10px] font-mono uppercase tracking-widest hover:text-white hover:[text-shadow:0_0_6px_rgba(255,255,255,0.3)] transition-all duration-300'
          style={jitter()}
        >
          {'< return to constructs'}
        </Link>

        <header className='mb-8 border-b border-white/5 pb-6'>
          <h1
            className='bio-glitch text-white text-xl sm:text-3xl font-pixel uppercase tracking-wide mb-3'
            style={jitter()}
          >
            {c.title}
          </h1>
          <div className='flex items-baseline gap-3 flex-wrap'>
            <span
              className='bio-glitch text-white/50 text-xs font-mono'
              style={jitter()}
            >
              {c.date}
            </span>
            <span
              className='bio-glitch text-white/50 text-xs font-mono'
              style={jitter()}
            >
              — {c.subtitle}
            </span>
            {c.link && (
              <a
                href={c.link}
                target='_blank'
                rel='noopener noreferrer'
                className='bio-glitch text-white/50 text-xs font-mono hover:text-white hover:[text-shadow:0_0_6px_rgba(255,255,255,0.3)] transition-all duration-300'
                style={jitter()}
              >
                [{c.linkLabel}]
              </a>
            )}
          </div>
        </header>

        <div
          className='bio-glitch signal-prose text-white/70 text-sm font-mono leading-loose'
          style={jitter()}
        >
          <Markdown
            rehypePlugins={[rehypeRaw]}
            components={{
              img: ({ src, alt, width, height }) => {
                if (typeof src !== 'string' || !width || !height)
                  return (
                    <img
                      src={typeof src === 'string' ? src : undefined}
                      alt={alt}
                    />
                  );
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
            {c.body}
          </Markdown>
        </div>

        <footer className='mt-12 pt-6 border-t border-white/5'>
          <p className='text-white/20 text-xs sm:text-[10px] font-mono uppercase tracking-widest'>
            {'// end'}
          </p>
        </footer>
      </div>
    </div>
  );
};

export { ConstructDetail };
