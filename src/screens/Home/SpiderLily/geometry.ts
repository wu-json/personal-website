import earcut from 'earcut';

import { CX, CY } from './motion';

const W = 4;

export type PetalData = {
  d: string;
  delay: number;
  cx: number;
  cy: number;
};

export const PETALS: PetalData[] = [
  {
    d: `M${CX - W} ${CY}
       C${CX - W - 2} ${CY - 38}, ${CX - W - 5} ${CY - 82}, ${CX - W - 4} ${CY - 122}
       C${CX - W - 3} ${CY - 144}, ${CX - 1} ${CY - 157}, ${CX - 1} ${CY - 160}
       C${CX} ${CY - 157}, ${CX + W} ${CY - 143}, ${CX + W - 1} ${CY - 124}
       C${CX + W} ${CY - 88}, ${CX + W + 2} ${CY - 42}, ${CX + W} ${CY} Z`,
    delay: 0,
    cx: CX,
    cy: CY - 80,
  },
  {
    d: `M${CX - W} ${CY}
       C${CX - W - 5} ${CY - 33}, ${CX - W - 16} ${CY - 75}, ${CX - W - 28} ${CY - 115}
       C${CX - W - 36} ${CY - 138}, ${CX - W - 23} ${CY - 153}, ${CX - W - 16} ${CY - 156}
       L${CX + W - 22} ${CY - 153}
       C${CX + W - 20} ${CY - 136}, ${CX + W - 17} ${CY - 108}, ${CX + W - 12} ${CY - 74}
       C${CX + W - 3} ${CY - 37}, ${CX + W + 1} ${CY - 12}, ${CX + W} ${CY} Z`,
    delay: 60,
    cx: CX - 20,
    cy: CY - 78,
  },
  {
    d: `M${CX + W} ${CY}
       C${CX + W + 8} ${CY - 34}, ${CX + W + 22} ${CY - 78}, ${CX + W + 36} ${CY - 118}
       C${CX + W + 44} ${CY - 141}, ${CX + W + 30} ${CY - 155}, ${CX + W + 23} ${CY - 157}
       L${CX - W + 29} ${CY - 153}
       C${CX - W + 27} ${CY - 139}, ${CX - W + 23} ${CY - 113}, ${CX - W + 19} ${CY - 76}
       C${CX - W + 7} ${CY - 38}, ${CX - W + 1} ${CY - 11}, ${CX - W} ${CY} Z`,
    delay: 100,
    cx: CX + 30,
    cy: CY - 78,
  },
  {
    d: `M${CX - W} ${CY}
       C${CX - W - 13} ${CY - 24}, ${CX - W - 36} ${CY - 58}, ${CX - W - 60} ${CY - 95}
       C${CX - W - 76} ${CY - 120}, ${CX - W - 63} ${CY - 139}, ${CX - W - 54} ${CY - 143}
       L${CX + W - 60} ${CY - 140}
       C${CX + W - 57} ${CY - 120}, ${CX + W - 48} ${CY - 92}, ${CX + W - 33} ${CY - 58}
       C${CX + W - 11} ${CY - 25}, ${CX + W + 1} ${CY - 9}, ${CX + W} ${CY} Z`,
    delay: 140,
    cx: CX - 50,
    cy: CY - 70,
  },
  {
    d: `M${CX + W} ${CY}
       C${CX + W + 17} ${CY - 27}, ${CX + W + 44} ${CY - 63}, ${CX + W + 68} ${CY - 98}
       C${CX + W + 84} ${CY - 123}, ${CX + W + 70} ${CY - 141}, ${CX + W + 62} ${CY - 145}
       L${CX - W + 68} ${CY - 142}
       C${CX - W + 64} ${CY - 123}, ${CX - W + 56} ${CY - 96}, ${CX - W + 40} ${CY - 61}
       C${CX - W + 15} ${CY - 27}, ${CX - W + 1} ${CY - 9}, ${CX - W} ${CY} Z`,
    delay: 180,
    cx: CX + 60,
    cy: CY - 70,
  },
  {
    d: `M${CX - W} ${CY}
       C${CX - W - 19} ${CY - 16}, ${CX - W - 52} ${CY - 39}, ${CX - W - 85} ${CY - 63}
       C${CX - W - 106} ${CY - 80}, ${CX - W - 98} ${CY - 100}, ${CX - W - 92} ${CY - 104}
       L${CX + W - 97} ${CY - 100}
       C${CX + W - 93} ${CY - 83}, ${CX + W - 80} ${CY - 60}, ${CX + W - 48} ${CY - 38}
       C${CX + W - 17} ${CY - 17}, ${CX + W + 1} ${CY - 5}, ${CX + W} ${CY} Z`,
    delay: 220,
    cx: CX - 80,
    cy: CY - 50,
  },
  {
    d: `M${CX + W} ${CY}
       C${CX + W + 24} ${CY - 19}, ${CX + W + 60} ${CY - 43}, ${CX + W + 94} ${CY - 67}
       C${CX + W + 114} ${CY - 83}, ${CX + W + 106} ${CY - 103}, ${CX + W + 101} ${CY - 107}
       L${CX - W + 106} ${CY - 103}
       C${CX - W + 102} ${CY - 87}, ${CX - W + 88} ${CY - 64}, ${CX - W + 56} ${CY - 41}
       C${CX - W + 22} ${CY - 19}, ${CX - W + 1} ${CY - 6}, ${CX - W} ${CY} Z`,
    delay: 250,
    cx: CX + 90,
    cy: CY - 50,
  },
  {
    d: `M${CX} ${CY - W}
       C${CX - 26} ${CY - W - 3}, ${CX - 68} ${CY - W - 8}, ${CX - 112} ${CY - W - 10}
       C${CX - 140} ${CY - W - 11}, ${CX - 154} ${CY - 20}, ${CX - 157} ${CY - 27}
       L${CX - 154} ${CY + W - 21}
       C${CX - 140} ${CY + W - 11}, ${CX - 108} ${CY + W - 4}, ${CX - 70} ${CY + W}
       C${CX - 30} ${CY + W + 2}, ${CX} ${CY + W}, ${CX} ${CY + W} Z`,
    delay: 40,
    cx: CX - 100,
    cy: CY - 14,
  },
  {
    d: `M${CX} ${CY - W}
       C${CX + 32} ${CY - W - 6}, ${CX + 78} ${CY - W - 13}, ${CX + 122} ${CY - W - 16}
       C${CX + 150} ${CY - W - 15}, ${CX + 164} ${CY - 25}, ${CX + 166} ${CY - 32}
       L${CX + 163} ${CY + W - 26}
       C${CX + 150} ${CY + W - 14}, ${CX + 120} ${CY + W - 9}, ${CX + 78} ${CY + W - 4}
       C${CX + 32} ${CY + W - 2}, ${CX} ${CY + W}, ${CX} ${CY + W} Z`,
    delay: 80,
    cx: CX + 110,
    cy: CY - 14,
  },
  {
    d: `M${CX} ${CY + W}
       C${CX - 33} ${CY + W + 4}, ${CX - 68} ${CY + W + 16}, ${CX - 84} ${CY + W + 38}
       C${CX - 96} ${CY + W + 57}, ${CX - 90} ${CY + W + 78}, ${CX - 70} ${CY + 87}
       C${CX - 84} ${CY + 73}, ${CX - 89} ${CY + 53}, ${CX - 79} ${CY + 36}
       C${CX - 66} ${CY + 17}, ${CX - 34} ${CY + 5}, ${CX} ${CY - W} Z`,
    delay: 280,
    cx: CX - 60,
    cy: CY + 50,
  },
  {
    d: `M${CX} ${CY + W}
       C${CX + 36} ${CY + W + 5}, ${CX + 70} ${CY + W + 19}, ${CX + 86} ${CY + W + 40}
       C${CX + 97} ${CY + W + 59}, ${CX + 91} ${CY + W + 79}, ${CX + 70} ${CY + 86}
       C${CX + 85} ${CY + 72}, ${CX + 90} ${CY + 52}, ${CX + 80} ${CY + 35}
       C${CX + 66} ${CY + 17}, ${CX + 33} ${CY + 4}, ${CX} ${CY - W} Z`,
    delay: 320,
    cx: CX + 65,
    cy: CY + 50,
  },
  {
    d: `M${CX} ${CY + W}
       C${CX - 18} ${CY + W + 5}, ${CX - 40} ${CY + W + 18}, ${CX - 50} ${CY + W + 36}
       C${CX - 57} ${CY + W + 51}, ${CX - 51} ${CY + W + 67}, ${CX - 36} ${CY + 73}
       C${CX - 47} ${CY + 61}, ${CX - 51} ${CY + 45}, ${CX - 43} ${CY + 31}
       C${CX - 34} ${CY + 17}, ${CX - 17} ${CY + 5}, ${CX} ${CY - W} Z`,
    delay: 360,
    cx: CX - 30,
    cy: CY + 40,
  },
  {
    d: `M${CX} ${CY + W}
       C${CX + 24} ${CY + W + 7}, ${CX + 47} ${CY + W + 21}, ${CX + 57} ${CY + W + 39}
       C${CX + 64} ${CY + W + 54}, ${CX + 58} ${CY + W + 70}, ${CX + 43} ${CY + 77}
       C${CX + 54} ${CY + 65}, ${CX + 58} ${CY + 49}, ${CX + 50} ${CY + 35}
       C${CX + 42} ${CY + 21}, ${CX + 22} ${CY + 7}, ${CX} ${CY - W} Z`,
    delay: 400,
    cx: CX + 35,
    cy: CY + 40,
  },
];

export type StamenData = {
  d: string;
  tipX: number;
  tipY: number;
  delay: number;
  tipAngle: number;
  tipLen: number;
  tipW: number;
  cx: number;
  cy: number;
};

export const STAMENS: StamenData[] = [
  {
    d: `M${CX} ${CY - 12} C${CX - 160} ${CY - 12}, ${CX - 320} ${CY - 14}, ${CX - 340} ${CY - 115}`,
    tipX: CX - 340,
    tipY: CY - 115,
    delay: 0,
    tipAngle: -12,
    tipLen: 5.2,
    tipW: 2.4,
    cx: CX - 170,
    cy: CY - 60,
  },
  {
    d: `M${CX} ${CY - 12} C${CX - 145} ${CY - 14}, ${CX - 298} ${CY - 20}, ${CX - 315} ${CY - 135}`,
    tipX: CX - 315,
    tipY: CY - 135,
    delay: 40,
    tipAngle: -25,
    tipLen: 5.0,
    tipW: 2.5,
    cx: CX - 155,
    cy: CY - 72,
  },
  {
    d: `M${CX} ${CY - 12} C${CX - 125} ${CY - 16}, ${CX - 268} ${CY - 28}, ${CX - 285} ${CY - 155}`,
    tipX: CX - 285,
    tipY: CY - 155,
    delay: 80,
    tipAngle: -38,
    tipLen: 4.8,
    tipW: 2.4,
    cx: CX - 140,
    cy: CY - 82,
  },
  {
    d: `M${CX} ${CY - 12} C${CX - 100} ${CY - 20}, ${CX - 232} ${CY - 42}, ${CX - 252} ${CY - 170}`,
    tipX: CX - 252,
    tipY: CY - 170,
    delay: 120,
    tipAngle: -50,
    tipLen: 4.6,
    tipW: 2.6,
    cx: CX - 120,
    cy: CY - 90,
  },
  {
    d: `M${CX} ${CY - 12} C${CX + 158} ${CY - 12}, ${CX + 318} ${CY - 16}, ${CX + 338} ${CY - 118}`,
    tipX: CX + 338,
    tipY: CY - 118,
    delay: 20,
    tipAngle: 14,
    tipLen: 4.9,
    tipW: 2.5,
    cx: CX + 170,
    cy: CY - 62,
  },
  {
    d: `M${CX} ${CY - 12} C${CX + 142} ${CY - 15}, ${CX + 295} ${CY - 22}, ${CX + 312} ${CY - 138}`,
    tipX: CX + 312,
    tipY: CY - 138,
    delay: 60,
    tipAngle: 28,
    tipLen: 5.1,
    tipW: 2.4,
    cx: CX + 155,
    cy: CY - 74,
  },
  {
    d: `M${CX} ${CY - 12} C${CX + 122} ${CY - 18}, ${CX + 265} ${CY - 32}, ${CX + 282} ${CY - 158}`,
    tipX: CX + 282,
    tipY: CY - 158,
    delay: 100,
    tipAngle: 42,
    tipLen: 5.0,
    tipW: 2.2,
    cx: CX + 140,
    cy: CY - 84,
  },
  {
    d: `M${CX} ${CY - 12} C${CX + 98} ${CY - 22}, ${CX + 230} ${CY - 46}, ${CX + 248} ${CY - 172}`,
    tipX: CX + 248,
    tipY: CY - 172,
    delay: 140,
    tipAngle: 54,
    tipLen: 5.3,
    tipW: 2.3,
    cx: CX + 120,
    cy: CY - 92,
  },
  {
    d: `M${CX} ${CY - 12} C${CX - 55} ${CY - 48}, ${CX - 168} ${CY - 115}, ${CX - 185} ${CY - 178}`,
    tipX: CX - 185,
    tipY: CY - 178,
    delay: 200,
    tipAngle: -65,
    tipLen: 4.8,
    tipW: 2.4,
    cx: CX - 90,
    cy: CY - 95,
  },
  {
    d: `M${CX} ${CY - 12} C${CX + 52} ${CY - 50}, ${CX + 165} ${CY - 118}, ${CX + 182} ${CY - 175}`,
    tipX: CX + 182,
    tipY: CY - 175,
    delay: 240,
    tipAngle: 62,
    tipLen: 4.6,
    tipW: 2.6,
    cx: CX + 90,
    cy: CY - 95,
  },
  {
    d: `M${CX} ${CY - 12} C${CX - 30} ${CY - 62}, ${CX - 95} ${CY - 148}, ${CX - 90} ${CY - 190}`,
    tipX: CX - 90,
    tipY: CY - 190,
    delay: 280,
    tipAngle: -78,
    tipLen: 5.1,
    tipW: 2.2,
    cx: CX - 45,
    cy: CY - 100,
  },
  {
    d: `M${CX} ${CY - 12} C${CX + 28} ${CY - 64}, ${CX + 92} ${CY - 150}, ${CX + 88} ${CY - 188}`,
    tipX: CX + 88,
    tipY: CY - 188,
    delay: 320,
    tipAngle: 75,
    tipLen: 4.7,
    tipW: 2.5,
    cx: CX + 45,
    cy: CY - 100,
  },
];

export const STEM_D = `M${CX - 4} ${CY}
  C${CX - 3} ${CY + 30}, ${CX + 2} 275, ${CX + 4} 320
  C${CX + 6} 365, ${CX + 4} 410, ${CX + 1} 465
  C${CX + 6} 410, ${CX + 8} 365, ${CX + 10} 320
  C${CX + 8} 275, ${CX + 7} ${CY + 30}, ${CX + 6} ${CY}
  Z`;

export const STEM_TOP_Y = CY;
export const STEM_BOTTOM_Y = 465;

// === Stamen activation order (closest to center first), ported from
// SpiderLily.tsx so the entrance cascade timing is bit-for-bit identical.

const stamenDistances = STAMENS.map(s =>
  Math.sqrt((s.cx - CX) ** 2 + (s.cy - CY) ** 2),
);
const stamenActivationOrder = STAMENS.map((_, i) => i).sort(
  (a, b) => stamenDistances[a] - stamenDistances[b],
);
export const STAMEN_RANK = new Array<number>(STAMENS.length);
for (let rank = 0; rank < stamenActivationOrder.length; rank++) {
  STAMEN_RANK[stamenActivationOrder[rank]] = rank;
}

// === SVG d-string parser (supports M, L, C, Z only — all our paths use this subset)

type Pt = [number, number];

type Segment =
  | { kind: 'line'; p0: Pt; p1: Pt }
  | { kind: 'cubic'; p0: Pt; p1: Pt; p2: Pt; p3: Pt };

type ParsedPath = { segments: Segment[]; start: Pt; closed: boolean };

function parsePath(d: string): ParsedPath {
  const tokens =
    d
      .replace(/,/g, ' ')
      .match(/[a-zA-Z]|-?[0-9]*\.?[0-9]+(?:[eE][+-]?[0-9]+)?/g) ?? [];
  const segments: Segment[] = [];
  let i = 0;
  let cursor: Pt = [0, 0];
  let start: Pt = [0, 0];
  let closed = false;
  let cmd = '';
  const readNum = () => parseFloat(tokens[i++]);
  while (i < tokens.length) {
    const tok = tokens[i];
    if (/^[a-zA-Z]$/.test(tok)) {
      cmd = tok;
      i++;
      if (cmd === 'Z' || cmd === 'z') {
        closed = true;
        if (cursor[0] !== start[0] || cursor[1] !== start[1]) {
          segments.push({ kind: 'line', p0: cursor, p1: start });
        }
        cursor = start;
        continue;
      }
    }
    if (cmd === 'M' || cmd === 'm') {
      const p: Pt = [readNum(), readNum()];
      cursor = p;
      start = p;
      cmd = cmd === 'M' ? 'L' : 'l';
    } else if (cmd === 'L' || cmd === 'l') {
      const p: Pt = [readNum(), readNum()];
      segments.push({ kind: 'line', p0: cursor, p1: p });
      cursor = p;
    } else if (cmd === 'C' || cmd === 'c') {
      const p1: Pt = [readNum(), readNum()];
      const p2: Pt = [readNum(), readNum()];
      const p3: Pt = [readNum(), readNum()];
      segments.push({ kind: 'cubic', p0: cursor, p1, p2, p3 });
      cursor = p3;
    } else {
      i++;
    }
  }
  return { segments, start, closed };
}

const BEZIER_SAMPLES = 24;

function cubicAt(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  const uu = u * u;
  const uuu = uu * u;
  const tt = t * t;
  const ttt = tt * t;
  return [
    uuu * p0[0] + 3 * uu * t * p1[0] + 3 * u * tt * p2[0] + ttt * p3[0],
    uuu * p0[1] + 3 * uu * t * p1[1] + 3 * u * tt * p2[1] + ttt * p3[1],
  ];
}

function samplePath(parsed: ParsedPath): Pt[] {
  const out: Pt[] = [];
  if (parsed.segments.length === 0) return out;
  out.push(parsed.segments[0].p0);
  for (const seg of parsed.segments) {
    if (seg.kind === 'line') {
      out.push(seg.p1);
    } else {
      for (let s = 1; s <= BEZIER_SAMPLES; s++) {
        const t = s / BEZIER_SAMPLES;
        out.push(cubicAt(seg.p0, seg.p1, seg.p2, seg.p3, t));
      }
    }
  }
  return out;
}

// === Mesh outputs

export type Mesh = {
  vertices: Float32Array; // (x, y, arcLength) per vertex
  indices: Uint16Array;
};

export type PetalMesh = Mesh & { pivot: [number, number] };

function buildFilled(pts: Pt[]): Mesh {
  // Drop the duplicate closing vertex if the closing segment brought us back to start.
  let n = pts.length;
  if (n > 1 && pts[0][0] === pts[n - 1][0] && pts[0][1] === pts[n - 1][1]) {
    n--;
  }
  const flat = new Float64Array(n * 2);
  for (let i = 0; i < n; i++) {
    flat[i * 2] = pts[i][0];
    flat[i * 2 + 1] = pts[i][1];
  }
  const tris = earcut(Array.from(flat));
  const vertices = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    vertices[i * 3] = pts[i][0];
    vertices[i * 3 + 1] = pts[i][1];
    vertices[i * 3 + 2] = 0;
  }
  return { vertices, indices: new Uint16Array(tris) };
}

function buildStroke(pts: Pt[], halfWidth: number): Mesh {
  const n = pts.length;
  const arcLen = new Float32Array(n);
  let total = 0;
  for (let i = 1; i < n; i++) {
    const dx = pts[i][0] - pts[i - 1][0];
    const dy = pts[i][1] - pts[i - 1][1];
    total += Math.sqrt(dx * dx + dy * dy);
    arcLen[i] = total;
  }
  if (total > 0) for (let i = 0; i < n; i++) arcLen[i] /= total;

  const vertices = new Float32Array(n * 2 * 3);
  for (let i = 0; i < n; i++) {
    let nx = 0;
    let ny = 0;
    if (i > 0) {
      const dx = pts[i][0] - pts[i - 1][0];
      const dy = pts[i][1] - pts[i - 1][1];
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      nx += -dy / len;
      ny += dx / len;
    }
    if (i < n - 1) {
      const dx = pts[i + 1][0] - pts[i][0];
      const dy = pts[i + 1][1] - pts[i][1];
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      nx += -dy / len;
      ny += dx / len;
    }
    const nlen = Math.sqrt(nx * nx + ny * ny) || 1;
    nx /= nlen;
    ny /= nlen;
    // Left
    vertices[i * 6 + 0] = pts[i][0] + nx * halfWidth;
    vertices[i * 6 + 1] = pts[i][1] + ny * halfWidth;
    vertices[i * 6 + 2] = arcLen[i];
    // Right
    vertices[i * 6 + 3] = pts[i][0] - nx * halfWidth;
    vertices[i * 6 + 4] = pts[i][1] - ny * halfWidth;
    vertices[i * 6 + 5] = arcLen[i];
  }

  const indices = new Uint16Array((n - 1) * 6);
  for (let i = 0; i < n - 1; i++) {
    const i0 = i * 2;
    const i1 = i * 2 + 1;
    const i2 = (i + 1) * 2;
    const i3 = (i + 1) * 2 + 1;
    indices[i * 6 + 0] = i0;
    indices[i * 6 + 1] = i1;
    indices[i * 6 + 2] = i2;
    indices[i * 6 + 3] = i2;
    indices[i * 6 + 4] = i1;
    indices[i * 6 + 5] = i3;
  }

  return { vertices, indices };
}

function buildEllipseFan(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  angleDeg: number,
  segments: number,
): Mesh {
  const rad = (angleDeg * Math.PI) / 180;
  const cosR = Math.cos(rad);
  const sinR = Math.sin(rad);
  const vertices = new Float32Array((segments + 1) * 3);
  vertices[0] = cx;
  vertices[1] = cy;
  vertices[2] = 0;
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * 2 * Math.PI;
    const lx = Math.cos(a) * rx;
    const ly = Math.sin(a) * ry;
    vertices[(i + 1) * 3 + 0] = cx + lx * cosR - ly * sinR;
    vertices[(i + 1) * 3 + 1] = cy + lx * sinR + ly * cosR;
    vertices[(i + 1) * 3 + 2] = 0;
  }
  const indices = new Uint16Array(segments * 3);
  for (let i = 0; i < segments; i++) {
    indices[i * 3 + 0] = 0;
    indices[i * 3 + 1] = i + 1;
    indices[i * 3 + 2] = ((i + 1) % segments) + 1;
  }
  return { vertices, indices };
}

export const STAMEN_HALF_WIDTH = 0.4;
const ANTHER_SEGMENTS = 16;
const CENTER_SEGMENTS = 16;
const CENTER_RADIUS = 3;

export const PETAL_MESHES: PetalMesh[] = PETALS.map(p => {
  const mesh = buildFilled(samplePath(parsePath(p.d)));
  return { ...mesh, pivot: [p.cx, p.cy] };
});

// Sampled centerline points per stamen — kept around so the renderer can
// rebuild stamen stroke meshes at a wider half-width on small/low-DPR
// canvases, where the default 0.4 viewBox-unit half-width is sub-device-pixel
// and MSAA-4x produces such low coverage that the line goes nearly
// transparent (invisible against light-mode white; barely off against
// dark-mode black, which is why the bug is mobile + light only).
const STAMEN_POINTS: Pt[][] = STAMENS.map(s => samplePath(parsePath(s.d)));

export function buildStamenMeshes(halfWidth: number): Mesh[] {
  return STAMEN_POINTS.map(pts => buildStroke(pts, halfWidth));
}

export const STAMEN_MESHES: Mesh[] = buildStamenMeshes(STAMEN_HALF_WIDTH);

export const ANTHER_MESHES: Mesh[] = STAMENS.map(s =>
  buildEllipseFan(
    s.tipX,
    s.tipY,
    s.tipLen,
    s.tipW,
    s.tipAngle,
    ANTHER_SEGMENTS,
  ),
);

export const STEM_MESH: Mesh = buildFilled(samplePath(parsePath(STEM_D)));

export const CENTER_MESH: Mesh = buildEllipseFan(
  CX,
  CY,
  CENTER_RADIUS,
  CENTER_RADIUS,
  0,
  CENTER_SEGMENTS,
);
