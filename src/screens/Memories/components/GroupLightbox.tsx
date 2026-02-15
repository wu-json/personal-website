import { useEffect, useMemo, useRef, useState } from 'react';
import Markdown from 'react-markdown';

import type { PhotoMeta } from '../types';

import { photoUrl } from '../data';

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
}) => {
  const [loadedSet, setLoadedSet] = useState<Set<string>>(() => new Set());
  const photoKey = useMemo(() => photos.map(p => p.file).join(','), [photos]);

  useEffect(() => {
    setLoadedSet(new Set());
  }, [photoKey]);

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
    <div
      className='fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/95'
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

        {onPrev && (
          <button
            type='button'
            onClick={onPrev}
            className='absolute left-2 sm:left-4 z-10 text-white/30 hover:text-white text-lg font-mono transition-colors duration-300'
          >
            &lt;
          </button>
        )}

        <div className='flex flex-col items-center gap-4 max-w-full max-h-full'>
          <div
            className={`${containerCls} gap-2 items-center justify-center`}
            style={{ maxHeight: 'calc(100vh - 8rem)', maxWidth: '90vw' }}
          >
            {photos.map(p => {
              const loaded = loadedSet.has(p.file);
              return (
                <button
                  key={p.file}
                  type='button'
                  className={`relative overflow-hidden cursor-pointer min-h-0 max-h-full ${isAlwaysRow ? 'min-w-0' : shouldStack ? 'w-full sm:min-w-0 sm:w-auto' : ''}`}
                  style={
                    isAlwaysRow
                      ? { flex: `${p.width / p.height} 1 0%` }
                      : shouldStack
                        ? { flex: '1 1 0%' }
                        : undefined
                  }
                  onClick={() => onPhotoClick(p)}
                >
                  <img
                    src={photoUrl(fragmentId, p.file, 'placeholder')}
                    alt=''
                    aria-hidden
                    className={`absolute inset-0 w-full h-full object-contain scale-110 blur-md transition-opacity duration-500 ${loaded ? 'opacity-0' : 'opacity-100'}`}
                  />
                  <img
                    src={photoUrl(fragmentId, p.file, 'full')}
                    alt={p.alt ?? p.caption ?? ''}
                    decoding='async'
                    className={`object-contain w-full h-full transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() =>
                      setLoadedSet(prev => new Set(prev).add(p.file))
                    }
                  />
                </button>
              );
            })}
          </div>

          <div
            className={`flex items-center gap-4 text-[10px] font-mono transition-opacity duration-500 ${photos.every(p => loadedSet.has(p.file)) ? 'opacity-100' : 'opacity-0'}`}
          >
            <span className='text-white/30'>{counter}</span>
            {caption && (
              <span className='text-white/50 transmission-prose'>
                <Markdown>{caption}</Markdown>
              </span>
            )}
          </div>
        </div>

        {onNext && (
          <button
            type='button'
            onClick={onNext}
            className='absolute right-2 sm:right-4 z-10 text-white/30 hover:text-white text-lg font-mono transition-colors duration-300'
          >
            &gt;
          </button>
        )}
      </div>
    </div>
  );
};

export { GroupLightbox };
