import { useEffect, useState } from 'react';

/**
 * Side-view spider lily (彼岸花) — Japanese anime ink aesthetic.
 * Thin ribbon petals with tight spiral curls at the tips.
 * Dense, chaotic, overlapping. White on black.
 */

const CX = 220;
const CY = 230;

// Hand-drawn ribbon petals — thin, organic, dome-shaped arrangement.
// W = half-width of ribbon. Kept narrow for paper/ribbon feel.
const W = 4;
const petals: { d: string; delay: number }[] = [
  // ==== UPPER DOME — organic ribbon petals, tips tracing a dome arc ====

  // Top center — straight up
  {
    d: `M${CX - W} ${CY}
       C${CX - W - 1} ${CY - 40}, ${CX - W - 3} ${CY - 85}, ${CX - W - 2} ${CY - 125}
       C${CX - W - 1} ${CY - 145}, ${CX} ${CY - 156}, ${CX} ${CY - 158}
       C${CX} ${CY - 156}, ${CX + W + 1} ${CY - 145}, ${CX + W} ${CY - 125}
       C${CX + W - 1} ${CY - 85}, ${CX + W + 1} ${CY - 40}, ${CX + W} ${CY} Z`,
    delay: 0,
  },
  // Left ~20°
  {
    d: `M${CX - W} ${CY}
       C${CX - W - 6} ${CY - 35}, ${CX - W - 18} ${CY - 78}, ${CX - W - 30} ${CY - 118}
       C${CX - W - 38} ${CY - 140}, ${CX - W - 24} ${CY - 154}, ${CX - W - 18} ${CY - 155}
       L${CX + W - 24} ${CY - 152}
       C${CX + W - 22} ${CY - 138}, ${CX + W - 18} ${CY - 112}, ${CX + W - 14} ${CY - 76}
       C${CX + W - 4} ${CY - 35}, ${CX + W} ${CY - 10}, ${CX + W} ${CY} Z`,
    delay: 60,
  },
  // Right ~20°
  {
    d: `M${CX + W} ${CY}
       C${CX + W + 7} ${CY - 36}, ${CX + W + 20} ${CY - 80}, ${CX + W + 34} ${CY - 120}
       C${CX + W + 42} ${CY - 142}, ${CX + W + 28} ${CY - 156}, ${CX + W + 22} ${CY - 158}
       L${CX - W + 28} ${CY - 155}
       C${CX - W + 26} ${CY - 140}, ${CX - W + 22} ${CY - 115}, ${CX - W + 18} ${CY - 78}
       C${CX - W + 6} ${CY - 36}, ${CX - W} ${CY - 10}, ${CX - W} ${CY} Z`,
    delay: 100,
  },
  // Left ~42°
  {
    d: `M${CX - W} ${CY}
       C${CX - W - 14} ${CY - 26}, ${CX - W - 38} ${CY - 62}, ${CX - W - 62} ${CY - 98}
       C${CX - W - 78} ${CY - 122}, ${CX - W - 64} ${CY - 140}, ${CX - W - 56} ${CY - 142}
       L${CX + W - 62} ${CY - 139}
       C${CX + W - 58} ${CY - 122}, ${CX + W - 50} ${CY - 95}, ${CX + W - 34} ${CY - 60}
       C${CX + W - 12} ${CY - 26}, ${CX + W} ${CY - 8}, ${CX + W} ${CY} Z`,
    delay: 140,
  },
  // Right ~42°
  {
    d: `M${CX + W} ${CY}
       C${CX + W + 16} ${CY - 28}, ${CX + W + 42} ${CY - 65}, ${CX + W + 66} ${CY - 100}
       C${CX + W + 82} ${CY - 124}, ${CX + W + 68} ${CY - 142}, ${CX + W + 60} ${CY - 144}
       L${CX - W + 66} ${CY - 141}
       C${CX - W + 62} ${CY - 124}, ${CX - W + 54} ${CY - 98}, ${CX - W + 38} ${CY - 62}
       C${CX - W + 14} ${CY - 28}, ${CX - W} ${CY - 8}, ${CX - W} ${CY} Z`,
    delay: 180,
  },
  // Left ~62°
  {
    d: `M${CX - W} ${CY}
       C${CX - W - 20} ${CY - 18}, ${CX - W - 55} ${CY - 42}, ${CX - W - 88} ${CY - 66}
       C${CX - W - 108} ${CY - 82}, ${CX - W - 100} ${CY - 102}, ${CX - W - 95} ${CY - 105}
       L${CX + W - 100} ${CY - 102}
       C${CX + W - 95} ${CY - 85}, ${CX + W - 82} ${CY - 62}, ${CX + W - 50} ${CY - 40}
       C${CX + W - 18} ${CY - 18}, ${CX + W} ${CY - 5}, ${CX + W} ${CY} Z`,
    delay: 220,
  },
  // Right ~62°
  {
    d: `M${CX + W} ${CY}
       C${CX + W + 22} ${CY - 20}, ${CX + W + 58} ${CY - 44}, ${CX + W + 92} ${CY - 68}
       C${CX + W + 112} ${CY - 84}, ${CX + W + 104} ${CY - 104}, ${CX + W + 100} ${CY - 108}
       L${CX - W + 104} ${CY - 105}
       C${CX - W + 100} ${CY - 88}, ${CX - W + 86} ${CY - 65}, ${CX - W + 54} ${CY - 42}
       C${CX - W + 20} ${CY - 20}, ${CX - W} ${CY - 5}, ${CX - W} ${CY} Z`,
    delay: 250,
  },
  // Left ~80° — nearly horizontal
  {
    d: `M${CX} ${CY - W}
       C${CX - 28} ${CY - W - 4}, ${CX - 72} ${CY - W - 10}, ${CX - 115} ${CY - W - 12}
       C${CX - 142} ${CY - W - 12}, ${CX - 156} ${CY - 22}, ${CX - 158} ${CY - 28}
       L${CX - 155} ${CY + W - 22}
       C${CX - 142} ${CY + W - 12}, ${CX - 112} ${CY + W - 6}, ${CX - 72} ${CY + W - 2}
       C${CX - 28} ${CY + W}, ${CX} ${CY + W}, ${CX} ${CY + W} Z`,
    delay: 40,
  },
  // Right ~80° — nearly horizontal
  {
    d: `M${CX} ${CY - W}
       C${CX + 30} ${CY - W - 5}, ${CX + 76} ${CY - W - 12}, ${CX + 120} ${CY - W - 14}
       C${CX + 148} ${CY - W - 13}, ${CX + 162} ${CY - 24}, ${CX + 164} ${CY - 30}
       L${CX + 161} ${CY + W - 24}
       C${CX + 148} ${CY + W - 13}, ${CX + 118} ${CY + W - 8}, ${CX + 76} ${CY + W - 3}
       C${CX + 30} ${CY + W - 1}, ${CX} ${CY + W}, ${CX} ${CY + W} Z`,
    delay: 80,
  },

  // ==== LOWER PETALS — four parenthesis curves, sharp pointed tips ====

  // Outer left "("
  {
    d: `M${CX} ${CY + W}
       C${CX - 35} ${CY + W + 5}, ${CX - 70} ${CY + W + 18}, ${CX - 85} ${CY + W + 40}
       C${CX - 95} ${CY + W + 58}, ${CX - 88} ${CY + W + 78}, ${CX - 68} ${CY + 86}
       C${CX - 82} ${CY + 72}, ${CX - 88} ${CY + 52}, ${CX - 78} ${CY + 35}
       C${CX - 65} ${CY + 16}, ${CX - 32} ${CY + 4}, ${CX} ${CY - W} Z`,
    delay: 280,
  },
  // Outer right ")"
  {
    d: `M${CX} ${CY + W}
       C${CX + 38} ${CY + W + 6}, ${CX + 72} ${CY + W + 20}, ${CX + 88} ${CY + W + 42}
       C${CX + 98} ${CY + W + 60}, ${CX + 92} ${CY + W + 80}, ${CX + 72} ${CY + 88}
       C${CX + 86} ${CY + 74}, ${CX + 92} ${CY + 54}, ${CX + 82} ${CY + 37}
       C${CX + 68} ${CY + 18}, ${CX + 35} ${CY + 5}, ${CX} ${CY - W} Z`,
    delay: 320,
  },
  // Inner left "("
  {
    d: `M${CX} ${CY + W}
       C${CX - 20} ${CY + W + 6}, ${CX - 42} ${CY + W + 20}, ${CX - 52} ${CY + W + 38}
       C${CX - 58} ${CY + W + 52}, ${CX - 52} ${CY + W + 68}, ${CX - 37} ${CY + 74}
       C${CX - 48} ${CY + 62}, ${CX - 52} ${CY + 46}, ${CX - 44} ${CY + 32}
       C${CX - 36} ${CY + 18}, ${CX - 18} ${CY + 5}, ${CX} ${CY - W} Z`,
    delay: 360,
  },
  // Inner right ")"
  {
    d: `M${CX} ${CY + W}
       C${CX + 22} ${CY + W + 8}, ${CX + 45} ${CY + W + 22}, ${CX + 55} ${CY + W + 40}
       C${CX + 62} ${CY + W + 55}, ${CX + 56} ${CY + W + 70}, ${CX + 41} ${CY + 76}
       C${CX + 52} ${CY + 64}, ${CX + 56} ${CY + 48}, ${CX + 48} ${CY + 34}
       C${CX + 40} ${CY + 20}, ${CX + 20} ${CY + 6}, ${CX} ${CY - W} Z`,
    delay: 400,
  },
];

const petalDelays = petals.map((p) => p.delay);

// Stamens: smooth wide U-arcs. All control points stay above CY (the center)
// so nothing dips below the flower neck. Tips staggered naturally.
const stamens: { d: string; tipX: number; tipY: number; delay: number; tipAngle: number; tipLen: number; tipW: number; noTip?: boolean }[] = [
  // ==== OUTER cluster (dense, wide fan) ====
  { d: `M${CX} ${CY - 12} C${CX - 160} ${CY - 12}, ${CX - 320} ${CY - 14}, ${CX - 340} ${CY - 115}`, tipX: CX - 340, tipY: CY - 115, delay: 0, tipAngle: -12, tipLen: 3.8, tipW: 2.4, noTip: true },
  { d: `M${CX} ${CY - 12} C${CX - 145} ${CY - 14}, ${CX - 298} ${CY - 20}, ${CX - 315} ${CY - 135}`, tipX: CX - 315, tipY: CY - 135, delay: 40, tipAngle: -25, tipLen: 3.7, tipW: 2.5 },
  { d: `M${CX} ${CY - 12} C${CX - 125} ${CY - 16}, ${CX - 268} ${CY - 28}, ${CX - 285} ${CY - 155}`, tipX: CX - 285, tipY: CY - 155, delay: 80, tipAngle: -38, tipLen: 3.6, tipW: 2.4 },
  { d: `M${CX} ${CY - 12} C${CX - 100} ${CY - 20}, ${CX - 232} ${CY - 42}, ${CX - 252} ${CY - 170}`, tipX: CX - 252, tipY: CY - 170, delay: 120, tipAngle: -50, tipLen: 3.4, tipW: 2.6, noTip: true },

  { d: `M${CX} ${CY - 12} C${CX + 158} ${CY - 12}, ${CX + 318} ${CY - 16}, ${CX + 338} ${CY - 118}`, tipX: CX + 338, tipY: CY - 118, delay: 20, tipAngle: 14, tipLen: 3.6, tipW: 2.5 },
  { d: `M${CX} ${CY - 12} C${CX + 142} ${CY - 15}, ${CX + 295} ${CY - 22}, ${CX + 312} ${CY - 138}`, tipX: CX + 312, tipY: CY - 138, delay: 60, tipAngle: 28, tipLen: 3.8, tipW: 2.4, noTip: true },
  { d: `M${CX} ${CY - 12} C${CX + 122} ${CY - 18}, ${CX + 265} ${CY - 32}, ${CX + 282} ${CY - 158}`, tipX: CX + 282, tipY: CY - 158, delay: 100, tipAngle: 42, tipLen: 3.7, tipW: 2.2 },
  { d: `M${CX} ${CY - 12} C${CX + 98} ${CY - 22}, ${CX + 230} ${CY - 46}, ${CX + 248} ${CY - 172}`, tipX: CX + 248, tipY: CY - 172, delay: 140, tipAngle: 54, tipLen: 3.9, tipW: 2.3 },

  // ==== MIDDLE (sparse) ====
  { d: `M${CX} ${CY - 12} C${CX - 55} ${CY - 48}, ${CX - 168} ${CY - 115}, ${CX - 185} ${CY - 178}`, tipX: CX - 185, tipY: CY - 178, delay: 200, tipAngle: -65, tipLen: 3.6, tipW: 2.4 },
  { d: `M${CX} ${CY - 12} C${CX + 52} ${CY - 50}, ${CX + 165} ${CY - 118}, ${CX + 182} ${CY - 175}`, tipX: CX + 182, tipY: CY - 175, delay: 240, tipAngle: 62, tipLen: 3.4, tipW: 2.6, noTip: true },
  { d: `M${CX} ${CY - 12} C${CX - 30} ${CY - 62}, ${CX - 95} ${CY - 148}, ${CX - 90} ${CY - 190}`, tipX: CX - 90, tipY: CY - 190, delay: 280, tipAngle: -78, tipLen: 3.8, tipW: 2.2 },
  { d: `M${CX} ${CY - 12} C${CX + 28} ${CY - 64}, ${CX + 92} ${CY - 150}, ${CX + 88} ${CY - 188}`, tipX: CX + 88, tipY: CY - 188, delay: 320, tipAngle: 75, tipLen: 3.5, tipW: 2.5 },
];

const STEM_DELAY = 150;
const PETAL_DELAY = 650;
const STAMEN_DELAY = 1000;
const STAMEN_DURATION = 550;

const SpiderLily = ({ className }: { className?: string }) => {
  const [stemActive, setStemActive] = useState(false);
  const [petalsActive, setPetalsActive] = useState(false);
  const [stamensActive, setStamensActive] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setStemActive(true), STEM_DELAY);
    const t2 = setTimeout(() => setPetalsActive(true), PETAL_DELAY);
    const t3 = setTimeout(() => setStamensActive(true), STAMEN_DELAY);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <svg
      viewBox="-180 10 800 590"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="ink-texture">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.04"
            numOctaves="3"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="1.2"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        <filter id="stamen-glow">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#ink-texture)">
        {/* Stem — brush stroke: wide at flower head, trails to a wisp */}
        <path
          d={`M${CX - 5} ${CY}
              C${CX - 6} ${CY + 25}, ${CX - 7} 280, ${CX - 6} 330
              C${CX - 4} 375, ${CX - 6} 420, ${CX - 7} 470
              C${CX - 6} 515, ${CX - 4} 550, ${CX - 3} 580
              Q${CX - 2} 594, ${CX} 598
              Q${CX + 2} 594, ${CX + 2} 580
              C${CX + 3} 550, ${CX + 1} 515, ${CX} 470
              C${CX - 1} 420, ${CX + 2} 375, ${CX + 4} 330
              C${CX + 5} 280, ${CX + 5} ${CY + 25}, ${CX + 5} ${CY}
              Z`}
          className={`spider-lily-stem ${stemActive ? 'spider-lily-stem-active' : ''}`}
        />

        {/* Petals */}
        {petals.map((p, i) => (
          <path
            key={`petal-${i}`}
            d={p.d}
            className={`spider-lily-petal ${petalsActive ? 'spider-lily-petal-active' : ''}`}
            style={{ animationDelay: `${petalDelays[i]}ms` }}
            pathLength={1}
          />
        ))}

        {/* Stamens */}
        {stamens.map((s, i) => (
          <g key={`stamen-${i}`}>
            <path
              d={s.d}
              className={`spider-lily-stamen ${stamensActive ? 'spider-lily-stamen-active' : ''}`}
              style={{ animationDelay: `${s.delay}ms` }}
              filter="url(#stamen-glow)"
              pathLength={1}
            />
            {!s.noTip && (
              <ellipse
                cx={s.tipX}
                cy={s.tipY}
                rx={s.tipLen}
                ry={s.tipW}
                transform={`rotate(${s.tipAngle} ${s.tipX} ${s.tipY})`}
                className={`spider-lily-anther ${stamensActive ? 'spider-lily-anther-active' : ''}`}
                style={{ animationDelay: `${s.delay + STAMEN_DURATION}ms` }}
                filter="url(#stamen-glow)"
              />
            )}
          </g>
        ))}

        {/* Center */}
        <circle
          cx={CX}
          cy={CY}
          r="3"
          className={`spider-lily-center ${petalsActive ? 'spider-lily-center-active' : ''}`}
        />
      </g>
    </svg>
  );
};

export { SpiderLily };
