import { PointerLockControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

const ROOM_WIDTH = 60;
const ROOM_HEIGHT = 16;
const ROOM_DEPTH = 60;
const MOVE_SPEED = 16;
const JUMP_IMPULSE = 12;
const GRAVITY = 40;
const BOUNDARY_PADDING = 0.5;

const createWoodTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Cool gray washed wood base
  ctx.fillStyle = '#b5b0a9';
  ctx.fillRect(0, 0, 1024, 1024);

  const plankHeight = 96;

  // Half-bond pattern: uniform planks, each row offset by half a plank
  // 1024 / 682 ≈ 1.5 planks per row — longer boards with stagger
  const plankLen = 682;
  const halfPlank = 341;

  // Simple hash for deterministic per-plank color
  const plankColor = (row: number, col: number) => {
    const h = ((row * 17 + col * 31 + 7) * 2654435761) >>> 0;
    const lightness = 72 + (h % 4);
    const saturation = 5 + ((h >> 4) % 4);
    return `hsl(30, ${saturation}%, ${lightness}%)`;
  };

  const drawPlank = (x: number, y: number, color: string, seed: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, plankLen, plankHeight);

    // Grain lines
    let s = seed;
    for (let i = 0; i < 10; i++) {
      s = ((s * 1103515245 + 12345) & 0x7fffffff) >>> 0;
      const gy = y + 8 + (s % (plankHeight - 16));
      s = ((s * 1103515245 + 12345) & 0x7fffffff) >>> 0;
      const alpha = 0.03 + (s % 50) / 1000;
      ctx.strokeStyle = `rgba(100, 95, 90, ${alpha})`;
      ctx.lineWidth = 0.5 + (i % 3) * 0.25;
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.bezierCurveTo(
        x + plankLen * 0.33,
        gy + ((i % 3) - 1) * 1.5,
        x + plankLen * 0.66,
        gy + ((i % 2) - 0.5) * 2,
        x + plankLen,
        gy + ((i % 3) - 1) * 2,
      );
      ctx.stroke();
    }

    // Vertical end-seam
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + plankLen, y);
    ctx.lineTo(x + plankLen, y + plankHeight);
    ctx.stroke();
  };

  for (let y = 0; y < 1024; y += plankHeight) {
    const row = Math.floor(y / plankHeight);
    const offset = row % 2 === 0 ? 0 : halfPlank;

    for (let i = 0; i < 2; i++) {
      const x = i * plankLen - offset;
      const color = plankColor(row, i);
      const seed = row * 17 + i * 31;
      drawPlank(x, y, color, seed);

      // Draw the wrapping plank at the opposite edge for seamless tiling
      if (x < 0) drawPlank(x + 1024, y, color, seed);
    }

    // Horizontal seam between rows
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(9, 9);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const WALL_COLOR = '#f0ece6';
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
const BASEBOARD_HEIGHT = 0.3;
const BASEBOARD_COLOR = '#e0dbd3';
const CROWN_HEIGHT = 0.15;

const Floor = () => {
  const texture = useMemo(createWoodTexture, []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -ROOM_HEIGHT / 2, 0]}>
      <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
};

const Baseboard = ({
  position,
  rotation,
  width,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
}) => (
  <mesh position={position} rotation={rotation}>
    <boxGeometry args={[width, BASEBOARD_HEIGHT, 0.05]} />
    <meshStandardMaterial color={BASEBOARD_COLOR} />
  </mesh>
);

const CrownMolding = ({
  position,
  rotation,
  width,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
}) => (
  <mesh position={position} rotation={rotation}>
    <boxGeometry args={[width, CROWN_HEIGHT, 0.04]} />
    <meshStandardMaterial color={BASEBOARD_COLOR} />
  </mesh>
);

const PartitionWall = ({
  position,
  size,
}: {
  position: [number, number, number];
  size: [number, number, number];
}) => (
  <mesh position={position}>
    <boxGeometry args={size} />
    <meshStandardMaterial color={WALL_COLOR} roughness={0.9} />
  </mesh>
);

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
        <meshStandardMaterial color='#2c2520' roughness={0.8} />
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
          <meshStandardMaterial color='#1a1a1a' roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
};

type ArtPiece = {
  position: [number, number, number];
  size: [number, number];
  rotation: [number, number, number];
};

const ART_PIECES: ArtPiece[] = [
  // Back wall (NW) — hero piece, bench faces this
  { position: [-11, 0.5, -29.9], size: [5, 3.5], rotation: [0, 0, 0] },
  // Back wall (NE) — portrait
  { position: [20, 0, -29.9], size: [2.5, 3.5], rotation: [0, 0, 0] },
  // Left wall (NW) — landscape
  {
    position: [-29.9, 0.5, -22],
    size: [3.5, 2.5],
    rotation: [0, Math.PI / 2, 0],
  },
  // Left wall (central) — small portrait
  { position: [-29.9, 0, -2], size: [2, 3], rotation: [0, Math.PI / 2, 0] },
  // Right wall (NE) — tall portrait
  { position: [29.9, 0, -20], size: [3, 4], rotation: [0, -Math.PI / 2, 0] },
  // Right wall (south) — landscape
  { position: [29.9, 0.5, 8], size: [4, 2.5], rotation: [0, -Math.PI / 2, 0] },
  // A-Left south face — faces central area
  { position: [-14, 0.5, -11.5], size: [3.5, 2.5], rotation: [0, 0, 0] },
  // A-Right south face — portrait, faces central
  { position: [10, 0, -11.5], size: [2.5, 3.5], rotation: [0, 0, 0] },
  // Wall B west face — portrait, faces NW gallery
  { position: [7.5, 0, -24], size: [2, 3.5], rotation: [0, -Math.PI / 2, 0] },
  // Wall B east face — landscape, faces NE
  { position: [8.5, 0.5, -18], size: [4, 2.5], rotation: [0, Math.PI / 2, 0] },
  // Wall C north face — small landscape
  { position: [-16, 0.5, 14.5], size: [3, 2], rotation: [0, Math.PI, 0] },
  // Wall D west face — portrait
  { position: [17.5, 0, 22], size: [2.5, 3.5], rotation: [0, -Math.PI / 2, 0] },
  // Front wall (SW) — tall portrait
  { position: [-10, 0, 29.9], size: [3, 4], rotation: [0, Math.PI, 0] },
];

const ArtPlaceholder = ({
  position,
  size,
  rotation,
}: {
  position: [number, number, number];
  size: [number, number];
  rotation: [number, number, number];
}) => {
  const [w, h] = size;
  return (
    <group position={position} rotation={rotation}>
      {/* Frame */}
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[w + 0.16, h + 0.16, 0.04]} />
        <meshStandardMaterial color='#2a2420' roughness={0.8} />
      </mesh>
      {/* Canvas */}
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color='#e8e4de' />
      </mesh>
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
        angle={0.45}
        penumbra={0.7}
        intensity={3}
        distance={20}
        decay={1.5}
        color='#fff8f0'
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
  const baseY = -halfH + BASEBOARD_HEIGHT / 2;
  const crownY = halfH - CROWN_HEIGHT / 2;

  return (
    <group>
      <Floor />
      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, halfH, 0]}>
        <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
        <meshStandardMaterial color={WALL_COLOR} />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, 0, -halfD]}>
        <planeGeometry args={[ROOM_WIDTH, ROOM_HEIGHT]} />
        <meshStandardMaterial color={WALL_COLOR} roughness={0.9} />
      </mesh>
      {/* Front wall */}
      <mesh rotation={[0, Math.PI, 0]} position={[0, 0, halfD]}>
        <planeGeometry args={[ROOM_WIDTH, ROOM_HEIGHT]} />
        <meshStandardMaterial color={WALL_COLOR} roughness={0.9} />
      </mesh>
      {/* Left wall */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-halfW, 0, 0]}>
        <planeGeometry args={[ROOM_DEPTH, ROOM_HEIGHT]} />
        <meshStandardMaterial color={WALL_COLOR} roughness={0.9} />
      </mesh>
      {/* Right wall */}
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[halfW, 0, 0]}>
        <planeGeometry args={[ROOM_DEPTH, ROOM_HEIGHT]} />
        <meshStandardMaterial color={WALL_COLOR} roughness={0.9} />
      </mesh>
      {/* Baseboards */}
      <Baseboard
        position={[0, baseY, -halfD + 0.025]}
        rotation={[0, 0, 0]}
        width={ROOM_WIDTH}
      />
      <Baseboard
        position={[0, baseY, halfD - 0.025]}
        rotation={[0, Math.PI, 0]}
        width={ROOM_WIDTH}
      />
      <Baseboard
        position={[-halfW + 0.025, baseY, 0]}
        rotation={[0, Math.PI / 2, 0]}
        width={ROOM_DEPTH}
      />
      <Baseboard
        position={[halfW - 0.025, baseY, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        width={ROOM_DEPTH}
      />
      {/* Crown molding */}
      <CrownMolding
        position={[0, crownY, -halfD + 0.02]}
        rotation={[0, 0, 0]}
        width={ROOM_WIDTH}
      />
      <CrownMolding
        position={[0, crownY, halfD - 0.02]}
        rotation={[0, Math.PI, 0]}
        width={ROOM_WIDTH}
      />
      <CrownMolding
        position={[-halfW + 0.02, crownY, 0]}
        rotation={[0, Math.PI / 2, 0]}
        width={ROOM_DEPTH}
      />
      <CrownMolding
        position={[halfW - 0.02, crownY, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        width={ROOM_DEPTH}
      />
      {/* Interior partition walls */}
      <Partitions />
      {/* Art placeholders and per-piece spotlights */}
      <Artworks />
      <ArtLighting />
      {/* Benches */}
      <GalleryBench position={[-11, 0, -22]} />
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

    if (direction.lengthSq() > 0) {
      direction.normalize();
      camera.position.addScaledVector(direction, MOVE_SPEED * delta);
    }

    // Jump physics
    velocityY.current -= GRAVITY * delta;
    camera.position.y += velocityY.current * delta;
    if (camera.position.y <= 0) {
      camera.position.y = 0;
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
    <div className='fixed inset-0 z-50'>
      <Canvas camera={{ position: [0, 0, 0], fov: 75 }}>
        <ambientLight intensity={0.3} />
        <hemisphereLight args={['#f0ece6', '#b5b0a9', 0.4]} />
        <Room />
        <Movement />
        <PointerLockControls onLock={onLock} onUnlock={onUnlock} />
      </Canvas>
      {!locked && (
        <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
          <p className='text-black/40 text-sm font-medium select-none'>
            Click to look around &middot; WASD to move &middot; Space to jump
            &middot; ESC to exit
          </p>
        </div>
      )}
    </div>
  );
};

export { GalleryScreen };
