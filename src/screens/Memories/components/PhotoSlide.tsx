import { useLayoutEffect, useRef, useState } from 'react';
import { Markdown } from 'src/components/Markdown';

import { captionTree, photoUrl } from '../data';
import type { PhotoMeta } from '../types';
import { loadedFullUrls } from './loadedFullUrls';

const PhotoSlide = ({
  photo,
  fragmentId,
  counter,
  interactive,
}: {
  photo: PhotoMeta;
  fragmentId: string;
  counter: string;
  interactive: boolean;
}) => {
  const fullUrl = photoUrl(fragmentId, photo.file, 'full');
  const captionNode = photo.caption && captionTree(photo.caption);
  const [loaded, setLoaded] = useState(() => loadedFullUrls.has(fullUrl));
  const imgRef = useRef<HTMLImageElement>(null);

  useLayoutEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete && img.naturalWidth > 0) {
      loadedFullUrls.add(fullUrl);
      setLoaded(true);
    }
  }, [fullUrl]);

  const onImgLoad = () => {
    loadedFullUrls.add(fullUrl);
    setLoaded(true);
  };

  return (
    <div
      className={`relative flex flex-col items-center justify-center w-full h-full p-4 sm:p-8 gap-3 ${interactive ? '' : 'pointer-events-none'}`}
    >
      <div
        className='relative overflow-hidden'
        style={{
          aspectRatio: `${photo.width} / ${photo.height}`,
          maxHeight: 'calc(100vh - 8rem)',
          width: `min(calc(100vw - 4rem), calc((100vh - 8rem) * ${photo.width / photo.height}))`,
        }}
      >
        <img
          src={photoUrl(fragmentId, photo.file, 'placeholder')}
          alt=''
          aria-hidden
          className={`absolute inset-0 w-full h-full object-contain scale-110 blur-md transition-opacity duration-500 ${loaded ? 'opacity-0' : 'opacity-100'}`}
        />
        <img
          ref={imgRef}
          src={fullUrl}
          alt={photo.alt ?? photo.caption ?? ''}
          decoding='async'
          fetchPriority={interactive ? 'high' : 'low'}
          className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={onImgLoad}
        />
      </div>

      <div
        className={`flex items-baseline gap-4 text-xs sm:text-[10px] font-mono max-w-full transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      >
        <span className='text-white/30 shrink-0'>{counter}</span>
        {captionNode && (
          <span className='text-white/50 signal-prose min-w-0'>
            <Markdown
              tree={captionNode}
              components={{
                a: ({ children, href }) => (
                  <a href={href} target='_blank' rel='noopener noreferrer'>
                    {children}
                  </a>
                ),
              }}
            />
          </span>
        )}
      </div>
    </div>
  );
};

export { PhotoSlide };
