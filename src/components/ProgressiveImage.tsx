import type { CSSProperties } from 'react';
import { useEffect, useRef } from 'react';

type CSSVars = CSSProperties & Record<string, string>;

const ProgressiveImage = ({
  placeholderSrc,
  src,
  srcSet,
  sizes,
  alt = '',
  width,
  height,
  loading = 'lazy',
  fetchPriority,
  objectPosition,
  className = '',
  onClick,
}: {
  placeholderSrc: string;
  src: string;
  srcSet?: string;
  sizes?: string;
  alt?: string;
  width: number;
  height: number;
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'low' | 'auto';
  objectPosition?: string;
  className?: string;
  onClick?: () => void;
}) => {
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const wrapper = img.parentElement;
    if (!wrapper) return;

    if (img.complete) {
      if (img.naturalWidth > 0) {
        wrapper.dataset.loaded = 'true';
      } else {
        wrapper.dataset.loaded = 'true';
        wrapper.dataset.error = 'true';
      }
      return;
    }

    const onLoad = () => {
      wrapper.dataset.loaded = 'true';
    };
    const onError = () => {
      wrapper.dataset.loaded = 'true';
      wrapper.dataset.error = 'true';
    };
    img.addEventListener('load', onLoad, { once: true });
    img.addEventListener('error', onError, { once: true });
    return () => {
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onError);
    };
  }, []);

  const escapedPlaceholder = placeholderSrc
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
  const style: CSSVars = {
    '--ar': `${width} / ${height}`,
    '--ph': `url("${escapedPlaceholder}")`,
    '--obj-pos': objectPosition ?? 'center',
  };

  return (
    <div
      className={`progressive-image ${className}`}
      style={style}
      onClick={onClick}
      onKeyDown={
        onClick
          ? e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <img
        ref={imgRef}
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding='async'
        fetchPriority={fetchPriority}
      />
    </div>
  );
};

export { ProgressiveImage };
