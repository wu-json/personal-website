export type ImageSpec = {
  id: string;
  orientation: 'portrait' | 'landscape';
  aspectRatio?: number;
  imageUrl?: string;
  label?: string;
  groupId?: string;
  groupLayout?: 'row' | 'column';
  groupCaption?: string;
};

export type AABB = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export type ArtPieceChild = {
  offset: [number, number];
  size: [number, number];
  imageUrl?: string;
};

export type ArtPiece = {
  position: [number, number, number];
  size: [number, number];
  rotation: [number, number, number];
  title: string;
  imageUrl?: string;
  childPieces?: ArtPieceChild[];
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

const deterministicHash = (str: string): number => {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) & 0x7fffffff;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x45d9f3b) & 0x7fffffff;
  h ^= h >>> 16;
  return h;
};

const hashFloat = (h: number, min: number, max: number): number =>
  min + ((h & 0xffff) / 0xffff) * (max - min);

type WallSegment = {
  origin: [number, number, number];
  normal: [number, number, number];
  rotation: [number, number, number];
  width: number;
  reserved: number;
  used: number;
};

const WALL_THICKNESS = 0.8;
const CORNER_MARGIN = 2;
const ART_PADDING = 2.5;
const GROUP_GAP = 0.3;
const WELCOME_CENTER_X = 3;

const computeRoomHeight = (roomSize: number): number => {
  const h = Math.max(10, Math.min(16, 10 + ((roomSize - 20) * 6) / 40));
  return Math.round(h * 2) / 2;
};

const computeArtSize = (spec: ImageSpec): { width: number; height: number } => {
  const h = deterministicHash(spec.id);
  const tierVal = (h >>> 16) % 100;
  const tier = tierVal < 30 ? 0 : tierVal < 70 ? 1 : 2;

  if (spec.aspectRatio != null) {
    const ar = spec.aspectRatio;
    if (ar > 1) {
      const width =
        tier === 0
          ? hashFloat(h, 3, 4.5)
          : tier === 1
            ? hashFloat(h, 5, 7)
            : hashFloat(h, 8, 11);
      return { width, height: width / ar };
    }
    const height =
      tier === 0
        ? hashFloat(h, 3, 4)
        : tier === 1
          ? hashFloat(h, 4.5, 6)
          : hashFloat(h, 6.5, 8.5);
    return { width: height * ar, height };
  }

  if (spec.orientation === 'landscape') {
    const aspect = 1.4 + hashFloat(h >>> 4, 0, 0.4);
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

  const aspect = 0.6 + hashFloat(h >>> 4, 0, 0.14);
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

const computeRoomSize = (
  images: ImageSpec[],
): { roomSize: number; roomHeight: number; partitionCount: number } => {
  const artSizes = images.map(computeArtSize);
  const totalDemand = artSizes.reduce(
    (sum, a) => sum + a.width + ART_PADDING,
    0,
  );
  const targetSupply = totalDemand * 1.1;

  let roomSize = Math.max(20, Math.ceil(Math.sqrt(totalDemand * 12)));
  if (roomSize % 2 !== 0) roomSize++;
  roomSize = Math.min(120, roomSize);

  const roomHeight = computeRoomHeight(roomSize);

  const perimeterSupply = 2 * roomSize + roomSize - 3 * CORNER_MARGIN * 2;
  const deficit = targetSupply - perimeterSupply;
  const surfacePerPartition = roomSize * 0.4;
  const partitionCount =
    deficit > 0 ? Math.ceil(deficit / surfacePerPartition) : 0;

  return { roomSize, roomHeight, partitionCount };
};

const generatePartitions = (
  count: number,
  roomW: number,
  roomD: number,
  partitionHeight: number,
): Partition[] => {
  if (count === 0) return [];

  const halfW = roomW / 2;
  const halfD = roomD / 2;

  const J = WALL_THICKNESS;

  if (count <= 2) {
    const backZ = -halfD * 0.35;
    const hWidth = roomW * 0.45;
    const hEdge = hWidth / 2;
    const p: Partition[] = [
      {
        position: [0, 0, backZ],
        size: [hWidth, partitionHeight, WALL_THICKNESS],
      },
    ];
    if (count >= 2) {
      const wingD = roomD * 0.3;
      p.push({
        position: [hEdge, 0, backZ + (wingD + J) / 2 - J / 2],
        size: [WALL_THICKNESS, partitionHeight, wingD + J],
      });
    }
    return mergeClosePartitions(snapToPerimeter(p, roomW, roomD));
  }

  if (count <= 4) {
    const backZ = -halfD * 0.35;
    const hWidth = roomW * 0.45;
    const hEdge = hWidth / 2;
    const wingD = roomD * 0.3;
    const wing2D = roomD * 0.25;
    const p: Partition[] = [
      {
        position: [0, 0, backZ],
        size: [hWidth, partitionHeight, WALL_THICKNESS],
      },
      {
        position: [hEdge, 0, backZ + (wingD + J) / 2 - J / 2],
        size: [WALL_THICKNESS, partitionHeight, wingD + J],
      },
      {
        position: [-hEdge, 0, backZ - (wing2D + J) / 2 + J / 2],
        size: [WALL_THICKNESS, partitionHeight, wing2D + J],
      },
    ];
    if (count >= 4) {
      p.push({
        position: [-halfW * 0.15, 0, halfD * 0.35],
        size: [roomW * 0.35, partitionHeight, WALL_THICKNESS],
      });
    }
    return mergeClosePartitions(snapToPerimeter(p, roomW, roomD));
  }

  if (count <= 7) {
    const backZ = -halfD * 0.35;
    const archGap = roomW * 0.12;
    const archW = roomW * 0.22;
    const p: Partition[] = [
      {
        position: [-(archGap / 2 + archW / 2), 0, backZ],
        size: [archW, partitionHeight, WALL_THICKNESS],
      },
      {
        position: [archGap / 2 + archW / 2, 0, backZ],
        size: [archW, partitionHeight, WALL_THICKNESS],
      },
      {
        position: [
          -(archGap / 2 + archW),
          0,
          backZ - (roomD * 0.2 + J) / 2 + J / 2,
        ],
        size: [WALL_THICKNESS, partitionHeight, roomD * 0.2 + J],
      },
      {
        position: [
          archGap / 2 + archW,
          0,
          backZ + (roomD * 0.25 + J) / 2 - J / 2,
        ],
        size: [WALL_THICKNESS, partitionHeight, roomD * 0.25 + J],
      },
      {
        position: [halfW * 0.1, 0, halfD * 0.35],
        size: [roomW * 0.35, partitionHeight, WALL_THICKNESS],
      },
    ];
    if (count >= 6) {
      p.push({
        position: [-halfW * 0.3, 0, halfD * 0.05],
        size: [roomW * 0.2, partitionHeight, WALL_THICKNESS],
      });
    }
    if (count >= 7) {
      p.push({
        position: [halfW * 0.35, 0, -halfD * 0.02],
        size: [roomW * 0.2, partitionHeight, WALL_THICKNESS],
      });
    }
    return mergeClosePartitions(snapToPerimeter(p, roomW, roomD));
  }

  const p: Partition[] = [
    {
      position: [0, 0, -halfD * 0.15],
      size: [roomW * 0.5, partitionHeight, WALL_THICKNESS],
    },
    {
      position: [-halfW * 0.1, 0, 0],
      size: [WALL_THICKNESS, partitionHeight, roomD * 0.5],
    },
    {
      position: [-halfW * 0.4, 0, -halfD * 0.55],
      size: [roomW * 0.3, partitionHeight, WALL_THICKNESS],
    },
    {
      position: [halfW * 0.45, 0, -halfD * 0.45],
      size: [WALL_THICKNESS, partitionHeight, roomD * 0.25],
    },
    {
      position: [halfW * 0.35, 0, halfD * 0.45],
      size: [roomW * 0.3, partitionHeight, WALL_THICKNESS],
    },
    {
      position: [-halfW * 0.45, 0, halfD * 0.35],
      size: [WALL_THICKNESS, partitionHeight, roomD * 0.25],
    },
  ];

  return mergeClosePartitions(snapToPerimeter(p.slice(0, count), roomW, roomD));
};

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

const mergeClosePartitions = (partitions: Partition[]): Partition[] => {
  const COLLINEAR_TOL = WALL_THICKNESS * 2;
  const MERGE_GAP = 3;
  const MIN_PARALLEL_DIST = 8;

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
        if (aH !== bH) continue;

        if (aH) {
          const dist = Math.abs(a.position[2] - b.position[2]);

          if (dist <= COLLINEAR_TOL) {
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
            out.splice(a.size[0] <= b.size[0] ? i : j, 1);
            changed = true;
            break outer;
          }
        } else {
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
  const TOUCH_TOL = 1.0;

  const segments: WallSegment[] = [];

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
    segments.push({
      origin: [-halfW + 0.1, 0, rMax],
      normal: [1, 0, 0],
      rotation: [0, Math.PI / 2, 0],
      width: usable,
      reserved: 0,
      used: 0,
    });
  }

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
    segments.push({
      origin: [halfW - 0.1, 0, rMin],
      normal: [-1, 0, 0],
      rotation: [0, -Math.PI / 2, 0],
      width: usable,
      reserved: 0,
      used: 0,
    });
  }

  return segments;
};

const buildPartitionSegments = (partitions: Partition[]): WallSegment[] => {
  const segments: WallSegment[] = [];
  const JUNCTION_MARGIN = WALL_THICKNESS + 0.5;
  const EDGE_MARGIN = 1;

  for (let i = 0; i < partitions.length; i++) {
    const p = partitions[i];
    const [px, py, pz] = p.position;
    const [sx, , sz] = p.size;
    const isHorizontal = sx > sz;

    const junctions: number[] = [];
    for (let j = 0; j < partitions.length; j++) {
      if (i === j) continue;
      const o = partitions[j];
      const [opx, , opz] = o.position;
      const [osx, , osz] = o.size;
      const oIsHorizontal = osx > osz;

      if (isHorizontal && !oIsHorizontal) {
        if (
          opx >= px - sx / 2 &&
          opx <= px + sx / 2 &&
          opz - osz / 2 <= pz + sz / 2 &&
          opz + osz / 2 >= pz - sz / 2
        ) {
          junctions.push(opx);
        }
      } else if (!isHorizontal && oIsHorizontal) {
        if (
          opz >= pz - sz / 2 &&
          opz <= pz + sz / 2 &&
          opx - osx / 2 <= px + sx / 2 &&
          opx + osx / 2 >= px - sx / 2
        ) {
          junctions.push(opz);
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
        segments.push({
          origin: [rMin, py, pz + WALL_THICKNESS / 2 + 0.1],
          normal: [0, 0, 1],
          rotation: [0, 0, 0],
          width: usable,
          reserved: 0,
          used: 0,
        });
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
        segments.push({
          origin: [px + WALL_THICKNESS / 2 + 0.1, py, rMax],
          normal: [1, 0, 0],
          rotation: [0, Math.PI / 2, 0],
          width: usable,
          reserved: 0,
          used: 0,
        });
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

const localToWorld = (
  segment: WallSegment,
  offset: number,
  artWidth: number,
): [number, number, number] => {
  const [ox, oy, oz] = segment.origin;
  const [nx, , nz] = segment.normal;

  const rx = nz;
  const rz = -nx;

  const centerOffset = offset + artWidth / 2;
  return [ox + rx * centerOffset, oy, oz + rz * centerOffset];
};

type SizedImage = ImageSpec & { width: number; height: number };

type GroupMemberSize = { width: number; height: number };

type PlacementItem = {
  compositeWidth: number;
  compositeHeight: number;
  id: string;
} & (
  | { kind: 'solo'; spec: SizedImage }
  | {
      kind: 'group';
      layout: 'row' | 'column';
      members: SizedImage[];
      memberSizes: GroupMemberSize[];
      caption?: string;
    }
);

const computeGroupSizes = (
  groupId: string,
  layout: 'row' | 'column',
  members: ImageSpec[],
): {
  compositeWidth: number;
  compositeHeight: number;
  memberSizes: GroupMemberSize[];
} => {
  const ars = members.map(m => m.aspectRatio ?? 1);
  const h = deterministicHash(groupId);
  const memberSizes: GroupMemberSize[] = [];

  if (layout === 'row') {
    const sharedH = hashFloat(h, 5, 8);
    let totalW = 0;
    for (const ar of ars) {
      const w = sharedH * ar;
      memberSizes.push({ width: w, height: sharedH });
      totalW += w;
    }
    return {
      compositeWidth: totalW + GROUP_GAP * (members.length - 1),
      compositeHeight: sharedH,
      memberSizes,
    };
  }

  const sharedW = hashFloat(h, 5, 8);
  let totalH = 0;
  for (const ar of ars) {
    const height = sharedW / ar;
    memberSizes.push({ width: sharedW, height });
    totalH += height;
  }
  return {
    compositeWidth: sharedW,
    compositeHeight: totalH + GROUP_GAP * (members.length - 1),
    memberSizes,
  };
};

const distributeArt = (
  images: ImageSpec[],
  segments: WallSegment[],
): ArtPiece[] => {
  const sized: SizedImage[] = images.map(img => ({
    ...img,
    ...computeArtSize(img),
  }));

  const groupMap = new Map<string, SizedImage[]>();
  const solos: SizedImage[] = [];
  for (const item of sized) {
    if (item.groupId) {
      let arr = groupMap.get(item.groupId);
      if (!arr) {
        arr = [];
        groupMap.set(item.groupId, arr);
      }
      arr.push(item);
    } else {
      solos.push(item);
    }
  }

  const items: PlacementItem[] = [];

  for (const s of solos) {
    items.push({
      compositeWidth: s.width,
      compositeHeight: s.height,
      id: s.id,
      kind: 'solo',
      spec: s,
    });
  }

  for (const [groupId, members] of groupMap) {
    const layout = members[0]?.groupLayout ?? 'row';
    const caption = members[0]?.groupCaption;
    const { compositeWidth, compositeHeight, memberSizes } = computeGroupSizes(
      groupId,
      layout,
      members,
    );

    items.push({
      compositeWidth,
      compositeHeight,
      id: groupId,
      kind: 'group',
      layout,
      members,
      memberSizes,
      caption,
    });
  }

  const sorted = [...items].sort((a, b) => b.compositeWidth - a.compositeWidth);

  const pieces: ArtPiece[] = [];

  for (const item of sorted) {
    const needed = item.compositeWidth + ART_PADDING;

    let bestSeg: WallSegment | null = null;
    let bestAvail = -1;
    for (const seg of segments) {
      const available = seg.width - seg.reserved - seg.used;
      if (available >= needed && available > bestAvail) {
        bestSeg = seg;
        bestAvail = available;
      }
    }

    if (!bestSeg) {
      for (const seg of segments) {
        const available = seg.width - seg.reserved - seg.used;
        if (available >= item.compositeWidth + 1 && available > bestAvail) {
          bestSeg = seg;
          bestAvail = available;
        }
      }
    }

    if (bestSeg) {
      const pad = bestAvail >= needed ? ART_PADDING / 2 : 0.5;
      const pos = localToWorld(
        bestSeg,
        bestSeg.used + pad,
        item.compositeWidth,
      );
      const h = deterministicHash(item.id);
      pos[1] += hashFloat(h >>> 8, -0.5, 1);

      if (item.kind === 'solo') {
        pieces.push({
          position: pos,
          size: [item.compositeWidth, item.compositeHeight],
          rotation: bestSeg.rotation,
          title: (item.spec.label ?? item.spec.id).toUpperCase(),
          imageUrl: item.spec.imageUrl,
        });
      } else {
        const childPieces: ArtPieceChild[] = [];

        if (item.layout === 'row') {
          let offsetX = -item.compositeWidth / 2;
          for (let i = 0; i < item.members.length; i++) {
            const sz = item.memberSizes[i]!;
            childPieces.push({
              offset: [offsetX + sz.width / 2, 0],
              size: [sz.width, sz.height],
              imageUrl: item.members[i]!.imageUrl,
            });
            offsetX += sz.width + GROUP_GAP;
          }
        } else {
          let offsetY = item.compositeHeight / 2;
          for (let i = 0; i < item.members.length; i++) {
            const sz = item.memberSizes[i]!;
            childPieces.push({
              offset: [0, offsetY - sz.height / 2],
              size: [sz.width, sz.height],
              imageUrl: item.members[i]!.imageUrl,
            });
            offsetY -= sz.height + GROUP_GAP;
          }
        }

        const title = item.caption
          ? item.caption.toUpperCase()
          : item.members.map(m => (m.label ?? m.id).toUpperCase()).join(' / ');

        pieces.push({
          position: pos,
          size: [item.compositeWidth, item.compositeHeight],
          rotation: bestSeg.rotation,
          title,
          childPieces,
        });
      }

      bestSeg.used += bestAvail >= needed ? needed : item.compositeWidth + 1;
    }
  }

  return pieces;
};

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

export const generateGalleryLayout = (images: ImageSpec[]): GalleryLayout => {
  const { roomSize, roomHeight, partitionCount } = computeRoomSize(images);
  const roomWidth = roomSize;
  const roomDepth = roomSize;
  const halfW = roomWidth / 2;
  const halfD = roomDepth / 2;
  const halfH = roomHeight / 2;
  const partitionHeight = roomHeight - 0.4;

  const partitions = generatePartitions(
    partitionCount,
    roomWidth,
    roomDepth,
    partitionHeight,
  );

  const perimeterSegments = buildPerimeterSegments(
    roomWidth,
    roomDepth,
    partitions,
  );
  const partSegments = buildPartitionSegments(partitions);
  const allSegments = [...perimeterSegments, ...partSegments];

  const artPieces = distributeArt(images, allSegments);

  const colliders = partitionColliders(partitions);

  const benchPositions: Array<[number, number, number]> = [];
  if (roomSize >= 50) {
    benchPositions.push([0, 0, 0]);
    colliders.push({ minX: -3, maxX: 3, minZ: -0.9, maxZ: 0.9 });
  }

  const spawnZ = halfD - Math.min(10, halfD * 0.65);
  const spawnPosition: [number, number, number] = [WELCOME_CENTER_X, 0, spawnZ];
  const spawnLookAt: [number, number, number] = [WELCOME_CENTER_X, 0, halfD];

  const welcomePosition: [number, number, number] = [
    WELCOME_CENTER_X,
    0,
    halfD - 0.01,
  ];
  const welcomeRotation: [number, number, number] = [0, Math.PI, 0];

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
    roomHeight,
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
