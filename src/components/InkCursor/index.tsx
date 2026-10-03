import { useEffect, useRef } from 'react';

import { InkCursorRenderer, SEGMENT_STRIDE } from './renderer';

const POINT_LIFETIME = 1600;
const MAX_POINTS = 500;

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
    if (!gl) return;

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
      load: number;
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
      const speed = dist / dt;
      const targetWidth = clamp(15 - speed * 5.2, 1.6, 15);
      const w = prevWidth * 0.55 + targetWidth * 0.45;
      prevWidth = w;
      const targetLoad = clamp(1 - speed * 0.22, 0.32, 1);
      const load = prevLoad * 0.55 + targetLoad * 0.45;
      prevLoad = load;
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

    let alphas = new Float32Array(MAX_POINTS);
    let halfWs = new Float32Array(MAX_POINTS);
    let arcs = new Float32Array(MAX_POINTS);
    const segBuffer = new Float32Array(MAX_POINTS * SEGMENT_STRIDE);

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
      if (alphas.length < n) {
        alphas = new Float32Array(n);
        halfWs = new Float32Array(n);
        arcs = new Float32Array(n);
      }

      for (let i = 0; i < n; i++) {
        const age = now - points[i].bornAt;
        if (age >= POINT_LIFETIME) {
          alphas[i] = 0;
          halfWs[i] = 0;
        } else {
          const u = 1 - age / POINT_LIFETIME;
          alphas[i] = u * u;
          halfWs[i] = points[i].w * 0.5 * Math.sqrt(u);
        }
      }

      arcs[0] = 0;
      for (let i = 1; i < n; i++) {
        const dx = points[i].x - points[i - 1].x;
        const dy = points[i].y - points[i - 1].y;
        arcs[i] = arcs[i - 1] + Math.hypot(dx, dy);
      }

      const segmentCount = n - 1;
      for (let s = 0; s < segmentCount; s++) {
        const off = s * SEGMENT_STRIDE;
        const p0 = points[s];
        const p1 = points[s + 1];
        segBuffer[off + 0] = p0.x;
        segBuffer[off + 1] = p0.y;
        segBuffer[off + 2] = p1.x;
        segBuffer[off + 3] = p1.y;
        segBuffer[off + 4] = halfWs[s];
        segBuffer[off + 5] = halfWs[s + 1];
        segBuffer[off + 6] = alphas[s];
        segBuffer[off + 7] = alphas[s + 1];
        segBuffer[off + 8] = arcs[s];
        segBuffer[off + 9] = arcs[s + 1];
        segBuffer[off + 10] = p0.load;
        segBuffer[off + 11] = p1.load;
      }

      renderer.uploadAndDraw(segBuffer, segmentCount);

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    const onLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(rafId);
      rafId = 0;
    };
    const onRestored = () => {
      try {
        renderer?.dispose();
      } catch {}
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
