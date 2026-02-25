import { PointerLockControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

const ROOM_WIDTH = 60;
const ROOM_HEIGHT = 16;
const ROOM_DEPTH = 60;
const MOVE_SPEED = 16;
const RUN_SPEED = 32;
const CROUCH_SPEED = 8;
const JUMP_IMPULSE = 12;
const GRAVITY = 40;
const STAND_HEIGHT = 0;
const CROUCH_HEIGHT = -2.5;
const CROUCH_LERP = 8;
const BOUNDARY_PADDING = 0.5;

const createWoodTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Ashy gray wood base
  ctx.fillStyle = '#2a2a2a';
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

  // Per-plank color — subtle variation
  const plankColor = (row: number, col: number) => {
    seed(row * 7 + col * 13 + 3);
    const l = 15 + next() * 4;
    const s = 2 + next() * 2;
    return `hsl(0, ${s}%, ${l}%)`;
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
        ? `rgba(20, 20, 20, ${alpha})`
        : `rgba(60, 60, 60, ${alpha * 0.6})`;
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
      ctx.fillStyle = `rgba(15, 15, 15, ${0.03 + next() * 0.04})`;
      ctx.fillRect(x, bandY, w, bandH);
    }

    // Vertical end-seam — visible gap between planks
    ctx.strokeStyle = 'rgba(10, 10, 10, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w, y + plankH);
    ctx.stroke();
    // Highlight edge (light catches the bevel)
    ctx.strokeStyle = 'rgba(60, 60, 60, 0.06)';
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
    ctx.strokeStyle = 'rgba(10, 10, 10, 0.08)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(60, 60, 60, 0.04)';
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

const createWallTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dark charcoal base
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle noise
  const imageData = ctx.getImageData(0, 0, 512, 512);
  const data = imageData.data;
  let s = 42;
  for (let i = 0; i < data.length; i += 4) {
    s = ((s * 1103515245 + 12345) & 0x7fffffff) >>> 0;
    const noise = (s / 0x7fffffff - 0.5) * 6;
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

const createCeilingTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Flat dark ceiling
  ctx.fillStyle = '#080808';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle noise
  const imageData = ctx.getImageData(0, 0, 512, 512);
  const data = imageData.data;
  let s = 77;
  for (let i = 0; i < data.length; i += 4) {
    s = ((s * 1103515245 + 12345) & 0x7fffffff) >>> 0;
    const noise = (s / 0x7fffffff - 0.5) * 4;
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
  alpha: number,
) => {
  const angles = [0, 72, 144, 216, 288];
  const petalRx = 10 * scale;
  const petalRy = 22 * scale;
  const petalOffset = 28 * scale;

  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
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

const createWelcomeTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1280;
  const ctx = canvas.getContext('2d')!;

  const s = 2; // scale factor for hi-res

  // Match gallery wall color
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Blossom emblem on the left
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  drawBlossom(ctx, 150 * s, 180 * s, 2.2 * s, 1);

  // Switch to pixel font rendering
  ctx.imageSmoothingEnabled = false;

  const font = "'Geist Pixel Circle'";
  const textLeft = 310 * s;

  ctx.textAlign = 'left';

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = `${64 * s}px ${font}`;
  ctx.fillText('GALLERY', textLeft, 150 * s);

  // Subtitle
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = `${28 * s}px ${font}`;
  ctx.fillText('A COLLECTION BY JASON WU', textLeft, 210 * s);

  // Divider
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1 * s;
  const divY = 255 * s;
  ctx.beginPath();
  ctx.moveTo(textLeft, divY);
  ctx.lineTo(canvas.width - 80 * s, divY);
  ctx.stroke();

  // Controls
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.font = `${20 * s}px ${font}`;
  const controls = [
    'WASD — MOVE / SHIFT — RUN',
    'MOUSE — LOOK / CTRL — CROUCH',
    'SPACE — JUMP',
    'ESC — RELEASE CAMERA',
  ];
  let y = 305 * s;
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

const WALL_THICKNESS = 0.8;
const PARTITION_HEIGHT = 15.6;

type AABB = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

const COLLIDERS: AABB[] = [
  // Wall A-Left: center [-12, 0, -12], size [12, h, 0.8] → X: -18 to -6
  { minX: -18, maxX: -6, minZ: -12.4, maxZ: -11.6 },
  // Wall A-Right: center [12, 0, -12], size [14, h, 0.8] → X: 5 to 19
  { minX: 5, maxX: 19, minZ: -12.4, maxZ: -11.6 },
  // Archway header: passable at ground level (beam is overhead only)
  // Wall B: center [8, 0, -21], size [0.8, h, 18] → Z: -30 to -12
  { minX: 7.6, maxX: 8.4, minZ: -30, maxZ: -12 },
  // Wall C: center [-16, 0, 15], size [10, h, 0.8] → X: -21 to -11
  { minX: -21, maxX: -11, minZ: 14.6, maxZ: 15.4 },
  // Wall D: center [18, 0, 22.5], size [0.8, h, 15] → Z: 15 to 30
  { minX: 17.6, maxX: 18.4, minZ: 15, maxZ: 30 },
  // Bench: center [-11, y, -22], seat size [6, 0.35, 1.8]
  { minX: -14, maxX: -8, minZ: -22.9, maxZ: -21.1 },
];

const Floor = () => {
  const texture = useMemo(createWoodTexture, []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -ROOM_HEIGHT / 2, 0]}>
      <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
};

const PartitionWall = ({
  position,
  size,
}: {
  position: [number, number, number];
  size: [number, number, number];
}) => {
  const wallTex = useMemo(createWallTexture, []);
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial map={wallTex} roughness={0.92} />
    </mesh>
  );
};

const Partitions = () => (
  <group>
    {/* Wall A-Left */}
    <PartitionWall
      position={[-12, 0, -12]}
      size={[12, PARTITION_HEIGHT, WALL_THICKNESS]}
    />
    {/* Wall A-Right */}
    <PartitionWall
      position={[12, 0, -12]}
      size={[14, PARTITION_HEIGHT, WALL_THICKNESS]}
    />
    {/* Archway header beam */}
    <PartitionWall position={[-0.5, 6.3, -12]} size={[11, 3, WALL_THICKNESS]} />
    {/* Wall B */}
    <PartitionWall
      position={[8, 0, -21]}
      size={[WALL_THICKNESS, PARTITION_HEIGHT, 18]}
    />
    {/* Wall C */}
    <PartitionWall
      position={[-16, 0, 15]}
      size={[10, PARTITION_HEIGHT, WALL_THICKNESS]}
    />
    {/* Wall D */}
    <PartitionWall
      position={[18, 0, 22.5]}
      size={[WALL_THICKNESS, PARTITION_HEIGHT, 15]}
    />
  </group>
);

const GalleryBench = ({ position }: { position: [number, number, number] }) => {
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
        <meshStandardMaterial color='#1a1a1a' roughness={0.8} />
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
          <meshStandardMaterial color='#111' roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
};

const SPAWN_POSITION: [number, number, number] = [3, 0, 20];

const SpawnPoint = () => {
  const { camera } = useThree();
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      camera.position.set(...SPAWN_POSITION);
      camera.lookAt(SPAWN_POSITION[0], SPAWN_POSITION[1], 30);
      initialized.current = true;
    }
  }, [camera]);

  return null;
};

const WelcomeWallText = () => {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    document.fonts.ready.then(() => {
      setTexture(createWelcomeTexture());
    });
  }, []);

  if (!texture) return null;

  return (
    <mesh position={[3, 0, 29.99]} rotation={[0, Math.PI, 0]}>
      <planeGeometry args={[7, 4.375]} />
      <meshStandardMaterial
        map={texture}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
      />
    </mesh>
  );
};

type ArtPiece = {
  position: [number, number, number];
  size: [number, number];
  rotation: [number, number, number];
  title: string;
};

const ART_PIECES: ArtPiece[] = [
  // === Back wall (z=-30, faces +Z) ===
  {
    position: [-11, 1, -29.9],
    size: [8, 5],
    rotation: [0, 0, 0],
    title: 'UNTITLED I',
  },
  {
    position: [20, 0.5, -29.9],
    size: [3.5, 5],
    rotation: [0, 0, 0],
    title: 'UNTITLED II',
  },

  // === Left wall (x=-30, faces +X) ===
  {
    position: [-29.9, 1, -22],
    size: [7, 4.5],
    rotation: [0, Math.PI / 2, 0],
    title: 'UNTITLED III',
  },
  {
    position: [-29.9, 0, -2],
    size: [2, 3],
    rotation: [0, Math.PI / 2, 0],
    title: 'UNTITLED IV',
  },
  {
    position: [-29.9, 0.5, 18],
    size: [4, 3],
    rotation: [0, Math.PI / 2, 0],
    title: 'UNTITLED V',
  },

  // === Right wall (x=+30, faces -X) ===
  {
    position: [29.9, 0.5, -20],
    size: [3.5, 6],
    rotation: [0, -Math.PI / 2, 0],
    title: 'UNTITLED VI',
  },
  {
    position: [29.9, 1, 8],
    size: [8, 5],
    rotation: [0, -Math.PI / 2, 0],
    title: 'UNTITLED VII',
  },

  // === Partition A-Left (X: -18 to -6) ===
  {
    position: [-12, 0.5, -11.5],
    size: [6, 4],
    rotation: [0, 0, 0],
    title: 'UNTITLED VIII',
  },
  {
    position: [-12, 0.5, -12.5],
    size: [5, 3.5],
    rotation: [0, Math.PI, 0],
    title: 'UNTITLED IX',
  },

  // === Partition A-Right (X: 5 to 19) ===
  {
    position: [12, 0.5, -11.5],
    size: [6, 4.5],
    rotation: [0, 0, 0],
    title: 'UNTITLED X',
  },
  {
    position: [14, 0.5, -12.5],
    size: [5, 3.5],
    rotation: [0, Math.PI, 0],
    title: 'UNTITLED XI',
  },

  // === Wall B (Z: -30 to -12, vertical) ===
  {
    position: [7.5, 0, -22],
    size: [3, 4],
    rotation: [0, -Math.PI / 2, 0],
    title: 'UNTITLED XII',
  },
  {
    position: [8.5, 0.5, -20],
    size: [5, 3.5],
    rotation: [0, Math.PI / 2, 0],
    title: 'UNTITLED XIII',
  },

  // === Wall C (X: -21 to -11) ===
  {
    position: [-16, 0.5, 14.5],
    size: [5, 3],
    rotation: [0, Math.PI, 0],
    title: 'UNTITLED XIV',
  },
  {
    position: [-16, 0, 15.5],
    size: [4, 3],
    rotation: [0, 0, 0],
    title: 'UNTITLED XV',
  },

  // === Wall D (Z: 15 to 30, vertical) ===
  {
    position: [17.5, 0.5, 22.5],
    size: [4, 5],
    rotation: [0, -Math.PI / 2, 0],
    title: 'UNTITLED XVI',
  },
  {
    position: [18.5, 0, 22.5],
    size: [4, 3],
    rotation: [0, Math.PI / 2, 0],
    title: 'UNTITLED XVII',
  },

  // === Front wall (z=+30, faces -Z) ===
  {
    position: [-10, 1, 29.9],
    size: [7, 5],
    rotation: [0, Math.PI, 0],
    title: 'UNTITLED XVIII',
  },
  {
    position: [15, 0.5, 29.9],
    size: [3.5, 5],
    rotation: [0, Math.PI, 0],
    title: 'UNTITLED XIX',
  },
];

const LABEL_W = 1.6;
const LABEL_H = 0.4;

const createLabelTexture = (title: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Match wall color so it blends seamlessly
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, 256, 64);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = "16px 'Geist Pixel Circle'";
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 8, 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  return texture;
};

const ArtPlaceholder = ({
  position,
  size,
  rotation,
  title,
}: {
  position: [number, number, number];
  size: [number, number];
  rotation: [number, number, number];
  title: string;
}) => {
  const [w, h] = size;
  const [labelTex, setLabelTex] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    document.fonts.ready.then(() => {
      setLabelTex(createLabelTexture(title));
    });
  }, [title]);

  // Position label just below bottom-right of frame, right-aligned
  const frameRight = w / 2 + 0.08;
  const frameBottom = -(h / 2 + 0.08);
  const labelX = frameRight - LABEL_W / 2;
  const labelY = frameBottom - 0.15 - LABEL_H / 2;

  return (
    <group position={position} rotation={rotation}>
      {/* Frame */}
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[w + 0.16, h + 0.16, 0.04]} />
        <meshStandardMaterial color='#e0e0e0' roughness={0.3} metalness={0.1} />
      </mesh>
      {/* Canvas */}
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color='#1a1a1a' />
      </mesh>
      {/* Title text on wall */}
      {labelTex && (
        <mesh position={[labelX, labelY, 0]}>
          <planeGeometry args={[LABEL_W, LABEL_H]} />
          <meshStandardMaterial
            map={labelTex}
            polygonOffset
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
      )}
    </group>
  );
};

const Artworks = () => (
  <group>
    {ART_PIECES.map((piece, i) => (
      <ArtPlaceholder key={i} {...piece} />
    ))}
  </group>
);

const ArtSpotlight = ({
  artPosition,
  artRotation,
}: {
  artPosition: [number, number, number];
  artRotation: [number, number, number];
}) => {
  const lightRef = useRef<THREE.SpotLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);
  const connectedRef = useRef(false);

  const ceilingY = ROOM_HEIGHT / 2 - 0.1;
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
        intensity={12}
        distance={35}
        decay={1}
        color='#ffffff'
      />
      <object3D ref={targetRef} position={artPosition} />
    </group>
  );
};

const ArtLighting = () => (
  <group>
    {ART_PIECES.map((piece, i) => (
      <ArtSpotlight
        key={i}
        artPosition={piece.position}
        artRotation={piece.rotation}
      />
    ))}
  </group>
);

const Room = () => {
  const halfW = ROOM_WIDTH / 2;
  const halfH = ROOM_HEIGHT / 2;
  const halfD = ROOM_DEPTH / 2;
  const wallTex = useMemo(createWallTexture, []);
  const ceilingTex = useMemo(createCeilingTexture, []);

  return (
    <group>
      <Floor />
      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, halfH, 0]}>
        <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
        <meshStandardMaterial map={ceilingTex} roughness={0.95} />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, 0, -halfD]}>
        <planeGeometry args={[ROOM_WIDTH, ROOM_HEIGHT]} />
        <meshStandardMaterial map={wallTex} roughness={0.92} />
      </mesh>
      {/* Front wall */}
      <mesh rotation={[0, Math.PI, 0]} position={[0, 0, halfD]}>
        <planeGeometry args={[ROOM_WIDTH, ROOM_HEIGHT]} />
        <meshStandardMaterial map={wallTex} roughness={0.92} />
      </mesh>
      {/* Left wall */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-halfW, 0, 0]}>
        <planeGeometry args={[ROOM_DEPTH, ROOM_HEIGHT]} />
        <meshStandardMaterial map={wallTex} roughness={0.92} />
      </mesh>
      {/* Right wall */}
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[halfW, 0, 0]}>
        <planeGeometry args={[ROOM_DEPTH, ROOM_HEIGHT]} />
        <meshStandardMaterial map={wallTex} roughness={0.92} />
      </mesh>
      {/* Overhead fill lights */}
      <pointLight
        position={[0, halfH - 1, 0]}
        intensity={3}
        distance={50}
        decay={1}
        color='#ffffff'
      />
      <pointLight
        position={[-15, halfH - 1, -15]}
        intensity={2}
        distance={40}
        decay={1}
        color='#ffffff'
      />
      <pointLight
        position={[15, halfH - 1, -15]}
        intensity={2}
        distance={40}
        decay={1}
        color='#ffffff'
      />
      <pointLight
        position={[-15, halfH - 1, 15]}
        intensity={2}
        distance={40}
        decay={1}
        color='#ffffff'
      />
      <pointLight
        position={[15, halfH - 1, 15]}
        intensity={2}
        distance={40}
        decay={1}
        color='#ffffff'
      />
      {/* Interior partition walls */}
      <Partitions />
      {/* Art placeholders and per-piece spotlights */}
      <Artworks />
      <ArtLighting />
      {/* Benches */}
      <GalleryBench position={[-11, 0, -22]} />
      {/* Welcome wall text */}
      <WelcomeWallText />
    </group>
  );
};

const Movement = () => {
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
    for (const box of COLLIDERS) {
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
          // Push out along X
          const centerX = (box.minX + box.maxX) / 2;
          camera.position.x +=
            camera.position.x < centerX ? -overlapX : overlapX;
        } else {
          // Push out along Z
          const centerZ = (box.minZ + box.maxZ) / 2;
          camera.position.z +=
            camera.position.z < centerZ ? -overlapZ : overlapZ;
        }
      }
    }

    const halfW = ROOM_WIDTH / 2 - BOUNDARY_PADDING;
    const halfD = ROOM_DEPTH / 2 - BOUNDARY_PADDING;
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -halfW, halfW);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -halfD, halfD);
  });

  return null;
};

const GalleryScreen = () => {
  const [locked, setLocked] = useState(false);

  const onLock = useCallback(() => setLocked(true), []);
  const onUnlock = useCallback(() => setLocked(false), []);

  return (
    <div className={`fixed inset-0 z-50${!locked ? ' cursor-pointer' : ''}`}>
      <Canvas camera={{ position: SPAWN_POSITION, fov: 75 }}>
        <ambientLight intensity={1.2} />
        <hemisphereLight args={['#ffffff', '#333333', 0.8]} />
        <Room />
        <SpawnPoint />
        <Movement />
        <PointerLockControls onLock={onLock} onUnlock={onUnlock} />
      </Canvas>
      {!locked && (
        <div className='absolute inset-x-0 bottom-8 flex justify-center pointer-events-none'>
          <p className='font-pixel text-white/25 text-xs tracking-[0.2em] select-none'>
            CLICK TO LOOK
          </p>
        </div>
      )}
    </div>
  );
};

export { GalleryScreen };
