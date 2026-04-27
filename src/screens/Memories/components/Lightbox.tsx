import { useEffect, useRef } from 'react';
import Markdown from 'react-markdown';

import type { PhotoMeta } from '../types';

import { photoUrl } from '../data';
import { warmImage } from './imageCache';
import { PhotoCell } from './PhotoCell';
import { useSwipe } from './useSwipe';

type Neighbors = {
  prev: PhotoMeta | null;
  next: PhotoMeta | null;
};

const Lightbox = ({
  photo,
  fragmentId,
  counter,
  onClose,
  onPrev,
  onNext,
  neighbors,
  preloadFiles,
}: {
  photo: PhotoMeta;
  fragmentId: string;
  counter: string;
  onClose: () => void;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
  neighbors: Neighbors;
  preloadFiles: string[];
}) => {
  const callbacksRef = useRef({ onClose, onPrev, onNext });
  callbacksRef.current = { onClose, onPrev, onNext };

  const { surfaceRef, trackRef } = useSwipe({
    hasPrev: !!onPrev,
    hasNext: !!onNext,
    onCommitPrev: onPrev,
    onCommitNext: onNext,
  });

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') callbacksRef.current.onClose();
      if (e.key === 'ArrowLeft') callbacksRef.current.onPrev?.();
      if (e.key === 'ArrowRight') callbacksRef.current.onNext?.();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Warm distant neighbors (distance 2-3) so subsequent swipes are also
  // flicker-free. The immediate neighbors (distance 1) are already
  // DOM-resident in the prev/next cells, so the browser fetches them
  // automatically; we just need to populate the warm cache for them via
  // their `<img onLoad>` handlers.
  useEffect(() => {
    for (const file of preloadFiles) {
      void warmImage(photoUrl(fragmentId, file, 'full'));
    }
  }, [preloadFiles, fragmentId]);

  return (
    <div
      className='fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/95'
      onClick={onClose}
      onKeyDown={e => e.key === 'Escape' && onClose()}
      role='dialog'
      aria-modal='true'
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        ref={surfaceRef}
        className='memories-swipe-surface absolute inset-0 overflow-hidden'
        onClick={e => e.stopPropagation()}
      >
        <button
          type='button'
          onClick={onClose}
          className='absolute top-4 right-4 z-10 text-white/50 hover:text-white text-xs font-mono uppercase tracking-widest transition-colors duration-300'
        >
          [close]
        </button>

        {onPrev && (
          <button
            type='button'
            onClick={onPrev}
            className='absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 text-white/30 hover:text-white text-lg font-mono transition-colors duration-300'
          >
            &lt;
          </button>
        )}

        <div
          ref={trackRef}
          className='memories-track absolute inset-0 flex'
          style={{ width: '300%' }}
        >
          <PhotoCell photo={neighbors.prev} fragmentId={fragmentId} />
          <PhotoCell photo={photo} fragmentId={fragmentId} />
          <PhotoCell photo={neighbors.next} fragmentId={fragmentId} />
        </div>

        {onNext && (
          <button
            type='button'
            onClick={onNext}
            className='absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 text-white/30 hover:text-white text-lg font-mono transition-colors duration-300'
          >
            &gt;
          </button>
        )}

        <div className='absolute bottom-4 left-0 right-0 z-10 flex justify-center pointer-events-none px-4'>
          <div className='flex items-baseline gap-4 text-[10px] font-mono max-w-full pointer-events-auto'>
            <span className='text-white/30 shrink-0'>{counter}</span>
            {photo.caption && (
              <span className='text-white/50 signal-prose min-w-0'>
                <Markdown
                  components={{
                    a: ({ children, href }) => (
                      <a href={href} target='_blank' rel='noopener noreferrer'>
                        {children}
                      </a>
                    ),
                  }}
                >
                  {photo.caption}
                </Markdown>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { Lightbox };
export type { Neighbors };
