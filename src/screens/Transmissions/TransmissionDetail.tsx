import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { Link } from 'wouter';

import { ProgressiveImage } from '../../components/ProgressiveImage';
import { transmissions } from './data';

const jitter = () => ({ animationDelay: `${Math.random() * 120}ms` });

const TransmissionDetail = ({ id }: { id: string }) => {
  const t = transmissions.find(tx => tx.id === id);

  if (!t) {
    return (
      <div className='w-full min-h-screen bg-black flex items-center justify-center md:pr-40'>
        <div className='flex flex-col items-center gap-3'>
          <h1 className='bio-glitch text-white text-2xl font-pixel'>
            SIGNAL LOST
          </h1>
          <p className='bio-glitch text-white/30 text-xs font-mono'>
            {'// transmission not found in relay logs'}
          </p>
          <Link
            to='/transmissions'
            className='mt-4 text-white/30 text-[10px] font-mono uppercase tracking-widest hover:text-white hover:[text-shadow:0_0_6px_rgba(255,255,255,0.3)] transition-all duration-300'
          >
            {'< return to relay'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className='w-full min-h-screen bg-black md:pr-40'>
      <div className='max-w-2xl mx-auto px-6 py-16 pb-32'>
        <Link
          to='/transmissions'
          className='bio-glitch inline-block mb-8 text-white/30 text-[10px] font-mono uppercase tracking-widest hover:text-white hover:[text-shadow:0_0_6px_rgba(255,255,255,0.3)] transition-all duration-300'
          style={jitter()}
        >
          {'< return to relay'}
        </Link>

        <header className='mb-8 border-b border-white/5 pb-6'>
          <div className='flex items-baseline gap-3 mb-3 flex-wrap'>
            <span
              className='bio-glitch text-white/20 text-[10px] font-mono'
              style={jitter()}
            >
              [{t.id}]
            </span>
            <span
              className='bio-glitch text-white/30 text-[10px] font-mono'
              style={jitter()}
            >
              {t.timestamp}
            </span>
            {t.location && (
              <span
                className='bio-glitch text-white/20 text-[10px] font-mono'
                style={jitter()}
              >
                — {t.location}
              </span>
            )}
          </div>
          <h1
            className='bio-glitch text-white text-xl sm:text-3xl font-pixel uppercase tracking-wide'
            style={jitter()}
          >
            {t.title}
          </h1>
        </header>

        <div
          className='bio-glitch transmission-prose text-white/70 text-xs sm:text-sm font-mono leading-loose'
          style={jitter()}
        >
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
        </div>

        <footer className='mt-12 pt-6 border-t border-white/5'>
          <p className='text-white/20 text-[10px] font-mono uppercase tracking-widest'>
            {'// end of transmission'}
          </p>
        </footer>
      </div>
    </div>
  );
};

export { TransmissionDetail };
