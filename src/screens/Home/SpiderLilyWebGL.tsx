import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { useTheme } from 'src/theme/ThemeContext';

import { CX, CY, petals, stamens } from './SpiderLily';

/**
 * WebGL spider lily — exploration of the "uniform across browsers" approach.
 *
 * We rasterize the SVG silhouette once into a canvas-backed texture, then
 * run all motion (wind sway, hover push) and effects (glow) on the GPU via
 * a fragment shader. WebKit and Skia both treat WebGL as a black box that
 * blits a texture, so the per-frame work happens in shader code we own
 * rather than in the engine's SVG filter pipeline — Safari renders this at
 * the same FPS as Chrome.
 *
 * Trade-offs vs the SVG version:
 *   - The bloom entrance is a single fade-in rather than per-petal
 *     unfurling. Replicating the staggered SVG bloom in a shader would
 *     require either per-petal textures or an SDF representation.
 *   - Wind sway is a smooth global UV warp, not per-petal jitter. Visually
 *     similar; mechanically simpler.
 *   - Ink-texture displacement is dropped; the glow is approximated by a
 *     16-tap radial blur instead of feGaussianBlur.
 */

const TEXTURE_W = 1024;
const TEXTURE_H = 602;
const VIEW_BOX = { x: -180, y: 10, w: 800, h: 470 };
const ASPECT = VIEW_BOX.w / VIEW_BOX.h;

const buildSvgString = (color: string): string => {
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEW_BOX.x} ${VIEW_BOX.y} ${VIEW_BOX.w} ${VIEW_BOX.h}" width="${TEXTURE_W}" height="${TEXTURE_H}">`,
  );
  parts.push(
    `<path d="M${CX - 4} ${CY} C${CX - 3} ${CY + 30}, ${CX + 2} 275, ${CX + 4} 320 C${CX + 6} 365, ${CX + 4} 410, ${CX + 1} 465 C${CX + 6} 410, ${CX + 8} 365, ${CX + 10} 320 C${CX + 8} 275, ${CX + 7} ${CY + 30}, ${CX + 6} ${CY} Z" fill="${color}" opacity="0.8"/>`,
  );
  parts.push(`<g transform="rotate(-4 ${CX} ${CY})">`);
  for (const p of petals) {
    parts.push(
      `<path d="${p.d}" fill="${color}" stroke="${color}" stroke-width="0.5" stroke-linejoin="round"/>`,
    );
  }
  for (const s of stamens) {
    parts.push(
      `<path d="${s.d}" fill="none" stroke="${color}" stroke-width="0.8" stroke-linecap="round" opacity="0.55"/>`,
    );
    if (!s.noTip) {
      parts.push(
        `<ellipse cx="${s.tipX}" cy="${s.tipY}" rx="${s.tipLen}" ry="${s.tipW}" transform="rotate(${s.tipAngle} ${s.tipX} ${s.tipY})" fill="${color}" opacity="0.75"/>`,
      );
    }
  }
  parts.push(`<circle cx="${CX}" cy="${CY}" r="3" fill="${color}"/>`);
  parts.push(`</g></svg>`);
  return parts.join('');
};

type RasterPair = { sharp: HTMLCanvasElement; glow: HTMLCanvasElement };

// Rasterize the SVG into two canvases — a sharp silhouette and a
// pre-blurred halo. Doing the blur once at startup via ctx.filter (GPU-
// accelerated in both Skia and CoreGraphics) collapses the shader's
// per-frame work from 32 texture samples per pixel to 2. The shape never
// changes, so the cached blur is always correct.
const rasterize = (svg: string): Promise<RasterPair> =>
  new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const make = (filter: string) => {
        const canvas = document.createElement('canvas');
        canvas.width = TEXTURE_W;
        canvas.height = TEXTURE_H;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.filter = filter;
        ctx.drawImage(img, 0, 0, TEXTURE_W, TEXTURE_H);
        return canvas;
      };
      const sharp = make('none');
      const glow = make('blur(14px)');
      URL.revokeObjectURL(url);
      if (!sharp || !glow) {
        reject(new Error('2d context unavailable'));
        return;
      }
      resolve({ sharp, glow });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('svg rasterization failed'));
    };
    img.src = url;
  });

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment shader: warps uv with wind + hover, then does TWO texture
// samples — sharp silhouette + pre-blurred halo. The blur is baked at
// startup (see rasterize), so the per-frame cost is constant regardless
// of halo radius. Earlier iterations did a 32-tap radial blur in the
// shader which was fine on Chromium but stutter-y on Safari/Metal at
// Retina dpr; this trades startup work for runtime smoothness.
const FRAGMENT_SHADER = /* glsl */ `
  precision mediump float;

  uniform sampler2D uSharp;
  uniform sampler2D uGlow;
  uniform float uTime;
  uniform vec2 uMouse;       // 0..1 uv space; (-1,-1) when inactive
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uAspect;

  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;

    float windX = sin(uTime * 0.8 + uv.y * 4.0) * 0.006
                + sin(uTime * 1.7 + uv.y * 2.3) * 0.002;
    float windY = cos(uTime * 0.6 + uv.x * 3.0) * 0.003;
    uv += vec2(windX, windY);

    if (uMouse.x > -0.5) {
      vec2 d = (uv - uMouse) * vec2(uAspect, 1.0);
      float dist = length(d);
      if (dist > 0.001 && dist < 0.35) {
        float push = pow(1.0 - dist / 0.35, 2.0) * 0.025;
        uv += normalize(uv - uMouse) * push;
      }
    }

    float core = texture2D(uSharp, uv).a;
    float halo = texture2D(uGlow, uv).a;

    float alpha = max(core, halo * 0.55) * uOpacity;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

type Vec3 = [number, number, number];

const hexToVec3 = (hex: string): Vec3 => {
  const m = hex.replace('#', '');
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  return [r, g, b];
};

const LilyMesh = ({
  sharp,
  glow,
  color,
  fadeStart,
}: {
  sharp: THREE.Texture;
  glow: THREE.Texture;
  color: Vec3;
  fadeStart: number;
}) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });
  const { gl } = useThree();

  const uniforms = useMemo(
    () => ({
      uSharp: { value: sharp },
      uGlow: { value: glow },
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(-1, -1) },
      uColor: { value: new THREE.Vector3(...color) },
      uOpacity: { value: 0 },
      uAspect: { value: ASPECT },
    }),
    // Uniforms are owned by the mesh's lifetime; the refs below mutate
    // them in place so we never want this memo to re-fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    uniforms.uSharp.value = sharp;
    uniforms.uGlow.value = glow;
    if (materialRef.current) materialRef.current.needsUpdate = true;
  }, [sharp, glow, uniforms]);

  useEffect(() => {
    uniforms.uColor.value.set(...color);
  }, [color, uniforms]);

  useEffect(() => {
    const canvas = gl.domElement;
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = (e.clientX - rect.left) / rect.width;
      mouseRef.current.y = 1 - (e.clientY - rect.top) / rect.height;
      mouseRef.current.active = true;
    };
    const onLeave = () => {
      mouseRef.current.active = false;
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);
    return () => {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
    };
  }, [gl]);

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime;
    const fade = Math.min(
      1,
      Math.max(0, (clock.elapsedTime - fadeStart) / 1.8),
    );
    uniforms.uOpacity.value = fade;
    if (mouseRef.current.active) {
      uniforms.uMouse.value.set(mouseRef.current.x, mouseRef.current.y);
    } else {
      uniforms.uMouse.value.set(-1, -1);
    }
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent
        depthTest={false}
      />
    </mesh>
  );
};

const SpiderLilyWebGL = ({ className }: { className?: string }) => {
  const { theme, toggle } = useTheme();
  const [textures, setTextures] = useState<{
    sharp: THREE.CanvasTexture;
    glow: THREE.CanvasTexture;
  } | null>(null);

  const color = useMemo<Vec3>(
    () => (theme === 'dark' ? hexToVec3('#ffffff') : hexToVec3('#000000')),
    [theme],
  );

  useEffect(() => {
    let cancelled = false;
    const wrap = (canvas: HTMLCanvasElement) => {
      const tex = new THREE.CanvasTexture(canvas);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      tex.premultiplyAlpha = false;
      return tex;
    };
    rasterize(buildSvgString('#ffffff'))
      .then(({ sharp, glow }) => {
        if (cancelled) return;
        setTextures({ sharp: wrap(sharp), glow: wrap(glow) });
      })
      .catch(err => {
        // eslint-disable-next-line no-console
        console.error('SpiderLilyWebGL: rasterize failed', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleClick = useCallback(() => {
    toggle();
  }, [toggle]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      toggle();
    },
    [toggle],
  );

  return (
    <div
      className={`${className ?? ''} cursor-pointer focus:outline-none`}
      style={{ aspectRatio: `${VIEW_BOX.w} / ${VIEW_BOX.h}` }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      // oxlint-disable-next-line prefer-tag-over-role
      role='button'
      tabIndex={0}
      aria-label='Toggle color scheme'
    >
      {textures && (
        <Canvas
          orthographic
          camera={{ position: [0, 0, 1], zoom: 1, near: 0.1, far: 10 }}
          // Clamp dpr to 1 — at Retina 2x the fragment shader runs over
          // 4x the pixels, which Safari/Metal handles noticeably worse
          // than Chrome. The flower is a soft, blurry silhouette so the
          // resolution drop is invisible.
          dpr={1}
          gl={{ alpha: true, antialias: true }}
          style={{ background: 'transparent' }}
        >
          <LilyMesh
            sharp={textures.sharp}
            glow={textures.glow}
            color={color}
            fadeStart={0.2}
          />
        </Canvas>
      )}
    </div>
  );
};

export { SpiderLilyWebGL };
