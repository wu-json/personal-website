import { useEffect, useRef } from 'react';

// Ink-brush cursor trail. A full-viewport canvas renders the recent
// cursor path as one continuous quad strip per layer — per-point
// perpendiculars are averaged from neighbor tangents so adjacent quads
// share their boundary edge (no seam gaps or overlaps), and each quad
// is filled with a linear gradient from the start point's alpha to the
// end point's alpha so the trail fades smoothly along its length
// rather than in disjoint chunks. Brush width tracks inverse cursor
// velocity (slow → wet body, fast → hair-thin). Disabled on coarse
// pointers and when prefers-reduced-motion is set.
const InkCursor = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    type Point = {
      x: number;
      y: number;
      w: number; // brush width at this point
      bornAt: number;
    };
    const points: Point[] = [];
    const POINT_LIFETIME = 1600;
    const MAX_POINTS = 500;

    let prevX = 0;
    let prevY = 0;
    let prevT = 0;
    let hasPrev = false;
    let prevWidth = 0.5;

    const clamp = (v: number, lo: number, hi: number) =>
      Math.max(lo, Math.min(hi, v));

    const onMove = (e: MouseEvent) => {
      const now = performance.now();
      const x = e.clientX;
      const y = e.clientY;
      if (!hasPrev) {
        prevX = x;
        prevY = y;
        prevT = now;
        hasPrev = true;
        // Seed the strip with the touch-down point. Width starts small so
        // the brush appears to be set down lightly.
        points.push({ x, y, w: 0.5, bornAt: now });
        prevWidth = 0.5;
        return;
      }
      const dx = x - prevX;
      const dy = y - prevY;
      const dt = Math.max(now - prevT, 1);
      const dist = Math.hypot(dx, dy);
      if (dist < 1.5) return;

      const speed = dist / dt; // px/ms
      // Slow drag pools to ~13px of wet ink; a fast flick narrows to a
      // ~1.4px hair. The wide range gives the stroke a brushy body
      // rather than a uniform line trace.
      const targetWidth = clamp(13 - speed * 5.2, 1.4, 13);
      // Smooth abrupt speed changes — the centerline width.
      const w = prevWidth * 0.55 + targetWidth * 0.45;
      prevWidth = w;

      // Tiny per-point width jitter — fakes the irregular bristle edge
      // of real ink, so the strip's outline isn't perfectly mathematical.
      const jitter = 1 + (Math.random() - 0.5) * 0.18;
      points.push({ x, y, w: w * jitter, bornAt: now });
      if (points.length > MAX_POINTS) points.shift();

      prevX = x;
      prevY = y;
      prevT = now;
    };

    const onLeave = () => {
      hasPrev = false;
      prevWidth = 0.5;
    };

    document.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);

    // Theme-aware ink color. Cached and refreshed only on data-theme flips.
    let inkColor = '255, 255, 255';
    const parseColor = (raw: string): string => {
      const v = raw.trim();
      if (!v) return '255, 255, 255';
      if (v.startsWith('#')) {
        const hex = v.slice(1);
        const full =
          hex.length === 3
            ? hex
                .split('')
                .map(c => c + c)
                .join('')
            : hex;
        const r = parseInt(full.slice(0, 2), 16);
        const g = parseInt(full.slice(2, 4), 16);
        const b = parseInt(full.slice(4, 6), 16);
        return `${r}, ${g}, ${b}`;
      }
      const m = v.match(/\d+(?:\.\d+)?/g);
      if (m && m.length >= 3) return `${m[0]}, ${m[1]}, ${m[2]}`;
      return '255, 255, 255';
    };
    const refreshInkColor = () => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue(
        '--color-ink',
      );
      inkColor = parseColor(raw);
    };
    refreshInkColor();
    const themeObserver = new MutationObserver(refreshInkColor);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    // Layer recipe: widthScale (relative to point's brush width) and
    // alphaScale (multiplied into the point's age-derived alpha). The
    // inner core is wider and fainter than the v1 recipe — its job is a
    // subtle density gradient inside the body, not a defining centerline
    // (which made the stroke read as a pen with a halo).
    const LAYERS: { widthScale: number; alphaScale: number }[] = [
      { widthScale: 1.7, alphaScale: 0.08 }, // soft wet halo
      { widthScale: 1.0, alphaScale: 0.7 }, // main ink body
      { widthScale: 0.55, alphaScale: 0.28 }, // diffuse inner core
    ];

    // Reusable scratch buffers — re-allocated only when the point count
    // outgrows them. Float32 is plenty of precision for screen coords.
    let perpsX = new Float32Array(MAX_POINTS);
    let perpsY = new Float32Array(MAX_POINTS);
    let alphas = new Float32Array(MAX_POINTS);

    let rafId = 0;
    const tick = () => {
      const now = performance.now();
      ctx.clearRect(0, 0, width, height);

      // Cull expired points from the head (oldest first). Points are
      // pushed in time order so a leading-edge shift is correct.
      while (points.length > 0 && now - points[0].bornAt > POINT_LIFETIME) {
        points.shift();
      }
      if (points.length < 2) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const n = points.length;
      if (perpsX.length < n) {
        perpsX = new Float32Array(n);
        perpsY = new Float32Array(n);
        alphas = new Float32Array(n);
      }

      // Per-point perpendiculars. For interior points use the chord from
      // the previous to the next neighbor as a smoothed tangent — both
      // adjacent quads see the same perpendicular at this shared vertex,
      // so the strip is geometrically continuous (no seam artifacts).
      for (let i = 0; i < n; i++) {
        let tx: number;
        let ty: number;
        if (i === 0) {
          tx = points[1].x - points[0].x;
          ty = points[1].y - points[0].y;
        } else if (i === n - 1) {
          tx = points[i].x - points[i - 1].x;
          ty = points[i].y - points[i - 1].y;
        } else {
          tx = points[i + 1].x - points[i - 1].x;
          ty = points[i + 1].y - points[i - 1].y;
        }
        const tl = Math.hypot(tx, ty) || 1;
        perpsX[i] = -ty / tl;
        perpsY[i] = tx / tl;
      }

      // Per-point age-derived alpha. Quadratic on the inverse age — ink
      // holds vivid for the first half of its lifetime then dissipates
      // gently, more like wet ink drying than a hard cutoff.
      for (let i = 0; i < n; i++) {
        const age = now - points[i].bornAt;
        if (age >= POINT_LIFETIME) {
          alphas[i] = 0;
        } else {
          const u = 1 - age / POINT_LIFETIME;
          alphas[i] = u * u;
        }
      }

      // Draw each layer as a quad strip with per-quad linear gradients.
      // Gradient endpoints are the centerline points (p0 → p1) and the
      // alphas at those endpoints match the shared per-point alpha — so
      // the value at the boundary of two adjacent quads agrees from both
      // sides, giving a continuous alpha gradient along the stroke.
      for (let l = 0; l < LAYERS.length; l++) {
        const layer = LAYERS[l];
        for (let i = 0; i < n - 1; i++) {
          const aStart = alphas[i] * layer.alphaScale;
          const aEnd = alphas[i + 1] * layer.alphaScale;
          if (aStart < 0.002 && aEnd < 0.002) continue;

          const p0 = points[i];
          const p1 = points[i + 1];
          const w0 = p0.w * layer.widthScale * 0.5;
          const w1 = p1.w * layer.widthScale * 0.5;
          const n0x = perpsX[i];
          const n0y = perpsY[i];
          const n1x = perpsX[i + 1];
          const n1y = perpsY[i + 1];

          const grad = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
          grad.addColorStop(0, `rgba(${inkColor}, ${aStart})`);
          grad.addColorStop(1, `rgba(${inkColor}, ${aEnd})`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.moveTo(p0.x + n0x * w0, p0.y + n0y * w0);
          ctx.lineTo(p1.x + n1x * w1, p1.y + n1y * w1);
          ctx.lineTo(p1.x - n1x * w1, p1.y - n1y * w1);
          ctx.lineTo(p0.x - n0x * w0, p0.y - n0y * w0);
          ctx.closePath();
          ctx.fill();
        }
      }

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      themeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className='pointer-events-none fixed inset-0 z-[200]'
    />
  );
};

export { InkCursor };
