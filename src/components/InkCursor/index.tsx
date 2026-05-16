import { useEffect, useRef } from 'react';

import { InkCursorRenderer, type Layer, VERTEX_STRIDE } from './renderer';

// Ink-brush cursor trail rendered with WebGL2.
//
// The point-tracking logic mirrors the Canvas2D original: each mousemove
// becomes a point with a width that tracks inverse cursor velocity (slow
// → wet body, fast → hair-thin), plus a tiny per-point jitter to fake
// bristle irregularity. Each frame we cull expired points, compute a
// neighbor-averaged perpendicular per point (so adjacent quads share an
// edge — no seams), pack everything into one Float32Array, and let the
// GPU rasterize three layered triangle strips with per-vertex alpha
// interpolation. The interpolated alpha across the strip replaces the
// per-quad linearGradient that was the Canvas2D Safari bottleneck.
//
// Disabled on coarse pointers and when prefers-reduced-motion is set.

const POINT_LIFETIME = 1600;
const MAX_POINTS = 500;

// Layer recipe: widthScale (relative to point's brush width) and
// alphaScale (multiplied into the point's age-derived alpha). The inner
// core is wider and fainter than a centerline — its job is a subtle
// density gradient inside the body, not a hard pen line.
const LAYERS: Layer[] = [
  { widthScale: 1.7, alphaScale: 0.08 }, // soft wet halo
  { widthScale: 1.0, alphaScale: 0.7 }, // main ink body
  { widthScale: 0.55, alphaScale: 0.28 }, // diffuse inner core
];

const parseColor = (raw: string): [number, number, number] => {
  const v = raw.trim();
  if (!v) return [1, 1, 1];
  if (v.startsWith('#')) {
    const hex = v.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split('')
            .map(c => c + c)
            .join('')
        : hex;
    return [
      parseInt(full.slice(0, 2), 16) / 255,
      parseInt(full.slice(2, 4), 16) / 255,
      parseInt(full.slice(4, 6), 16) / 255,
    ];
  }
  const m = v.match(/\d+(?:\.\d+)?/g);
  if (m && m.length >= 3) {
    return [
      parseFloat(m[0]) / 255,
      parseFloat(m[1]) / 255,
      parseFloat(m[2]) / 255,
    ];
  }
  return [1, 1, 1];
};

const InkCursor = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
    });
    if (!gl) return; // WebGL2 unavailable — trail is decorative, render nothing.

    let renderer: InkCursorRenderer | null = null;
    try {
      renderer = new InkCursorRenderer(gl);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('InkCursor renderer failed to initialize:', err);
      return;
    }

    const applySize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const widthCss = window.innerWidth;
      const heightCss = window.innerHeight;
      const widthPx = Math.floor(widthCss * dpr);
      const heightPx = Math.floor(heightCss * dpr);
      if (canvas.width !== widthPx) canvas.width = widthPx;
      if (canvas.height !== heightPx) canvas.height = heightPx;
      canvas.style.width = `${widthCss}px`;
      canvas.style.height = `${heightCss}px`;
      renderer?.setSize(widthCss, heightCss, widthPx, heightPx);
    };
    applySize();
    window.addEventListener('resize', applySize);

    type Point = {
      x: number;
      y: number;
      w: number;
      load: number; // 0..1 — drier on fast strokes (sumi ink-depletion feel)
      bornAt: number;
    };
    const points: Point[] = [];

    let prevX = 0;
    let prevY = 0;
    let prevT = 0;
    let prevWidth = 0.5;
    let prevLoad = 1;
    let hasPrev = false;

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
        points.push({ x, y, w: 0.5, load: 1, bornAt: now });
        prevWidth = 0.5;
        prevLoad = 1;
        return;
      }
      const dx = x - prevX;
      const dy = y - prevY;
      const dt = Math.max(now - prevT, 1);
      const dist = Math.hypot(dx, dy);
      if (dist < 1.5) return;
      const speed = dist / dt; // px/ms
      // Slow drag pools to ~15px of wet ink; a fast flick narrows to a
      // ~1.6px hair. Wide range gives the stroke a brushy body.
      const targetWidth = clamp(15 - speed * 5.2, 1.6, 15);
      const w = prevWidth * 0.55 + targetWidth * 0.45;
      prevWidth = w;
      // Ink load: slow strokes ride at full saturation; fast strokes
      // deplete the brush. Same smoothing as width so the wet/dry feel
      // tracks velocity without flicker.
      const targetLoad = clamp(1 - speed * 0.22, 0.32, 1);
      const load = prevLoad * 0.55 + targetLoad * 0.45;
      prevLoad = load;
      // Tiny per-point width jitter — fakes irregular bristle edge.
      const jitter = 1 + (Math.random() - 0.5) * 0.18;
      points.push({ x, y, w: w * jitter, load, bornAt: now });
      if (points.length > MAX_POINTS) points.shift();
      prevX = x;
      prevY = y;
      prevT = now;
    };

    const onLeave = () => {
      hasPrev = false;
      prevWidth = 0.5;
      prevLoad = 1;
    };

    document.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);

    const refreshColor = () => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue(
        '--color-ink',
      );
      renderer?.setColor(parseColor(raw));
    };
    refreshColor();
    const themeObserver = new MutationObserver(refreshColor);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    let perpsX = new Float32Array(MAX_POINTS);
    let perpsY = new Float32Array(MAX_POINTS);
    let alphas = new Float32Array(MAX_POINTS);
    let widthFactors = new Float32Array(MAX_POINTS);
    let arcs = new Float32Array(MAX_POINTS);
    const vertexBuffer = new Float32Array(MAX_POINTS * 2 * VERTEX_STRIDE);

    let rafId = 0;
    const tick = () => {
      if (!renderer || renderer.disposed) return;
      const now = performance.now();
      renderer.clear();

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
        widthFactors = new Float32Array(n);
        arcs = new Float32Array(n);
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

      // Per-point age-derived alpha + width. Alpha decays quadratically
      // (ink holds vivid then fades). Width tapers as sqrt of remaining
      // life — slower start, faster at the end — so the oldest end of
      // the stroke narrows to a point like a brush lifting off paper.
      for (let i = 0; i < n; i++) {
        const age = now - points[i].bornAt;
        if (age >= POINT_LIFETIME) {
          alphas[i] = 0;
          widthFactors[i] = 0;
        } else {
          const u = 1 - age / POINT_LIFETIME;
          alphas[i] = u * u;
          widthFactors[i] = Math.sqrt(u);
        }
      }

      // Cumulative arc length per point — feeds the bristle noise's
      // along-stroke axis. Recomputed each frame from the oldest live
      // point so values don't grow unbounded across long sessions.
      arcs[0] = 0;
      for (let i = 1; i < n; i++) {
        const dx = points[i].x - points[i - 1].x;
        const dy = points[i].y - points[i - 1].y;
        arcs[i] = arcs[i - 1] + Math.hypot(dx, dy);
      }

      // Pack triangle-strip vertices: two per point (rails at +perp / -perp).
      // Width and alpha scale happen in the vertex shader from layer uniforms,
      // so this buffer is uploaded once and drawn three times.
      for (let i = 0; i < n; i++) {
        const off = i * 2 * VERTEX_STRIDE;
        const p = points[i];
        const halfW = p.w * 0.5 * widthFactors[i];
        const px = perpsX[i];
        const py = perpsY[i];
        const a = alphas[i];
        const arc = arcs[i];
        const load = p.load;
        // +side
        vertexBuffer[off + 0] = p.x;
        vertexBuffer[off + 1] = p.y;
        vertexBuffer[off + 2] = px;
        vertexBuffer[off + 3] = py;
        vertexBuffer[off + 4] = halfW;
        vertexBuffer[off + 5] = a;
        vertexBuffer[off + 6] = 1;
        vertexBuffer[off + 7] = arc;
        vertexBuffer[off + 8] = load;
        // -side
        vertexBuffer[off + 9] = p.x;
        vertexBuffer[off + 10] = p.y;
        vertexBuffer[off + 11] = px;
        vertexBuffer[off + 12] = py;
        vertexBuffer[off + 13] = halfW;
        vertexBuffer[off + 14] = a;
        vertexBuffer[off + 15] = -1;
        vertexBuffer[off + 16] = arc;
        vertexBuffer[off + 17] = load;
      }

      renderer.uploadAndDraw(vertexBuffer, n * 2, LAYERS);

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    // Context loss — rebuild the renderer and resume. The trail is reset
    // (no point in trying to redraw stale history through a new context).
    const onLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(rafId);
      rafId = 0;
    };
    const onRestored = () => {
      try {
        renderer?.dispose();
      } catch {
        /* ignore */
      }
      try {
        renderer = new InkCursorRenderer(gl);
      } catch {
        renderer = null;
        return;
      }
      refreshColor();
      applySize();
      points.length = 0;
      hasPrev = false;
      rafId = requestAnimationFrame(tick);
    };
    canvas.addEventListener('webglcontextlost', onLost, false);
    canvas.addEventListener('webglcontextrestored', onRestored, false);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', applySize);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      themeObserver.disconnect();
      renderer?.dispose();
      renderer = null;
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
