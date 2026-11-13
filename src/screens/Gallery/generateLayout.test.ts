import { describe, expect, it } from 'bun:test';

import {
  type GalleryLayout,
  type ImageSpec,
  generateGalleryLayout,
} from './generateLayout';

const PLAYER_RADIUS = 0.5;
const CELL = 0.5;
const VIEWING_DISTANCE = 2;

const soloImages = (count: number): ImageSpec[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `image-${i}`,
    orientation: i % 3 === 0 ? 'portrait' : 'landscape',
  }));

const groupedImages = (count: number): ImageSpec[] =>
  soloImages(count).map((image, i) => ({
    ...image,
    aspectRatio: i % 3 === 0 ? 2 / 3 : 3 / 2,
    groupId: i % 5 < 2 ? `group-${Math.floor(i / 5)}` : undefined,
    groupLayout: i % 10 < 5 ? 'row' : 'column',
  }));

const wideRowGroup = (members: number): ImageSpec[] =>
  Array.from({ length: members }, (_, i) => ({
    id: `img-2-${i}`,
    orientation: 'landscape',
    aspectRatio: 1.5,
    groupId: 'group-2',
    groupLayout: 'row',
  }));

const spawnIsBlocked = (layout: GalleryLayout) => {
  const [x, , z] = layout.spawnPosition;
  return layout.colliders.some(
    box =>
      x + PLAYER_RADIUS > box.minX &&
      x - PLAYER_RADIUS < box.maxX &&
      z + PLAYER_RADIUS > box.minZ &&
      z - PLAYER_RADIUS < box.maxZ,
  );
};

const placementCount = (images: ImageSpec[]) =>
  images.filter(image => !image.groupId).length +
  new Set(images.flatMap(image => image.groupId ?? [])).size;

const reachableCells = (layout: GalleryLayout) => {
  const half = layout.roomWidth / 2;
  const size = Math.round(layout.roomWidth / CELL) + 1;
  const toCell = (v: number) => Math.round((v + half) / CELL);
  const isOpen = (cx: number, cz: number) => {
    const x = cx * CELL - half;
    const z = cz * CELL - half;
    if (Math.abs(x) > half - PLAYER_RADIUS) return false;
    if (Math.abs(z) > half - PLAYER_RADIUS) return false;
    return !layout.colliders.some(
      box =>
        x + PLAYER_RADIUS > box.minX &&
        x - PLAYER_RADIUS < box.maxX &&
        z + PLAYER_RADIUS > box.minZ &&
        z - PLAYER_RADIUS < box.maxZ,
    );
  };

  const seen = new Set<number>();
  const start: [number, number] = [
    toCell(layout.spawnPosition[0]),
    toCell(layout.spawnPosition[2]),
  ];
  const queue = [start];
  seen.add(start[0] * size + start[1]);
  while (queue.length > 0) {
    const [cx, cz] = queue.pop()!;
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = cx + dx;
      const nz = cz + dz;
      const key = nx * size + nz;
      if (seen.has(key) || !isOpen(nx, nz)) continue;
      seen.add(key);
      queue.push([nx, nz]);
    }
  }
  return {
    has: (x: number, z: number) => seen.has(toCell(x) * size + toCell(z)),
  };
};

const unreachablePieces = (layout: GalleryLayout) => {
  const reachable = reachableCells(layout);
  return layout.artPieces.filter(piece => {
    const yRot = piece.rotation[1];
    return !reachable.has(
      piece.position[0] + Math.sin(yRot) * VIEWING_DISTANCE,
      piece.position[2] + Math.cos(yRot) * VIEWING_DISTANCE,
    );
  });
};

describe('generateGalleryLayout', () => {
  it('places every solo image for galleries of 1 to 150 images', () => {
    for (let count = 1; count <= 150; count++) {
      const layout = generateGalleryLayout(soloImages(count));
      expect([count, layout.artPieces.length]).toEqual([count, count]);
    }
  });

  it('places every solo image and group in mixed galleries', () => {
    for (let count = 1; count <= 80; count++) {
      const images = groupedImages(count);
      const layout = generateGalleryLayout(images);
      expect([count, layout.artPieces.length]).toEqual([
        count,
        placementCount(images),
      ]);
    }
  });

  it('keeps every piece reachable from the spawn point', () => {
    for (let count = 1; count <= 150; count++) {
      const layout = generateGalleryLayout(soloImages(count));
      expect([count, unreachablePieces(layout).length]).toEqual([count, 0]);
    }
    for (let count = 1; count <= 80; count++) {
      const layout = generateGalleryLayout(groupedImages(count));
      expect([count, unreachablePieces(layout).length]).toEqual([count, 0]);
    }
  });

  it('never spawns the player inside a collider', () => {
    for (let count = 1; count <= 150; count++) {
      const layout = generateGalleryLayout(soloImages(count));
      expect([count, spawnIsBlocked(layout)]).toEqual([count, false]);
    }
    for (let count = 1; count <= 80; count++) {
      const layout = generateGalleryLayout(groupedImages(count));
      expect([count, spawnIsBlocked(layout)]).toEqual([count, false]);
    }
  });

  it('fits a group wider than the initial room without blocking spawn', () => {
    for (let members = 2; members <= 6; members++) {
      const layout = generateGalleryLayout(wideRowGroup(members));
      expect([members, layout.artPieces.length]).toEqual([members, 1]);
      expect([members, spawnIsBlocked(layout)]).toEqual([members, false]);
      expect([members, unreachablePieces(layout).length]).toEqual([members, 0]);
    }
  });
});
