import { useEffect, useState } from 'react';

/**
 * Side-view spider lily (彼岸花) — Japanese ink/anime aesthetic.
 * Solid white filled petals with irregular widths and aggressive curling tips.
 * Graceful curved stamens. Stem leans naturally.
 */

const CX = 218;
const CY = 195;

// Each petal is a closed filled shape — ribbon-like, wider in the middle,
// tapering at base and tip, with a tight curl at the end.
// Irregularity in widths and angles makes it feel hand-drawn.
const petals: { d: string; delay: number }[] = [
  // === FAR LEFT — wide sweep, aggressive curl down ===
  {
    d: `M${CX} ${CY} C${CX - 15} ${CY - 2}, ${CX - 45} ${CY - 8}, ${CX - 80} ${CY - 6}
       C${CX - 105} ${CY - 4}, ${CX - 128} ${CY + 2}, ${CX - 140} ${CY + 15}
       C${CX - 148} ${CY + 25}, ${CX - 145} ${CY + 35}, ${CX - 135} ${CY + 32}
       C${CX - 125} ${CY + 28}, ${CX - 128} ${CY + 18}, ${CX - 122} ${CY + 8}
       C${CX - 110} ${CY - 2}, ${CX - 82} ${CY - 2}, ${CX - 55} ${CY + 2}
       C${CX - 30} ${CY + 5}, ${CX - 10} ${CY + 4}, ${CX} ${CY} Z`,
    delay: 0,
  },
  // Left-upper sweep with tight hook
  {
    d: `M${CX} ${CY} C${CX - 12} ${CY - 8}, ${CX - 38} ${CY - 22}, ${CX - 68} ${CY - 30}
       C${CX - 92} ${CY - 35}, ${CX - 115} ${CY - 32}, ${CX - 130} ${CY - 20}
       C${CX - 140} ${CY - 10}, ${CX - 142} ${CY + 2}, ${CX - 132} ${CY + 5}
       C${CX - 122} ${CY + 6}, ${CX - 120} ${CY - 5}, ${CX - 112} ${CY - 15}
       C${CX - 98} ${CY - 28}, ${CX - 72} ${CY - 25}, ${CX - 48} ${CY - 18}
       C${CX - 25} ${CY - 10}, ${CX - 8} ${CY - 3}, ${CX} ${CY} Z`,
    delay: 80,
  },
  // Left-low sweep curling under
  {
    d: `M${CX} ${CY} C${CX - 10} ${CY + 4}, ${CX - 35} ${CY + 14}, ${CX - 62} ${CY + 22}
       C${CX - 85} ${CY + 28}, ${CX - 105} ${CY + 35}, ${CX - 115} ${CY + 48}
       C${CX - 120} ${CY + 58}, ${CX - 115} ${CY + 65}, ${CX - 105} ${CY + 60}
       C${CX - 98} ${CY + 55}, ${CX - 100} ${CY + 45}, ${CX - 95} ${CY + 35}
       C${CX - 85} ${CY + 22}, ${CX - 60} ${CY + 18}, ${CX - 38} ${CY + 12}
       C${CX - 18} ${CY + 6}, ${CX - 5} ${CY + 2}, ${CX} ${CY} Z`,
    delay: 160,
  },

  // === FAR RIGHT — mirror-ish but irregular ===
  {
    d: `M${CX} ${CY} C${CX + 18} ${CY - 4}, ${CX + 50} ${CY - 12}, ${CX + 85} ${CY - 10}
       C${CX + 108} ${CY - 8}, ${CX + 130} ${CY - 2}, ${CX + 142} ${CY + 10}
       C${CX + 150} ${CY + 20}, ${CX + 148} ${CY + 32}, ${CX + 138} ${CY + 30}
       C${CX + 128} ${CY + 26}, ${CX + 130} ${CY + 14}, ${CX + 125} ${CY + 4}
       C${CX + 112} ${CY - 4}, ${CX + 85} ${CY - 4}, ${CX + 58} ${CY}
       C${CX + 32} ${CY + 3}, ${CX + 12} ${CY + 2}, ${CX} ${CY} Z`,
    delay: 50,
  },
  // Right-upper with curl
  {
    d: `M${CX} ${CY} C${CX + 14} ${CY - 10}, ${CX + 42} ${CY - 25}, ${CX + 72} ${CY - 35}
       C${CX + 95} ${CY - 40}, ${CX + 118} ${CY - 36}, ${CX + 132} ${CY - 22}
       C${CX + 142} ${CY - 12}, ${CX + 144} ${CY}, ${CX + 134} ${CY + 2}
       C${CX + 124} ${CY + 2}, ${CX + 122} ${CY - 8}, ${CX + 115} ${CY - 18}
       C${CX + 100} ${CY - 30}, ${CX + 75} ${CY - 28}, ${CX + 50} ${CY - 20}
       C${CX + 28} ${CY - 12}, ${CX + 10} ${CY - 4}, ${CX} ${CY} Z`,
    delay: 130,
  },
  // Right-low curling under
  {
    d: `M${CX} ${CY} C${CX + 12} ${CY + 5}, ${CX + 38} ${CY + 16}, ${CX + 65} ${CY + 25}
       C${CX + 88} ${CY + 32}, ${CX + 108} ${CY + 40}, ${CX + 118} ${CY + 52}
       C${CX + 124} ${CY + 62}, ${CX + 118} ${CY + 68}, ${CX + 108} ${CY + 62}
       C${CX + 100} ${CY + 55}, ${CX + 102} ${CY + 45}, ${CX + 98} ${CY + 38}
       C${CX + 88} ${CY + 25}, ${CX + 62} ${CY + 20}, ${CX + 40} ${CY + 14}
       C${CX + 20} ${CY + 8}, ${CX + 6} ${CY + 3}, ${CX} ${CY} Z`,
    delay: 200,
  },

  // === UPPER — rise and hook back ===
  {
    d: `M${CX} ${CY} C${CX - 5} ${CY - 12}, ${CX - 15} ${CY - 38}, ${CX - 22} ${CY - 62}
       C${CX - 28} ${CY - 82}, ${CX - 30} ${CY - 100}, ${CX - 25} ${CY - 110}
       C${CX - 20} ${CY - 118}, ${CX - 12} ${CY - 115}, ${CX - 12} ${CY - 105}
       C${CX - 12} ${CY - 95}, ${CX - 18} ${CY - 88}, ${CX - 18} ${CY - 72}
       C${CX - 16} ${CY - 50}, ${CX - 8} ${CY - 28}, ${CX - 2} ${CY - 8}
       L${CX} ${CY} Z`,
    delay: 100,
  },
  {
    d: `M${CX} ${CY} C${CX + 6} ${CY - 14}, ${CX + 18} ${CY - 42}, ${CX + 26} ${CY - 68}
       C${CX + 32} ${CY - 88}, ${CX + 34} ${CY - 105}, ${CX + 28} ${CY - 115}
       C${CX + 22} ${CY - 122}, ${CX + 14} ${CY - 118}, ${CX + 15} ${CY - 108}
       C${CX + 16} ${CY - 98}, ${CX + 22} ${CY - 90}, ${CX + 22} ${CY - 75}
       C${CX + 20} ${CY - 52}, ${CX + 12} ${CY - 30}, ${CX + 4} ${CY - 10}
       L${CX} ${CY} Z`,
    delay: 170,
  },

  // === UPPER-DIAGONAL — aggressive angular ===
  {
    d: `M${CX} ${CY} C${CX - 10} ${CY - 10}, ${CX - 30} ${CY - 35}, ${CX - 48} ${CY - 58}
       C${CX - 62} ${CY - 75}, ${CX - 72} ${CY - 90}, ${CX - 70} ${CY - 100}
       C${CX - 68} ${CY - 108}, ${CX - 60} ${CY - 108}, ${CX - 58} ${CY - 98}
       C${CX - 56} ${CY - 88}, ${CX - 60} ${CY - 78}, ${CX - 52} ${CY - 65}
       C${CX - 40} ${CY - 45}, ${CX - 22} ${CY - 25}, ${CX - 5} ${CY - 5}
       L${CX} ${CY} Z`,
    delay: 140,
  },
  {
    d: `M${CX} ${CY} C${CX + 12} ${CY - 12}, ${CX + 35} ${CY - 38}, ${CX + 55} ${CY - 62}
       C${CX + 68} ${CY - 78}, ${CX + 78} ${CY - 92}, ${CX + 75} ${CY - 102}
       C${CX + 72} ${CY - 110}, ${CX + 64} ${CY - 108}, ${CX + 62} ${CY - 98}
       C${CX + 60} ${CY - 88}, ${CX + 65} ${CY - 78}, ${CX + 58} ${CY - 65}
       C${CX + 45} ${CY - 48}, ${CX + 25} ${CY - 28}, ${CX + 8} ${CY - 8}
       L${CX} ${CY} Z`,
    delay: 220,
  },
];

const petalDelays = petals.map((p) => p.delay);

// Stamens: graceful curves, not straight lines. Thin, elegant arcs.
const stamens = [
  { d: `M${CX} ${CY - 5} C${CX - 12} ${CY - 45}, ${CX - 30} ${CY - 100}, ${CX - 55} ${CY - 155} C${CX - 65} ${CY - 180}, ${CX - 72} ${CY - 200}, ${CX - 75} ${CY - 215}`, tipX: CX - 75, tipY: CY - 215, delay: 550 },
  { d: `M${CX} ${CY - 5} C${CX + 10} ${CY - 48}, ${CX + 28} ${CY - 105}, ${CX + 50} ${CY - 158} C${CX + 60} ${CY - 182}, ${CX + 68} ${CY - 202}, ${CX + 72} ${CY - 218}`, tipX: CX + 72, tipY: CY - 218, delay: 620 },
  { d: `M${CX} ${CY - 5} C${CX - 5} ${CY - 50}, ${CX - 12} ${CY - 110}, ${CX - 20} ${CY - 168} C${CX - 24} ${CY - 195}, ${CX - 26} ${CY - 215}, ${CX - 25} ${CY - 232}`, tipX: CX - 25, tipY: CY - 232, delay: 690 },
  { d: `M${CX} ${CY - 5} C${CX + 5} ${CY - 52}, ${CX + 14} ${CY - 112}, ${CX + 22} ${CY - 170} C${CX + 26} ${CY - 198}, ${CX + 28} ${CY - 218}, ${CX + 28} ${CY - 235}`, tipX: CX + 28, tipY: CY - 235, delay: 760 },
  { d: `M${CX} ${CY - 5} C${CX - 20} ${CY - 38}, ${CX - 52} ${CY - 82}, ${CX - 85} ${CY - 125} C${CX - 100} ${CY - 145}, ${CX - 112} ${CY - 160}, ${CX - 120} ${CY - 172}`, tipX: CX - 120, tipY: CY - 172, delay: 830 },
  { d: `M${CX} ${CY - 5} C${CX + 18} ${CY - 40}, ${CX + 48} ${CY - 85}, ${CX + 80} ${CY - 128} C${CX + 95} ${CY - 148}, ${CX + 108} ${CY - 165}, ${CX + 115} ${CY - 175}`, tipX: CX + 115, tipY: CY - 175, delay: 900 },
];

const SpiderLily = ({ className }: { className?: string }) => {
  const [bloomed, setBloomed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setBloomed(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <svg
      viewBox="10 -60 400 580"
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
        {/* Stem — natural lean */}
        <path
          d={`M188 520 C190 475, 195 410, 200 350 C206 290, 214 245, ${CX} ${CY + 12}`}
          className={`spider-lily-stem ${bloomed ? 'spider-lily-stem-active' : ''}`}
          pathLength={1}
        />

        {/* Bracts */}
        <path
          d={`M${CX - 1} ${CY + 6} C${CX - 8} ${CY + 15}, ${CX - 14} ${CY + 28}, ${CX - 18} ${CY + 40}`}
          className={`spider-lily-bract ${bloomed ? 'spider-lily-bract-active' : ''}`}
          style={{ animationDelay: '120ms' }}
          pathLength={1}
        />
        <path
          d={`M${CX + 1} ${CY + 6} C${CX + 6} ${CY + 15}, ${CX + 10} ${CY + 28}, ${CX + 12} ${CY + 40}`}
          className={`spider-lily-bract ${bloomed ? 'spider-lily-bract-active' : ''}`}
          style={{ animationDelay: '150ms' }}
          pathLength={1}
        />

        {/* Petals — solid white filled shapes */}
        {petals.map((p, i) => (
          <path
            key={`petal-${i}`}
            d={p.d}
            className={`spider-lily-petal ${bloomed ? 'spider-lily-petal-active' : ''}`}
            style={{ animationDelay: `${petalDelays[i]}ms` }}
            pathLength={1}
          />
        ))}

        {/* Stamens — graceful curves */}
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
