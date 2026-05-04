import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import Markdown from 'react-markdown';

import type { PhotoMeta } from '../types';

import { photoUrl } from '../data';
import { loadedFullUrls } from './loadedFullUrls';

const GroupSlide = ({
  photos,
  fragmentId,
  layout,
  caption,
  counter,
  interactive,
  onPhotoClick,
}: {
  photos: PhotoMeta[];
  fragmentId: string;
  layout: string;
  caption?: string;
  counter: string;
  interactive: boolean;
  onPhotoClick: (photo: PhotoMeta) => void;
}) => {
  const photoKey = useMemo(() => photos.map(p => p.file).join(','), [photos]);
  // `LightboxShell` keys each `GroupSlide` by slide identity, so a change in
  // `photos` / `fragmentId` arrives as a fresh mount. The `useState`
  // initializer alone is enough to seed `loadedSet` from the cache; a
  // separate effect would just produce a redundant Set + extra render.
  const [loadedSet, setLoadedSet] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const p of photos) {
      const url = photoUrl(fragmentId, p.file, 'full');
      if (loadedFullUrls.has(url)) initial.add(p.file);
    }
    return initial;
  });

  const imgsRef = useRef<Map<string, HTMLImageElement>>(new Map());

  useLayoutEffect(() => {
    let next: Set<string> | null = null;
    for (const p of photos) {
      const img = imgsRef.current.get(p.file);
      if (img && img.complete && img.naturalWidth > 0) {
        loadedFullUrls.add(photoUrl(fragmentId, p.file, 'full'));
        if (!next) next = new Set(loadedSet);
        next.add(p.file);
      }
    }
    if (next) setLoadedSet(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoKey, fragmentId]);

  const markLoaded = (file: string) => {
    loadedFullUrls.add(photoUrl(fragmentId, file, 'full'));
    setLoadedSet(prev => {
      if (prev.has(file)) return prev;
      const next = new Set(prev);
      next.add(file);
      return next;
    });
  };

  const isAlwaysColumn = layout === 'column';
  const combinedAR = photos.reduce((sum, p) => sum + p.width / p.height, 0);
  const shouldStack = !isAlwaysColumn && combinedAR > 2;
  const isAlwaysRow = !isAlwaysColumn && !shouldStack;

  const containerCls = isAlwaysColumn
    ? 'flex flex-col'
    : shouldStack
      ? 'flex flex-col sm:flex-row'
      : 'flex';

  const allLoaded = photos.every(p => loadedSet.has(p.file));

  return (
    <div
      className={`relative flex flex-col items-center justify-center w-full h-full p-4 sm:p-8 gap-4 ${interactive ? '' : 'pointer-events-none'}`}
    >
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
              tabIndex={interactive ? 0 : -1}
              aria-hidden={interactive ? undefined : true}
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
                ref={el => {
                  if (el) imgsRef.current.set(p.file, el);
                  else imgsRef.current.delete(p.file);
                }}
                src={photoUrl(fragmentId, p.file, 'full')}
                alt={p.alt ?? p.caption ?? ''}
                decoding='async'
                fetchPriority={interactive ? 'high' : 'low'}
                className={`object-contain w-full h-full transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => markLoaded(p.file)}
              />
            </button>
          );
        })}
      </div>

      <div
        className={`flex items-center gap-4 text-xs sm:text-[10px] font-mono transition-opacity duration-500 ${allLoaded ? 'opacity-100' : 'opacity-0'}`}
      >
        <span className='text-white/30'>{counter}</span>
        {caption && (
          <span className='text-white/50 signal-prose'>
            <Markdown>{caption}</Markdown>
          </span>
        )}
      </div>
    </div>
  );
};

export { GroupSlide };
