import { useCallback, useEffect, useRef } from 'react';
import { useTheme } from 'src/theme/ThemeContext';

import { PETALS, STAMEN_RANK, STAMENS } from './geometry';
import {
  ANTHER_DURATION,
  CENTER_DURATION,
  HOVER_RADIUS,
  HOVER_STRENGTH,
  LERP_SPEED,
  PETAL_DELAY,
  PETAL_DURATION,
  RETURN_SPEED,
  STAMEN_BASE_DELAY,
  STAMEN_DURATION,
  STAMEN_STAGGER,
  STEM_DELAY,
  STEM_DURATION,
  VIEWBOX,
  WIND_SPEED,
  WIND_STRENGTH_X,
  WIND_STRENGTH_Y,
} from './motion';
import {
  type Colors,
  type ColorVec,
  SpiderLilyRenderer,
  stemRevealYFromProgress,
} from './renderer';

function cubicBezierEase(x1: number, y1: number, x2: number, y2: number) {
  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let s = t;
    for (let i = 0; i < 8; i++) {
      const u = 1 - s;
      const x = 3 * u * u * s * x1 + 3 * u * s * s * x2 + s * s * s;
      const dx = 3 * u * u * x1 + 6 * u * s * (x2 - x1) + 3 * s * s * (1 - x2);
      if (Math.abs(dx) < 1e-6) break;
      const dt = (x - t) / dx;
      s -= dt;
      if (Math.abs(dt) < 1e-5) break;
    }
    const u = 1 - s;
    return 3 * u * u * s * y1 + 3 * u * s * s * y2 + s * s * s;
  };
}

const easeStem = cubicBezierEase(0.16, 1, 0.3, 1);
const easeBloom = cubicBezierEase(0.12, 0.8, 0.2, 1);

const STEM_FINAL_OPACITY = 1;
const PETAL_FINAL_OPACITY = 0.92;
const STAMEN_FINAL_OPACITY = 0.7;
const ANTHER_FINAL_OPACITY = 0.75;
const CENTER_FINAL_OPACITY = 0.85;
const PETAL_BLOOM_START_ROTATION = (8 * Math.PI) / 180;

function parseCssColor(input: string): ColorVec {
  const s = input.trim();
  if (s.startsWith('#')) {
    let hex = s.slice(1);
    if (hex.length === 3 || hex.length === 4)
      hex = hex
        .split('')
        .map(c => c + c)
        .join('');
    if (hex.length === 6) {
      return [
        parseInt(hex.slice(0, 2), 16) / 255,
        parseInt(hex.slice(2, 4), 16) / 255,
        parseInt(hex.slice(4, 6), 16) / 255,
        1,
      ];
    }
    if (hex.length === 8) {
      return [
        parseInt(hex.slice(0, 2), 16) / 255,
        parseInt(hex.slice(2, 4), 16) / 255,
        parseInt(hex.slice(4, 6), 16) / 255,
        parseInt(hex.slice(6, 8), 16) / 255,
      ];
    }
  }
  const m = s.match(/[\d.]+/g);
  if (m && m.length >= 3) {
    return [
      parseFloat(m[0]) / 255,
      parseFloat(m[1]) / 255,
      parseFloat(m[2]) / 255,
      m.length >= 4 ? parseFloat(m[3]) : 1,
    ];
  }
  return [1, 1, 1, 1];
}

function readColors(canvas: HTMLCanvasElement): Colors {
  const cs = getComputedStyle(canvas);
  return {
    ink: parseCssColor(cs.getPropertyValue('--color-ink')),
    inkMuted: parseCssColor(cs.getPropertyValue('--color-ink-muted')),
    inkSoft: parseCssColor(cs.getPropertyValue('--color-ink-soft')),
  };
}

const SpiderLily = ({ className }: { className?: string }) => {
  const { theme, toggle } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<SpiderLilyRenderer | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, active: false });

  const toCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const u = (clientX - rect.left) / rect.width;
    const v = (clientY - rect.top) / rect.height;
    return {
      x: VIEWBOX.x + u * VIEWBOX.w,
      y: VIEWBOX.y + v * VIEWBOX.h,
    };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const c = toCanvasCoords(e.clientX, e.clientY);
      mouseRef.current.x = c.x;
      mouseRef.current.y = c.y;
      mouseRef.current.active = true;
    },
    [toCanvasCoords],
  );
  const handleMouseLeave = useCallback(() => {
    mouseRef.current.active = false;
  }, []);
  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      const t = e.touches[0];
      if (!t) return;
      const c = toCanvasCoords(t.clientX, t.clientY);
      mouseRef.current.x = c.x;
      mouseRef.current.y = c.y;
      mouseRef.current.active = true;
    },
    [toCanvasCoords],
  );
  const handleTouchEnd = useCallback(() => {
    mouseRef.current.active = false;
  }, []);
  const handleClick = useCallback(() => toggle(), [toggle]);
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLCanvasElement>) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      toggle();
    },
    [toggle],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl =
      canvas.getContext('webgl2', {
        alpha: true,
        antialias: false,
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
        depth: false,
        stencil: false,
        powerPreference: 'high-performance',
      }) ?? null;
    if (!gl) return;

    let renderer: SpiderLilyRenderer;
    try {
      renderer = new SpiderLilyRenderer(gl);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('SpiderLily renderer failed to initialize:', err);
      return;
    }
    rendererRef.current = renderer;
    renderer.setColors(readColors(canvas));

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const applySize = () => {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      renderer.setSize(w, h);
    };
    applySize();
    const ro = new ResizeObserver(applySize);
    ro.observe(canvas);

    const MAX_FRAME_STEP = 50;
    const stamenDelays = STAMENS.map(
      (_, i) => STAMEN_BASE_DELAY + STAMEN_RANK[i] * STAMEN_STAGGER,
    );
    let timeline = 0;
    let lastNow = 0;

    const petalPhases = PETALS.map((_, i) => i * 0.7 + Math.sin(i * 2.3) * 0.5);
    const stamenPhases = STAMENS.map(
      (_, i) => i * 0.9 + Math.cos(i * 1.7) * 0.6,
    );

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    const petalOffsets = new Float32Array(PETALS.length * 2);
    const stamenOffsets = new Float32Array(STAMENS.length * 2);
    const petalBloomScale = new Float32Array(PETALS.length);
    const petalBloomRotation = new Float32Array(PETALS.length);
    const petalOpacity = new Float32Array(PETALS.length);
    const stamenReveal = new Float32Array(STAMENS.length);
    const stamenOpacity = new Float32Array(STAMENS.length);
    const antherOpacity = new Float32Array(STAMENS.length);

    let rafId = 0;
    let lastColorThemeAttr =
      document.documentElement.getAttribute('data-theme');

    const tick = () => {
      if (renderer.disposed || rendererRef.current !== renderer) return;
      const now = performance.now();
      if (lastNow === 0) lastNow = now;
      timeline += Math.min(now - lastNow, MAX_FRAME_STEP);
      lastNow = now;
      const t = timeline * WIND_SPEED;
      const mouse = mouseRef.current;

      if (timeline < STEM_DELAY) {
        if (document.visibilityState === 'hidden') {
          rafId = 0;
          return;
        }
        rafId = requestAnimationFrame(tick);
        return;
      }

      const cur = document.documentElement.getAttribute('data-theme');
      if (cur !== lastColorThemeAttr) {
        lastColorThemeAttr = cur;
        renderer.setColors(readColors(canvas));
      }

      for (let i = 0; i < PETALS.length; i++) {
        const phase = petalPhases[i];
        const windX = reduceMotion
          ? 0
          : Math.sin(t + phase) * WIND_STRENGTH_X +
            Math.sin(t * 1.7 + phase * 0.6) * WIND_STRENGTH_X * 0.3;
        const windY = reduceMotion
          ? 0
          : Math.cos(t * 0.8 + phase * 1.3) * WIND_STRENGTH_Y;

        let pushX = 0;
        let pushY = 0;
        if (mouse.active) {
          const dx = PETALS[i].cx - mouse.x;
          const dy = PETALS[i].cy - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < HOVER_RADIUS && dist > 0.1) {
            const factor = (1 - dist / HOVER_RADIUS) ** 2;
            pushX = (dx / dist) * HOVER_STRENGTH * factor;
            pushY = (dy / dist) * HOVER_STRENGTH * factor;
          }
        }
        const targetX = windX + pushX;
        const targetY = windY + pushY;
        const speed = mouse.active ? LERP_SPEED : RETURN_SPEED;
        const ox = petalOffsets[i * 2];
        const oy = petalOffsets[i * 2 + 1];
        petalOffsets[i * 2] = ox + (targetX - ox) * speed;
        petalOffsets[i * 2 + 1] = oy + (targetY - oy) * speed;

        const elapsed = timeline - PETAL_DELAY - PETALS[i].delay;
        const p = Math.max(0, Math.min(1, elapsed / PETAL_DURATION));
        const eased = easeBloom(p);
        petalBloomScale[i] = eased;
        petalBloomRotation[i] = PETAL_BLOOM_START_ROTATION * (1 - eased);
        petalOpacity[i] = PETAL_FINAL_OPACITY * eased;
      }

      for (let i = 0; i < STAMENS.length; i++) {
        const phase = stamenPhases[i];
        const windX = reduceMotion
          ? 0
          : Math.sin(t + phase) * WIND_STRENGTH_X * 1.2 +
            Math.sin(t * 1.4 + phase * 0.8) * WIND_STRENGTH_X * 0.4;
        const windY = reduceMotion
          ? 0
          : Math.cos(t * 0.7 + phase * 1.1) * WIND_STRENGTH_Y * 0.8;
        let pushX = 0;
        let pushY = 0;
        if (mouse.active) {
          const dx = STAMENS[i].cx - mouse.x;
          const dy = STAMENS[i].cy - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < HOVER_RADIUS && dist > 0.1) {
            const factor = (1 - dist / HOVER_RADIUS) ** 2;
            pushX = (dx / dist) * HOVER_STRENGTH * factor * 1.2;
            pushY = (dy / dist) * HOVER_STRENGTH * factor * 1.2;
          }
        }
        const targetX = windX + pushX;
        const targetY = windY + pushY;
        const speed = mouse.active ? LERP_SPEED : RETURN_SPEED;
        const ox = stamenOffsets[i * 2];
        const oy = stamenOffsets[i * 2 + 1];
        stamenOffsets[i * 2] = ox + (targetX - ox) * speed;
        stamenOffsets[i * 2 + 1] = oy + (targetY - oy) * speed;

        const elapsed = timeline - stamenDelays[i];
        const p = Math.max(0, Math.min(1, elapsed / STAMEN_DURATION));
        const eased = easeBloom(p);
        stamenReveal[i] = eased;
        stamenOpacity[i] = STAMEN_FINAL_OPACITY * eased;
        const aElapsed = elapsed - STAMEN_DURATION;
        const ap = Math.max(0, Math.min(1, aElapsed / ANTHER_DURATION));
        antherOpacity[i] = ANTHER_FINAL_OPACITY * easeBloom(ap);
      }

      let stemOpacity = 0;
      const stemP = Math.max(
        0,
        Math.min(1, (timeline - STEM_DELAY) / STEM_DURATION),
      );
      const stemRevealProgress = easeStem(stemP);
      if (stemRevealProgress < 0.1) {
        stemOpacity = (stemRevealProgress / 0.1) * 0.8;
      } else {
        stemOpacity = 0.8 + ((stemRevealProgress - 0.1) / 0.9) * 0.2;
      }
      stemOpacity *= STEM_FINAL_OPACITY;
      const stemRevealY = stemRevealYFromProgress(stemRevealProgress);

      const centerP = Math.max(
        0,
        Math.min(1, (timeline - PETAL_DELAY) / CENTER_DURATION),
      );
      const centerEased = easeBloom(centerP);
      const centerScale = centerEased;
      const centerOpacity = CENTER_FINAL_OPACITY * centerEased;

      const flowerRotation = reduceMotion
        ? 0
        : ((Math.sin(t * 0.8) * 0.8 + Math.sin(t * 1.3) * 0.35) * Math.PI) /
          180;

      renderer.render({
        flowerRotation,
        petalOffsets,
        stamenOffsets,
        petalBloomScale,
        petalBloomRotation,
        petalOpacity,
        stamenReveal,
        stamenOpacity,
        antherOpacity,
        stemOpacity,
        stemRevealY,
        centerScale,
        centerOpacity,
      });

      if (document.visibilityState === 'hidden') {
        rafId = 0;
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !rafId) {
        rafId = requestAnimationFrame(tick);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    const onLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(rafId);
      rafId = 0;
    };
    const onRestored = () => {
      try {
        renderer.dispose();
      } catch {}
      const newRenderer = new SpiderLilyRenderer(gl);
      rendererRef.current = newRenderer;
      newRenderer.setColors(readColors(canvas));
      applySize();
      rafId = requestAnimationFrame(tick);
    };
    canvas.addEventListener('webglcontextlost', onLost, false);
    canvas.addEventListener('webglcontextrestored', onRestored, false);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      ro.disconnect();
      renderer.dispose();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !rendererRef.current) return;
    rendererRef.current.setColors(readColors(canvas));
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className={`${className ?? ''} cursor-pointer focus:outline-none focus-visible:[filter:drop-shadow(0_0_8px_var(--color-glow))]`}
      style={{
        aspectRatio: `${VIEWBOX.w} / ${VIEWBOX.h}`,
        display: 'block',
        width: '100%',
      }}
      // oxlint-disable-next-line prefer-tag-over-role
      role='button'
      tabIndex={0}
      aria-label='Toggle color scheme'
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    />
  );
};

export { SpiderLily };
