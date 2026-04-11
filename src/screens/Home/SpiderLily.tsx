import { useEffect, useState } from 'react';

/**
 * Side-view spider lily (彼岸花) — Japanese anime ink aesthetic.
 * Thin ribbon petals with tight spiral curls at the tips.
 * Dense, chaotic, overlapping. White on black.
 */

const CX = 220;
const CY = 230;

// Reference analysis: most petal mass droops BELOW center, curling down
// and outward like a skirt, with tips curling back up. Only 2-3 short
// petals go upward. The shape is WIDE and DROOPING, not a vertical fan.
// W = half-width of ribbon.
const W = 4;
const petals: { d: string; delay: number }[] = [
  // ==== DROOPING LEFT — the main visual mass ====
  // Far left — drops down-left, sweeps wide, tip curls up
  {
    d: `M${CX} ${CY + W}
       C${CX - 35} ${CY + W + 15}, ${CX - 80} ${CY + W + 45}, ${CX - 120} ${CY + W + 68}
       C${CX - 145} ${CY + W + 80}, ${CX - 162} ${CY + 78}, ${CX - 165} ${CY + 62}
       C${CX - 166} ${CY + 48}, ${CX - 155} ${CY + 45}, ${CX - 150} ${CY + 55}
       C${CX - 145} ${CY + 65}, ${CX - 148} ${CY + 72}, ${CX - 130} ${CY - W + 65}
       C${CX - 90} ${CY - W + 45}, ${CX - 40} ${CY - W + 18}, ${CX} ${CY - W} Z`,
    delay: 0,
  },
  // Left mid-drop — slightly less steep
  {
    d: `M${CX} ${CY + W}
       C${CX - 40} ${CY + W + 10}, ${CX - 90} ${CY + W + 30}, ${CX - 130} ${CY + W + 42}
       C${CX - 155} ${CY + W + 48}, ${CX - 170} ${CY + 38}, ${CX - 172} ${CY + 22}
       C${CX - 172} ${CY + 8}, ${CX - 162} ${CY + 5}, ${CX - 158} ${CY + 15}
       C${CX - 154} ${CY + 25}, ${CX - 158} ${CY + 32}, ${CX - 140} ${CY - W + 38}
       C${CX - 100} ${CY - W + 25}, ${CX - 45} ${CY - W + 8}, ${CX} ${CY - W} Z`,
    delay: 80,
  },
  // Left upper-drop — goes out left, slight downward, curls back
  {
    d: `M${CX} ${CY - W}
       C${CX - 42} ${CY - W - 2}, ${CX - 95} ${CY - W + 8}, ${CX - 135} ${CY - W + 18}
       C${CX - 158} ${CY - W + 25}, ${CX - 170} ${CY + 15}, ${CX - 168} ${CY}
       C${CX - 166} ${CY - 14}, ${CX - 156} ${CY - 18}, ${CX - 152} ${CY - 8}
       C${CX - 148} ${CY + 2}, ${CX - 152} ${CY + 10}, ${CX - 135} ${CY + W + 10}
       C${CX - 95} ${CY + W + 2}, ${CX - 42} ${CY + W - 2}, ${CX} ${CY + W} Z`,
    delay: 160,
  },
  // Left steep drop — goes sharply down-left
  {
    d: `M${CX} ${CY + W}
       C${CX - 25} ${CY + W + 20}, ${CX - 55} ${CY + W + 55}, ${CX - 80} ${CY + W + 85}
       C${CX - 95} ${CY + W + 100}, ${CX - 108} ${CY + 102}, ${CX - 112} ${CY + 88}
       C${CX - 115} ${CY + 75}, ${CX - 105} ${CY + 70}, ${CX - 100} ${CY + 80}
       C${CX - 95} ${CY + 90}, ${CX - 98} ${CY + 95}, ${CX - 78} ${CY - W + 82}
       C${CX - 52} ${CY - W + 55}, ${CX - 25} ${CY - W + 22}, ${CX} ${CY - W} Z`,
    delay: 240,
  },

  // ==== DROOPING RIGHT — mirror mass ====
  // Far right drop
  {
    d: `M${CX} ${CY + W}
       C${CX + 38} ${CY + W + 16}, ${CX + 85} ${CY + W + 48}, ${CX + 125} ${CY + W + 72}
       C${CX + 150} ${CY + W + 84}, ${CX + 168} ${CY + 80}, ${CX + 170} ${CY + 64}
       C${CX + 172} ${CY + 50}, ${CX + 160} ${CY + 46}, ${CX + 155} ${CY + 56}
       C${CX + 150} ${CY + 66}, ${CX + 152} ${CY + 74}, ${CX + 135} ${CY - W + 68}
       C${CX + 95} ${CY - W + 48}, ${CX + 42} ${CY - W + 20}, ${CX} ${CY - W} Z`,
    delay: 40,
  },
  // Right mid-drop
  {
    d: `M${CX} ${CY + W}
       C${CX + 42} ${CY + W + 12}, ${CX + 95} ${CY + W + 32}, ${CX + 135} ${CY + W + 44}
       C${CX + 160} ${CY + W + 50}, ${CX + 175} ${CY + 40}, ${CX + 178} ${CY + 24}
       C${CX + 178} ${CY + 10}, ${CX + 168} ${CY + 6}, ${CX + 162} ${CY + 16}
       C${CX + 158} ${CY + 26}, ${CX + 162} ${CY + 34}, ${CX + 145} ${CY - W + 40}
       C${CX + 105} ${CY - W + 28}, ${CX + 48} ${CY - W + 10}, ${CX} ${CY - W} Z`,
    delay: 120,
  },
  // Right upper-drop
  {
    d: `M${CX} ${CY - W}
       C${CX + 45} ${CY - W - 4}, ${CX + 100} ${CY - W + 5}, ${CX + 140} ${CY - W + 15}
       C${CX + 162} ${CY - W + 22}, ${CX + 175} ${CY + 12}, ${CX + 172} ${CY - 2}
       C${CX + 170} ${CY - 16}, ${CX + 160} ${CY - 20}, ${CX + 156} ${CY - 10}
       C${CX + 152} ${CY}, ${CX + 156} ${CY + 8}, ${CX + 140} ${CY + W + 8}
       C${CX + 100} ${CY + W}, ${CX + 45} ${CY + W - 4}, ${CX} ${CY + W} Z`,
    delay: 200,
  },
  // Right steep drop
  {
    d: `M${CX} ${CY + W}
       C${CX + 28} ${CY + W + 22}, ${CX + 58} ${CY + W + 58}, ${CX + 85} ${CY + W + 88}
       C${CX + 100} ${CY + W + 104}, ${CX + 112} ${CY + 105}, ${CX + 116} ${CY + 90}
       C${CX + 118} ${CY + 78}, ${CX + 108} ${CY + 72}, ${CX + 104} ${CY + 82}
       C${CX + 100} ${CY + 92}, ${CX + 102} ${CY + 98}, ${CX + 82} ${CY - W + 85}
       C${CX + 56} ${CY - W + 58}, ${CX + 28} ${CY - W + 24}, ${CX} ${CY - W} Z`,
    delay: 280,
  },

  // ==== UPPER — spreading out wide at various angles ====
  // Upper far-left — goes up and out left, curls back
  {
    d: `M${CX - W} ${CY}
       C${CX - W - 15} ${CY - 18}, ${CX - W - 45} ${CY - 45}, ${CX - W - 78} ${CY - 62}
       C${CX - W - 100} ${CY - 72}, ${CX - W - 118} ${CY - 68}, ${CX - W - 125} ${CY - 52}
       C${CX - W - 130} ${CY - 38}, ${CX - W - 120} ${CY - 32}, ${CX - W - 112} ${CY - 42}
       C${CX - W - 105} ${CY - 52}, ${CX - W - 108} ${CY - 58}, ${CX + W - 95} ${CY - 55}
       C${CX + W - 60} ${CY - 42}, ${CX + W - 25} ${CY - 20}, ${CX + W} ${CY} Z`,
    delay: 60,
  },
  // Upper far-right — mirror
  {
    d: `M${CX + W} ${CY}
       C${CX + W + 18} ${CY - 20}, ${CX + W + 48} ${CY - 48}, ${CX + W + 82} ${CY - 66}
       C${CX + W + 105} ${CY - 76}, ${CX + W + 122} ${CY - 72}, ${CX + W + 130} ${CY - 55}
       C${CX + W + 135} ${CY - 42}, ${CX + W + 125} ${CY - 34}, ${CX + W + 116} ${CY - 44}
       C${CX + W + 108} ${CY - 54}, ${CX + W + 112} ${CY - 62}, ${CX - W + 100} ${CY - 58}
       C${CX - W + 65} ${CY - 45}, ${CX - W + 28} ${CY - 22}, ${CX - W} ${CY} Z`,
    delay: 130,
  },
  // Upper-left diagonal — steeper
  {
    d: `M${CX - W} ${CY}
       C${CX - W - 10} ${CY - 25}, ${CX - W - 28} ${CY - 62}, ${CX - W - 42} ${CY - 95}
       C${CX - W - 52} ${CY - 118}, ${CX - W - 48} ${CY - 140}, ${CX - W - 35} ${CY - 148}
       C${CX - W - 22} ${CY - 155}, ${CX - W - 12} ${CY - 145}, ${CX - W - 16} ${CY - 132}
       C${CX - W - 20} ${CY - 120}, ${CX - W - 28} ${CY - 115}, ${CX + W - 38} ${CY - 100}
       C${CX + W - 25} ${CY - 65}, ${CX + W - 8} ${CY - 28}, ${CX + W} ${CY} Z`,
    delay: 100,
  },
  // Upper-right diagonal — steeper
  {
    d: `M${CX + W} ${CY}
       C${CX + W + 12} ${CY - 28}, ${CX + W + 32} ${CY - 65}, ${CX + W + 48} ${CY - 98}
       C${CX + W + 58} ${CY - 122}, ${CX + W + 54} ${CY - 144}, ${CX + W + 40} ${CY - 152}
       C${CX + W + 28} ${CY - 158}, ${CX + W + 16} ${CY - 148}, ${CX + W + 20} ${CY - 135}
       C${CX + W + 24} ${CY - 122}, ${CX + W + 32} ${CY - 118}, ${CX - W + 42} ${CY - 104}
       C${CX - W + 28} ${CY - 68}, ${CX - W + 10} ${CY - 30}, ${CX - W} ${CY} Z`,
    delay: 190,
  },
  // Top left-lean
  {
    d: `M${CX - W} ${CY}
       C${CX - W - 3} ${CY - 30}, ${CX - W - 10} ${CY - 72}, ${CX - W - 14} ${CY - 108}
       C${CX - W - 16} ${CY - 132}, ${CX - W - 8} ${CY - 150}, ${CX + 2} ${CY - 155}
       C${CX + 10} ${CY - 158}, ${CX + 14} ${CY - 148}, ${CX + 10} ${CY - 135}
       C${CX + 6} ${CY - 122}, ${CX - 2} ${CY - 118}, ${CX + W - 10} ${CY - 105}
       C${CX + W - 6} ${CY - 72}, ${CX + W - 1} ${CY - 30}, ${CX + W} ${CY} Z`,
    delay: 50,
  },
  // Top right-lean
  {
    d: `M${CX + W} ${CY}
       C${CX + W + 5} ${CY - 32}, ${CX + W + 14} ${CY - 75}, ${CX + W + 18} ${CY - 112}
       C${CX + W + 20} ${CY - 135}, ${CX + W + 12} ${CY - 152}, ${CX + 2} ${CY - 158}
       C${CX - 8} ${CY - 162}, ${CX - 12} ${CY - 152}, ${CX - 8} ${CY - 138}
       C${CX - 4} ${CY - 125}, ${CX + 4} ${CY - 120}, ${CX - W + 14} ${CY - 108}
       C${CX - W + 10} ${CY - 75}, ${CX - W + 3} ${CY - 32}, ${CX - W} ${CY} Z`,
    delay: 150,
  },
  // Top center
  {
    d: `M${CX - W} ${CY}
       C${CX - W} ${CY - 28}, ${CX - W - 3} ${CY - 65}, ${CX - W - 5} ${CY - 98}
       C${CX - W - 6} ${CY - 120}, ${CX - W} ${CY - 138}, ${CX + 2} ${CY - 142}
       C${CX + W + 2} ${CY - 145}, ${CX + W + 5} ${CY - 135}, ${CX + W + 3} ${CY - 122}
       C${CX + W} ${CY - 108}, ${CX + W - 2} ${CY - 102}, ${CX + W} ${CY - 85}
       C${CX + W} ${CY - 58}, ${CX + W} ${CY - 28}, ${CX + W} ${CY} Z`,
    delay: 220,
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
