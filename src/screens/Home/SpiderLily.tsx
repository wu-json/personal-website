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
  // ==== UPPER DOME — organic ribbon petals with natural irregularity ====

  // Top center — leans very slightly left
  {
    d: `M${CX - W} ${CY}
       C${CX - W - 2} ${CY - 38}, ${CX - W - 5} ${CY - 82}, ${CX - W - 4} ${CY - 122}
       C${CX - W - 3} ${CY - 144}, ${CX - 1} ${CY - 157}, ${CX - 1} ${CY - 160}
       C${CX} ${CY - 157}, ${CX + W} ${CY - 143}, ${CX + W - 1} ${CY - 124}
       C${CX + W} ${CY - 88}, ${CX + W + 2} ${CY - 42}, ${CX + W} ${CY} Z`,
    delay: 0,
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
  },
  // Left ~78° — nearly horizontal, slight droop
  {
    d: `M${CX} ${CY - W}
       C${CX - 26} ${CY - W - 3}, ${CX - 68} ${CY - W - 8}, ${CX - 112} ${CY - W - 10}
       C${CX - 140} ${CY - W - 11}, ${CX - 154} ${CY - 20}, ${CX - 157} ${CY - 27}
       L${CX - 154} ${CY + W - 21}
       C${CX - 140} ${CY + W - 11}, ${CX - 108} ${CY + W - 4}, ${CX - 70} ${CY + W}
       C${CX - 30} ${CY + W + 2}, ${CX} ${CY + W}, ${CX} ${CY + W} Z`,
    delay: 40,
  },
  // Right ~82° — nearly horizontal, slight lift
  {
    d: `M${CX} ${CY - W}
       C${CX + 32} ${CY - W - 6}, ${CX + 78} ${CY - W - 13}, ${CX + 122} ${CY - W - 16}
       C${CX + 150} ${CY - W - 15}, ${CX + 164} ${CY - 25}, ${CX + 166} ${CY - 32}
       L${CX + 163} ${CY + W - 26}
       C${CX + 150} ${CY + W - 14}, ${CX + 120} ${CY + W - 9}, ${CX + 78} ${CY + W - 4}
       C${CX + 32} ${CY + W - 2}, ${CX} ${CY + W}, ${CX} ${CY + W} Z`,
    delay: 80,
  },

  // ==== LOWER PETALS — parenthesis curves with organic asymmetry ====

  // Outer left "(" — wider arc, tip curls slightly inward
  {
    d: `M${CX} ${CY + W}
       C${CX - 33} ${CY + W + 4}, ${CX - 68} ${CY + W + 16}, ${CX - 84} ${CY + W + 38}
       C${CX - 96} ${CY + W + 57}, ${CX - 90} ${CY + W + 78}, ${CX - 70} ${CY + 87}
       C${CX - 84} ${CY + 73}, ${CX - 89} ${CY + 53}, ${CX - 79} ${CY + 36}
       C${CX - 66} ${CY + 17}, ${CX - 34} ${CY + 5}, ${CX} ${CY - W} Z`,
    delay: 280,
  },
  // Outer right ")" — slightly tighter than left
  {
    d: `M${CX} ${CY + W}
       C${CX + 36} ${CY + W + 5}, ${CX + 70} ${CY + W + 19}, ${CX + 86} ${CY + W + 40}
       C${CX + 97} ${CY + W + 59}, ${CX + 91} ${CY + W + 79}, ${CX + 70} ${CY + 86}
       C${CX + 85} ${CY + 72}, ${CX + 90} ${CY + 52}, ${CX + 80} ${CY + 35}
       C${CX + 66} ${CY + 17}, ${CX + 33} ${CY + 4}, ${CX} ${CY - W} Z`,
    delay: 320,
  },
  // Inner left "(" — shorter, tighter curl
  {
    d: `M${CX} ${CY + W}
       C${CX - 18} ${CY + W + 5}, ${CX - 40} ${CY + W + 18}, ${CX - 50} ${CY + W + 36}
       C${CX - 57} ${CY + W + 51}, ${CX - 51} ${CY + W + 67}, ${CX - 36} ${CY + 73}
       C${CX - 47} ${CY + 61}, ${CX - 51} ${CY + 45}, ${CX - 43} ${CY + 31}
       C${CX - 34} ${CY + 17}, ${CX - 17} ${CY + 5}, ${CX} ${CY - W} Z`,
    delay: 360,
  },
  // Inner right ")" — slightly longer than inner left
  {
    d: `M${CX} ${CY + W}
       C${CX + 24} ${CY + W + 7}, ${CX + 47} ${CY + W + 21}, ${CX + 57} ${CY + W + 39}
       C${CX + 64} ${CY + W + 54}, ${CX + 58} ${CY + W + 70}, ${CX + 43} ${CY + 77}
       C${CX + 54} ${CY + 65}, ${CX + 58} ${CY + 49}, ${CX + 50} ${CY + 35}
       C${CX + 42} ${CY + 21}, ${CX + 22} ${CY + 7}, ${CX} ${CY - W} Z`,
    delay: 400,
  },
];

const petalDelays = petals.map((p) => p.delay);

// Stamens: smooth wide U-arcs. All control points stay above CY (the center)
// so nothing dips below the flower neck. Tips staggered naturally.
const stamens: { d: string; tipX: number; tipY: number; delay: number; tipAngle: number; tipLen: number; tipW: number; noTip?: boolean }[] = [
  // ==== OUTER cluster (dense, wide fan) ====
  { d: `M${CX} ${CY - 12} C${CX - 160} ${CY - 12}, ${CX - 320} ${CY - 14}, ${CX - 340} ${CY - 115}`, tipX: CX - 340, tipY: CY - 115, delay: 0, tipAngle: -12, tipLen: 5.2, tipW: 2.4 },
  { d: `M${CX} ${CY - 12} C${CX - 145} ${CY - 14}, ${CX - 298} ${CY - 20}, ${CX - 315} ${CY - 135}`, tipX: CX - 315, tipY: CY - 135, delay: 40, tipAngle: -25, tipLen: 5.0, tipW: 2.5 },
  { d: `M${CX} ${CY - 12} C${CX - 125} ${CY - 16}, ${CX - 268} ${CY - 28}, ${CX - 285} ${CY - 155}`, tipX: CX - 285, tipY: CY - 155, delay: 80, tipAngle: -38, tipLen: 4.8, tipW: 2.4 },
  { d: `M${CX} ${CY - 12} C${CX - 100} ${CY - 20}, ${CX - 232} ${CY - 42}, ${CX - 252} ${CY - 170}`, tipX: CX - 252, tipY: CY - 170, delay: 120, tipAngle: -50, tipLen: 4.6, tipW: 2.6 },

  { d: `M${CX} ${CY - 12} C${CX + 158} ${CY - 12}, ${CX + 318} ${CY - 16}, ${CX + 338} ${CY - 118}`, tipX: CX + 338, tipY: CY - 118, delay: 20, tipAngle: 14, tipLen: 4.9, tipW: 2.5 },
  { d: `M${CX} ${CY - 12} C${CX + 142} ${CY - 15}, ${CX + 295} ${CY - 22}, ${CX + 312} ${CY - 138}`, tipX: CX + 312, tipY: CY - 138, delay: 60, tipAngle: 28, tipLen: 5.1, tipW: 2.4 },
  { d: `M${CX} ${CY - 12} C${CX + 122} ${CY - 18}, ${CX + 265} ${CY - 32}, ${CX + 282} ${CY - 158}`, tipX: CX + 282, tipY: CY - 158, delay: 100, tipAngle: 42, tipLen: 5.0, tipW: 2.2 },
  { d: `M${CX} ${CY - 12} C${CX + 98} ${CY - 22}, ${CX + 230} ${CY - 46}, ${CX + 248} ${CY - 172}`, tipX: CX + 248, tipY: CY - 172, delay: 140, tipAngle: 54, tipLen: 5.3, tipW: 2.3 },

  // ==== MIDDLE (sparse) ====
  { d: `M${CX} ${CY - 12} C${CX - 55} ${CY - 48}, ${CX - 168} ${CY - 115}, ${CX - 185} ${CY - 178}`, tipX: CX - 185, tipY: CY - 178, delay: 200, tipAngle: -65, tipLen: 4.8, tipW: 2.4 },
  { d: `M${CX} ${CY - 12} C${CX + 52} ${CY - 50}, ${CX + 165} ${CY - 118}, ${CX + 182} ${CY - 175}`, tipX: CX + 182, tipY: CY - 175, delay: 240, tipAngle: 62, tipLen: 4.6, tipW: 2.6 },
  { d: `M${CX} ${CY - 12} C${CX - 30} ${CY - 62}, ${CX - 95} ${CY - 148}, ${CX - 90} ${CY - 190}`, tipX: CX - 90, tipY: CY - 190, delay: 280, tipAngle: -78, tipLen: 5.1, tipW: 2.2 },
  { d: `M${CX} ${CY - 12} C${CX + 28} ${CY - 64}, ${CX + 92} ${CY - 150}, ${CX + 88} ${CY - 188}`, tipX: CX + 88, tipY: CY - 188, delay: 320, tipAngle: 75, tipLen: 4.7, tipW: 2.5 },
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
        <filter id="petal-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="wideGlow" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="tightGlow" />
          <feMerge>
            <feMergeNode in="wideGlow" />
            <feMergeNode in="tightGlow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#ink-texture)">
        {/* Stem — organic brush stroke with natural curve */}
        <path
          d={`M${CX - 4} ${CY}
              C${CX - 3} ${CY + 30}, ${CX + 2} 275, ${CX + 6} 320
              C${CX + 10} 365, ${CX + 8} 410, ${CX + 4} 455
              C${CX + 1} 500, ${CX - 3} 540, ${CX - 5} 575
              Q${CX - 5} 592, ${CX - 3} 598
              Q${CX - 1} 592, ${CX - 1} 575
              C${CX + 1} 540, ${CX + 5} 500, ${CX + 8} 455
              C${CX + 12} 410, ${CX + 14} 365, ${CX + 10} 320
              C${CX + 6} 275, ${CX + 7} ${CY + 30}, ${CX + 6} ${CY}
              Z`}
          className={`spider-lily-stem ${stemActive ? 'spider-lily-stem-active' : ''}`}
        />

        {/* Flower head — subtle lean + ethereal glow */}
        <g transform={`rotate(-4 ${CX} ${CY})`} filter="url(#petal-glow)">
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
      </g>
    </svg>
  );
};

export { SpiderLily };
