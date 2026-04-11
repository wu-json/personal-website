import { useEffect, useState } from 'react';

/**
 * Side-view spider lily (彼岸花) — Japanese anime ink aesthetic.
 * Thin ribbon petals with tight spiral curls at the tips.
 * Dense, chaotic, overlapping. White on black.
 */

const CX = 220;
const CY = 230;

// Petals are thin ribbons (two-edge closed paths) with tight curling
// spiral tips. Each one: narrow at base → slight widening → tight loop.
// The "top edge" and "bottom edge" of the ribbon are offset by ~6-10px.
const petals: { d: string; delay: number }[] = [
  // ---- LEFT HORIZONTAL ----
  // Far left — long sweep, tight downward spiral at tip
  {
    d: `M${CX} ${CY - 3}
       L${CX - 40} ${CY - 12} L${CX - 85} ${CY - 16} L${CX - 125} ${CY - 10}
       L${CX - 152} ${CY + 2} L${CX - 165} ${CY + 18} L${CX - 170} ${CY + 38}
       C${CX - 170} ${CY + 52}, ${CX - 160} ${CY + 58}, ${CX - 150} ${CY + 52}
       C${CX - 142} ${CY + 44}, ${CX - 148} ${CY + 32}, ${CX - 158} ${CY + 22}
       L${CX - 155} ${CY + 8} L${CX - 140} ${CY - 2}
       L${CX - 118} ${CY - 6} L${CX - 82} ${CY - 8} L${CX - 42} ${CY - 2}
       L${CX - 5} ${CY + 5} Z`,
    delay: 0,
  },
  // Left mid-upper
  {
    d: `M${CX} ${CY - 2}
       L${CX - 35} ${CY - 14} L${CX - 72} ${CY - 28} L${CX - 108} ${CY - 34}
       L${CX - 138} ${CY - 28} L${CX - 155} ${CY - 14} L${CX - 162} ${CY + 4}
       C${CX - 165} ${CY + 18}, ${CX - 156} ${CY + 26}, ${CX - 146} ${CY + 20}
       C${CX - 138} ${CY + 14}, ${CX - 142} ${CY + 2}, ${CX - 150} ${CY - 6}
       L${CX - 142} ${CY - 16} L${CX - 125} ${CY - 22}
       L${CX - 102} ${CY - 24} L${CX - 70} ${CY - 18} L${CX - 38} ${CY - 6}
       L${CX - 6} ${CY + 6} Z`,
    delay: 100,
  },
  // Left low — sweeps down, curls up
  {
    d: `M${CX} ${CY + 2}
       L${CX - 32} ${CY + 15} L${CX - 65} ${CY + 32} L${CX - 95} ${CY + 50}
       L${CX - 115} ${CY + 66} L${CX - 125} ${CY + 82} L${CX - 126} ${CY + 98}
       C${CX - 124} ${CY + 112}, ${CX - 114} ${CY + 116}, ${CX - 108} ${CY + 108}
       C${CX - 102} ${CY + 98}, ${CX - 108} ${CY + 86}, ${CX - 116} ${CY + 78}
       L${CX - 110} ${CY + 62} L${CX - 95} ${CY + 48}
       L${CX - 72} ${CY + 34} L${CX - 45} ${CY + 20} L${CX - 18} ${CY + 8}
       L${CX + 3} ${CY + 6} Z`,
    delay: 190,
  },

  // ---- RIGHT HORIZONTAL ----
  // Far right
  {
    d: `M${CX} ${CY - 4}
       L${CX + 42} ${CY - 15} L${CX + 88} ${CY - 20} L${CX + 128} ${CY - 14}
       L${CX + 155} ${CY} L${CX + 168} ${CY + 16} L${CX + 174} ${CY + 36}
       C${CX + 175} ${CY + 50}, ${CX + 165} ${CY + 56}, ${CX + 155} ${CY + 50}
       C${CX + 147} ${CY + 42}, ${CX + 152} ${CY + 30}, ${CX + 162} ${CY + 20}
       L${CX + 158} ${CY + 6} L${CX + 145} ${CY - 4}
       L${CX + 122} ${CY - 8} L${CX + 85} ${CY - 10} L${CX + 45} ${CY - 4}
       L${CX + 6} ${CY + 4} Z`,
    delay: 50,
  },
  // Right mid-upper
  {
    d: `M${CX} ${CY - 3}
       L${CX + 38} ${CY - 16} L${CX + 76} ${CY - 32} L${CX + 112} ${CY - 38}
       L${CX + 142} ${CY - 30} L${CX + 160} ${CY - 16} L${CX + 168} ${CY + 2}
       C${CX + 172} ${CY + 16}, ${CX + 162} ${CY + 24}, ${CX + 152} ${CY + 18}
       C${CX + 144} ${CY + 12}, ${CX + 148} ${CY}, ${CX + 155} ${CY - 8}
       L${CX + 148} ${CY - 18} L${CX + 130} ${CY - 24}
       L${CX + 106} ${CY - 28} L${CX + 74} ${CY - 22} L${CX + 40} ${CY - 8}
       L${CX + 8} ${CY + 5} Z`,
    delay: 140,
  },
  // Right low
  {
    d: `M${CX} ${CY + 3}
       L${CX + 35} ${CY + 18} L${CX + 68} ${CY + 36} L${CX + 98} ${CY + 54}
       L${CX + 118} ${CY + 70} L${CX + 128} ${CY + 86} L${CX + 130} ${CY + 102}
       C${CX + 128} ${CY + 115}, ${CX + 118} ${CY + 118}, ${CX + 112} ${CY + 110}
       C${CX + 106} ${CY + 100}, ${CX + 112} ${CY + 88}, ${CX + 120} ${CY + 80}
       L${CX + 114} ${CY + 66} L${CX + 100} ${CY + 52}
       L${CX + 76} ${CY + 38} L${CX + 48} ${CY + 22} L${CX + 20} ${CY + 10}
       L${CX - 2} ${CY + 6} Z`,
    delay: 230,
  },

  // ---- UPPER LEFT DIAGONAL ----
  {
    d: `M${CX - 2} ${CY}
       L${CX - 20} ${CY - 22} L${CX - 42} ${CY - 52} L${CX - 62} ${CY - 78}
       L${CX - 76} ${CY - 100} L${CX - 82} ${CY - 118} L${CX - 80} ${CY - 132}
       C${CX - 76} ${CY - 144}, ${CX - 66} ${CY - 146}, ${CX - 60} ${CY - 138}
       C${CX - 56} ${CY - 130}, ${CX - 62} ${CY - 120}, ${CX - 70} ${CY - 114}
       L${CX - 68} ${CY - 98} L${CX - 58} ${CY - 78}
       L${CX - 42} ${CY - 54} L${CX - 24} ${CY - 30} L${CX - 6} ${CY - 8}
       L${CX + 3} ${CY + 5} Z`,
    delay: 70,
  },

  // ---- UPPER RIGHT DIAGONAL ----
  {
    d: `M${CX + 2} ${CY}
       L${CX + 22} ${CY - 24} L${CX + 46} ${CY - 56} L${CX + 68} ${CY - 82}
       L${CX + 82} ${CY - 104} L${CX + 88} ${CY - 122} L${CX + 86} ${CY - 136}
       C${CX + 82} ${CY - 148}, ${CX + 72} ${CY - 150}, ${CX + 66} ${CY - 142}
       C${CX + 62} ${CY - 134}, ${CX + 68} ${CY - 124}, ${CX + 76} ${CY - 118}
       L${CX + 74} ${CY - 102} L${CX + 64} ${CY - 82}
       L${CX + 46} ${CY - 58} L${CX + 26} ${CY - 32} L${CX + 8} ${CY - 10}
       L${CX - 2} ${CY + 4} Z`,
    delay: 160,
  },

  // ---- TOP PETALS ----
  // Top left-lean
  {
    d: `M${CX - 1} ${CY}
       L${CX - 10} ${CY - 28} L${CX - 18} ${CY - 65} L${CX - 24} ${CY - 102}
       L${CX - 26} ${CY - 132} L${CX - 22} ${CY - 155} L${CX - 14} ${CY - 170}
       C${CX - 6} ${CY - 180}, ${CX + 2} ${CY - 176}, ${CX + 2} ${CY - 166}
       C${CX + 2} ${CY - 156}, ${CX - 8} ${CY - 152}, ${CX - 16} ${CY - 148}
       L${CX - 18} ${CY - 132} L${CX - 16} ${CY - 105}
       L${CX - 12} ${CY - 68} L${CX - 4} ${CY - 32} L${CX + 4} ${CY - 4}
       L${CX + 3} ${CY + 5} Z`,
    delay: 40,
  },
  // Top right-lean
  {
    d: `M${CX + 1} ${CY}
       L${CX + 12} ${CY - 30} L${CX + 22} ${CY - 68} L${CX + 30} ${CY - 106}
       L${CX + 34} ${CY - 138} L${CX + 30} ${CY - 160} L${CX + 22} ${CY - 175}
       C${CX + 14} ${CY - 185}, ${CX + 4} ${CY - 182}, ${CX + 4} ${CY - 172}
       C${CX + 4} ${CY - 162}, ${CX + 14} ${CY - 156}, ${CX + 22} ${CY - 152}
       L${CX + 24} ${CY - 138} L${CX + 22} ${CY - 108}
       L${CX + 16} ${CY - 72} L${CX + 8} ${CY - 34} L${CX} ${CY - 6}
       L${CX - 2} ${CY + 4} Z`,
    delay: 110,
  },
  // Top center-left narrow
  {
    d: `M${CX - 1} ${CY}
       L${CX - 6} ${CY - 22} L${CX - 14} ${CY - 55} L${CX - 24} ${CY - 88}
       L${CX - 36} ${CY - 115} L${CX - 42} ${CY - 135} L${CX - 42} ${CY - 150}
       C${CX - 38} ${CY - 162}, ${CX - 28} ${CY - 164}, ${CX - 24} ${CY - 155}
       C${CX - 20} ${CY - 146}, ${CX - 28} ${CY - 138}, ${CX - 35} ${CY - 132}
       L${CX - 32} ${CY - 115} L${CX - 22} ${CY - 90}
       L${CX - 12} ${CY - 58} L${CX - 4} ${CY - 26} L${CX + 4} ${CY - 2}
       Z`,
    delay: 200,
  },
  // Top center-right narrow
  {
    d: `M${CX + 1} ${CY}
       L${CX + 8} ${CY - 24} L${CX + 18} ${CY - 58} L${CX + 30} ${CY - 92}
       L${CX + 42} ${CY - 118} L${CX + 48} ${CY - 138} L${CX + 48} ${CY - 152}
       C${CX + 44} ${CY - 164}, ${CX + 34} ${CY - 166}, ${CX + 30} ${CY - 158}
       C${CX + 26} ${CY - 148}, ${CX + 34} ${CY - 140}, ${CX + 42} ${CY - 135}
       L${CX + 38} ${CY - 118} L${CX + 28} ${CY - 94}
       L${CX + 16} ${CY - 62} L${CX + 6} ${CY - 28} L${CX - 2} ${CY - 4}
       Z`,
    delay: 260,
  },

  // ---- EXTRA DENSITY PETALS ----
  // Left far-upper — tighter angle
  {
    d: `M${CX - 1} ${CY - 1}
       L${CX - 28} ${CY - 18} L${CX - 58} ${CY - 42} L${CX - 85} ${CY - 58}
       L${CX - 108} ${CY - 66} L${CX - 124} ${CY - 64} L${CX - 134} ${CY - 52}
       C${CX - 140} ${CY - 40}, ${CX - 134} ${CY - 30}, ${CX - 124} ${CY - 32}
       C${CX - 116} ${CY - 34}, ${CX - 118} ${CY - 44}, ${CX - 124} ${CY - 50}
       L${CX - 114} ${CY - 54} L${CX - 98} ${CY - 52}
       L${CX - 75} ${CY - 44} L${CX - 50} ${CY - 30} L${CX - 25} ${CY - 12}
       L${CX + 2} ${CY + 5} Z`,
    delay: 280,
  },
  // Right far-upper
  {
    d: `M${CX + 1} ${CY - 1}
       L${CX + 30} ${CY - 20} L${CX + 62} ${CY - 46} L${CX + 90} ${CY - 62}
       L${CX + 112} ${CY - 70} L${CX + 128} ${CY - 68} L${CX + 138} ${CY - 56}
       C${CX + 144} ${CY - 44}, ${CX + 138} ${CY - 34}, ${CX + 128} ${CY - 36}
       C${CX + 120} ${CY - 38}, ${CX + 122} ${CY - 48}, ${CX + 128} ${CY - 54}
       L${CX + 118} ${CY - 58} L${CX + 102} ${CY - 56}
       L${CX + 80} ${CY - 48} L${CX + 54} ${CY - 34} L${CX + 28} ${CY - 14}
       L${CX - 1} ${CY + 4} Z`,
    delay: 310,
  },
];

const petalDelays = petals.map((p) => p.delay);

// Stamens: smooth wide U-arcs. All control points stay above CY (the center)
// so nothing dips below the flower neck. Tips staggered naturally.
const stamens = [
  // ==== OUTERMOST — wide, shallow curve, control points above center ====
  { d: `M${CX} ${CY - 12} C${CX - 120} ${CY - 18}, ${CX - 260} ${CY - 25}, ${CX - 280} ${CY - 120}`, tipX: CX - 280, tipY: CY - 120, delay: 550 },
  { d: `M${CX} ${CY - 12} C${CX + 118} ${CY - 20}, ${CX + 256} ${CY - 28}, ${CX + 278} ${CY - 125}`, tipX: CX + 278, tipY: CY - 125, delay: 600 },

  // ==== WIDE ====
  { d: `M${CX} ${CY - 12} C${CX - 100} ${CY - 22}, ${CX - 235} ${CY - 35}, ${CX - 252} ${CY - 145}`, tipX: CX - 252, tipY: CY - 145, delay: 650 },
  { d: `M${CX} ${CY - 12} C${CX + 98} ${CY - 24}, ${CX + 232} ${CY - 38}, ${CX + 250} ${CY - 140}`, tipX: CX + 250, tipY: CY - 140, delay: 700 },

  // ==== MID-WIDE ====
  { d: `M${CX} ${CY - 12} C${CX - 65} ${CY - 38}, ${CX - 185} ${CY - 72}, ${CX - 205} ${CY - 165}`, tipX: CX - 205, tipY: CY - 165, delay: 750 },
  { d: `M${CX} ${CY - 12} C${CX + 62} ${CY - 40}, ${CX + 182} ${CY - 76}, ${CX + 202} ${CY - 170}`, tipX: CX + 202, tipY: CY - 170, delay: 800 },

  // ==== UPPER ====
  { d: `M${CX} ${CY - 12} C${CX - 40} ${CY - 55}, ${CX - 130} ${CY - 125}, ${CX - 142} ${CY - 180}`, tipX: CX - 142, tipY: CY - 180, delay: 850 },
  { d: `M${CX} ${CY - 12} C${CX + 38} ${CY - 58}, ${CX + 128} ${CY - 128}, ${CX + 140} ${CY - 175}`, tipX: CX + 140, tipY: CY - 175, delay: 900 },

  // ==== CENTER ====
  { d: `M${CX} ${CY - 12} C${CX - 18} ${CY - 68}, ${CX - 58} ${CY - 155}, ${CX - 55} ${CY - 188}`, tipX: CX - 55, tipY: CY - 188, delay: 950 },
  { d: `M${CX} ${CY - 12} C${CX + 16} ${CY - 70}, ${CX + 56} ${CY - 158}, ${CX + 52} ${CY - 185}`, tipX: CX + 52, tipY: CY - 185, delay: 1000 },
];

const SpiderLily = ({ className }: { className?: string }) => {
  const [bloomed, setBloomed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setBloomed(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <svg
      viewBox="-120 10 680 590"
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
        {/* Stem */}
        <path
          d={`M195 580 C198 520, 205 445, 212 380 C218 320, 220 275, ${CX} ${CY + 15}`}
          className={`spider-lily-stem ${bloomed ? 'spider-lily-stem-active' : ''}`}
          pathLength={1}
        />

        {/* Petals */}
        {petals.map((p, i) => (
          <path
            key={`petal-${i}`}
            d={p.d}
            className={`spider-lily-petal ${bloomed ? 'spider-lily-petal-active' : ''}`}
            style={{ animationDelay: `${petalDelays[i]}ms` }}
            pathLength={1}
          />
        ))}

        {/* Stamens */}
        {stamens.map((s, i) => (
          <g key={`stamen-${i}`}>
            <path
              d={s.d}
              className={`spider-lily-stamen ${bloomed ? 'spider-lily-stamen-active' : ''}`}
              style={{ animationDelay: `${s.delay}ms` }}
              filter="url(#stamen-glow)"
              pathLength={1}
            />
            <circle
              cx={s.tipX}
              cy={s.tipY}
              r="2.2"
              className={`spider-lily-anther ${bloomed ? 'spider-lily-anther-active' : ''}`}
              style={{ animationDelay: `${s.delay + 180}ms` }}
              filter="url(#stamen-glow)"
            />
          </g>
        ))}

        {/* Center */}
        <circle
          cx={CX}
          cy={CY}
          r="3"
          className={`spider-lily-center ${bloomed ? 'spider-lily-center-active' : ''}`}
        />
      </g>
    </svg>
  );
};

export { SpiderLily };
