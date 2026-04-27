import { useEffect, useState } from 'react';

import type { PhotoMeta } from '../types';

import { photoUrl } from '../data';
import { isWarm, markWarm } from './imageCache';

/**
 * Renders one photo (placeholder + full image) inside a carousel cell.
 * `loaded` is initialized from the warm-image cache so neighbors that
 * have already been preloaded + decoded skip the placeholder fade
 * entirely on swipe commit.
 *
 * Used by `Lightbox` for the prev / center / next cells, and by
 * `GroupLightbox` for the prev / next cells (the center cell of
 * `GroupLightbox` renders a multi-photo group layout instead).
 */
const PhotoCell = ({
  photo,
  fragmentId,
}: {
  photo: PhotoMeta | null;
  fragmentId: string;
}) => {
  if (!photo) {
    return <div className='memories-track-cell' aria-hidden />;
  }
  return <PhotoCellInner photo={photo} fragmentId={fragmentId} />;
};

const PhotoCellInner = ({
  photo,
  fragmentId,
}: {
  photo: PhotoMeta;
  fragmentId: string;
}) => {
  const fullSrc = photoUrl(fragmentId, photo.file, 'full');
  const placeholderSrc = photoUrl(fragmentId, photo.file, 'placeholder');
  const [loaded, setLoaded] = useState(() => isWarm(fullSrc));

  useEffect(() => {
    setLoaded(isWarm(fullSrc));
  }, [fullSrc]);

  return (
    <div className='memories-track-cell flex items-center justify-center'>
      <div
        className='relative overflow-hidden'
        style={{
          aspectRatio: `${photo.width} / ${photo.height}`,
          maxHeight: 'calc(100vh - 8rem)',
          width: `min(calc(100vw - 4rem), calc((100vh - 8rem) * ${photo.width / photo.height}))`,
        }}
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
          className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => {
            markWarm(fullSrc);
            setLoaded(true);
          }}
        />
      </div>
    </div>
  );
};

export { PhotoCell };
