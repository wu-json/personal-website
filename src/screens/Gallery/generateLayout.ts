export type ImageSpec = { id: string; orientation: 'portrait' | 'landscape' };

export type AABB = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export type ArtPiece = {
  position: [number, number, number];
  size: [number, number];
  rotation: [number, number, number];
  title: string;
};

export type Partition = {
  position: [number, number, number];
  size: [number, number, number];
};

export interface GalleryLayout {
  roomWidth: number;
  roomHeight: number;
  roomDepth: number;
  partitions: Partition[];
  artPieces: ArtPiece[];
  colliders: AABB[];
  spawnPosition: [number, number, number];
  spawnLookAt: [number, number, number];
  welcomePosition: [number, number, number];
  welcomeRotation: [number, number, number];
  benchPositions: Array<[number, number, number]>;
  fillLights: Array<[number, number, number]>;
}

// ---------------------------------------------------------------------------
// Deterministic hash (no Math.random)
// ---------------------------------------------------------------------------
const deterministicHash = (str: string): number => {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) & 0x7fffffff;
  }
  // Avalanche finalizer so similar strings produce very different hashes
  h ^= h >>> 16;
  h = Math.imul(h, 0x45d9f3b) & 0x7fffffff;
  h ^= h >>> 16;
  return h;
};

const hashFloat = (h: number, min: number, max: number): number =>
  min + ((h & 0xffff) / 0xffff) * (max - min);

// ---------------------------------------------------------------------------
// Wall segment: a surface that can receive art
// ---------------------------------------------------------------------------
type WallSegment = {
  origin: [number, number, number]; // left-edge world position (at segment start)
  normal: [number, number, number]; // outward-facing normal
  rotation: [number, number, number]; // Euler rotation for art placed on this wall
  width: number; // usable width
  reserved: number; // span reserved (e.g. for welcome text)
  used: number; // span consumed so far
};

const WALL_THICKNESS = 0.8;
const ROOM_HEIGHT = 16;
const PARTITION_HEIGHT = 15.6;
const CORNER_MARGIN = 2;
const ART_PADDING = 2.5;
const WELCOME_CENTER_X = 3;
const WELCOME_WIDTH = 7;
const WELCOME_PAD = 1.5; // clearance each side

// ---------------------------------------------------------------------------
// 1. Compute art sizes from orientation + deterministic hash
//
// Uses size tiers (small / medium / large) so pieces feel varied like a
// real gallery rather than clustering around one "medium" size.
// ---------------------------------------------------------------------------
const computeArtSize = (spec: ImageSpec): { width: number; height: number } => {
  const h = deterministicHash(spec.id);
  // Pick size tier: ~30% small, ~40% medium, ~30% large
  const tierVal = (h >>> 16) % 100;
  const tier = tierVal < 30 ? 0 : tierVal < 70 ? 1 : 2;

  if (spec.orientation === 'landscape') {
    const aspect = 1.4 + hashFloat(h >>> 4, 0, 0.4); // 1.4–1.8
    if (tier === 0) {
      const width = hashFloat(h, 3, 4.5);
      return { width, height: width / aspect };
    }
    if (tier === 1) {
      const width = hashFloat(h, 5, 7);
      return { width, height: width / aspect };
    }
    const width = hashFloat(h, 8, 11);
    return { width, height: width / aspect };
  }

  // Portrait
  const aspect = 0.6 + hashFloat(h >>> 4, 0, 0.14); // 0.6–0.74
  if (tier === 0) {
    const height = hashFloat(h, 3, 4);
    return { width: height * aspect, height };
  }
  if (tier === 1) {
    const height = hashFloat(h, 4.5, 6);
    return { width: height * aspect, height };
  }
  const height = hashFloat(h, 6.5, 8.5);
  return { width: height * aspect, height };
};

// ---------------------------------------------------------------------------
// 2. Room dimensions + partition count
// ---------------------------------------------------------------------------
const computeRoomSize = (
  images: ImageSpec[],
): { roomSize: number; partitionCount: number } => {
  const artSizes = images.map(computeArtSize);
  const totalDemand = artSizes.reduce(
    (sum, a) => sum + a.width + ART_PADDING,
    0,
  );
  const targetSupply = totalDemand * 1.1;

  let roomSize = Math.max(60, Math.ceil(Math.sqrt(totalDemand * 12)));
  if (roomSize % 2 !== 0) roomSize++;
  roomSize = Math.min(120, roomSize);

  const welcomeReserve = WELCOME_WIDTH + 2 * WELCOME_PAD;
  const perimeterSupply =
    2 * (roomSize + roomSize) - 4 * CORNER_MARGIN - welcomeReserve;
  const deficit = targetSupply - perimeterSupply;
  // Each partition provides roughly roomSize * 0.4 usable wall surface (both faces)
  const surfacePerPartition = roomSize * 0.4;
  const partitionCount =
    deficit > 0 ? Math.ceil(deficit / surfacePerPartition) : 0;

  return { roomSize, partitionCount };
};

// ---------------------------------------------------------------------------
// 3. Generate partition walls from pattern catalog
//
// Patterns create structured gallery layouts (T-shapes, archways, alcoves)
// rather than scattered walls. Each pattern builds on the previous tier.
// ---------------------------------------------------------------------------
const generatePartitions = (
  count: number,
  roomW: number,
  roomD: number,
): Partition[] => {
  if (count === 0) return [];

  const halfW = roomW / 2;
  const halfD = roomD / 2;
  const partitions: Partition[] = [];

  // Tier 1 (1–2): Long horizontal divider in back half, optional perpendicular wing
  // Creates a distinct "back gallery" zone
  const backWallZ = -halfD * 0.35;
  const backWallW = roomW * 0.45;
  partitions.push({
    position: [0, 0, backWallZ],
    size: [backWallW, PARTITION_HEIGHT, WALL_THICKNESS],
  });
  if (count === 1) return partitions;

  // Add a perpendicular wing from the right end → L-shape, creating an alcove
  const wingX = halfW * 0.5;
  const wingD = roomD * 0.3;
  partitions.push({
    position: [wingX, 0, backWallZ + wingD / 2],
    size: [WALL_THICKNESS, PARTITION_HEIGHT, wingD],
  });
  if (count === 2) return partitions;

  // Tier 2 (3–4): Add a second perpendicular wing on the left → T-shape
  // Creates two alcoves behind the back wall
  const wing2X = -halfW * 0.45;
  const wing2D = roomD * 0.25;
  partitions.push({
    position: [wing2X, 0, backWallZ - wing2D / 2],
    size: [WALL_THICKNESS, PARTITION_HEIGHT, wing2D],
  });
  if (count === 3) return partitions;

  // Add a front-area divider → separate front gallery zone
  partitions.push({
    position: [-halfW * 0.15, 0, halfD * 0.35],
    size: [roomW * 0.35, PARTITION_HEIGHT, WALL_THICKNESS],
  });
  if (count === 4) return partitions;

  // Tier 3 (5–6): Archway pair + side alcove (inspired by original gallery)
  // Split the back wall into two halves with a passage between
  // Replace the single back wall with a pair
  partitions[0] = {
    position: [-halfW * 0.25, 0, backWallZ],
    size: [roomW * 0.25, PARTITION_HEIGHT, WALL_THICKNESS],
  };
  partitions.push({
    position: [halfW * 0.25, 0, backWallZ],
    size: [roomW * 0.25, PARTITION_HEIGHT, WALL_THICKNESS],
  });
  if (count === 5) return partitions;

  // A long wall on the right side creating a corridor
  partitions.push({
    position: [halfW * 0.55, 0, 0],
    size: [WALL_THICKNESS, PARTITION_HEIGHT, roomD * 0.4],
  });
  if (count <= 7) return partitions;

  // Tier 4 (7+): Additional alcove walls for very large galleries
  // Left-side corridor wall
  partitions.push({
    position: [-halfW * 0.55, 0, halfD * 0.15],
    size: [WALL_THICKNESS, PARTITION_HEIGHT, roomD * 0.3],
  });
  if (count === 8) return partitions;

  // Additional short cross-walls for remaining count
  for (let i = partitions.length; i < count; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const zPos = halfD * (0.1 * (i - 7) - 0.2) * side;
    partitions.push({
      position: [side * halfW * 0.3, 0, zPos],
      size: [roomW * 0.15, PARTITION_HEIGHT, WALL_THICKNESS],
    });
  }

  return partitions;
};

// ---------------------------------------------------------------------------
// 4. Build wall segments (perimeter + partitions)
// ---------------------------------------------------------------------------
const buildPerimeterSegments = (
  roomW: number,
  roomD: number,
): WallSegment[] => {
  const halfW = roomW / 2;
  const halfD = roomD / 2;
  const usableW = roomW - 2 * CORNER_MARGIN;
  const usableD = roomD - 2 * CORNER_MARGIN;

  return [
    // Back wall (z = -halfD, faces +Z)
    {
      origin: [-halfW + CORNER_MARGIN, 0, -halfD + 0.1],
      normal: [0, 0, 1],
      rotation: [0, 0, 0],
      width: usableW,
      reserved: 0,
      used: 0,
    },
    // Left wall (x = -halfW, faces +X) — right vector is (0,0,-1), sweep from +Z to -Z
    {
      origin: [-halfW + 0.1, 0, halfD - CORNER_MARGIN],
      normal: [1, 0, 0],
      rotation: [0, Math.PI / 2, 0],
      width: usableD,
      reserved: 0,
      used: 0,
    },
    // Right wall (x = +halfW, faces -X) — right vector is (0,0,+1), sweep from -Z to +Z
    {
      origin: [halfW - 0.1, 0, -halfD + CORNER_MARGIN],
      normal: [-1, 0, 0],
      rotation: [0, -Math.PI / 2, 0],
      width: usableD,
      reserved: 0,
      used: 0,
    },
    // Front wall — split into two segments around the welcome text zone
    // Welcome text occupies X ≈ [WELCOME_CENTER_X - WELCOME_WIDTH/2 - PAD, WELCOME_CENTER_X + WELCOME_WIDTH/2 + PAD]
    // Right vector is (-1,0,0): sweep from high-X origin toward low-X
    // Right segment: from halfW - CORNER_MARGIN down to welcomeZoneRight
    // Left segment:  from welcomeZoneLeft down to -halfW + CORNER_MARGIN
    (() => {
      const zoneRight = WELCOME_CENTER_X + WELCOME_WIDTH / 2 + WELCOME_PAD;
      const zoneLeft = WELCOME_CENTER_X - WELCOME_WIDTH / 2 - WELCOME_PAD;
      const rightW = halfW - CORNER_MARGIN - zoneRight;
      const leftW = zoneLeft - (-halfW + CORNER_MARGIN);
      const segs: WallSegment[] = [];
      if (rightW > 3) {
        segs.push({
          origin: [halfW - CORNER_MARGIN, 0, halfD - 0.1],
          normal: [0, 0, -1],
          rotation: [0, Math.PI, 0],
          width: rightW,
          reserved: 0,
          used: 0,
        });
      }
      if (leftW > 3) {
        segs.push({
          origin: [zoneLeft, 0, halfD - 0.1],
          normal: [0, 0, -1],
          rotation: [0, Math.PI, 0],
          width: leftW,
          reserved: 0,
          used: 0,
        });
      }
      return segs;
    })(),
  ].flat();
};

const buildPartitionSegments = (partitions: Partition[]): WallSegment[] => {
  const segments: WallSegment[] = [];
  for (const p of partitions) {
    const [px, py, pz] = p.position;
    const [sx, _sy, sz] = p.size;

    if (sx > sz) {
      // Horizontal partition (wide in X, thin in Z)
      const usable = sx - 2;
      if (usable <= 0) continue;
      // Front face (faces +Z)
      segments.push({
        origin: [px - sx / 2 + 1, py, pz + WALL_THICKNESS / 2 + 0.1],
        normal: [0, 0, 1],
        rotation: [0, 0, 0],
        width: usable,
        reserved: 0,
        used: 0,
      });
      // Back face (faces -Z)
      segments.push({
        origin: [px + sx / 2 - 1, py, pz - WALL_THICKNESS / 2 - 0.1],
        normal: [0, 0, -1],
        rotation: [0, Math.PI, 0],
        width: usable,
        reserved: 0,
        used: 0,
      });
    } else {
      // Vertical partition (thin in X, wide in Z)
      const usable = sz - 2;
      if (usable <= 0) continue;
      // Right face (faces +X) — right vector is (0,0,-1), sweep from +Z to -Z
      segments.push({
        origin: [px + WALL_THICKNESS / 2 + 0.1, py, pz + sz / 2 - 1],
        normal: [1, 0, 0],
        rotation: [0, Math.PI / 2, 0],
        width: usable,
        reserved: 0,
        used: 0,
      });
      // Left face (faces -X) — right vector is (0,0,+1), sweep from -Z to +Z
      segments.push({
        origin: [px - WALL_THICKNESS / 2 - 0.1, py, pz - sz / 2 + 1],
        normal: [-1, 0, 0],
        rotation: [0, -Math.PI / 2, 0],
        width: usable,
        reserved: 0,
        used: 0,
      });
    }
  }
  return segments;
};

// ---------------------------------------------------------------------------
// 5. Place art on segments (greedy first-fit-decreasing)
// ---------------------------------------------------------------------------
const localToWorld = (
  segment: WallSegment,
  offset: number,
  artWidth: number,
): [number, number, number] => {
  const [ox, oy, oz] = segment.origin;
  const [nx, , nz] = segment.normal;

  // "right" vector: perpendicular to normal in XZ plane
  // For normal (0,0,1) → right is (1,0,0)
  // For normal (1,0,0) → right is (0,0,1)
  // For normal (0,0,-1) → right is (-1,0,0)
  // For normal (-1,0,0) → right is (0,0,-1)
  const rx = nz; // cross(up, normal).x = nz
  const rz = -nx; // cross(up, normal).z = -nx

  const centerOffset = offset + artWidth / 2;
  return [ox + rx * centerOffset, oy, oz + rz * centerOffset];
};

const distributeArt = (
  images: ImageSpec[],
  segments: WallSegment[],
): ArtPiece[] => {
  const artSpecs = images.map(img => ({
    ...img,
    ...computeArtSize(img),
  }));

  // Sort by width descending so large pieces get placed first
  const sorted = [...artSpecs].sort((a, b) => b.width - a.width);

  const pieces: ArtPiece[] = [];

  for (const art of sorted) {
    const needed = art.width + ART_PADDING;

    // Find the segment with the MOST remaining space that can still fit this piece.
    // This spreads art evenly across all walls instead of filling them sequentially.
    let bestSeg: WallSegment | null = null;
    let bestAvail = -1;
    for (const seg of segments) {
      const available = seg.width - seg.reserved - seg.used;
      if (available >= needed && available > bestAvail) {
        bestSeg = seg;
        bestAvail = available;
      }
    }

    // Fallback: tighter fit if no segment has room with full padding
    if (!bestSeg) {
      for (const seg of segments) {
        const available = seg.width - seg.reserved - seg.used;
        if (available >= art.width + 1 && available > bestAvail) {
          bestSeg = seg;
          bestAvail = available;
        }
      }
    }

    if (bestSeg) {
      const pad = bestAvail >= needed ? ART_PADDING / 2 : 0.5;
      const pos = localToWorld(bestSeg, bestSeg.used + pad, art.width);
      const h = deterministicHash(art.id);
      pos[1] += hashFloat(h >>> 8, -0.5, 1);

      pieces.push({
        position: pos,
        size: [art.width, art.height],
        rotation: bestSeg.rotation,
        title: art.id.toUpperCase(),
      });
      bestSeg.used += bestAvail >= needed ? needed : art.width + 1;
    }
    // If no segment can fit, skip this piece
  }

  return pieces;
};

// ---------------------------------------------------------------------------
// 6. Colliders from partitions
// ---------------------------------------------------------------------------
const partitionColliders = (partitions: Partition[]): AABB[] =>
  partitions.map(p => {
    const [px, , pz] = p.position;
    const [sx, , sz] = p.size;
    return {
      minX: px - sx / 2,
      maxX: px + sx / 2,
      minZ: pz - sz / 2,
      maxZ: pz + sz / 2,
    };
  });

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------
export const generateGalleryLayout = (images: ImageSpec[]): GalleryLayout => {
  const { roomSize, partitionCount } = computeRoomSize(images);
  const roomWidth = roomSize;
  const roomDepth = roomSize;
  const halfW = roomWidth / 2;
  const halfD = roomDepth / 2;
  const halfH = ROOM_HEIGHT / 2;

  // Generate partitions
  const partitions = generatePartitions(partitionCount, roomWidth, roomDepth);

  // Build wall segments
  const perimeterSegments = buildPerimeterSegments(roomWidth, roomDepth);
  const partSegments = buildPartitionSegments(partitions);
  const allSegments = [...perimeterSegments, ...partSegments];

  // Distribute art
  const artPieces = distributeArt(images, allSegments);

  // Colliders
  const colliders = partitionColliders(partitions);

  // Bench colliders
  const benchPositions: Array<[number, number, number]> = [];
  if (roomSize >= 50) {
    benchPositions.push([0, 0, 0]);
    colliders.push({ minX: -3, maxX: 3, minZ: -0.9, maxZ: 0.9 });
  }

  // Spawn: directly in front of welcome text, facing it
  const spawnZ = halfD - 10;
  const spawnPosition: [number, number, number] = [WELCOME_CENTER_X, 0, spawnZ];
  const spawnLookAt: [number, number, number] = [WELCOME_CENTER_X, 0, halfD];

  // Welcome text: front wall, anchored to WELCOME_CENTER_X
  const welcomePosition: [number, number, number] = [
    WELCOME_CENTER_X,
    0,
    halfD - 0.01,
  ];
  const welcomeRotation: [number, number, number] = [0, Math.PI, 0];

  // Fill lights: center + 4 quarter points
  const qW = halfW * 0.5;
  const qD = halfD * 0.5;
  const lightY = halfH - 1;
  const fillLights: Array<[number, number, number]> = [
    [0, lightY, 0],
    [-qW, lightY, -qD],
    [qW, lightY, -qD],
    [-qW, lightY, qD],
    [qW, lightY, qD],
  ];

  return {
    roomWidth,
    roomHeight: ROOM_HEIGHT,
    roomDepth,
    partitions,
    artPieces,
    colliders,
    spawnPosition,
    spawnLookAt,
    welcomePosition,
    welcomeRotation,
    benchPositions,
    fillLights,
  };
};
