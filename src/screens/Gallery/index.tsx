import { PointerLockControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

const ROOM_WIDTH = 40;
const ROOM_HEIGHT = 14;
const ROOM_DEPTH = 40;
const MOVE_SPEED = 14;
const JUMP_IMPULSE = 8;
const GRAVITY = 20;
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
  texture.repeat.set(6, 6);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const WALL_COLOR = '#f0ece6';
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

const RAIL_OFFSET = 2.5;
const FIXTURE_POSITIONS = [-14, -7, 0, 7, 14];
const FIXTURE_TILT = Math.PI / 6; // 30 degrees toward wall

const FixtureHead = ({
  position,
  tiltAxis,
}: {
  position: [number, number, number];
  tiltAxis: [number, number, number];
}) => (
  <mesh position={position} rotation={tiltAxis}>
    <cylinderGeometry args={[0.06, 0.05, 0.2, 8]} />
    <meshStandardMaterial color='#d8d4ce' />
  </mesh>
);

const TrackRail = ({
  wallAxis,
  wallSign,
  length,
}: {
  wallAxis: 'x' | 'z';
  wallSign: 1 | -1;
  length: number;
}) => {
  const lightsRef = useRef<(THREE.SpotLight | null)[]>([]);
  const targetsRef = useRef<(THREE.Object3D | null)[]>([]);

  const halfH = ROOM_HEIGHT / 2;
  const halfW = ROOM_WIDTH / 2;
  const halfD = ROOM_DEPTH / 2;
  const railY = halfH - 0.02; // flush to ceiling

  const connectedRef = useRef(false);

  useFrame(() => {
    if (connectedRef.current) return;
    let allConnected = true;
    for (let i = 0; i < FIXTURE_POSITIONS.length; i++) {
      const l = lightsRef.current[i];
      const t = targetsRef.current[i];
      if (l && t) {
        l.target = t;
      } else {
        allConnected = false;
      }
    }
    connectedRef.current = allConnected;
  });

  // Rail and fixture positions depend on which wall
  const isZ = wallAxis === 'z'; // wall runs along Z (left/right walls)
  const wallEdge = isZ ? halfW * wallSign : halfD * wallSign;
  const railPos: [number, number, number] = isZ
    ? [wallEdge - wallSign * RAIL_OFFSET, railY, 0]
    : [0, railY, wallEdge - wallSign * RAIL_OFFSET];
  const railRotation: [number, number, number] = isZ
    ? [0, Math.PI / 2, 0]
    : [0, 0, 0];

  return (
    <group>
      {/* Rail bar */}
      <mesh position={railPos} rotation={railRotation}>
        <boxGeometry args={[length, 0.04, 0.04]} />
        <meshStandardMaterial color={WALL_COLOR} />
      </mesh>

      {/* Fixture heads + spotlights */}
      {FIXTURE_POSITIONS.map((offset, i) => {
        const fixturePos: [number, number, number] = isZ
          ? [wallEdge - wallSign * RAIL_OFFSET, railY - 0.1, offset]
          : [offset, railY - 0.1, wallEdge - wallSign * RAIL_OFFSET];

        // Tilt the cylinder toward the wall
        const tiltAxis: [number, number, number] = isZ
          ? [0, 0, wallSign * FIXTURE_TILT]
          : [wallSign * -FIXTURE_TILT, 0, 0];

        const targetY = 0;
        const targetPos: [number, number, number] = isZ
          ? [wallEdge, targetY, offset]
          : [offset, targetY, wallEdge];

        return (
          <group key={offset}>
            <FixtureHead position={fixturePos} tiltAxis={tiltAxis} />
            <spotLight
              ref={el => {
                lightsRef.current[i] = el;
              }}
              position={fixturePos}
              angle={0.4}
              penumbra={0.8}
              intensity={2.5}
              distance={25}
              decay={1.2}
              color='#fff8f0'
            />
            <object3D
              ref={el => {
                targetsRef.current[i] = el;
              }}
              position={targetPos}
            />
          </group>
        );
      })}
    </group>
  );
};

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
      {/* Track rails with fixtures along each wall */}
      <TrackRail wallAxis='x' wallSign={-1} length={ROOM_WIDTH} />
      <TrackRail wallAxis='x' wallSign={1} length={ROOM_WIDTH} />
      <TrackRail wallAxis='z' wallSign={-1} length={ROOM_DEPTH} />
      <TrackRail wallAxis='z' wallSign={1} length={ROOM_DEPTH} />
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
