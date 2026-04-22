import { useCallback, useEffect, useRef, useState } from 'react';
import { useTheme } from 'src/theme/ThemeContext';

/**
 * Side-view spider lily (彼岸花) — Japanese anime ink aesthetic.
 * Thin ribbon petals with tight spiral curls at the tips.
 * Dense, chaotic, overlapping. White on black.
 * Petals and stamens react to hover — gently parting like fingers through a flower.
 */

const CX = 220;
const CY = 230;

const W = 4;
const petals: { d: string; delay: number; cx: number; cy: number }[] = [
  // ==== UPPER DOME ====
  // Top center
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
  // Left ~18°
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
  // Right ~22°
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
  // Left ~40°
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
  // Right ~44°
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
  // Left ~60°
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
  // Right ~64°
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
  // Left ~78°
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
  // Right ~82°
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

  // ==== LOWER PETALS ====
  // Outer left "("
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
  // Outer right ")"
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
  // Inner left "("
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
  // Inner right ")"
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

const petalDelays = petals.map(p => p.delay);

const stamens: {
  d: string;
  tipX: number;
  tipY: number;
  delay: number;
  tipAngle: number;
  tipLen: number;
  tipW: number;
  noTip?: boolean;
  cx: number;
  cy: number;
}[] = [
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

const STEM_DELAY = 100;
const STEM_DURATION = 800;
const PETAL_DELAY = STEM_DELAY + STEM_DURATION;
const STAMEN_BASE_DELAY = PETAL_DELAY + 300;
const STAMEN_DURATION = 600;
const STAMEN_STAGGER = 50;

const stamenDistances = stamens.map(s =>
  Math.sqrt((s.cx - CX) ** 2 + (s.cy - CY) ** 2),
);
const stamenActivationOrder = stamens
  .map((_, i) => i)
  .sort((a, b) => stamenDistances[a] - stamenDistances[b]);
const stamenRank = new Array<number>(stamens.length);
for (let rank = 0; rank < stamenActivationOrder.length; rank++) {
  stamenRank[stamenActivationOrder[rank]] = rank;
}

const HOVER_RADIUS = 140;
const HOVER_STRENGTH = 8;
const LERP_SPEED = 0.045;
const RETURN_SPEED = 0.025;

const WIND_SPEED = 0.0008;
const WIND_STRENGTH_X = 4.5;
const WIND_STRENGTH_Y = 2.0;

const PRESS_RADIUS = 160;
const PRESS_STRENGTH = 20;

type Vec2 = { x: number; y: number };

const SpiderLily = ({ className }: { className?: string }) => {
  const { toggle } = useTheme();
  const [stemActive, setStemActive] = useState(false);
  const [petalsActive, setPetalsActive] = useState(false);
  const [activeStamens, setActiveStamens] = useState<boolean[]>(() =>
    stamens.map(() => false),
  );

  const svgRef = useRef<SVGSVGElement>(null);
  const mouseRef = useRef<{
    x: number;
    y: number;
    active: boolean;
    pressed: boolean;
  }>({ x: 0, y: 0, active: false, pressed: false });
  const petalOffsetsRef = useRef<Vec2[]>(petals.map(() => ({ x: 0, y: 0 })));
  const stamenOffsetsRef = useRef<Vec2[]>(stamens.map(() => ({ x: 0, y: 0 })));
  const petalElsRef = useRef<(SVGPathElement | null)[]>([]);
  const stamenGroupElsRef = useRef<(SVGGElement | null)[]>([]);
  const wholeFlowerRef = useRef<SVGGElement>(null);
  const leanRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStemActive(true), STEM_DELAY);
    const t2 = setTimeout(() => setPetalsActive(true), PETAL_DELAY);
    const stamenTimers = stamens.map((_, i) =>
      setTimeout(
        () => {
          setActiveStamens(prev => {
            const next = [...prev];
            next[i] = true;
            return next;
          });
        },
        STAMEN_BASE_DELAY + stamenRank[i] * STAMEN_STAGGER,
      ),
    );
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      for (const t of stamenTimers) clearTimeout(t);
    };
  }, []);

  const toSVGCoords = useCallback((clientX: number, clientY: number): Vec2 => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const svgPt = pt.matrixTransform(ctm.inverse());
    return { x: svgPt.x, y: svgPt.y };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const coords = toSVGCoords(e.clientX, e.clientY);
      mouseRef.current.x = coords.x;
      mouseRef.current.y = coords.y;
      mouseRef.current.active = true;
    },
    [toSVGCoords],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const coords = toSVGCoords(e.clientX, e.clientY);
      mouseRef.current.x = coords.x;
      mouseRef.current.y = coords.y;
      mouseRef.current.active = true;
      mouseRef.current.pressed = true;
    },
    [toSVGCoords],
  );

  const handleMouseUp = useCallback(() => {
    mouseRef.current.pressed = false;
  }, []);

  const handleMouseLeave = useCallback(() => {
    mouseRef.current.active = false;
    mouseRef.current.pressed = false;
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      const touch = e.touches[0];
      if (!touch) return;
      const coords = toSVGCoords(touch.clientX, touch.clientY);
      mouseRef.current.x = coords.x;
      mouseRef.current.y = coords.y;
      mouseRef.current.active = true;
      mouseRef.current.pressed = true;
    },
    [toSVGCoords],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      const touch = e.touches[0];
      if (!touch) return;
      const coords = toSVGCoords(touch.clientX, touch.clientY);
      mouseRef.current.x = coords.x;
      mouseRef.current.y = coords.y;
      mouseRef.current.active = true;
    },
    [toSVGCoords],
  );

  const handleTouchEnd = useCallback(() => {
    mouseRef.current.active = false;
    mouseRef.current.pressed = false;
  }, []);

  const handleClick = useCallback(() => {
    toggle();
  }, [toggle]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<SVGSVGElement>) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      toggle();
    },
    [toggle],
  );

  useEffect(() => {
    const t0 = performance.now();
    const petalPhases = petals.map((_, i) => i * 0.7 + Math.sin(i * 2.3) * 0.5);
    const stamenPhases = stamens.map(
      (_, i) => i * 0.9 + Math.cos(i * 1.7) * 0.6,
    );

    const animate = () => {
      const now = performance.now();
      const t = (now - t0) * WIND_SPEED;
      const mouse = mouseRef.current;
      const petalOffsets = petalOffsetsRef.current;
      const stamenOffsets = stamenOffsetsRef.current;
      const strength = mouse.pressed ? PRESS_STRENGTH : HOVER_STRENGTH;
      const radius = mouse.pressed ? PRESS_RADIUS : HOVER_RADIUS;

      for (let i = 0; i < petals.length; i++) {
        const phase = petalPhases[i];
        const windX =
          Math.sin(t + phase) * WIND_STRENGTH_X +
          Math.sin(t * 1.7 + phase * 0.6) * WIND_STRENGTH_X * 0.3;
        const windY = Math.cos(t * 0.8 + phase * 1.3) * WIND_STRENGTH_Y;

        let pushX = 0,
          pushY = 0;
        if (mouse.active) {
          const dx = petals[i].cx - mouse.x;
          const dy = petals[i].cy - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < radius && dist > 0.1) {
            const factor = (1 - dist / radius) ** 2;
            pushX = (dx / dist) * strength * factor;
            pushY = (dy / dist) * strength * factor;
          }
        }

        const targetX = windX + pushX;
        const targetY = windY + pushY;
        const speed = mouse.active ? LERP_SPEED : RETURN_SPEED;

        petalOffsets[i] = {
          x: petalOffsets[i].x + (targetX - petalOffsets[i].x) * speed,
          y: petalOffsets[i].y + (targetY - petalOffsets[i].y) * speed,
        };
        const el = petalElsRef.current[i];
        if (el) {
          el.setAttribute(
            'transform',
            `translate(${petalOffsets[i].x.toFixed(2)} ${petalOffsets[i].y.toFixed(2)})`,
          );
        }
      }

      for (let i = 0; i < stamens.length; i++) {
        const phase = stamenPhases[i];
        const windX =
          Math.sin(t + phase) * WIND_STRENGTH_X * 1.2 +
          Math.sin(t * 1.4 + phase * 0.8) * WIND_STRENGTH_X * 0.4;
        const windY = Math.cos(t * 0.7 + phase * 1.1) * WIND_STRENGTH_Y * 0.8;

        let pushX = 0,
          pushY = 0;
        if (mouse.active) {
          const dx = stamens[i].cx - mouse.x;
          const dy = stamens[i].cy - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < radius && dist > 0.1) {
            const factor = (1 - dist / radius) ** 2;
            pushX = (dx / dist) * strength * factor * 1.2;
            pushY = (dy / dist) * strength * factor * 1.2;
          }
        }

        const targetX = windX + pushX;
        const targetY = windY + pushY;
        const speed = mouse.active ? LERP_SPEED : RETURN_SPEED;

        stamenOffsets[i] = {
          x: stamenOffsets[i].x + (targetX - stamenOffsets[i].x) * speed,
          y: stamenOffsets[i].y + (targetY - stamenOffsets[i].y) * speed,
        };
        const el = stamenGroupElsRef.current[i];
        if (el) {
          el.setAttribute(
            'transform',
            `translate(${stamenOffsets[i].x.toFixed(2)} ${stamenOffsets[i].y.toFixed(2)})`,
          );
        }
      }

      let leanTarget = 0;
      if (mouse.active && mouse.pressed) {
        const side = mouse.x < CX ? -1 : 1;
        const dx = Math.abs(mouse.x - CX);
        const dy = Math.abs(mouse.y - CY);
        const proximity = Math.max(
          0,
          1 - Math.sqrt(dx * dx + dy * dy) / PRESS_RADIUS,
        );
        leanTarget = side * proximity * 3.5;
      }
      leanRef.current +=
        (leanTarget - leanRef.current) * (mouse.active ? 0.03 : 0.015);

      const flowerEl = wholeFlowerRef.current;
      if (flowerEl) {
        const swayAngle =
          Math.sin(t * 0.8) * 0.8 + Math.sin(t * 1.3) * 0.35 + leanRef.current;
        flowerEl.setAttribute(
          'transform',
          `rotate(${swayAngle.toFixed(3)} ${CX} 465)`,
        );
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox='-180 10 800 470'
      className={`${className ?? ''} cursor-pointer focus:outline-none focus-visible:[filter:drop-shadow(0_0_8px_var(--color-glow))]`}
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      role='button'
      tabIndex={0}
      aria-label='Toggle color scheme'
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <defs>
        <filter id='ink-texture'>
          <feTurbulence
            type='fractalNoise'
            baseFrequency='0.04'
            numOctaves='3'
            result='noise'
          />
          <feDisplacementMap
            in='SourceGraphic'
            in2='noise'
            scale='1.2'
            xChannelSelector='R'
            yChannelSelector='G'
          />
        </filter>
        <filter id='stamen-glow'>
          <feGaussianBlur stdDeviation='1.2' result='blur' />
          <feMerge>
            <feMergeNode in='blur' />
            <feMergeNode in='SourceGraphic' />
          </feMerge>
        </filter>
        <filter id='petal-glow' x='-30%' y='-30%' width='160%' height='160%'>
          <feGaussianBlur
            in='SourceGraphic'
            stdDeviation='6'
            result='wideGlow'
          />
          <feGaussianBlur
            in='SourceGraphic'
            stdDeviation='2.5'
            result='tightGlow'
          />
          <feMerge>
            <feMergeNode in='wideGlow' />
            <feMergeNode in='tightGlow' />
            <feMergeNode in='SourceGraphic' />
          </feMerge>
        </filter>
      </defs>

      <g ref={wholeFlowerRef}>
        <g filter='url(#ink-texture)'>
          {/* Stem */}
          <path
            d={`M${CX - 4} ${CY}
              C${CX - 3} ${CY + 30}, ${CX + 2} 275, ${CX + 4} 320
              C${CX + 6} 365, ${CX + 4} 410, ${CX + 1} 465
              C${CX + 6} 410, ${CX + 8} 365, ${CX + 10} 320
              C${CX + 8} 275, ${CX + 7} ${CY + 30}, ${CX + 6} ${CY}
              Z`}
            className={`spider-lily-stem ${stemActive ? 'spider-lily-stem-active' : ''}`}
          />

          {/* Flower head */}
          <g transform={`rotate(-4 ${CX} ${CY})`} filter='url(#petal-glow)'>
            {/* Petals */}
            {petals.map((p, i) => (
              <path
                key={`petal-${i}`}
                ref={el => {
                  petalElsRef.current[i] = el;
                }}
                d={p.d}
                className={`spider-lily-petal ${petalsActive ? 'spider-lily-petal-active' : ''}`}
                style={{ animationDelay: `${petalDelays[i]}ms` }}
                pathLength={1}
              />
            ))}

            {/* Stamens */}
            {stamens.map((s, i) => (
              <g
                key={`stamen-${i}`}
                ref={el => {
                  stamenGroupElsRef.current[i] = el;
                }}
              >
                <path
                  d={s.d}
                  className={`spider-lily-stamen ${activeStamens[i] ? 'spider-lily-stamen-active' : ''}`}
                  filter='url(#stamen-glow)'
                  pathLength={1}
                />
                {!s.noTip && (
                  <ellipse
                    cx={s.tipX}
                    cy={s.tipY}
                    rx={s.tipLen}
                    ry={s.tipW}
                    transform={`rotate(${s.tipAngle} ${s.tipX} ${s.tipY})`}
                    className={`spider-lily-anther ${activeStamens[i] ? 'spider-lily-anther-active' : ''}`}
                    style={{ animationDelay: `${STAMEN_DURATION}ms` }}
                    filter='url(#stamen-glow)'
                  />
                )}
              </g>
            ))}

            {/* Center */}
            <circle
              cx={CX}
              cy={CY}
              r='3'
              className={`spider-lily-center ${petalsActive ? 'spider-lily-center-active' : ''}`}
            />
          </g>
        </g>
      </g>
    </svg>
  );
};

export { SpiderLily };
