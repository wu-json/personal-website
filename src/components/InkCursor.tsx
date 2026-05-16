import { useEffect, useRef } from 'react';

// Ink-brush cursor trail. A full-viewport canvas paints layered quadratic
// segments behind the OS cursor — wet halo, body, sharp spine, and a few
// perpendicular bristle hairs — that fade over ~1.4s. Brush width tracks
// inverse velocity so a slow drag pools into thick wet ink while a fast
// flick scatters into thin "flying white" hairs. Disabled on coarse
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

    type Segment = {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
      cx: number;
      cy: number;
      width: number;
      bristles: {
        offset: number;
        opacity: number;
        head: number;
        tail: number;
      }[];
      splatters: { dx: number; dy: number; r: number; a: number }[];
      bornAt: number;
      lifetime: number;
    };

    const segments: Segment[] = [];
    const SEGMENT_CAP = 220;

    let prevX = 0;
    let prevY = 0;
    let prevT = 0;
    let hasPrev = false;
    let prevWidth = 6;

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
        return;
      }
      const dx = x - prevX;
      const dy = y - prevY;
      const dt = Math.max(now - prevT, 1);
      const dist = Math.hypot(dx, dy);
      if (dist < 1.5) return;

      const speed = dist / dt; // px/ms
      // Slow = thick wet ink (target ~16px); fast = thin dry brush (~1.5px).
      const targetWidth = clamp(16 - speed * 5.5, 1.5, 16);
      // Smooth width transitions so abrupt speed changes don't snap.
      const w = prevWidth * 0.55 + targetWidth * 0.45;
      prevWidth = w;

      // Use the midpoint as the control point. Sequential segments share
      // endpoints at their midpoints, which knits them into a single C1
      // curve without explicit Catmull-Rom math.
      const cx = (prevX + x) / 2;
      const cy = (prevY + y) / 2;

      // Bristle hairs: 2–4 thin lines parallel to the stroke, offset
      // perpendicular. More bristles when moving fast (dry brush look).
      const bristleCount = speed > 1.2 ? 4 : speed > 0.5 ? 3 : 2;
      const bristles: Segment['bristles'] = [];
      for (let i = 0; i < bristleCount; i++) {
        const seed = Math.random();
        bristles.push({
          offset: (seed - 0.5) * w * 1.6,
          opacity: 0.25 + seed * 0.45,
          // Trim some bristles short on either end to fake split bristles.
          head: Math.random() * 0.35,
          tail: 0.65 + Math.random() * 0.35,
        });
      }

      // Occasional ink splatters when the brush is pressing (slow & wet).
      const splatters: Segment['splatters'] = [];
      if (speed < 0.4 && Math.random() < 0.35) {
        const count = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
          splatters.push({
            dx: (Math.random() - 0.5) * w * 2.2,
            dy: (Math.random() - 0.5) * w * 2.2,
            r: 0.4 + Math.random() * 1.2,
            a: 0.35 + Math.random() * 0.45,
          });
        }
      }

      // Faster strokes evaporate quicker; slow wet ink lingers a bit longer.
      const lifetime = speed > 1.5 ? 900 : speed > 0.6 ? 1200 : 1600;

      segments.push({
        x0: prevX,
        y0: prevY,
        x1: x,
        y1: y,
        cx,
        cy,
        width: w,
        bristles,
        splatters,
        bornAt: now,
        lifetime,
      });

      // Guard against runaway growth if a rAF stalls.
      if (segments.length > SEGMENT_CAP) {
        segments.splice(0, segments.length - SEGMENT_CAP);
      }

      prevX = x;
      prevY = y;
      prevT = now;
    };

    const onLeave = () => {
      hasPrev = false;
    };

    document.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);

    // Read the ink color once and re-read whenever the theme attribute on
    // <html> flips. Cheaper than getComputedStyle per frame.
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

    let rafId = 0;
    const tick = () => {
      const now = performance.now();
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = segments.length - 1; i >= 0; i--) {
        const s = segments[i];
        const age = now - s.bornAt;
        if (age >= s.lifetime) {
          segments.splice(i, 1);
          continue;
        }
        const t = age / s.lifetime;
        // Ease-out cubic — ink stays vivid then fades quickly at the end.
        const fade = 1 - t * t * t;

        // Layer 1: wet ink halo. Wide, soft, very faint — the bleed.
        ctx.strokeStyle = `rgba(${inkColor}, ${0.08 * fade})`;
        ctx.lineWidth = s.width * 1.9;
        ctx.beginPath();
        ctx.moveTo(s.x0, s.y0);
        ctx.quadraticCurveTo(s.cx, s.cy, s.x1, s.y1);
        ctx.stroke();

        // Layer 2: main body — the readable ink mark.
        ctx.strokeStyle = `rgba(${inkColor}, ${0.72 * fade})`;
        ctx.lineWidth = s.width;
        ctx.beginPath();
        ctx.moveTo(s.x0, s.y0);
        ctx.quadraticCurveTo(s.cx, s.cy, s.x1, s.y1);
        ctx.stroke();

        // Layer 3: sharp spine — a thin dark line down the middle.
        ctx.strokeStyle = `rgba(${inkColor}, ${0.55 * fade})`;
        ctx.lineWidth = Math.max(s.width * 0.32, 0.6);
        ctx.beginPath();
        ctx.moveTo(s.x0, s.y0);
        ctx.quadraticCurveTo(s.cx, s.cy, s.x1, s.y1);
        ctx.stroke();

        // Layer 4: bristle hairs. Perpendicular offset, each trimmed at
        // head/tail so they look like split bristle tracks.
        const dx = s.x1 - s.x0;
        const dy = s.y1 - s.y0;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        ctx.lineWidth = 0.6;
        for (const b of s.bristles) {
          const ox = nx * b.offset;
          const oy = ny * b.offset;
          // Quadratic point at parameter u: (1-u)^2 P0 + 2(1-u)u CP + u^2 P1.
          const headX =
            (1 - b.head) * (1 - b.head) * s.x0 +
            2 * (1 - b.head) * b.head * s.cx +
            b.head * b.head * s.x1;
          const headY =
            (1 - b.head) * (1 - b.head) * s.y0 +
            2 * (1 - b.head) * b.head * s.cy +
            b.head * b.head * s.y1;
          const tailX =
            (1 - b.tail) * (1 - b.tail) * s.x0 +
            2 * (1 - b.tail) * b.tail * s.cx +
            b.tail * b.tail * s.x1;
          const tailY =
            (1 - b.tail) * (1 - b.tail) * s.y0 +
            2 * (1 - b.tail) * b.tail * s.cy +
            b.tail * b.tail * s.y1;
          ctx.strokeStyle = `rgba(${inkColor}, ${b.opacity * fade})`;
          ctx.beginPath();
          ctx.moveTo(headX + ox, headY + oy);
          ctx.quadraticCurveTo(s.cx + ox, s.cy + oy, tailX + ox, tailY + oy);
          ctx.stroke();
        }

        // Splatters — small ink dots scattered around slow brush points.
        for (const sp of s.splatters) {
          ctx.fillStyle = `rgba(${inkColor}, ${sp.a * fade})`;
          ctx.beginPath();
          ctx.arc(s.x0 + sp.dx, s.y0 + sp.dy, sp.r, 0, Math.PI * 2);
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
