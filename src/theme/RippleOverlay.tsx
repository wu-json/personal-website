import { useEffect, useMemo, useRef, useState } from 'react';

import type { Theme } from './ThemeContext';

/**
 * Animates a single viewport-covering circle from scale 0 to 1, then fades
 * out. The circle is painted with the incoming theme's surface color. The
 * parent's `onFlip` callback is invoked at ~60% of the scale animation —
 * that's when the disc has covered most of the viewport and it's safe to
 * swap the `data-theme` attribute without the user seeing a mid-animation
 * repaint.
 */

const SCALE_DURATION_MS = 650;
const FADE_DURATION_MS = 160;
const FLIP_AT = 0.6;

// Surface colors must match the CSS tokens in index.css. Keeping them inline
// (rather than reading from getComputedStyle) avoids a layout flush on the
// hot path and guarantees the ripple's color is the *incoming* surface
// regardless of what the current attribute says.
const SURFACE_BY_THEME: Record<Theme, string> = {
  dark: '#000000',
  light: '#ffffff',
};

const RippleOverlay = ({
  x,
  y,
  toTheme,
  onFlip,
  onDone,
}: {
  x: number;
  y: number;
  toTheme: Theme;
  onFlip: () => void;
  onDone: () => void;
}) => {
  const [phase, setPhase] = useState<'grow' | 'fade'>('grow');
  const onFlipRef = useRef(onFlip);
  const onDoneRef = useRef(onDone);
  onFlipRef.current = onFlip;
  onDoneRef.current = onDone;

  const radius = useMemo(() => {
    if (typeof window === 'undefined') return 1500;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dx = Math.max(x, vw - x);
    const dy = Math.max(y, vh - y);
    // 20px padding guarantees we clear sub-pixel rounding at the edge.
    return Math.hypot(dx, dy) + 20;
  }, [x, y]);

  useEffect(() => {
    const flipTimer = window.setTimeout(() => {
      onFlipRef.current();
    }, SCALE_DURATION_MS * FLIP_AT);

    const fadeTimer = window.setTimeout(() => {
      setPhase('fade');
    }, SCALE_DURATION_MS);

    const doneTimer = window.setTimeout(() => {
      onDoneRef.current();
    }, SCALE_DURATION_MS + FADE_DURATION_MS);

    return () => {
      window.clearTimeout(flipTimer);
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  const diameter = radius * 2;
  const surface = SURFACE_BY_THEME[toTheme];

  return (
    <div
      aria-hidden
      className='theme-ripple-overlay pointer-events-none fixed inset-0 z-[9999]'
    >
      <div
        className={`theme-ripple-disc ${phase === 'grow' ? 'theme-ripple-disc-grow' : 'theme-ripple-disc-fade'}`}
        style={{
          left: x - radius,
          top: y - radius,
          width: diameter,
          height: diameter,
          background: `radial-gradient(circle at center, ${surface} 0%, ${surface} 78%, color-mix(in srgb, ${surface} 0%, transparent) 100%)`,
        }}
      />
    </div>
  );
};

export { RippleOverlay };
