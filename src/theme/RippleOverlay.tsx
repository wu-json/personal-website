import { useEffect, useMemo, useRef, useState } from 'react';

import type { Theme } from './ThemeContext';

/**
 * A layered "bloom" transition between themes. Not a single disc — four
 * synchronized layers, in back-to-front order:
 *
 *   1. advance halo  — a wide, low-alpha wash of the incoming surface that
 *                      scales ahead of everything else, giving the eye a
 *                      sense that something is arriving before the wash
 *                      actually lands.
 *   2. wash disc     — the primary scrim that grows from the click origin
 *                      and eventually covers the viewport. Feathered edge
 *                      (radial gradient) so it reads as ink bleeding, not a
 *                      disc snapping into place.
 *   3. ink ring      — a thin expanding stroke in the *incoming ink color*.
 *                      This is the "ripple on water" tell; it scales slightly
 *                      faster than the wash so it always rides ahead as a
 *                      leading edge.
 *   4. center flare  — a small radial bloom right where the flower was
 *                      clicked, in the incoming ink color. Grounds the
 *                      effect at the source.
 *
 * The data-theme attribute flips mid-animation (FLIP_AT), while the wash is
 * still spreading. Because the wash is translucent at its leading edge, the
 * revealed new theme emerges *through* the ripple rather than being hidden
 * behind a binary curtain drop.
 */

const FLARE_DURATION_MS = 520;
const HALO_DURATION_MS = 1100;
const WASH_DURATION_MS = 1150;
const RING_DURATION_MS = 1300;

const WASH_DELAY_MS = 70;
const RING_DELAY_MS = 130;

const FADE_DURATION_MS = 260;
const FLIP_AT = 0.55;

// Total lifetime before the overlay tears down.
const TOTAL_DURATION_MS = Math.max(
  FLARE_DURATION_MS,
  HALO_DURATION_MS,
  WASH_DURATION_MS + WASH_DELAY_MS,
  RING_DURATION_MS + RING_DELAY_MS,
);

// Surface + ink colors must match the CSS tokens in index.css. Reading them
// inline avoids a getComputedStyle flush on the hot path and guarantees the
// ripple uses the *incoming* theme's colors regardless of attribute state.
const SURFACE_BY_THEME: Record<Theme, string> = {
  dark: '#000000',
  light: '#ffffff',
};
const INK_BY_THEME: Record<Theme, string> = {
  dark: '#ffffff',
  light: '#000000',
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
    // 40px overshoot so the feathered edge actually reaches the corners
    // before the opacity fade begins.
    return Math.hypot(dx, dy) + 40;
  }, [x, y]);

  useEffect(() => {
    const flipTimer = window.setTimeout(
      () => onFlipRef.current(),
      WASH_DURATION_MS * FLIP_AT + WASH_DELAY_MS,
    );

    const fadeTimer = window.setTimeout(
      () => setPhase('fade'),
      TOTAL_DURATION_MS,
    );

    const doneTimer = window.setTimeout(
      () => onDoneRef.current(),
      TOTAL_DURATION_MS + FADE_DURATION_MS,
    );

    return () => {
      window.clearTimeout(flipTimer);
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  const diameter = radius * 2;
  const surface = SURFACE_BY_THEME[toTheme];
  const ink = INK_BY_THEME[toTheme];

  // Size the leading/trailing layers relative to the wash so the rings
  // always lead it regardless of viewport.
  const haloDiameter = diameter * 1.15;
  const ringDiameter = diameter * 1.08;
  const flareDiameter = Math.min(420, Math.max(260, radius * 0.55));

  const baseStyle = (size: number): React.CSSProperties => ({
    left: x - size / 2,
    top: y - size / 2,
    width: size,
    height: size,
  });

  return (
    <div
      aria-hidden
      className={`theme-ripple-root pointer-events-none fixed inset-0 z-[9999] ${
        phase === 'fade' ? 'theme-ripple-root-fade' : ''
      }`}
    >
      {/* Advance halo — wide, low-alpha, leads the wash */}
      <div
        className='theme-ripple-halo'
        style={{
          ...baseStyle(haloDiameter),
          background: `radial-gradient(circle at center, ${surface} 0%, ${surface} 35%, color-mix(in srgb, ${surface} 35%, transparent) 68%, transparent 100%)`,
        }}
      />

      {/* Wash disc — primary scrim, soft feathered edge */}
      <div
        className='theme-ripple-wash'
        style={{
          ...baseStyle(diameter),
          background: `radial-gradient(circle at center, ${surface} 0%, ${surface} 72%, color-mix(in srgb, ${surface} 55%, transparent) 88%, transparent 100%)`,
        }}
      />

      {/* Ink ring — thin stroke in the incoming ink color, rides ahead */}
      <div
        className='theme-ripple-ring'
        style={{
          ...baseStyle(ringDiameter),
          borderColor: `color-mix(in srgb, ${ink} 45%, transparent)`,
          boxShadow: `0 0 48px 4px color-mix(in srgb, ${ink} 18%, transparent)`,
        }}
      />

      {/* Center flare — grounds the bloom at the click origin */}
      <div
        className='theme-ripple-flare'
        style={{
          ...baseStyle(flareDiameter),
          background: `radial-gradient(circle at center, color-mix(in srgb, ${ink} 55%, transparent) 0%, color-mix(in srgb, ${ink} 22%, transparent) 35%, transparent 70%)`,
        }}
      />
    </div>
  );
};

export { RippleOverlay };
