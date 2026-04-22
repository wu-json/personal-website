import { PointerLockControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  type RefObject,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { type Theme, useTheme } from 'src/theme/ThemeContext';
import * as THREE from 'three';

import {
  type AABB,
  type ArtPiece,
  type GalleryLayout,
  type ImageSpec,
  type Partition,
  generateGalleryLayout,
} from './generateLayout';
import { MobileControls } from './MobileControls';

type GalleryPalette = {
  // Surfaces
  wall: string;
  wallNoiseAmp: number;
  ceiling: string;
  ceilingNoiseAmp: number;
  floorBase: string;
  plankHue: number;
  plankLightness: [number, number];
  plankSaturation: [number, number];
  grainDark: (alpha: number) => string;
  grainLight: (alpha: number) => string;
  plankBand: (alpha: number) => string;
  plankSeam: string;
  plankSeamHighlight: string;
  rowSeam: string;
  rowSeamHighlight: string;
  // Ink / text on canvas-rendered textures
  ink: string;
  inkMuted: string;
  inkFaint: string;
  inkDivider: string;
  // 3D object colors
  frame: string;
  canvasPlaceholder: string;
  benchSeat: string;
  benchLeg: string;
  // Lighting
  ambientIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  spotColor: string;
  spotIntensity: number;
  fillColor: string;
  fillIntensityNear: number;
  fillIntensityFar: number;
  fillDistanceNear: number;
  fillDistanceFar: number;
};

const DARK_PALETTE: GalleryPalette = {
  wall: '#0a0a0a',
  wallNoiseAmp: 6,
  ceiling: '#080808',
  ceilingNoiseAmp: 4,
  floorBase: '#2a2a2a',
  plankHue: 0,
  plankLightness: [15, 19],
  plankSaturation: [2, 4],
  grainDark: alpha => `rgba(20, 20, 20, ${alpha})`,
  grainLight: alpha => `rgba(60, 60, 60, ${alpha})`,
  plankBand: alpha => `rgba(15, 15, 15, ${alpha})`,
  plankSeam: 'rgba(10, 10, 10, 0.12)',
  plankSeamHighlight: 'rgba(60, 60, 60, 0.06)',
  rowSeam: 'rgba(10, 10, 10, 0.08)',
  rowSeamHighlight: 'rgba(60, 60, 60, 0.04)',
  ink: '#ffffff',
  inkMuted: 'rgba(255, 255, 255, 0.5)',
  inkFaint: 'rgba(255, 255, 255, 0.3)',
  inkDivider: 'rgba(255, 255, 255, 0.12)',
  frame: '#1a1a1e',
  canvasPlaceholder: '#1a1a1a',
  benchSeat: '#1a1a1a',
  benchLeg: '#111111',
  ambientIntensity: 1.2,
  hemiSky: '#ffffff',
  hemiGround: '#333333',
  hemiIntensity: 0.8,
  spotColor: '#ffffff',
  spotIntensity: 12,
  fillColor: '#ffffff',
  fillIntensityNear: 3,
  fillIntensityFar: 2,
  fillDistanceNear: 50,
  fillDistanceFar: 40,
};

const LIGHT_PALETTE: GalleryPalette = {
  wall: '#f2f2f2',
  wallNoiseAmp: 4,
  ceiling: '#f7f7f7',
  ceilingNoiseAmp: 3,
  floorBase: '#d6cfc1',
  plankHue: 30,
  plankLightness: [78, 86],
  plankSaturation: [10, 18],
  grainDark: alpha => `rgba(60, 45, 28, ${alpha * 1.3})`,
  grainLight: alpha => `rgba(255, 245, 230, ${alpha * 0.9})`,
  plankBand: alpha => `rgba(80, 60, 40, ${alpha * 1.2})`,
  plankSeam: 'rgba(70, 50, 30, 0.18)',
  plankSeamHighlight: 'rgba(255, 250, 240, 0.5)',
  rowSeam: 'rgba(70, 50, 30, 0.12)',
  rowSeamHighlight: 'rgba(255, 250, 240, 0.4)',
  ink: '#0a0a0a',
  inkMuted: 'rgba(0, 0, 0, 0.55)',
  inkFaint: 'rgba(0, 0, 0, 0.35)',
  inkDivider: 'rgba(0, 0, 0, 0.18)',
  frame: '#1a1a1e',
  canvasPlaceholder: '#e6e6e6',
  benchSeat: '#c9bda8',
  benchLeg: '#a89d8a',
  ambientIntensity: 0.75,
  hemiSky: '#ffffff',
  hemiGround: '#c8c8c8',
  hemiIntensity: 0.4,
  spotColor: '#ffffff',
  spotIntensity: 6,
  fillColor: '#ffffff',
  fillIntensityNear: 1.2,
  fillIntensityFar: 0.8,
  fillDistanceNear: 50,
  fillDistanceFar: 40,
};

const getPalette = (theme: Theme): GalleryPalette =>
  theme === 'light' ? LIGHT_PALETTE : DARK_PALETTE;

export type MobileInput = {
  moveX: number;
  moveY: number;
  lookDeltaX: number;
  lookDeltaY: number;
};

import { fragments, photoUrl } from 'src/screens/Memories/data';

const DEFAULT_COUNT = 19;

const makeImages = (count: number): ImageSpec[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `untitled ${String.fromCharCode(65 + (i % 26))}${i >= 26 ? String(i) : ''}`,
    orientation: (i % 3 === 0 ? 'portrait' : 'landscape') as const,
  }));

const MOVE_SPEED = 16;
const RUN_SPEED = 32;
const CROUCH_SPEED = 8;
const JUMP_IMPULSE = 12;
const GRAVITY = 40;
const STAND_HEIGHT = 0;
const CROUCH_HEIGHT = -2.5;
const CROUCH_LERP = 8;
const BOUNDARY_PADDING = 0.5;

const createWoodTexture = (palette: GalleryPalette) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = palette.floorBase;
  ctx.fillRect(0, 0, 1024, 1024);

  const plankH = 80;

  // Deterministic RNG
  let _s = 0;
  const seed = (v: number) => {
    _s = v;
  };
  const next = () => {
    _s = ((_s * 1103515245 + 12345) & 0x7fffffff) >>> 0;
    return _s / 0x7fffffff;
  };

  const [lMin, lMax] = palette.plankLightness;
  const [sMin, sMax] = palette.plankSaturation;
  const lRange = lMax - lMin;
  const sRange = sMax - sMin;

  // Per-plank color — subtle variation
  const plankColor = (row: number, col: number) => {
    seed(row * 7 + col * 13 + 3);
    const l = lMin + next() * lRange;
    const s = sMin + next() * sRange;
    return `hsl(${palette.plankHue}, ${s}%, ${l}%)`;
  };

  // Variable plank lengths per row (3–5 planks across 1024px)
  const rowPlanks = (row: number) => {
    seed(row * 53 + 11);
    const planks: number[] = [];
    let x = 0;
    // Offset the start so rows don't line up
    const rowOffset = next() * 200 - 100;
    x = rowOffset;
    if (x > 0) {
      // Need a partial plank at the left edge
      planks.push(-rowOffset); // negative means "start before 0"
    }
    while (x < 1024) {
      const len = 200 + next() * 300; // 200–500px per plank
      planks.push(len);
      x += len;
    }
    return { planks, rowOffset };
  };

  const drawPlank = (
    x: number,
    y: number,
    w: number,
    color: string,
    plankSeed: number,
  ) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, plankH);

    // Grain: clusters of parallel lines with varying density
    seed(plankSeed);
    const grainDensity = 12 + Math.floor(next() * 16); // 12–28 lines per plank
    const grainBaseY = y + next() * 10; // slight vertical offset per plank
    const grainSpread = 0.4 + next() * 0.3; // how spread out the lines are

    for (let i = 0; i < grainDensity; i++) {
      const t = i / grainDensity;
      const gy = grainBaseY + t * (plankH - 6) + (next() - 0.5) * 4;
      if (gy < y || gy > y + plankH) continue;

      const alpha = 0.04 + next() * 0.06;
      const darker = next() > 0.4;
      ctx.strokeStyle = darker
        ? palette.grainDark(alpha)
        : palette.grainLight(alpha * 0.6);
      ctx.lineWidth = grainSpread + next() * 0.5;
      ctx.beginPath();
      ctx.moveTo(x, gy);
      // Grain with gentle waviness
      const drift1 = (next() - 0.5) * 3;
      const drift2 = drift1 + (next() - 0.5) * 2;
      ctx.bezierCurveTo(
        x + w * 0.3,
        gy + drift1,
        x + w * 0.7,
        gy + drift2,
        x + w,
        gy + drift2 + (next() - 0.5) * 1.5,
      );
      ctx.stroke();
    }

    // Occasional darker band (heartwood variation)
    seed(plankSeed + 999);
    if (next() > 0.6) {
      const bandY = y + plankH * (0.2 + next() * 0.6);
      const bandH = 3 + next() * 8;
      ctx.fillStyle = palette.plankBand(0.03 + next() * 0.04);
      ctx.fillRect(x, bandY, w, bandH);
    }

    // Vertical end-seam — visible gap between planks
    ctx.strokeStyle = palette.plankSeam;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w, y + plankH);
    ctx.stroke();
    // Highlight edge (light catches the bevel)
    ctx.strokeStyle = palette.plankSeamHighlight;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x + w + 1, y);
    ctx.lineTo(x + w + 1, y + plankH);
    ctx.stroke();
  };

  for (let y = 0; y < 1024; y += plankH) {
    const row = Math.floor(y / plankH);
    const { planks, rowOffset } = rowPlanks(row);

    let x = rowOffset < 0 ? rowOffset : 0;
    let col = 0;
    for (const len of planks) {
      const actualX = rowOffset < 0 && col === 0 ? 0 : x;
      const actualLen = rowOffset < 0 && col === 0 ? x + len : len;
      const color = plankColor(row, col);
      const ps = row * 127 + col * 43;
      drawPlank(actualX, y, actualLen, color, ps);
      // Wrap around for seamless tiling
      if (actualX + actualLen > 1024) {
        drawPlank(actualX - 1024, y, actualLen, color, ps);
      }
      if (actualX < 0) {
        drawPlank(actualX + 1024, y, actualLen, color, ps);
      }
      x += len;
      col++;
    }

    // Horizontal seam between rows
    ctx.strokeStyle = palette.rowSeam;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
    ctx.strokeStyle = palette.rowSeamHighlight;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y + 1);
    ctx.lineTo(1024, y + 1);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(9, 9);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const createWallTexture = (palette: GalleryPalette) => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = palette.wall;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle noise
  const imageData = ctx.getImageData(0, 0, 512, 512);
  const data = imageData.data;
  let s = 42;
  const amp = palette.wallNoiseAmp;
  for (let i = 0; i < data.length; i += 4) {
    s = ((s * 1103515245 + 12345) & 0x7fffffff) >>> 0;
    const noise = (s / 0x7fffffff - 0.5) * amp;
    data[i] = Math.min(255, Math.max(0, data[i]! + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1]! + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2]! + noise));
  }
  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const createCeilingTexture = (palette: GalleryPalette) => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = palette.ceiling;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle noise
  const imageData = ctx.getImageData(0, 0, 512, 512);
  const data = imageData.data;
  let s = 77;
  const amp = palette.ceilingNoiseAmp;
  for (let i = 0; i < data.length; i += 4) {
    s = ((s * 1103515245 + 12345) & 0x7fffffff) >>> 0;
    const noise = (s / 0x7fffffff - 0.5) * amp;
    data[i] = Math.min(255, Math.max(0, data[i]! + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1]! + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2]! + noise));
  }
  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const drawBlossom = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  fill: string,
) => {
  const angles = [0, 72, 144, 216, 288];
  const petalRx = 10 * scale;
  const petalRy = 22 * scale;
  const petalOffset = 28 * scale;

  ctx.fillStyle = fill;
  for (const angle of angles) {
    const rad = (angle * Math.PI) / 180;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rad);
    ctx.beginPath();
    ctx.ellipse(0, -petalOffset, petalRx, petalRy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Center circle
  ctx.beginPath();
  ctx.arc(cx, cy, 8 * scale, 0, Math.PI * 2);
  ctx.fill();
};

const createWelcomeTexture = (
  palette: GalleryPalette,
  mobile = false,
  fragmentTitle?: string,
  fragmentDescription?: string,
) => {
  const canvas = document.createElement('canvas');
  canvas.width = 3072;
  canvas.height = 1280;
  const ctx = canvas.getContext('2d')!;

  const s = 2; // scale factor for hi-res

  ctx.fillStyle = palette.wall;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Center the content block horizontally
  // Content spans from blossom left (~50*s) to text right (~canvas.width old edge)
  // Original layout was designed for 2048px; offset to center in wider canvas
  const contentWidth = 2048;
  const offsetX = (canvas.width - contentWidth) / 2;

  // Blossom emblem on the left
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  drawBlossom(ctx, offsetX + 150 * s, 180 * s, 2.2 * s, palette.ink);

  // Switch to pixel font rendering
  ctx.imageSmoothingEnabled = false;

  const font = "'Geist Pixel Circle'";
  const textLeft = offsetX + 310 * s;

  ctx.textAlign = 'left';

  // Title
  ctx.fillStyle = palette.ink;
  ctx.font = `${64 * s}px ${font}`;
  ctx.fillText(fragmentTitle ?? 'GALLERY', textLeft, 150 * s);

  // Subtitle — strip markdown links and word-wrap
  ctx.fillStyle = palette.inkMuted;
  const subtitleSize = 28 * s;
  ctx.font = `${subtitleSize}px ${font}`;
  const rawSubtitle =
    fragmentDescription ||
    (fragmentTitle ? 'AN INTERACTIVE GALLERY' : 'A COLLECTION BY JASON WU');
  // Convert markdown links [text](url) → text
  const subtitle = rawSubtitle.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  const contentRight = offsetX + contentWidth;
  const maxTextWidth = contentRight - textLeft - 80 * s;
  const subtitleLines: string[] = [];
  for (const para of subtitle.split('\n')) {
    const trimmed = para.trim();
    if (trimmed === '') {
      subtitleLines.push('');
      continue;
    }
    for (const word of trimmed.split(' ')) {
      const last = subtitleLines[subtitleLines.length - 1];
      if (last && ctx.measureText(`${last} ${word}`).width <= maxTextWidth) {
        subtitleLines[subtitleLines.length - 1] = `${last} ${word}`;
      } else {
        subtitleLines.push(word);
      }
    }
  }
  let y = 210 * s;
  const subtitleLineHeight = 36 * s;
  for (const line of subtitleLines) {
    ctx.fillText(line, textLeft, y);
    y += subtitleLineHeight;
  }

  // Divider
  ctx.strokeStyle = palette.inkDivider;
  ctx.lineWidth = 1 * s;
  const divY = y + 10 * s;
  ctx.beginPath();
  ctx.moveTo(textLeft, divY);
  ctx.lineTo(contentRight - 80 * s, divY);
  ctx.stroke();

  // Controls
  ctx.fillStyle = palette.inkFaint;
  ctx.font = `${20 * s}px ${font}`;
  const controls = mobile
    ? ['LEFT JOYSTICK — MOVE', 'DRAG RIGHT — LOOK']
    : [
        'WASD — MOVE / SHIFT — RUN',
        'MOUSE — LOOK / CTRL — CROUCH',
        'SPACE — JUMP',
        'ESC — RELEASE CAMERA',
      ];
  y = divY + 50 * s;
  for (const line of controls) {
    ctx.fillText(line, textLeft, y);
    y += 40 * s;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  return texture;
};

const Floor = ({
  roomWidth,
  roomDepth,
  roomHeight,
  palette,
}: {
  roomWidth: number;
  roomDepth: number;
  roomHeight: number;
  palette: GalleryPalette;
}) => {
  const texture = useMemo(() => createWoodTexture(palette), [palette]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -roomHeight / 2, 0]}>
      <planeGeometry args={[roomWidth, roomDepth]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
};

const PartitionWall = ({
  position,
  size,
  palette,
}: {
  position: [number, number, number];
  size: [number, number, number];
  palette: GalleryPalette;
}) => {
  const wallTex = useMemo(() => createWallTexture(palette), [palette]);
  useEffect(() => () => wallTex.dispose(), [wallTex]);
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial map={wallTex} roughness={0.92} />
    </mesh>
  );
};

const Partitions = ({
  partitions,
  palette,
}: {
  partitions: Partition[];
  palette: GalleryPalette;
}) => (
  <group>
    {partitions.map((p, i) => (
      <PartitionWall
        key={i}
        position={p.position}
        size={p.size}
        palette={palette}
      />
    ))}
  </group>
);

const GalleryBench = ({
  position,
  palette,
}: {
  position: [number, number, number];
  palette: GalleryPalette;
}) => {
  const seatW = 6;
  const seatD = 1.8;
  const seatThickness = 0.35;
  const seatY = -6.1;
  const legW = 0.18;
  const legHeight = 1.7;
  const legY = seatY - seatThickness / 2 - legHeight / 2;
  const seatHalfW = seatW / 2;
  const seatHalfD = seatD / 2;
  const legInset = 0.25;

  return (
    <group position={position}>
      {/* Seat */}
      <mesh position={[0, seatY, 0]}>
        <boxGeometry args={[seatW, seatThickness, seatD]} />
        <meshStandardMaterial color={palette.benchSeat} roughness={0.8} />
      </mesh>
      {/* Legs */}
      {[
        [-seatHalfW + legInset, legY, -seatHalfD + legInset],
        [seatHalfW - legInset, legY, -seatHalfD + legInset],
        [-seatHalfW + legInset, legY, seatHalfD - legInset],
        [seatHalfW - legInset, legY, seatHalfD - legInset],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <boxGeometry args={[legW, legHeight, legW]} />
          <meshStandardMaterial color={palette.benchLeg} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
};

const SpawnPoint = ({
  position,
  lookAt,
}: {
  position: [number, number, number];
  lookAt: [number, number, number];
}) => {
  const { camera } = useThree();
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      camera.rotation.order = 'YXZ';
      camera.position.set(...position);
      camera.lookAt(...lookAt);
      initialized.current = true;
    }
  }, [camera, position, lookAt]);

  return null;
};

const WelcomeWallText = ({
  position,
  rotation,
  mobile,
  fragmentTitle,
  fragmentDescription,
  palette,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  mobile?: boolean;
  fragmentTitle?: string;
  fragmentDescription?: string;
  palette: GalleryPalette;
}) => {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let cancelled = false;
    let created: THREE.Texture | null = null;
    document.fonts.ready.then(() => {
      if (cancelled) return;
      created = createWelcomeTexture(
        palette,
        mobile,
        fragmentTitle,
        fragmentDescription,
      );
      setTexture(created);
    });
    return () => {
      cancelled = true;
      if (created) created.dispose();
    };
  }, [palette, mobile, fragmentTitle, fragmentDescription]);

  if (!texture) return null;

  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[10.5, 4.375]} />
      <meshStandardMaterial
        map={texture}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
      />
    </mesh>
  );
};

const LABEL_W = 1.6;
const LABEL_H = 0.4;

const createLabelTexture = (palette: GalleryPalette, title: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Match wall color so it blends seamlessly
  ctx.fillStyle = palette.wall;
  ctx.fillRect(0, 0, 256, 64);

  // Slightly brighter than inkMuted so labels read at reading distance.
  ctx.fillStyle = palette.ink;
  ctx.globalAlpha = 0.7;
  ctx.font = "16px 'Geist Pixel Circle'";
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 8, 32);
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  return texture;
};

const ArtFrame = memo(
  ({
    position,
    size,
    imageUrl,
    palette,
  }: {
    position: [number, number, number];
    size: [number, number];
    imageUrl?: string;
    palette: GalleryPalette;
  }) => {
    const [w, h] = size;
    const matRef = useRef<THREE.MeshBasicMaterial>(null);

    // Per-instance, palette-keyed frame material. Replaces the previous
    // module-scope singleton so theme flips actually re-color the frames.
    const frameMaterial = useMemo(
      () =>
        new THREE.MeshStandardMaterial({
          color: palette.frame,
          roughness: 0.3,
          metalness: 0.1,
        }),
      [palette.frame],
    );
    useEffect(() => () => frameMaterial.dispose(), [frameMaterial]);

    useEffect(() => {
      if (!imageUrl || !matRef.current) return;
      const mat = matRef.current;
      const loader = new THREE.TextureLoader();
      loader.load(
        imageUrl,
        tex => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.generateMipmaps = false;
          tex.minFilter = THREE.LinearFilter;
          tex.magFilter = THREE.LinearFilter;
          mat.map = tex;
          mat.color.set('#ffffff');
          mat.needsUpdate = true;
        },
        undefined,
        () => {
          // On error, keep the placeholder
        },
      );
      return () => {
        if (mat.map) {
          mat.map.dispose();
          mat.map = null;
        }
      };
    }, [imageUrl]);

    return (
      <group position={position}>
        {/* Frame */}
        <mesh position={[0, 0, -0.02]} material={frameMaterial}>
          <boxGeometry args={[w + 0.16, h + 0.16, 0.04]} />
        </mesh>
        {/* Canvas */}
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial ref={matRef} color={palette.canvasPlaceholder} />
        </mesh>
      </group>
    );
  },
);

const ArtLabel = memo(
  ({
    position,
    title,
    palette,
  }: {
    position: [number, number, number];
    title: string;
    palette: GalleryPalette;
  }) => {
    const [labelTex, setLabelTex] = useState<THREE.Texture | null>(null);

    useEffect(() => {
      let cancelled = false;
      let created: THREE.Texture | null = null;
      document.fonts.ready.then(() => {
        if (cancelled) return;
        created = createLabelTexture(palette, title);
        setLabelTex(created);
      });
      return () => {
        cancelled = true;
        if (created) created.dispose();
      };
    }, [palette, title]);

    if (!labelTex) return null;

    return (
      <mesh position={position}>
        <planeGeometry args={[LABEL_W, LABEL_H]} />
        <meshStandardMaterial
          map={labelTex}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
    );
  },
);

const ArtPlaceholder = memo(
  ({ piece, palette }: { piece: ArtPiece; palette: GalleryPalette }) => {
    const { position, size, rotation, title, imageUrl, childPieces } = piece;
    const [w, h] = size;
    const frameRight = w / 2 + 0.08;
    const frameBottom = -(h / 2 + 0.08);
    const labelX = frameRight - LABEL_W / 2;
    const labelY = frameBottom - 0.15 - LABEL_H / 2;

    if (childPieces) {
      return (
        <group position={position} rotation={rotation}>
          {childPieces.map((child, i) => (
            <ArtFrame
              key={i}
              position={[child.offset[0], child.offset[1], 0]}
              size={child.size}
              imageUrl={child.imageUrl}
              palette={palette}
            />
          ))}
          <ArtLabel
            position={[labelX, labelY, 0]}
            title={title}
            palette={palette}
          />
        </group>
      );
    }

    return (
      <group position={position} rotation={rotation}>
        <ArtFrame
          position={[0, 0, 0]}
          size={size}
          imageUrl={imageUrl}
          palette={palette}
        />
        <ArtLabel
          position={[labelX, labelY, 0]}
          title={title}
          palette={palette}
        />
      </group>
    );
  },
);

const Artworks = ({
  pieces,
  palette,
}: {
  pieces: ArtPiece[];
  palette: GalleryPalette;
}) => (
  <group>
    {pieces.map((piece, i) => (
      <ArtPlaceholder key={i} piece={piece} palette={palette} />
    ))}
  </group>
);

// Maximum number of spotlights to keep rendering performant.
// When there are more art pieces than this limit, we select an evenly-spaced
// subset so the gallery still feels well-lit without tanking framerate.
const MAX_SPOTLIGHTS = 16;

const ArtSpotlight = ({
  artPosition,
  artRotation,
  roomHeight,
  palette,
}: {
  artPosition: [number, number, number];
  artRotation: [number, number, number];
  roomHeight: number;
  palette: GalleryPalette;
}) => {
  const lightRef = useRef<THREE.SpotLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);
  const connectedRef = useRef(false);

  const ceilingY = roomHeight / 2 - 0.1;
  const offset = 2.5;

  // Compute light position: offset from art toward viewing direction
  const yRot = artRotation[1];
  const lightPos: [number, number, number] = [
    artPosition[0] + Math.sin(yRot) * offset,
    ceilingY,
    artPosition[2] + Math.cos(yRot) * offset,
  ];

  useFrame(() => {
    if (connectedRef.current) return;
    const l = lightRef.current;
    const t = targetRef.current;
    if (l && t) {
      l.target = t;
      connectedRef.current = true;
    }
  });

  return (
    <group>
      <spotLight
        ref={lightRef}
        position={lightPos}
        angle={0.5}
        penumbra={0.7}
        intensity={palette.spotIntensity}
        distance={35}
        decay={1}
        color={palette.spotColor}
      />
      <object3D ref={targetRef} position={artPosition} />
    </group>
  );
};

const ArtLighting = ({
  pieces,
  roomHeight,
  palette,
}: {
  pieces: ArtPiece[];
  roomHeight: number;
  palette: GalleryPalette;
}) => {
  // Select an evenly-distributed subset when over the spotlight limit
  const selected = useMemo(() => {
    if (pieces.length <= MAX_SPOTLIGHTS) return pieces;
    const step = pieces.length / MAX_SPOTLIGHTS;
    return Array.from(
      { length: MAX_SPOTLIGHTS },
      (_, i) => pieces[Math.floor(i * step)]!,
    );
  }, [pieces]);

  return (
    <group>
      {selected.map((piece, i) => (
        <ArtSpotlight
          key={i}
          artPosition={piece.position}
          artRotation={piece.rotation}
          roomHeight={roomHeight}
          palette={palette}
        />
      ))}
    </group>
  );
};

const Room = ({
  layout,
  mobile,
  fragmentTitle,
  fragmentDescription,
  palette,
}: {
  layout: GalleryLayout;
  mobile?: boolean;
  fragmentTitle?: string;
  fragmentDescription?: string;
  palette: GalleryPalette;
}) => {
  const {
    roomWidth,
    roomHeight,
    roomDepth,
    partitions,
    artPieces,
    fillLights,
    benchPositions,
    welcomePosition,
    welcomeRotation,
  } = layout;
  const halfW = roomWidth / 2;
  const halfH = roomHeight / 2;
  const halfD = roomDepth / 2;
  const wallTex = useMemo(() => createWallTexture(palette), [palette]);
  const ceilingTex = useMemo(() => createCeilingTexture(palette), [palette]);
  useEffect(() => () => wallTex.dispose(), [wallTex]);
  useEffect(() => () => ceilingTex.dispose(), [ceilingTex]);

  return (
    <group>
      <Floor
        roomWidth={roomWidth}
        roomDepth={roomDepth}
        roomHeight={roomHeight}
        palette={palette}
      />
      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, halfH, 0]}>
        <planeGeometry args={[roomWidth, roomDepth]} />
        <meshStandardMaterial map={ceilingTex} roughness={0.95} />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, 0, -halfD]}>
        <planeGeometry args={[roomWidth, roomHeight]} />
        <meshStandardMaterial map={wallTex} roughness={0.92} />
      </mesh>
      {/* Front wall */}
      <mesh rotation={[0, Math.PI, 0]} position={[0, 0, halfD]}>
        <planeGeometry args={[roomWidth, roomHeight]} />
        <meshStandardMaterial map={wallTex} roughness={0.92} />
      </mesh>
      {/* Left wall */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-halfW, 0, 0]}>
        <planeGeometry args={[roomDepth, roomHeight]} />
        <meshStandardMaterial map={wallTex} roughness={0.92} />
      </mesh>
      {/* Right wall */}
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[halfW, 0, 0]}>
        <planeGeometry args={[roomDepth, roomHeight]} />
        <meshStandardMaterial map={wallTex} roughness={0.92} />
      </mesh>
      {/* Ambient + hemisphere set the room's overall exposure. Palette-driven
          because light mode needs much less of both. */}
      <ambientLight intensity={palette.ambientIntensity} />
      <hemisphereLight
        args={[palette.hemiSky, palette.hemiGround, palette.hemiIntensity]}
      />
      {/* Overhead fill lights */}
      {fillLights.map((pos, i) => (
        <pointLight
          key={i}
          position={pos}
          intensity={
            i === 0 ? palette.fillIntensityNear : palette.fillIntensityFar
          }
          distance={
            i === 0 ? palette.fillDistanceNear : palette.fillDistanceFar
          }
          decay={1}
          color={palette.fillColor}
        />
      ))}
      {/* Interior partition walls */}
      <Partitions partitions={partitions} palette={palette} />
      {/* Art placeholders and per-piece spotlights */}
      <Artworks pieces={artPieces} palette={palette} />
      <ArtLighting
        pieces={artPieces}
        roomHeight={roomHeight}
        palette={palette}
      />
      {/* Benches */}
      {benchPositions.map((pos, i) => (
        <GalleryBench key={i} position={pos} palette={palette} />
      ))}
      {/* Welcome wall text */}
      <WelcomeWallText
        position={welcomePosition}
        rotation={welcomeRotation}
        mobile={mobile}
        fragmentTitle={fragmentTitle}
        fragmentDescription={fragmentDescription}
        palette={palette}
      />
    </group>
  );
};

const Movement = ({
  roomWidth,
  roomDepth,
  colliders,
  mobileInput,
}: {
  roomWidth: number;
  roomDepth: number;
  colliders: AABB[];
  mobileInput?: RefObject<MobileInput | null>;
}) => {
  const { camera } = useThree();
  const keys = useRef<Set<string>>(new Set());
  const velocityY = useRef(0);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keys.current.add(e.code);
      if (e.code === 'Space' && camera.position.y <= 0.01) {
        velocityY.current = JUMP_IMPULSE;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keys.current.delete(e.code);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [camera]);

  useFrame((_, delta) => {
    // Apply mobile look deltas
    const mi = mobileInput?.current;
    if (mi) {
      const { lookDeltaX, lookDeltaY } = mi;
      if (lookDeltaX !== 0 || lookDeltaY !== 0) {
        camera.rotation.y -= lookDeltaX;
        camera.rotation.x -= lookDeltaY;
        camera.rotation.x = THREE.MathUtils.clamp(
          camera.rotation.x,
          -Math.PI * 0.47,
          Math.PI * 0.47,
        );
        mi.lookDeltaX = 0;
        mi.lookDeltaY = 0;
      }
    }

    const direction = new THREE.Vector3();
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();

    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const pressed = keys.current;
    if (pressed.has('KeyW') || pressed.has('ArrowUp')) direction.add(forward);
    if (pressed.has('KeyS') || pressed.has('ArrowDown')) direction.sub(forward);
    if (pressed.has('KeyD') || pressed.has('ArrowRight')) direction.add(right);
    if (pressed.has('KeyA') || pressed.has('ArrowLeft')) direction.sub(right);

    // Add mobile joystick input
    if (mi && (mi.moveX !== 0 || mi.moveY !== 0)) {
      direction.addScaledVector(right, mi.moveX);
      direction.addScaledVector(forward, mi.moveY);
    }

    const crouching = pressed.has('ControlLeft') || pressed.has('ControlRight');

    if (direction.lengthSq() > 0) {
      direction.normalize();
      const speed = crouching
        ? CROUCH_SPEED
        : pressed.has('ShiftLeft') || pressed.has('ShiftRight')
          ? RUN_SPEED
          : MOVE_SPEED;
      camera.position.addScaledVector(direction, speed * delta);
    }

    // Crouch height
    const targetY =
      crouching && camera.position.y <= 0.01 ? CROUCH_HEIGHT : STAND_HEIGHT;
    const baseY = THREE.MathUtils.lerp(
      camera.position.y > 0.01 ? STAND_HEIGHT : camera.position.y,
      targetY,
      1 - Math.exp(-CROUCH_LERP * delta),
    );

    // Jump physics
    velocityY.current -= GRAVITY * delta;
    camera.position.y += velocityY.current * delta;
    if (camera.position.y <= baseY) {
      camera.position.y = baseY;
      velocityY.current = 0;
    }

    // Interior collision (AABB push-out along axis of least penetration)
    const r = BOUNDARY_PADDING;
    for (const box of colliders) {
      const overlapX = Math.min(
        camera.position.x + r - box.minX,
        box.maxX - (camera.position.x - r),
      );
      const overlapZ = Math.min(
        camera.position.z + r - box.minZ,
        box.maxZ - (camera.position.z - r),
      );
      if (overlapX > 0 && overlapZ > 0) {
        if (overlapX < overlapZ) {
          const centerX = (box.minX + box.maxX) / 2;
          camera.position.x +=
            camera.position.x < centerX ? -overlapX : overlapX;
        } else {
          const centerZ = (box.minZ + box.maxZ) / 2;
          camera.position.z +=
            camera.position.z < centerZ ? -overlapZ : overlapZ;
        }
      }
    }

    const halfW = roomWidth / 2 - BOUNDARY_PADDING;
    const halfD = roomDepth / 2 - BOUNDARY_PADDING;
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -halfW, halfW);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -halfD, halfD);
  });

  return null;
};

type HintPhase = 'step-back' | 'click' | 'mouse' | 'done';

const GalleryScreen = ({ fragmentId }: { fragmentId?: string }) => {
  const { theme } = useTheme();
  const palette = useMemo(() => getPalette(theme), [theme]);
  const [locked, setLocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [hintPhase, setHintPhase] = useState<HintPhase>('step-back');
  const isMobile = useMemo(
    () => window.matchMedia('(pointer: coarse)').matches,
    [],
  );
  const mobileInputRef = useRef<MobileInput | null>(
    isMobile ? { moveX: 0, moveY: 0, lookDeltaX: 0, lookDeltaY: 0 } : null,
  );
  const fragment = useMemo(
    () => (fragmentId ? fragments.find(f => f.id === fragmentId) : null),
    [fragmentId],
  );
  const layout = useMemo(() => {
    if (fragment) {
      const images: ImageSpec[] = fragment.photos.map(p => ({
        id: p.file,
        label: p.caption || 'Untitled',
        orientation: (p.width > p.height ? 'landscape' : 'portrait') as const,
        aspectRatio: p.width / p.height,
        imageUrl: photoUrl(fragment.id, p.file, 'thumb'),
        groupId: p.group,
        groupLayout: p.group
          ? ((fragment.groupings?.[p.group]?.layout as 'row' | 'column') ??
            'row')
          : undefined,
        groupCaption: p.group
          ? fragment.groupings?.[p.group]?.caption
          : undefined,
      }));
      return generateGalleryLayout(images);
    }
    const params = new URLSearchParams(window.location.search);
    const count = Number(params.get('count')) || DEFAULT_COUNT;
    return generateGalleryLayout(makeImages(count));
  }, [fragment]);

  const onLock = useCallback(() => {
    setLocked(true);
    setHintPhase('mouse');
  }, []);
  const onUnlock = useCallback(() => setLocked(false), []);
  const onCreated = useCallback(() => {
    // Small delay to let the first frame render fully
    requestAnimationFrame(() => setReady(true));
  }, []);

  // Desktop: advance from "step-back" to "click" on S key or after 5s
  useEffect(() => {
    if (isMobile || hintPhase !== 'step-back') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        setHintPhase('click');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [isMobile, hintPhase]);

  // Desktop: auto-dismiss "mouse" hint after 3s
  useEffect(() => {
    if (isMobile || hintPhase !== 'mouse') return;
    const timer = setTimeout(() => setHintPhase('done'), 3000);
    return () => clearTimeout(timer);
  }, [isMobile, hintPhase]);

  // Mobile: advance from "step-back" to "mouse" on joystick use
  const onMobileMove = useCallback(() => {
    if (hintPhase === 'step-back') setHintPhase('mouse');
  }, [hintPhase]);

  // Mobile: dismiss on look swipe
  const onMobileLook = useCallback(() => {
    if (hintPhase === 'mouse') setHintPhase('done');
  }, [hintPhase]);

  // Auto-dismiss mobile "mouse" hint after 3s
  useEffect(() => {
    if (!isMobile || hintPhase !== 'mouse') return;
    const timer = setTimeout(() => setHintPhase('done'), 3000);
    return () => clearTimeout(timer);
  }, [isMobile, hintPhase]);

  // Pixel-hint text uses ink tokens so the gallery UI chrome matches the
  // site theme in both dark and light. Base / hover opacities are tuned to
  // read against the gallery's own floor + wall tones, not the page
  // background, since the canvas fills the viewport once `ready`.
  const hintBase =
    'font-pixel text-[color:var(--color-ink-faint)] text-sm tracking-[0.2em] select-none';
  const hintSub =
    'font-pixel text-[color:var(--color-ink-ghost)] text-[10px] tracking-[0.15em] select-none mt-2';

  return (
    <div
      className={`fixed inset-0 z-50${!isMobile && !locked ? ' cursor-pointer' : ''}`}
      style={{ backgroundColor: 'var(--color-surface)' }}
    >
      <div
        className='absolute inset-0 transition-opacity duration-500'
        style={{ opacity: ready ? 1 : 0 }}
      >
        <Canvas
          camera={{ position: layout.spawnPosition, fov: 75 }}
          onCreated={onCreated}
        >
          <Room
            layout={layout}
            mobile={isMobile}
            fragmentTitle={fragment?.title}
            fragmentDescription={fragment?.description}
            palette={palette}
          />
          <SpawnPoint
            position={layout.spawnPosition}
            lookAt={layout.spawnLookAt}
          />
          <Movement
            roomWidth={layout.roomWidth}
            roomDepth={layout.roomDepth}
            colliders={layout.colliders}
            mobileInput={mobileInputRef}
          />
          {!isMobile && (
            <PointerLockControls onLock={onLock} onUnlock={onUnlock} />
          )}
        </Canvas>
      </div>
      {!locked && (
        <a
          href={fragment ? `/memories/${fragment.id}` : '/'}
          className='absolute top-6 left-6 z-10 font-pixel text-[color:var(--color-ink-ghost)] text-xs tracking-[0.2em] pointer-events-auto hover:text-[color:var(--color-ink-muted)] transition-colors'
        >
          ← EXIT GALLERY
        </a>
      )}
      {!isMobile && ready && hintPhase !== 'done' && (
        <div
          key={hintPhase}
          className='absolute inset-x-0 bottom-10 z-[5] flex flex-col items-center pointer-events-none animate-[gallery-hint-in_0.5s_ease-out_both]'
        >
          {hintPhase === 'step-back' && (
            <>
              <p className={hintBase}>PRESS "S" — TAKE A STEP BACK</p>
              <p className={hintSub}>WASD — MOVE</p>
            </>
          )}
          {hintPhase === 'click' && (
            <>
              <p className={hintBase}>CLICK — EXPLORE</p>
              <p className={hintSub}>MOUSE LOOK · ESC EXIT</p>
            </>
          )}
          {hintPhase === 'mouse' && (
            <p className={hintBase}>MOVE MOUSE — TURN AROUND</p>
          )}
        </div>
      )}
      {isMobile && ready && hintPhase !== 'done' && hintPhase !== 'click' && (
        <div
          key={hintPhase}
          className='absolute inset-x-0 bottom-36 z-[5] flex flex-col items-center pointer-events-none animate-[gallery-hint-in_0.5s_ease-out_both]'
        >
          {hintPhase === 'step-back' && (
            <p className={hintBase}>PULL JOYSTICK DOWN — STEP BACK</p>
          )}
          {hintPhase === 'mouse' && (
            <div className='flex flex-col items-center gap-3'>
              <p className={hintBase}>SWIPE RIGHT SIDE — TURN AROUND</p>
              <span className='text-[color:var(--color-ink-faint)] text-2xl animate-[gallery-swipe_1.2s_ease-in-out_infinite] select-none'>
                →
              </span>
            </div>
          )}
        </div>
      )}
      {isMobile && (
        <MobileControls
          inputRef={mobileInputRef}
          onMoveStart={onMobileMove}
          onLookStart={onMobileLook}
        />
      )}
    </div>
  );
};

export { GalleryScreen };
