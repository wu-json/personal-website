import { useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';

import type { PhotoMeta } from '../types';

import { photoUrl } from '../data';
import { isWarm, markWarm, warmImage } from './imageCache';
import { PhotoCell } from './PhotoCell';
import { useSwipe } from './useSwipe';

type Neighbors = {
  prev: PhotoMeta | null;
  next: PhotoMeta | null;
};

/**
 * Center cell of `GroupLightbox`: renders the multi-photo group with
 * the appropriate row/column/stacked layout. Each photo is a button
 * that drills into the single-photo `Lightbox` view via
 * `onPhotoClick`. Trailing clicks after a horizontal-locked swipe are
 * suppressed by the capture-phase listener installed in `useSwipe`.
 */
const GroupCell = ({
  photos,
  fragmentId,
  layout,
  onPhotoClick,
}: {
  photos: PhotoMeta[];
  fragmentId: string;
  layout: string;
  onPhotoClick: (photo: PhotoMeta) => void;
}) => {
  const isAlwaysColumn = layout === 'column';
  const combinedAR = photos.reduce((sum, p) => sum + p.width / p.height, 0);
  const shouldStack = !isAlwaysColumn && combinedAR > 2;
  const isAlwaysRow = !isAlwaysColumn && !shouldStack;

  const containerCls = isAlwaysColumn
    ? 'flex flex-col'
    : shouldStack
      ? 'flex flex-col sm:flex-row'
      : 'flex';

  return (
    <div className='memories-track-cell flex items-center justify-center'>
      <div
        className={`${containerCls} gap-2 items-center justify-center`}
        style={{ maxHeight: 'calc(100vh - 8rem)', maxWidth: '90vw' }}
      >
        {photos.map(p => (
          <GroupPhotoButton
            key={p.file}
            photo={p}
            fragmentId={fragmentId}
            isAlwaysRow={isAlwaysRow}
            shouldStack={shouldStack}
            onClick={() => onPhotoClick(p)}
          />
        ))}
      </div>
    </div>
  );
};

const GroupPhotoButton = ({
  photo,
  fragmentId,
  isAlwaysRow,
  shouldStack,
  onClick,
}: {
  photo: PhotoMeta;
  fragmentId: string;
  isAlwaysRow: boolean;
  shouldStack: boolean;
  onClick: () => void;
}) => {
  const fullSrc = photoUrl(fragmentId, photo.file, 'full');
  const placeholderSrc = photoUrl(fragmentId, photo.file, 'placeholder');
  const [loaded, setLoaded] = useState(() => isWarm(fullSrc));

  useEffect(() => {
    setLoaded(isWarm(fullSrc));
  }, [fullSrc]);

  return (
    <button
      type='button'
      className={`relative overflow-hidden cursor-pointer min-h-0 max-h-full ${
        isAlwaysRow
          ? 'min-w-0'
          : shouldStack
            ? 'w-full sm:min-w-0 sm:w-auto'
            : ''
      }`}
      style={
        isAlwaysRow
          ? { flex: `${photo.width / photo.height} 1 0%` }
          : shouldStack
            ? { flex: '1 1 0%' }
            : undefined
      }
      onClick={onClick}
    >
      <img
        src={placeholderSrc}
        alt=''
        aria-hidden
        className={`absolute inset-0 w-full h-full object-contain scale-110 blur-md transition-opacity duration-500 ${loaded ? 'opacity-0' : 'opacity-100'}`}
      />
      <img
        src={fullSrc}
        alt={photo.alt ?? photo.caption ?? ''}
        decoding='async'
        draggable={false}
        className={`object-contain w-full h-full transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => {
          markWarm(fullSrc);
          setLoaded(true);
        }}
      />
    </button>
  );
};

const GroupLightbox = ({
  photos,
  fragmentId,
  layout,
  caption,
  counter,
  onClose,
  onPrev,
  onNext,
  onPhotoClick,
  neighbors,
  preloadFiles,
}: {
  photos: PhotoMeta[];
  fragmentId: string;
  layout: string;
  caption?: string;
  counter: string;
  onClose: () => void;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
  onPhotoClick: (photo: PhotoMeta) => void;
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
          <GroupCell
            photos={photos}
            fragmentId={fragmentId}
            layout={layout}
            onPhotoClick={onPhotoClick}
          />
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
            {caption && (
              <span className='text-white/50 signal-prose min-w-0'>
                <Markdown>{caption}</Markdown>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { GroupLightbox };
export type { Neighbors };
