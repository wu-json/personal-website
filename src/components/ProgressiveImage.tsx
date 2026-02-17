import { useState } from 'react';

const ProgressiveImage = ({
  placeholderSrc,
  src,
  alt = '',
  width,
  height,
  loading = 'lazy',
  objectPosition,
  className = '',
  onClick,
}: {
  placeholderSrc: string;
  src: string;
  alt?: string;
  width: number;
  height: number;
  loading?: 'lazy' | 'eager';
  objectPosition?: string;
  className?: string;
  onClick?: () => void;
}) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className={`relative overflow-hidden bg-white/5 ${className}`}
      style={{ aspectRatio: `${width} / ${height}` }}
      onClick={onClick}
      onKeyDown={onClick ? e => e.key === 'Enter' && onClick() : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <img
        src={placeholderSrc}
        alt=''
        aria-hidden
        className={`absolute inset-0 w-full h-full object-cover scale-110 blur-md transition-opacity duration-500 ${loaded ? 'opacity-0' : 'opacity-100'}`}
        style={objectPosition ? { objectPosition } : undefined}
      />
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding='async'
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        style={objectPosition ? { objectPosition } : undefined}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
};

export { ProgressiveImage };
