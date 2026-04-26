import type { CSSProperties } from 'react';

import { useEffect, useRef } from 'react';

type CSSVars = CSSProperties & Record<string, string>;

/**
 * Single-node progressive image.
 *
 * The wrapper <div> carries the 20px placeholder as a CSS background-image
 * (via --ph), so there's only one real <img> per tile instead of the two
 * stacked <img>s we used to render. The blur→crisp transition is driven
 * purely by CSS: an imperative `load` listener flips
 * data-loaded="true" on the wrapper, which fades the <img> in and drops
 * the background. No React state, no reconciler re-render on load.
 *
 * Layout: --ar (width / height) drives `aspect-ratio` on the wrapper so
 * we reserve space before the image lands (no CLS).
 *
 * See src/index.css → `.progressive-image` for the rules.
 */
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

    // Already cached — `load` may never fire again.
    if (img.complete && img.naturalWidth > 0) {
      wrapper.dataset.loaded = 'true';
      return;
    }

    const onLoad = () => {
      wrapper.dataset.loaded = 'true';
    };
    // If the thumbnail 404s or otherwise fails, surface it instead of
    // leaving the <img> stuck at opacity:0 over the placeholder forever.
    // We flip data-loaded='true' (so the broken-image glyph fades in) and
    // also stamp data-error so callers/styles can react if they want.
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

  // Escape so paths with `"`, `\`, `)`, whitespace, etc. don't break the
  // CSS `url(...)` token. Backslash first, then double-quote.
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
      onKeyDown={onClick ? e => e.key === 'Enter' && onClick() : undefined}
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
