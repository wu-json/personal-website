export type ImageSpec = {
  id: string;
  orientation: 'portrait' | 'landscape';
  aspectRatio?: number; // real w/h ratio — used instead of random when present
  imageUrl?: string; // URL to load as texture
};

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
  imageUrl?: string;
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

  // When a real aspect ratio is provided, use it instead of the hash-derived one
  if (spec.aspectRatio != null) {
    const ar = spec.aspectRatio;
    if (ar > 1) {
      // Landscape: pick width from tier range, derive height
      const width =
        tier === 0
          ? hashFloat(h, 3, 4.5)
          : tier === 1
            ? hashFloat(h, 5, 7)
            : hashFloat(h, 8, 11);
      return { width, height: width / ar };
    }
    // Portrait / square: pick height from tier range, derive width
    const height =
      tier === 0
        ? hashFloat(h, 3, 4)
        : tier === 1
          ? hashFloat(h, 4.5, 6)
          : hashFloat(h, 6.5, 8.5);
    return { width: height * ar, height };
  }

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

  // Front wall is entirely reserved for welcome text — only 3 walls contribute
  const perimeterSupply = 2 * roomSize + roomSize - 3 * CORNER_MARGIN * 2;
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

  // Junction overlap so perpendicular walls have no gap at connections
  const J = WALL_THICKNESS;

  // Each count range is a standalone pattern — no incremental mutation.
  // All parallel walls are kept >= 12 units apart.

  if (count <= 2) {
    // L-shape: horizontal back divider + perpendicular wing
    const backZ = -halfD * 0.35;
    const hWidth = roomW * 0.45;
    const hEdge = hWidth / 2; // right edge X of horizontal wall
    const p: Partition[] = [
      {
        position: [0, 0, backZ],
        size: [hWidth, PARTITION_HEIGHT, WALL_THICKNESS],
      },
    ];
    if (count >= 2) {
      const wingD = roomD * 0.3;
      p.push({
        position: [hEdge, 0, backZ + (wingD + J) / 2 - J / 2],
        size: [WALL_THICKNESS, PARTITION_HEIGHT, wingD + J],
      });
    }
    return mergeClosePartitions(snapToPerimeter(p, roomW, roomD));
  }

  if (count <= 4) {
    // T-shape + front divider
    const backZ = -halfD * 0.35;
    const hWidth = roomW * 0.45;
    const hEdge = hWidth / 2; // right edge X of horizontal wall
    const wingD = roomD * 0.3;
    const wing2D = roomD * 0.25;
    const p: Partition[] = [
      // Horizontal back wall
      {
        position: [0, 0, backZ],
        size: [hWidth, PARTITION_HEIGHT, WALL_THICKNESS],
      },
      // Right wing extending forward (positioned at horizontal wall's right edge)
      {
        position: [hEdge, 0, backZ + (wingD + J) / 2 - J / 2],
        size: [WALL_THICKNESS, PARTITION_HEIGHT, wingD + J],
      },
      // Left wing extending backward (positioned at horizontal wall's left edge)
      {
        position: [-hEdge, 0, backZ - (wing2D + J) / 2 + J / 2],
        size: [WALL_THICKNESS, PARTITION_HEIGHT, wing2D + J],
      },
    ];
    if (count >= 4) {
      // Front horizontal divider (well separated — at least halfD*0.7 from back wall)
      p.push({
        position: [-halfW * 0.15, 0, halfD * 0.35],
        size: [roomW * 0.35, PARTITION_HEIGHT, WALL_THICKNESS],
      });
    }
    return mergeClosePartitions(snapToPerimeter(p, roomW, roomD));
  }

  if (count <= 7) {
    // Archway pair in back half + well-spaced walls.
    // Wings are perpendicular to archway; extra walls are horizontal
    // (perpendicular to wings) so no two parallel walls are close.
    const backZ = -halfD * 0.35;
    const archGap = roomW * 0.12;
    const archW = roomW * 0.22;
    const p: Partition[] = [
      // Left archway half
      {
        position: [-(archGap / 2 + archW / 2), 0, backZ],
        size: [archW, PARTITION_HEIGHT, WALL_THICKNESS],
      },
      // Right archway half
      {
        position: [archGap / 2 + archW / 2, 0, backZ],
        size: [archW, PARTITION_HEIGHT, WALL_THICKNESS],
      },
      // Left wing extending backward (vertical)
      {
        position: [
          -(archGap / 2 + archW),
          0,
          backZ - (roomD * 0.2 + J) / 2 + J / 2,
        ],
        size: [WALL_THICKNESS, PARTITION_HEIGHT, roomD * 0.2 + J],
      },
      // Right wing extending forward (vertical)
      {
        position: [
          archGap / 2 + archW,
          0,
          backZ + (roomD * 0.25 + J) / 2 - J / 2,
        ],
        size: [WALL_THICKNESS, PARTITION_HEIGHT, roomD * 0.25 + J],
      },
      // Front horizontal divider (well separated from archway)
      {
        position: [halfW * 0.1, 0, halfD * 0.35],
        size: [roomW * 0.35, PARTITION_HEIGHT, WALL_THICKNESS],
      },
    ];
    if (count >= 6) {
      // Horizontal wall in front-left (perpendicular to nearby verticals, not parallel)
      p.push({
        position: [-halfW * 0.3, 0, halfD * 0.05],
        size: [roomW * 0.2, PARTITION_HEIGHT, WALL_THICKNESS],
      });
    }
    if (count >= 7) {
      // Horizontal wall in center-right (far from all other horizontals)
      p.push({
        position: [halfW * 0.35, 0, -halfD * 0.02],
        size: [roomW * 0.2, PARTITION_HEIGHT, WALL_THICKNESS],
      });
    }
    return mergeClosePartitions(snapToPerimeter(p, roomW, roomD));
  }

  // 8+: Cross layout with alcoves.
  // Central cross + 4 well-spaced alcove walls. Alcove walls are sized
  // generously to provide enough hanging surface for large piece counts.
  const p: Partition[] = [
    // Central horizontal (slightly back of center)
    {
      position: [0, 0, -halfD * 0.15],
      size: [roomW * 0.5, PARTITION_HEIGHT, WALL_THICKNESS],
    },
    // Central vertical (slightly left of center)
    {
      position: [-halfW * 0.1, 0, 0],
      size: [WALL_THICKNESS, PARTITION_HEIGHT, roomD * 0.5],
    },
    // NW alcove — horizontal
    {
      position: [-halfW * 0.4, 0, -halfD * 0.55],
      size: [roomW * 0.3, PARTITION_HEIGHT, WALL_THICKNESS],
    },
    // NE alcove — vertical
    {
      position: [halfW * 0.45, 0, -halfD * 0.45],
      size: [WALL_THICKNESS, PARTITION_HEIGHT, roomD * 0.25],
    },
    // SE alcove — horizontal
    {
      position: [halfW * 0.35, 0, halfD * 0.45],
      size: [roomW * 0.3, PARTITION_HEIGHT, WALL_THICKNESS],
    },
    // SW alcove — vertical
    {
      position: [-halfW * 0.45, 0, halfD * 0.35],
      size: [WALL_THICKNESS, PARTITION_HEIGHT, roomD * 0.25],
    },
  ];

  return mergeClosePartitions(snapToPerimeter(p.slice(0, count), roomW, roomD));
};

// ---------------------------------------------------------------------------
// 3b-i. Snap partition ends to room perimeter walls
//
// If a partition end is close to a room wall, extend it to meet flush.
// Partition-to-partition alignment is handled by the patterns themselves
// (wings computed from parent wall edges) rather than post-processing.
// ---------------------------------------------------------------------------
const snapToPerimeter = (
  partitions: Partition[],
  roomW: number,
  roomD: number,
): Partition[] => {
  const SNAP = 5;
  const halfW = roomW / 2;
  const halfD = roomD / 2;
  const out = partitions.map(p => ({
    ...p,
    position: [...p.position] as [number, number, number],
    size: [...p.size] as [number, number, number],
  }));

  for (const p of out) {
    const isH = p.size[0] > p.size[2];
    if (isH) {
      const left = p.position[0] - p.size[0] / 2;
      const right = p.position[0] + p.size[0] / 2;
      const gapL = left - -halfW;
      if (gapL > 0.01 && gapL < SNAP) {
        p.size[0] += gapL;
        p.position[0] -= gapL / 2;
      }
      const gapR = halfW - right;
      if (gapR > 0.01 && gapR < SNAP) {
        p.size[0] += gapR;
        p.position[0] += gapR / 2;
      }
    } else {
      const minZ = p.position[2] - p.size[2] / 2;
      const maxZ = p.position[2] + p.size[2] / 2;
      const gapBack = minZ - -halfD;
      if (gapBack > 0.01 && gapBack < SNAP) {
        p.size[2] += gapBack;
        p.position[2] -= gapBack / 2;
      }
      const gapFront = halfD - maxZ;
      if (gapFront > 0.01 && gapFront < SNAP) {
        p.size[2] += gapFront;
        p.position[2] += gapFront / 2;
      }
    }
  }

  return out;
};

// ---------------------------------------------------------------------------
// 3b-ii. Clean up partition placement
//
// Two passes for same-orientation wall pairs:
//  1. Collinear (nearly same line, small gap) → merge into one wider wall.
//  2. Close parallels (different line but < MIN_PARALLEL_DIST) → drop the
//     shorter wall so we never get awkward narrow corridors.
// ---------------------------------------------------------------------------
const mergeClosePartitions = (partitions: Partition[]): Partition[] => {
  const COLLINEAR_TOL = WALL_THICKNESS * 2; // "same line" tolerance
  const MERGE_GAP = 3; // max gap for collinear merge
  const MIN_PARALLEL_DIST = 8; // minimum distance between parallel walls

  const out = [...partitions];
  let changed = true;

  while (changed) {
    changed = false;
    outer: for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const a = out[i]!;
        const b = out[j]!;
        const aH = a.size[0] > a.size[2];
        const bH = b.size[0] > b.size[2];
        if (aH !== bH) continue; // different orientations

        if (aH) {
          // Both horizontal — check Z distance
          const dist = Math.abs(a.position[2] - b.position[2]);

          if (dist <= COLLINEAR_TOL) {
            // Nearly same line — merge if gap is small
            const aMin = a.position[0] - a.size[0] / 2;
            const aMax = a.position[0] + a.size[0] / 2;
            const bMin = b.position[0] - b.size[0] / 2;
            const bMax = b.position[0] + b.size[0] / 2;
            const gap = Math.max(bMin - aMax, aMin - bMax);
            if (gap > MERGE_GAP) continue;

            const newMin = Math.min(aMin, bMin);
            const newMax = Math.max(aMax, bMax);
            out[i] = {
              position: [
                (newMin + newMax) / 2,
                a.position[1],
                (a.position[2] + b.position[2]) / 2,
              ],
              size: [newMax - newMin, a.size[1], a.size[2]],
            };
            out.splice(j, 1);
            changed = true;
            break outer;
          } else if (dist < MIN_PARALLEL_DIST) {
            // Too-close parallels — drop the shorter wall
            out.splice(a.size[0] <= b.size[0] ? i : j, 1);
            changed = true;
            break outer;
          }
        } else {
          // Both vertical — check X distance
          const dist = Math.abs(a.position[0] - b.position[0]);

          if (dist <= COLLINEAR_TOL) {
            const aMin = a.position[2] - a.size[2] / 2;
            const aMax = a.position[2] + a.size[2] / 2;
            const bMin = b.position[2] - b.size[2] / 2;
            const bMax = b.position[2] + b.size[2] / 2;
            const gap = Math.max(bMin - aMax, aMin - bMax);
            if (gap > MERGE_GAP) continue;

            const newMin = Math.min(aMin, bMin);
            const newMax = Math.max(aMax, bMax);
            out[i] = {
              position: [
                (a.position[0] + b.position[0]) / 2,
                a.position[1],
                (newMin + newMax) / 2,
              ],
              size: [a.size[0], a.size[1], newMax - newMin],
            };
            out.splice(j, 1);
            changed = true;
            break outer;
          } else if (dist < MIN_PARALLEL_DIST) {
            out.splice(a.size[2] <= b.size[2] ? i : j, 1);
            changed = true;
            break outer;
          }
        }
      }
    }
  }

  return out;
};

// ---------------------------------------------------------------------------
// 4. Build wall segments (perimeter + partitions)
// ---------------------------------------------------------------------------

// Split a linear range into sub-ranges that avoid junction exclusion zones
const splitAtJunctions = (
  rangeMin: number,
  rangeMax: number,
  junctions: number[],
  margin: number,
): [number, number][] => {
  const cuts = junctions
    .filter(x => x > rangeMin + margin && x < rangeMax - margin)
    .sort((a, b) => a - b);

  const ranges: [number, number][] = [];
  let cursor = rangeMin;
  for (const cut of cuts) {
    if (cut - margin > cursor) {
      ranges.push([cursor, cut - margin]);
    }
    cursor = cut + margin;
  }
  if (rangeMax > cursor) {
    ranges.push([cursor, rangeMax]);
  }
  return ranges;
};

const buildPerimeterSegments = (
  roomW: number,
  roomD: number,
  partitions: Partition[],
): WallSegment[] => {
  const halfW = roomW / 2;
  const halfD = roomD / 2;
  const JUNCTION_MARGIN = WALL_THICKNESS + 0.5;
  const TOUCH_TOL = 1.0; // tolerance for "partition touches perimeter"

  const segments: WallSegment[] = [];

  // --- Back wall (z = -halfD, faces +Z, sweeps +X) ---
  // Vertical partitions connecting to back wall create junctions
  const backJunctions: number[] = [];
  for (const p of partitions) {
    const isV = p.size[2] > p.size[0];
    if (isV && p.position[2] - p.size[2] / 2 <= -halfD + TOUCH_TOL) {
      backJunctions.push(p.position[0]);
    }
  }
  const backMin = -halfW + CORNER_MARGIN;
  const backMax = halfW - CORNER_MARGIN;
  for (const [rMin, rMax] of splitAtJunctions(
    backMin,
    backMax,
    backJunctions,
    JUNCTION_MARGIN,
  )) {
    const usable = rMax - rMin;
    if (usable < 2) continue;
    segments.push({
      origin: [rMin, 0, -halfD + 0.1],
      normal: [0, 0, 1],
      rotation: [0, 0, 0],
      width: usable,
      reserved: 0,
      used: 0,
    });
  }

  // --- Left wall (x = -halfW, faces +X, sweeps -Z) ---
  // Horizontal partitions connecting to left wall create junctions
  const leftJunctions: number[] = [];
  for (const p of partitions) {
    const isH = p.size[0] > p.size[2];
    if (isH && p.position[0] - p.size[0] / 2 <= -halfW + TOUCH_TOL) {
      leftJunctions.push(p.position[2]);
    }
  }
  const leftMin = -halfD + CORNER_MARGIN;
  const leftMax = halfD - CORNER_MARGIN;
  for (const [rMin, rMax] of splitAtJunctions(
    leftMin,
    leftMax,
    leftJunctions,
    JUNCTION_MARGIN,
  )) {
    const usable = rMax - rMin;
    if (usable < 2) continue;
    // Origin at +Z end of range (sweep goes -Z)
    segments.push({
      origin: [-halfW + 0.1, 0, rMax],
      normal: [1, 0, 0],
      rotation: [0, Math.PI / 2, 0],
      width: usable,
      reserved: 0,
      used: 0,
    });
  }

  // --- Right wall (x = +halfW, faces -X, sweeps +Z) ---
  // Horizontal partitions connecting to right wall create junctions
  const rightJunctions: number[] = [];
  for (const p of partitions) {
    const isH = p.size[0] > p.size[2];
    if (isH && p.position[0] + p.size[0] / 2 >= halfW - TOUCH_TOL) {
      rightJunctions.push(p.position[2]);
    }
  }
  const rightMin = -halfD + CORNER_MARGIN;
  const rightMax = halfD - CORNER_MARGIN;
  for (const [rMin, rMax] of splitAtJunctions(
    rightMin,
    rightMax,
    rightJunctions,
    JUNCTION_MARGIN,
  )) {
    const usable = rMax - rMin;
    if (usable < 2) continue;
    // Origin at -Z end of range (sweep goes +Z)
    segments.push({
      origin: [halfW - 0.1, 0, rMin],
      normal: [-1, 0, 0],
      rotation: [0, -Math.PI / 2, 0],
      width: usable,
      reserved: 0,
      used: 0,
    });
  }

  // Front wall: no art segments — reserved entirely for welcome text
  return segments;
};

const buildPartitionSegments = (partitions: Partition[]): WallSegment[] => {
  const segments: WallSegment[] = [];
  // Margin around junction points where art must not be placed.
  // Accounts for connecting wall half-thickness plus visual clearance.
  const JUNCTION_MARGIN = WALL_THICKNESS + 0.5;
  const EDGE_MARGIN = 1; // trim from each end of a partition face

  for (let i = 0; i < partitions.length; i++) {
    const p = partitions[i];
    const [px, py, pz] = p.position;
    const [sx, , sz] = p.size;
    const isHorizontal = sx > sz;

    // Find where perpendicular partitions intersect this one
    const junctions: number[] = [];
    for (let j = 0; j < partitions.length; j++) {
      if (i === j) continue;
      const o = partitions[j];
      const [opx, , opz] = o.position;
      const [osx, , osz] = o.size;
      const oIsHorizontal = osx > osz;

      if (isHorizontal && !oIsHorizontal) {
        // This horizontal, other vertical — check X overlap and Z proximity
        if (
          opx >= px - sx / 2 &&
          opx <= px + sx / 2 &&
          opz - osz / 2 <= pz + sz / 2 &&
          opz + osz / 2 >= pz - sz / 2
        ) {
          junctions.push(opx); // junction along X axis
        }
      } else if (!isHorizontal && oIsHorizontal) {
        // This vertical, other horizontal — check Z overlap and X proximity
        if (
          opz >= pz - sz / 2 &&
          opz <= pz + sz / 2 &&
          opx - osx / 2 <= px + sx / 2 &&
          opx + osx / 2 >= px - sx / 2
        ) {
          junctions.push(opz); // junction along Z axis
        }
      }
    }

    if (isHorizontal) {
      const segMin = px - sx / 2 + EDGE_MARGIN;
      const segMax = px + sx / 2 - EDGE_MARGIN;

      for (const [rMin, rMax] of splitAtJunctions(
        segMin,
        segMax,
        junctions,
        JUNCTION_MARGIN,
      )) {
        const usable = rMax - rMin;
        if (usable < 2) continue;
        // Front face (faces +Z)
        segments.push({
          origin: [rMin, py, pz + WALL_THICKNESS / 2 + 0.1],
          normal: [0, 0, 1],
          rotation: [0, 0, 0],
          width: usable,
          reserved: 0,
          used: 0,
        });
        // Back face (faces -Z)
        segments.push({
          origin: [rMax, py, pz - WALL_THICKNESS / 2 - 0.1],
          normal: [0, 0, -1],
          rotation: [0, Math.PI, 0],
          width: usable,
          reserved: 0,
          used: 0,
        });
      }
    } else {
      const segMin = pz - sz / 2 + EDGE_MARGIN;
      const segMax = pz + sz / 2 - EDGE_MARGIN;

      for (const [rMin, rMax] of splitAtJunctions(
        segMin,
        segMax,
        junctions,
        JUNCTION_MARGIN,
      )) {
        const usable = rMax - rMin;
        if (usable < 2) continue;
        // Right face (faces +X) — sweep from +Z to -Z
        segments.push({
          origin: [px + WALL_THICKNESS / 2 + 0.1, py, rMax],
          normal: [1, 0, 0],
          rotation: [0, Math.PI / 2, 0],
          width: usable,
          reserved: 0,
          used: 0,
        });
        // Left face (faces -X) — sweep from -Z to +Z
        segments.push({
          origin: [px - WALL_THICKNESS / 2 - 0.1, py, rMin],
          normal: [-1, 0, 0],
          rotation: [0, -Math.PI / 2, 0],
          width: usable,
          reserved: 0,
          used: 0,
        });
      }
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
        imageUrl: art.imageUrl,
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
  const perimeterSegments = buildPerimeterSegments(
    roomWidth,
    roomDepth,
    partitions,
  );
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
