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
  ink: string;
  inkMuted: string;
  inkFaint: string;
  inkDivider: string;
  frame: string;
  canvasPlaceholder: string;
  benchSeat: string;
  benchLeg: string;
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
    orientation: i % 3 === 0 ? 'portrait' : 'landscape',
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
const MAX_FRAME_DELTA = 0.1;
const MAX_STEP = BOUNDARY_PADDING / 2;
const MOVE_DEADZONE = 0.1;
const MAX_ANISOTROPY = 8;
const DESKTOP_DPR: [number, number] = [1, 2];
const MOBILE_DPR: [number, number] = [1, 1.5];

const WOOD_PLANK_HEIGHT = 80;
const WOOD_PLANK_ROWS = 13;
const WOOD_TEXTURE_WIDTH = 1024;
const WOOD_TEXTURE_HEIGHT = WOOD_PLANK_HEIGHT * WOOD_PLANK_ROWS;
const FLOOR_TILE_WIDTH = 5;
const FLOOR_TILE_DEPTH =
  (FLOOR_TILE_WIDTH * WOOD_TEXTURE_HEIGHT) / WOOD_TEXTURE_WIDTH;

const PIXEL_FONT = "'Geist Pixel Circle'";

let pixelFontLoad: Promise<unknown> | null = null;
const whenPixelFontLoaded = () => {
  pixelFontLoad ??= document.fonts
    .load(`16px ${PIXEL_FONT}`)
    .catch(() => undefined);
  return pixelFontLoad;
};

const ellipsize = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) => {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text.length;
  let clipped = '...';
  while (cut > 0) {
    clipped = `${text.slice(0, cut).trimEnd()}...`;
    if (ctx.measureText(clipped).width <= maxWidth) break;
    cut--;
  }
  return clipped;
};

const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) => {
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    const trimmed = para.trim();
    if (trimmed === '') {
      lines.push('');
      continue;
    }
    for (const word of trimmed.split(' ')) {
      const last = lines[lines.length - 1];
      if (last && ctx.measureText(`${last} ${word}`).width <= maxWidth) {
        lines[lines.length - 1] = `${last} ${word}`;
      } else {
        lines.push(word);
      }
    }
  }
  return lines;
};

const SUBTITLE_FONT_SIZES = [28, 24, 20, 17, 14];
const SUBTITLE_LINE_RATIO = 36 / 28;

const fitSubtitle = (
  ctx: CanvasRenderingContext2D,
  text: string,
  scale: number,
  maxWidth: number,
  maxHeight: number,
) => {
  const smallest = SUBTITLE_FONT_SIZES[SUBTITLE_FONT_SIZES.length - 1]!;
  for (const size of SUBTITLE_FONT_SIZES) {
    const fontSize = size * scale;
    ctx.font = `${fontSize}px ${PIXEL_FONT}`;
    const lineHeight = Math.round(fontSize * SUBTITLE_LINE_RATIO);
    const maxLines = Math.max(1, Math.floor(maxHeight / lineHeight));
    const lines = wrapText(ctx, text, maxWidth);
    if (lines.length <= maxLines) return { lines, lineHeight, fontSize };
    if (size === smallest) {
      const overflow = lines.slice(maxLines - 1).join(' ');
      return {
        lines: [
          ...lines.slice(0, maxLines - 1),
          ellipsize(ctx, overflow, maxWidth),
        ],
        lineHeight,
        fontSize,
      };
    }
  }
  return { lines: [], lineHeight: 0, fontSize: 0 };
};

const useAnisotropy = () => {
  const gl = useThree(state => state.gl);
  return Math.min(MAX_ANISOTROPY, gl.capabilities.getMaxAnisotropy());
};

const overlapsBox = (x: number, z: number, box: AABB, r: number) =>
  x + r > box.minX && x - r < box.maxX && z + r > box.minZ && z - r < box.maxZ;

const moveWithCollisions = (
  pos: THREE.Vector3,
  dx: number,
  dz: number,
  colliders: AABB[],
) => {
  const r = BOUNDARY_PADDING;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / MAX_STEP));
  const sx = dx / steps;
  const sz = dz / steps;

  for (let i = 0; i < steps; i++) {
    if (sx !== 0) {
      pos.x += sx;
      for (const box of colliders) {
        if (overlapsBox(pos.x, pos.z, box, r)) {
          pos.x = sx > 0 ? box.minX - r : box.maxX + r;
        }
      }
    }
    if (sz !== 0) {
      pos.z += sz;
      for (const box of colliders) {
        if (overlapsBox(pos.x, pos.z, box, r)) {
          pos.z = sz > 0 ? box.minZ - r : box.maxZ + r;
        }
      }
    }
  }
};

const createWoodTexture = (palette: GalleryPalette) => {
  const canvas = document.createElement('canvas');
  canvas.width = WOOD_TEXTURE_WIDTH;
  canvas.height = WOOD_TEXTURE_HEIGHT;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = palette.floorBase;
  ctx.fillRect(0, 0, WOOD_TEXTURE_WIDTH, WOOD_TEXTURE_HEIGHT);

  const plankH = WOOD_PLANK_HEIGHT;

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

  const plankColor = (row: number, col: number) => {
    seed(row * 7 + col * 13 + 3);
    const l = lMin + next() * lRange;
    const s = sMin + next() * sRange;
    return `hsl(${palette.plankHue}, ${s}%, ${l}%)`;
  };

  const rowPlanks = (row: number) => {
    seed(row * 53 + 11);
    const planks: number[] = [];
    let x = 0;
    const rowOffset = next() * 200 - 100;
    x = rowOffset;
    if (x > 0) {
      planks.push(-rowOffset);
    }
    while (x < WOOD_TEXTURE_WIDTH) {
      const len = 200 + next() * 300;
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

    seed(plankSeed);
    const grainDensity = 12 + Math.floor(next() * 16);
    const grainBaseY = y + next() * 10;
    const grainSpread = 0.4 + next() * 0.3;

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

    seed(plankSeed + 999);
    if (next() > 0.6) {
      const bandY = y + plankH * (0.2 + next() * 0.6);
      const bandH = 3 + next() * 8;
      ctx.fillStyle = palette.plankBand(0.03 + next() * 0.04);
      ctx.fillRect(x, bandY, w, bandH);
    }

    ctx.strokeStyle = palette.plankSeam;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w, y + plankH);
    ctx.stroke();
    ctx.strokeStyle = palette.plankSeamHighlight;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x + w + 1, y);
    ctx.lineTo(x + w + 1, y + plankH);
    ctx.stroke();
  };

  for (let y = 0; y < WOOD_TEXTURE_HEIGHT; y += plankH) {
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
      if (actualX + actualLen > WOOD_TEXTURE_WIDTH) {
        drawPlank(actualX - WOOD_TEXTURE_WIDTH, y, actualLen, color, ps);
      }
      if (actualX < 0) {
        drawPlank(actualX + WOOD_TEXTURE_WIDTH, y, actualLen, color, ps);
      }
      x += len;
      col++;
    }

    ctx.strokeStyle = palette.rowSeam;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WOOD_TEXTURE_WIDTH, y);
    ctx.stroke();
    ctx.strokeStyle = palette.rowSeamHighlight;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y + 1);
    ctx.lineTo(WOOD_TEXTURE_WIDTH, y + 1);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
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
  ctx.beginPath();
  ctx.arc(cx, cy, 8 * scale, 0, Math.PI * 2);
  ctx.fill();
};

const WELCOME_TEXTURE_WIDTH = 3072;
const WELCOME_TEXTURE_MIN_HEIGHT = 1280;
const WELCOME_SIGN_WIDTH = 10.5;
const WELCOME_SIGN_TOP =
  (WELCOME_SIGN_WIDTH * WELCOME_TEXTURE_MIN_HEIGHT) / WELCOME_TEXTURE_WIDTH / 2;
const WELCOME_SIGN_FLOOR_MARGIN = 1;

const createWelcomeTexture = (
  palette: GalleryPalette,
  maxHeight: number,
  mobile = false,
  fragmentTitle?: string,
  fragmentDescription?: string,
) => {
  const canvas = document.createElement('canvas');
  canvas.width = WELCOME_TEXTURE_WIDTH;
  const ctx = canvas.getContext('2d')!;

  const s = 2;
  const font = PIXEL_FONT;
  const contentWidth = 2048;
  const offsetX = (canvas.width - contentWidth) / 2;
  const textLeft = offsetX + 310 * s;
  const contentRight = offsetX + contentWidth;
  const maxTextWidth = contentRight - textLeft - 80 * s;

  const controls = mobile
    ? ['LEFT JOYSTICK — MOVE', 'DRAG RIGHT — LOOK']
    : [
        'WASD — MOVE / SHIFT — RUN',
        'MOUSE — LOOK / C — CROUCH',
        'SPACE — JUMP',
        'ESC — RELEASE CAMERA',
      ];
  const subtitleTop = 210 * s;
  const dividerGap = 10 * s;
  const controlsGap = 50 * s;
  const controlsLineHeight = 40 * s;
  const bottomMargin = 30 * s;
  const controlsHeight =
    dividerGap +
    controlsGap +
    controlsLineHeight * (controls.length - 1) +
    bottomMargin;

  const rawSubtitle =
    fragmentDescription ||
    (fragmentTitle ? 'AN INTERACTIVE GALLERY' : 'A COLLECTION BY JASON WU');
  const subtitle = rawSubtitle.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  const {
    lines: subtitleLines,
    lineHeight: subtitleLineHeight,
    fontSize: subtitleFontSize,
  } = fitSubtitle(
    ctx,
    subtitle,
    s,
    maxTextWidth,
    Math.max(WELCOME_TEXTURE_MIN_HEIGHT, maxHeight) -
      subtitleTop -
      controlsHeight,
  );

  canvas.height = Math.max(
    WELCOME_TEXTURE_MIN_HEIGHT,
    subtitleTop + subtitleLines.length * subtitleLineHeight + controlsHeight,
  );

  ctx.fillStyle = palette.wall;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  drawBlossom(ctx, offsetX + 150 * s, 180 * s, 2.2 * s, palette.ink);

  ctx.imageSmoothingEnabled = false;
  ctx.textAlign = 'left';

  ctx.fillStyle = palette.ink;
  ctx.font = `${64 * s}px ${font}`;
  ctx.fillText(fragmentTitle ?? 'GALLERY', textLeft, 150 * s);

  ctx.fillStyle = palette.inkMuted;
  ctx.font = `${subtitleFontSize}px ${font}`;
  let y = subtitleTop;
  for (const line of subtitleLines) {
    ctx.fillText(line, textLeft, y);
    y += subtitleLineHeight;
  }

  ctx.strokeStyle = palette.inkDivider;
  ctx.lineWidth = 1 * s;
  const divY = y + dividerGap;
  ctx.beginPath();
  ctx.moveTo(textLeft, divY);
  ctx.lineTo(contentRight - 80 * s, divY);
  ctx.stroke();

  ctx.fillStyle = palette.inkFaint;
  ctx.font = `${20 * s}px ${font}`;
  y = divY + controlsGap;
  for (const line of controls) {
    ctx.fillText(line, textLeft, y);
    y += controlsLineHeight;
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
  const anisotropy = useAnisotropy();
  const texture = useMemo(() => {
    const wood = createWoodTexture(palette);
    wood.anisotropy = anisotropy;
    wood.repeat.set(roomWidth / FLOOR_TILE_WIDTH, roomDepth / FLOOR_TILE_DEPTH);
    return wood;
  }, [palette, anisotropy, roomWidth, roomDepth]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -roomHeight / 2, 0]}>
      <planeGeometry args={[roomWidth, roomDepth]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
};

const Partitions = ({
  partitions,
  material,
}: {
  partitions: Partition[];
  material: THREE.Material;
}) => (
  <group>
    {partitions.map((p, i) => (
      <mesh key={i} position={p.position} material={material}>
        <boxGeometry args={p.size} />
      </mesh>
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
      <mesh position={[0, seatY, 0]}>
        <boxGeometry args={[seatW, seatThickness, seatD]} />
        <meshStandardMaterial color={palette.benchSeat} roughness={0.8} />
      </mesh>
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
  roomHeight,
  palette,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  mobile?: boolean;
  fragmentTitle?: string;
  fragmentDescription?: string;
  roomHeight: number;
  palette: GalleryPalette;
}) => {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  const maxSignHeight =
    WELCOME_SIGN_TOP + roomHeight / 2 - WELCOME_SIGN_FLOOR_MARGIN;
  const maxTextureHeight = Math.floor(
    (maxSignHeight * WELCOME_TEXTURE_WIDTH) / WELCOME_SIGN_WIDTH,
  );

  useEffect(() => {
    let cancelled = false;
    let created: THREE.CanvasTexture | null = null;
    void whenPixelFontLoaded().then(() => {
      if (cancelled) return;
      created = createWelcomeTexture(
        palette,
        maxTextureHeight,
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
  }, [palette, maxTextureHeight, mobile, fragmentTitle, fragmentDescription]);

  if (!texture) return null;

  const signHeight =
    (WELCOME_SIGN_WIDTH * texture.image.height) / texture.image.width;
  const [x, y, z] = position;

  return (
    <mesh
      position={[x, y + WELCOME_SIGN_TOP - signHeight / 2, z]}
      rotation={rotation}
    >
      <planeGeometry args={[WELCOME_SIGN_WIDTH, signHeight]} />
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
const LABEL_TEXT_INSET = 8;

const createLabelTexture = (palette: GalleryPalette, title: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = palette.wall;
  ctx.fillRect(0, 0, 256, 64);

  ctx.fillStyle = palette.ink;
  ctx.globalAlpha = 0.7;
  ctx.font = `16px ${PIXEL_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    ellipsize(ctx, title, canvas.width - LABEL_TEXT_INSET * 2),
    LABEL_TEXT_INSET,
    32,
  );
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
    const anisotropy = useAnisotropy();

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
      let cancelled = false;
      const loader = new THREE.TextureLoader();
      loader.load(
        imageUrl,
        tex => {
          if (cancelled) {
            tex.dispose();
            return;
          }
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = anisotropy;
          mat.map = tex;
          mat.color.set('#ffffff');
          mat.needsUpdate = true;
        },
        undefined,
        () => {},
      );
      return () => {
        cancelled = true;
        if (mat.map) {
          mat.map.dispose();
          mat.map = null;
          mat.needsUpdate = true;
        }
      };
    }, [imageUrl, anisotropy]);

    return (
      <group position={position}>
        <mesh position={[0, 0, -0.02]} material={frameMaterial}>
          <boxGeometry args={[w + 0.16, h + 0.16, 0.04]} />
        </mesh>
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial
            ref={matRef}
            color={palette.canvasPlaceholder}
            toneMapped={false}
          />
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
      void whenPixelFontLoaded().then(() => {
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

const SPOTLIGHT_POOL_SIZE = 6;
const SPOTLIGHT_FADE_DISTANCE = 4;
const SPOTLIGHT_WALL_OFFSET = 2.5;

const ArtLighting = ({
  pieces,
  roomHeight,
  palette,
}: {
  pieces: ArtPiece[];
  roomHeight: number;
  palette: GalleryPalette;
}) => {
  const camera = useThree(state => state.camera);
  const lightRefs = useRef<Array<THREE.SpotLight | null>>([]);
  const poolSize = Math.min(SPOTLIGHT_POOL_SIZE, pieces.length);
  const ceilingY = roomHeight / 2 - 0.1;

  const nearestFirst = useMemo(() => {
    const distances = new Float32Array(pieces.length);
    const order = pieces.map((_, i) => i);
    const byDistance = (a: number, b: number) => distances[a]! - distances[b]!;
    return { distances, order, byDistance };
  }, [pieces]);

  useFrame(() => {
    const { distances, order, byDistance } = nearestFirst;
    for (let i = 0; i < pieces.length; i++) {
      const [x, , z] = pieces[i]!.position;
      distances[i] = Math.hypot(x - camera.position.x, z - camera.position.z);
    }
    order.sort(byDistance);

    const nextOutside = order[poolSize];
    const cutoff =
      nextOutside === undefined ? Infinity : distances[nextOutside]!;

    for (let slot = 0; slot < poolSize; slot++) {
      const light = lightRefs.current[slot];
      const pieceIndex = order[slot];
      if (!light || pieceIndex === undefined) continue;

      const piece = pieces[pieceIndex]!;
      const [x, y, z] = piece.position;
      const yRot = piece.rotation[1];
      const fade = THREE.MathUtils.clamp(
        (cutoff - distances[pieceIndex]!) / SPOTLIGHT_FADE_DISTANCE,
        0,
        1,
      );

      light.position.set(
        x + Math.sin(yRot) * SPOTLIGHT_WALL_OFFSET,
        ceilingY,
        z + Math.cos(yRot) * SPOTLIGHT_WALL_OFFSET,
      );
      light.target.position.set(x, y, z);
      light.target.updateMatrixWorld();
      light.intensity = palette.spotIntensity * fade;
    }
  });

  return (
    <group>
      {Array.from({ length: poolSize }, (_, slot) => (
        <spotLight
          key={slot}
          ref={light => {
            lightRefs.current[slot] = light;
          }}
          angle={0.5}
          penumbra={0.7}
          intensity={0}
          distance={35}
          decay={1}
          color={palette.spotColor}
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
  const wallMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.92 }),
    [wallTex],
  );
  useEffect(() => () => wallTex.dispose(), [wallTex]);
  useEffect(() => () => wallMaterial.dispose(), [wallMaterial]);
  useEffect(() => () => ceilingTex.dispose(), [ceilingTex]);

  return (
    <group>
      <Floor
        roomWidth={roomWidth}
        roomDepth={roomDepth}
        roomHeight={roomHeight}
        palette={palette}
      />
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, halfH, 0]}>
        <planeGeometry args={[roomWidth, roomDepth]} />
        <meshStandardMaterial map={ceilingTex} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0, -halfD]} material={wallMaterial}>
        <planeGeometry args={[roomWidth, roomHeight]} />
      </mesh>
      <mesh
        rotation={[0, Math.PI, 0]}
        position={[0, 0, halfD]}
        material={wallMaterial}
      >
        <planeGeometry args={[roomWidth, roomHeight]} />
      </mesh>
      <mesh
        rotation={[0, Math.PI / 2, 0]}
        position={[-halfW, 0, 0]}
        material={wallMaterial}
      >
        <planeGeometry args={[roomDepth, roomHeight]} />
      </mesh>
      <mesh
        rotation={[0, -Math.PI / 2, 0]}
        position={[halfW, 0, 0]}
        material={wallMaterial}
      >
        <planeGeometry args={[roomDepth, roomHeight]} />
      </mesh>
      <ambientLight intensity={palette.ambientIntensity} />
      <hemisphereLight
        args={[palette.hemiSky, palette.hemiGround, palette.hemiIntensity]}
      />
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
      <Partitions partitions={partitions} material={wallMaterial} />
      <Artworks pieces={artPieces} palette={palette} />
      <ArtLighting
        pieces={artPieces}
        roomHeight={roomHeight}
        palette={palette}
      />
      {benchPositions.map((pos, i) => (
        <GalleryBench key={i} position={pos} palette={palette} />
      ))}
      <WelcomeWallText
        position={welcomePosition}
        rotation={welcomeRotation}
        mobile={mobile}
        fragmentTitle={fragmentTitle}
        fragmentDescription={fragmentDescription}
        roomHeight={roomHeight}
        palette={palette}
      />
    </group>
  );
};

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const moveDirection = new THREE.Vector3();
const moveForward = new THREE.Vector3();
const moveRight = new THREE.Vector3();

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
    const pressed = keys.current;
    const onKeyDown = (e: KeyboardEvent) => {
      const isBrowserShortcut = e.metaKey || e.ctrlKey || e.altKey;
      if (isBrowserShortcut) return;
      pressed.add(e.code);
      if (e.code === 'Space' && camera.position.y <= 0.01) {
        velocityY.current = JUMP_IMPULSE;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => pressed.delete(e.code);
    const releaseAll = () => pressed.clear();
    const onVisibilityChange = () => {
      if (document.hidden) releaseAll();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', releaseAll);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      releaseAll();
    };
  }, [camera]);

  useFrame((_, delta) => {
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

    const direction = moveDirection.set(0, 0, 0);
    const forward = moveForward;
    const right = moveRight;

    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(forward, WORLD_UP).normalize();

    const pressed = keys.current;
    if (pressed.has('KeyW') || pressed.has('ArrowUp')) direction.add(forward);
    if (pressed.has('KeyS') || pressed.has('ArrowDown')) direction.sub(forward);
    if (pressed.has('KeyD') || pressed.has('ArrowRight')) direction.add(right);
    if (pressed.has('KeyA') || pressed.has('ArrowLeft')) direction.sub(right);

    if (mi && (mi.moveX !== 0 || mi.moveY !== 0)) {
      direction.addScaledVector(right, mi.moveX);
      direction.addScaledVector(forward, mi.moveY);
    }

    const crouching = pressed.has('KeyC');

    const dt = Math.min(delta, MAX_FRAME_DELTA);

    const joystickTilt = Math.min(1, direction.length());
    if (joystickTilt > MOVE_DEADZONE) {
      direction.normalize();
      const speed =
        joystickTilt *
        (crouching
          ? CROUCH_SPEED
          : pressed.has('ShiftLeft') || pressed.has('ShiftRight')
            ? RUN_SPEED
            : MOVE_SPEED);
      moveWithCollisions(
        camera.position,
        direction.x * speed * dt,
        direction.z * speed * dt,
        colliders,
      );
    }

    const targetY =
      crouching && camera.position.y <= 0.01 ? CROUCH_HEIGHT : STAND_HEIGHT;
    const baseY = THREE.MathUtils.lerp(
      camera.position.y > 0.01 ? STAND_HEIGHT : camera.position.y,
      targetY,
      1 - Math.exp(-CROUCH_LERP * dt),
    );

    velocityY.current -= GRAVITY * dt;
    camera.position.y += velocityY.current * dt;
    if (camera.position.y <= baseY) {
      camera.position.y = baseY;
      velocityY.current = 0;
    }

    const halfW = roomWidth / 2 - BOUNDARY_PADDING;
    const halfD = roomDepth / 2 - BOUNDARY_PADDING;
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -halfW, halfW);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -halfD, halfD);
  });

  return null;
};

type HintPhase = 'step-back' | 'click' | 'mouse' | 'done';

const GalleryScreen = ({
  fragmentId,
  embedded = false,
}: {
  fragmentId?: string;
  embedded?: boolean;
}) => {
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
        orientation: p.width > p.height ? 'landscape' : 'portrait',
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
    setHintPhase(phase => (phase === 'done' ? phase : 'mouse'));
  }, []);
  const onUnlock = useCallback(() => setLocked(false), []);
  const onCreated = useCallback(() => {
    requestAnimationFrame(() => setReady(true));
  }, []);

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

  useEffect(() => {
    if (hintPhase !== 'mouse') return;
    const timer = setTimeout(() => setHintPhase('done'), 3000);
    return () => clearTimeout(timer);
  }, [hintPhase]);

  const onMobileMove = useCallback(() => {
    if (hintPhase === 'step-back') setHintPhase('mouse');
  }, [hintPhase]);

  const onMobileLook = useCallback(() => {
    if (hintPhase === 'mouse') setHintPhase('done');
  }, [hintPhase]);

  const hintBase =
    'font-pixel text-[color:var(--color-ink-faint)] text-sm tracking-[0.2em] select-none';
  const hintSub =
    'font-pixel text-[color:var(--color-ink-ghost)] text-xs sm:text-[10px] tracking-[0.15em] select-none mt-2';

  return (
    <div
      className={`${embedded ? 'absolute inset-0' : 'fixed inset-0 z-50'}${!isMobile && !locked ? ' cursor-pointer' : ''}`}
      style={{ backgroundColor: 'var(--color-surface)' }}
    >
      <div
        className='gallery-viewport absolute inset-0 transition-opacity duration-500'
        style={{ opacity: ready ? 1 : 0 }}
      >
        <Canvas
          camera={{ position: layout.spawnPosition, fov: 75 }}
          dpr={isMobile ? MOBILE_DPR : DESKTOP_DPR}
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
            <PointerLockControls
              selector='.gallery-viewport'
              onLock={onLock}
              onUnlock={onUnlock}
            />
          )}
        </Canvas>
      </div>
      {!locked && !embedded && (
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
