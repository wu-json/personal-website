import { useCallback, useEffect, useState } from 'react';

import type { PhotoMeta } from '../types';

import { photoUrl } from '../data';

const Lightbox = ({
  photos,
  fragmentId,
  initialIndex,
  onClose,
}: {
  photos: PhotoMeta[];
  fragmentId: string;
  initialIndex: number;
  onClose: () => void;
}) => {
  const [index, setIndex] = useState(initialIndex);
  const [loaded, setLoaded] = useState(false);

  const photo = photos[index];
  const total = photos.length;

  const prev = useCallback(
    () => setIndex(i => (i > 0 ? i - 1 : total - 1)),
    [total],
  );
  const next = useCallback(
    () => setIndex(i => (i < total - 1 ? i + 1 : 0)),
    [total],
  );

  useEffect(() => {
    setLoaded(false);
  }, [index]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, prev, next]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const preload = [index - 1, index + 1]
      .filter(i => i >= 0 && i < total)
      .map(i => photos[i]);
    for (const p of preload) {
      const img = new Image();
      img.src = photoUrl(fragmentId, p.file, 'full');
    }
  }, [index, photos, fragmentId, total]);

  return (
    <div
      className='fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95'
      onClick={onClose}
      onKeyDown={e => e.key === 'Escape' && onClose()}
      role='dialog'
      aria-modal='true'
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className='relative flex items-center justify-center w-full h-full p-4 sm:p-8'
        onClick={e => e.stopPropagation()}
      >
        <button
          type='button'
          onClick={onClose}
          className='absolute top-4 right-4 z-10 text-white/50 hover:text-white text-xs font-mono uppercase tracking-widest transition-colors duration-300'
        >
          [close]
        </button>

        <button
          type='button'
          onClick={prev}
          className='absolute left-2 sm:left-4 z-10 text-white/30 hover:text-white text-lg font-mono transition-colors duration-300'
        >
          &lt;
        </button>

        <div className='flex flex-col items-center gap-3 max-w-full max-h-full'>
          <div
            className='relative overflow-hidden'
            style={{
              aspectRatio: `${photo.width} / ${photo.height}`,
              maxHeight: 'calc(100vh - 8rem)',
              maxWidth: '100%',
            }}
          >
            <img
              src={photoUrl(fragmentId, photo.file, 'placeholder')}
              alt=''
              aria-hidden
              className={`absolute inset-0 w-full h-full object-contain scale-110 blur-md transition-opacity duration-500 ${loaded ? 'opacity-0' : 'opacity-100'}`}
            />
            <img
              src={photoUrl(fragmentId, photo.file, 'full')}
              alt={photo.alt ?? photo.caption ?? ''}
              decoding='async'
              className={`w-full h-full object-contain transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setLoaded(true)}
            />
          </div>

          <div className='flex items-center gap-4 text-[10px] font-mono'>
            <span className='text-white/30'>
              {index + 1} / {total}
            </span>
            {photo.caption && (
              <span className='text-white/50'>{photo.caption}</span>
            )}
          </div>
        </div>

        <button
          type='button'
          onClick={next}
          className='absolute right-2 sm:right-4 z-10 text-white/30 hover:text-white text-lg font-mono transition-colors duration-300'
        >
          &gt;
        </button>
      </div>
    </div>
  );
};

export { Lightbox };
