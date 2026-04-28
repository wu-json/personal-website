import { useEffect, useRef } from 'react';

import type { PhotoMeta } from '../types';

import { photoUrl } from '../data';
import { GroupSlide } from './GroupSlide';
import { PhotoSlide } from './PhotoSlide';
import { useSwipe } from './useSwipe';

type SlideView =
  | { kind: 'photo'; photo: PhotoMeta; counter: string }
  | {
      kind: 'group';
      groupId: string;
      photos: PhotoMeta[];
      layout: string;
      caption?: string;
      counter: string;
      onPhotoClick: (p: PhotoMeta) => void;
    };

function slideKey(view: SlideView): string {
  return view.kind === 'photo'
    ? `photo:${view.photo.file}`
    : `group:${view.groupId}`;
}

const LightboxShell = ({
  fragmentId,
  prev,
  current,
  next,
  onClose,
  onPrev,
  onNext,
  preloadFiles,
}: {
  fragmentId: string;
  prev: SlideView | null;
  current: SlideView;
  next: SlideView | null;
  onClose: () => void;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
  preloadFiles: string[];
}) => {
  const swipe = useSwipe({
    onSwipeLeft: onNext,
    onSwipeRight: onPrev,
    hasPrev: prev != null && onPrev != null,
    hasNext: next != null && onNext != null,
    currentKey: slideKey(current),
  });

  const callbacksRef = useRef({ onClose, onPrev, onNext });
  callbacksRef.current = { onClose, onPrev, onNext };

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

  useEffect(() => {
    for (const file of preloadFiles) {
      const img = new Image();
      img.fetchPriority = 'low';
      img.src = photoUrl(fragmentId, file, 'full');
    }
  }, [preloadFiles, fragmentId]);

  const slots: (SlideView | null)[] = [prev, current, next];

  return (
    <div
      className='fixed inset-0 z-[70] flex items-center justify-center bg-black/95'
      role='dialog'
      aria-modal='true'
    >
      <div className='relative w-full h-full'>
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

        {onNext && (
          <button
            type='button'
            onClick={onNext}
            className='absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 text-white/30 hover:text-white text-lg font-mono transition-colors duration-300'
          >
            &gt;
          </button>
        )}

        <div
          ref={swipe.viewportRef}
          className='relative w-full h-full overflow-hidden touch-pan-y'
        >
          <div
            ref={swipe.trackRef}
            className='flex h-full will-change-transform'
            style={{ width: '300%', ...swipe.trackStyle }}
          >
            {slots.map((view, slotIdx) => (
              <div
                // Keying by slot position (not slide identity) keeps the slot
                // wrappers stable across navigates and avoids the duplicate-
                // key warning when prev and next reference the same slide
                // (gridItems.length === 2). Cross-mount continuity is handled
                // by the shared `loadedFullUrls` cache inside the slide
                // bodies, so a remounted neighbor still renders crisply.
                key={slotIdx}
                className='shrink-0 h-full'
                style={{ width: '33.3333%' }}
                aria-hidden={slotIdx !== 1 || undefined}
              >
                {view ? (
                  view.kind === 'photo' ? (
                    <PhotoSlide
                      key={slideKey(view)}
                      photo={view.photo}
                      fragmentId={fragmentId}
                      counter={view.counter}
                      interactive={slotIdx === 1}
                    />
                  ) : (
                    <GroupSlide
                      key={slideKey(view)}
                      photos={view.photos}
                      fragmentId={fragmentId}
                      layout={view.layout}
                      caption={view.caption}
                      counter={view.counter}
                      interactive={slotIdx === 1}
                      onPhotoClick={view.onPhotoClick}
                    />
                  )
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export { LightboxShell };
export type { SlideView };
