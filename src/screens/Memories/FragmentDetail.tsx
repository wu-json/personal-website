import { useState } from 'react';
import Markdown from 'react-markdown';
import { Link, useLocation } from 'wouter';

import { Lightbox } from './components/Lightbox';
import { ProgressiveImage } from './components/ProgressiveImage';
import { fragments, photoUrl } from './data';

const jitter = () => ({ animationDelay: `${Math.random() * 120}ms` });

const FragmentDetail = ({ id, photo }: { id: string; photo?: string }) => {
  const [, navigate] = useLocation();
  const fragment = fragments.find(f => f.id === id);
  const initialIndex = photo
    ? (fragment?.photos.findIndex(p => p.file === photo) ?? null)
    : null;
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(
    initialIndex !== null && initialIndex >= 0 ? initialIndex : null,
  );

  if (!fragment) {
    return (
      <div className='w-full min-h-screen bg-black flex items-center justify-center md:pr-40'>
        <div className='flex flex-col items-center gap-3'>
          <h1 className='bio-glitch text-white text-2xl font-pixel'>
            FRAGMENT LOST
          </h1>
          <p className='bio-glitch text-white/30 text-xs font-mono'>
            {'// memory not found in archive'}
          </p>
          <Link
            to='/memories'
            className='mt-4 text-white/30 text-[10px] font-mono uppercase tracking-widest hover:text-white hover:[text-shadow:0_0_6px_rgba(255,255,255,0.3)] transition-all duration-300'
          >
            {'< return to memories'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className='w-full min-h-screen bg-black md:pr-40'>
      <div className='max-w-4xl mx-auto px-6 py-16 pb-32'>
        <Link
          to='/memories'
          className='bio-glitch inline-block mb-8 text-white/30 text-[10px] font-mono uppercase tracking-widest hover:text-white hover:[text-shadow:0_0_6px_rgba(255,255,255,0.3)] transition-all duration-300'
          style={jitter()}
        >
          {'< return to memories'}
        </Link>

        <header className='mb-8 border-b border-white/5 pb-6'>
          <h1
            className='bio-glitch text-white text-xl sm:text-3xl font-pixel uppercase tracking-wide mb-3'
            style={jitter()}
          >
            {fragment.title}
          </h1>
          <div className='flex items-baseline gap-3 flex-wrap'>
            <span
              className='bio-glitch text-white/30 text-[10px] font-mono'
              style={jitter()}
            >
              {fragment.date}
            </span>
            <span
              className='bio-glitch text-white/20 text-[10px] font-mono'
              style={jitter()}
            >
              — {fragment.location}
            </span>
          </div>
        </header>

        {fragment.description && (
          <div
            className='bio-glitch transmission-prose text-white/70 text-xs sm:text-sm font-mono leading-loose mb-12'
            style={jitter()}
          >
            <Markdown>{fragment.description}</Markdown>
          </div>
        )}

        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
          {fragment.photos.map((photo, i) => (
            <div key={photo.file} className='cursor-pointer'>
              <ProgressiveImage
                placeholderSrc={photoUrl(
                  fragment.id,
                  photo.file,
                  'placeholder',
                )}
                src={photoUrl(fragment.id, photo.file, 'thumb')}
                width={photo.width}
                height={photo.height}
                loading={i < 6 ? 'eager' : 'lazy'}
                className='rounded-sm'
                onClick={() => {
                  setLightboxIndex(i);
                  navigate(`/memories/${id}/${photo.file}`, { replace: true });
                }}
              />
              {photo.caption && (
                <p className='text-white/30 text-[10px] font-mono mt-1'>
                  {photo.caption}
                </p>
              )}
            </div>
          ))}
        </div>

        <footer className='mt-12 pt-6 border-t border-white/5'>
          <p className='text-white/20 text-[10px] font-mono uppercase tracking-widest'>
            {'// end of fragment'}
          </p>
        </footer>
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={fragment.photos}
          fragmentId={fragment.id}
          initialIndex={lightboxIndex}
          onIndexChange={i =>
            navigate(`/memories/${id}/${fragment.photos[i].file}`, {
              replace: true,
            })
          }
          onClose={() => {
            setLightboxIndex(null);
            navigate(`/memories/${id}`, { replace: true });
          }}
        />
      )}
    </div>
  );
};

export { FragmentDetail };
