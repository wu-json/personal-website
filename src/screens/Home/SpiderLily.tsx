import { useEffect, useState } from 'react';

/**
 * Side-view spider lily (彼岸花) — Japanese anime ink aesthetic.
 * Thin ribbon petals with tight spiral curls at the tips.
 * Dense, chaotic, overlapping. White on black.
 */

const CX = 220;
const CY = 230;

// Dense upper crown + few long swooping jellyfish tentacles below.
// W = half-width of ribbon.
const W = 4;
const petals: { d: string; delay: number }[] = [
  // ==== DENSE UPPER CROWN — many petals radiating up and outward ====

  // Top center — straight up
  {
    d: `M${CX - W} ${CY}
       C${CX - W} ${CY - 30}, ${CX - W - 2} ${CY - 70}, ${CX - W - 3} ${CY - 105}
       C${CX - W - 4} ${CY - 128}, ${CX - W + 1} ${CY - 148}, ${CX + 2} ${CY - 155}
       C${CX + W + 2} ${CY - 158}, ${CX + W + 4} ${CY - 148}, ${CX + W + 2} ${CY - 130}
       C${CX + W} ${CY - 112}, ${CX + W - 1} ${CY - 100}, ${CX + W} ${CY - 80}
       C${CX + W} ${CY - 52}, ${CX + W} ${CY - 28}, ${CX + W} ${CY} Z`,
    delay: 0,
  },
  // Top slight left lean
  {
    d: `M${CX - W} ${CY}
       C${CX - W - 5} ${CY - 28}, ${CX - W - 14} ${CY - 68}, ${CX - W - 20} ${CY - 105}
       C${CX - W - 24} ${CY - 130}, ${CX - W - 16} ${CY - 150}, ${CX - 4} ${CY - 158}
       C${CX + 6} ${CY - 162}, ${CX + 12} ${CY - 152}, ${CX + 8} ${CY - 138}
       C${CX + 4} ${CY - 124}, ${CX - 4} ${CY - 118}, ${CX + W - 16} ${CY - 102}
       C${CX + W - 10} ${CY - 68}, ${CX + W - 3} ${CY - 30}, ${CX + W} ${CY} Z`,
    delay: 50,
  },
  // Top slight right lean
  {
    d: `M${CX + W} ${CY}
       C${CX + W + 6} ${CY - 30}, ${CX + W + 16} ${CY - 72}, ${CX + W + 22} ${CY - 108}
       C${CX + W + 26} ${CY - 132}, ${CX + W + 18} ${CY - 152}, ${CX + 5} ${CY - 160}
       C${CX - 6} ${CY - 164}, ${CX - 10} ${CY - 154}, ${CX - 6} ${CY - 140}
       C${CX - 2} ${CY - 126}, ${CX + 6} ${CY - 120}, ${CX - W + 18} ${CY - 105}
       C${CX - W + 12} ${CY - 70}, ${CX - W + 4} ${CY - 32}, ${CX - W} ${CY} Z`,
    delay: 80,
  },
  // Upper-left diagonal — ~45 degrees
  {
    d: `M${CX - W} ${CY}
       C${CX - W - 12} ${CY - 22}, ${CX - W - 35} ${CY - 55}, ${CX - W - 55} ${CY - 85}
       C${CX - W - 68} ${CY - 105}, ${CX - W - 62} ${CY - 128}, ${CX - W - 48} ${CY - 138}
       C${CX - W - 35} ${CY - 145}, ${CX - W - 25} ${CY - 136}, ${CX - W - 30} ${CY - 122}
       C${CX - W - 35} ${CY - 110}, ${CX - W - 42} ${CY - 105}, ${CX + W - 50} ${CY - 90}
       C${CX + W - 32} ${CY - 58}, ${CX + W - 10} ${CY - 25}, ${CX + W} ${CY} Z`,
    delay: 120,
  },
  // Upper-right diagonal — ~45 degrees
  {
    d: `M${CX + W} ${CY}
       C${CX + W + 14} ${CY - 24}, ${CX + W + 38} ${CY - 58}, ${CX + W + 60} ${CY - 88}
       C${CX + W + 72} ${CY - 108}, ${CX + W + 66} ${CY - 132}, ${CX + W + 52} ${CY - 142}
       C${CX + W + 38} ${CY - 148}, ${CX + W + 28} ${CY - 140}, ${CX + W + 34} ${CY - 125}
       C${CX + W + 38} ${CY - 112}, ${CX + W + 46} ${CY - 108}, ${CX - W + 55} ${CY - 94}
       C${CX - W + 36} ${CY - 60}, ${CX - W + 12} ${CY - 26}, ${CX - W} ${CY} Z`,
    delay: 160,
  },
  // Far upper-left — ~60 degrees out, wide spread
  {
    d: `M${CX - W} ${CY}
       C${CX - W - 18} ${CY - 16}, ${CX - W - 52} ${CY - 40}, ${CX - W - 88} ${CY - 58}
       C${CX - W - 112} ${CY - 70}, ${CX - W - 128} ${CY - 65}, ${CX - W - 135} ${CY - 48}
       C${CX - W - 140} ${CY - 34}, ${CX - W - 130} ${CY - 28}, ${CX - W - 120} ${CY - 38}
       C${CX - W - 112} ${CY - 48}, ${CX - W - 116} ${CY - 55}, ${CX + W - 105} ${CY - 52}
       C${CX + W - 68} ${CY - 38}, ${CX + W - 28} ${CY - 18}, ${CX + W} ${CY} Z`,
    delay: 40,
  },
  // Far upper-right — ~60 degrees out
  {
    d: `M${CX + W} ${CY}
       C${CX + W + 20} ${CY - 18}, ${CX + W + 55} ${CY - 42}, ${CX + W + 92} ${CY - 62}
       C${CX + W + 116} ${CY - 74}, ${CX + W + 132} ${CY - 68}, ${CX + W + 140} ${CY - 52}
       C${CX + W + 145} ${CY - 38}, ${CX + W + 135} ${CY - 30}, ${CX + W + 124} ${CY - 40}
       C${CX + W + 116} ${CY - 50}, ${CX + W + 120} ${CY - 58}, ${CX - W + 110} ${CY - 55}
       C${CX - W + 72} ${CY - 40}, ${CX - W + 30} ${CY - 20}, ${CX - W} ${CY} Z`,
    delay: 100,
  },
  // Upper-left between 45 and 60 — fills the gap
  {
    d: `M${CX - W} ${CY}
       C${CX - W - 15} ${CY - 20}, ${CX - W - 42} ${CY - 48}, ${CX - W - 70} ${CY - 72}
       C${CX - W - 88} ${CY - 88}, ${CX - W - 85} ${CY - 110}, ${CX - W - 72} ${CY - 118}
       C${CX - W - 60} ${CY - 124}, ${CX - W - 50} ${CY - 115}, ${CX - W - 55} ${CY - 102}
       C${CX - W - 58} ${CY - 90}, ${CX - W - 65} ${CY - 85}, ${CX + W - 62} ${CY - 75}
       C${CX + W - 40} ${CY - 50}, ${CX + W - 15} ${CY - 22}, ${CX + W} ${CY} Z`,
    delay: 200,
  },
  // Upper-right between 45 and 60
  {
    d: `M${CX + W} ${CY}
       C${CX + W + 16} ${CY - 22}, ${CX + W + 45} ${CY - 50}, ${CX + W + 74} ${CY - 76}
       C${CX + W + 92} ${CY - 92}, ${CX + W + 90} ${CY - 114}, ${CX + W + 76} ${CY - 122}
       C${CX + W + 64} ${CY - 128}, ${CX + W + 54} ${CY - 118}, ${CX + W + 58} ${CY - 105}
       C${CX + W + 62} ${CY - 94}, ${CX + W + 68} ${CY - 88}, ${CX - W + 66} ${CY - 78}
       C${CX - W + 44} ${CY - 52}, ${CX - W + 16} ${CY - 24}, ${CX - W} ${CY} Z`,
    delay: 230,
  },
  // Near-horizontal left — wide spread at ~80 degrees
  {
    d: `M${CX} ${CY - W}
       C${CX - 30} ${CY - W - 6}, ${CX - 75} ${CY - W - 12}, ${CX - 115} ${CY - W - 10}
       C${CX - 142} ${CY - W - 8}, ${CX - 158} ${CY - 18}, ${CX - 160} ${CY - 32}
       C${CX - 162} ${CY - 44}, ${CX - 152} ${CY - 48}, ${CX - 145} ${CY - 38}
       C${CX - 138} ${CY - 28}, ${CX - 142} ${CY - 20}, ${CX - 125} ${CY + W - 14}
       C${CX - 82} ${CY + W - 6}, ${CX - 35} ${CY + W - 2}, ${CX} ${CY + W} Z`,
    delay: 140,
  },
  // Near-horizontal right
  {
    d: `M${CX} ${CY - W}
       C${CX + 32} ${CY - W - 8}, ${CX + 78} ${CY - W - 14}, ${CX + 120} ${CY - W - 12}
       C${CX + 148} ${CY - W - 10}, ${CX + 164} ${CY - 20}, ${CX + 166} ${CY - 35}
       C${CX + 168} ${CY - 48}, ${CX + 158} ${CY - 52}, ${CX + 150} ${CY - 42}
       C${CX + 142} ${CY - 32}, ${CX + 146} ${CY - 22}, ${CX + 130} ${CY + W - 16}
       C${CX + 86} ${CY + W - 8}, ${CX + 38} ${CY + W - 2}, ${CX} ${CY + W} Z`,
    delay: 180,
  },
  // Extra upper fill — between center and left lean
  {
    d: `M${CX - W} ${CY}
       C${CX - W - 8} ${CY - 26}, ${CX - W - 22} ${CY - 62}, ${CX - W - 32} ${CY - 95}
       C${CX - W - 38} ${CY - 118}, ${CX - W - 30} ${CY - 138}, ${CX - W - 18} ${CY - 145}
       C${CX - W - 6} ${CY - 150}, ${CX + 2} ${CY - 142}, ${CX} ${CY - 128}
       C${CX - 2} ${CY - 115}, ${CX - W - 8} ${CY - 110}, ${CX + W - 28} ${CY - 98}
       C${CX + W - 18} ${CY - 64}, ${CX + W - 6} ${CY - 28}, ${CX + W} ${CY} Z`,
    delay: 260,
  },
  // Extra upper fill — between center and right lean
  {
    d: `M${CX + W} ${CY}
       C${CX + W + 10} ${CY - 28}, ${CX + W + 25} ${CY - 65}, ${CX + W + 36} ${CY - 98}
       C${CX + W + 42} ${CY - 120}, ${CX + W + 34} ${CY - 140}, ${CX + W + 22} ${CY - 148}
       C${CX + W + 10} ${CY - 152}, ${CX + 2} ${CY - 144}, ${CX + 4} ${CY - 130}
       C${CX + 6} ${CY - 118}, ${CX + W + 10} ${CY - 112}, ${CX - W + 32} ${CY - 100}
       C${CX - W + 22} ${CY - 66}, ${CX - W + 8} ${CY - 30}, ${CX - W} ${CY} Z`,
    delay: 280,
  },

  // ==== LOWER PETALS — four ribbon curls, droop out then tips curl back up ====

  // Far left — sweeps wide left, droops, tip curls back up
  {
    d: `M${CX} ${CY + W}
       C${CX - 30} ${CY + W + 10}, ${CX - 75} ${CY + W + 30}, ${CX - 110} ${CY + W + 50}
       C${CX - 135} ${CY + W + 65}, ${CX - 148} ${CY + W + 72}, ${CX - 150} ${CY + W + 60}
       C${CX - 152} ${CY + W + 48}, ${CX - 142} ${CY + W + 38}, ${CX - 138} ${CY + W + 45}
       C${CX - 132} ${CY + 52}, ${CX - 128} ${CY + 48}, ${CX - 115} ${CY + 38}
       C${CX - 78} ${CY + 22}, ${CX - 35} ${CY + 8}, ${CX} ${CY - W} Z`,
    delay: 280,
  },
  // Far right — mirror
  {
    d: `M${CX} ${CY + W}
       C${CX + 32} ${CY + W + 12}, ${CX + 78} ${CY + W + 32}, ${CX + 114} ${CY + W + 52}
       C${CX + 140} ${CY + W + 68}, ${CX + 152} ${CY + W + 75}, ${CX + 155} ${CY + W + 62}
       C${CX + 157} ${CY + W + 50}, ${CX + 147} ${CY + W + 40}, ${CX + 142} ${CY + W + 48}
       C${CX + 136} ${CY + 54}, ${CX + 132} ${CY + 50}, ${CX + 118} ${CY + 40}
       C${CX + 82} ${CY + 24}, ${CX + 38} ${CY + 10}, ${CX} ${CY - W} Z`,
    delay: 320,
  },
  // Inner left — steeper droop, closer to center, tip curls up
  {
    d: `M${CX} ${CY + W}
       C${CX - 18} ${CY + W + 14}, ${CX - 48} ${CY + W + 40}, ${CX - 72} ${CY + W + 65}
       C${CX - 90} ${CY + W + 82}, ${CX - 100} ${CY + W + 88}, ${CX - 102} ${CY + W + 76}
       C${CX - 104} ${CY + W + 64}, ${CX - 95} ${CY + W + 56}, ${CX - 90} ${CY + W + 62}
       C${CX - 85} ${CY + 68}, ${CX - 82} ${CY + 64}, ${CX - 72} ${CY + 52}
       C${CX - 48} ${CY + 32}, ${CX - 20} ${CY + 12}, ${CX} ${CY - W} Z`,
    delay: 360,
  },
  // Inner right — mirror
  {
    d: `M${CX} ${CY + W}
       C${CX + 20} ${CY + W + 16}, ${CX + 52} ${CY + W + 42}, ${CX + 76} ${CY + W + 68}
       C${CX + 94} ${CY + W + 85}, ${CX + 104} ${CY + W + 92}, ${CX + 106} ${CY + W + 80}
       C${CX + 108} ${CY + W + 68}, ${CX + 98} ${CY + W + 58}, ${CX + 94} ${CY + W + 65}
       C${CX + 88} ${CY + 70}, ${CX + 86} ${CY + 66}, ${CX + 76} ${CY + 54}
       C${CX + 50} ${CY + 34}, ${CX + 22} ${CY + 14}, ${CX} ${CY - W} Z`,
    delay: 400,
  },
];

const petalDelays = petals.map((p) => p.delay);

// Stamens: smooth wide U-arcs. All control points stay above CY (the center)
// so nothing dips below the flower neck. Tips staggered naturally.
const stamens = [
  // ==== OUTERMOST — wide, shallow curve ====
  { d: `M${CX} ${CY - 12} C${CX - 120} ${CY - 18}, ${CX - 260} ${CY - 25}, ${CX - 280} ${CY - 120}`, tipX: CX - 280, tipY: CY - 120, delay: 0 },
  { d: `M${CX} ${CY - 12} C${CX + 118} ${CY - 20}, ${CX + 256} ${CY - 28}, ${CX + 278} ${CY - 125}`, tipX: CX + 278, tipY: CY - 125, delay: 40 },

  // ==== WIDE ====
  { d: `M${CX} ${CY - 12} C${CX - 100} ${CY - 22}, ${CX - 235} ${CY - 35}, ${CX - 252} ${CY - 145}`, tipX: CX - 252, tipY: CY - 145, delay: 80 },
  { d: `M${CX} ${CY - 12} C${CX + 98} ${CY - 24}, ${CX + 232} ${CY - 38}, ${CX + 250} ${CY - 140}`, tipX: CX + 250, tipY: CY - 140, delay: 120 },

  // ==== MID-WIDE ====
  { d: `M${CX} ${CY - 12} C${CX - 65} ${CY - 38}, ${CX - 185} ${CY - 72}, ${CX - 205} ${CY - 165}`, tipX: CX - 205, tipY: CY - 165, delay: 160 },
  { d: `M${CX} ${CY - 12} C${CX + 62} ${CY - 40}, ${CX + 182} ${CY - 76}, ${CX + 202} ${CY - 170}`, tipX: CX + 202, tipY: CY - 170, delay: 200 },

  // ==== UPPER ====
  { d: `M${CX} ${CY - 12} C${CX - 40} ${CY - 55}, ${CX - 130} ${CY - 125}, ${CX - 142} ${CY - 180}`, tipX: CX - 142, tipY: CY - 180, delay: 240 },
  { d: `M${CX} ${CY - 12} C${CX + 38} ${CY - 58}, ${CX + 128} ${CY - 128}, ${CX + 140} ${CY - 175}`, tipX: CX + 140, tipY: CY - 175, delay: 280 },

  // ==== CENTER ====
  { d: `M${CX} ${CY - 12} C${CX - 18} ${CY - 68}, ${CX - 58} ${CY - 155}, ${CX - 55} ${CY - 188}`, tipX: CX - 55, tipY: CY - 188, delay: 320 },
  { d: `M${CX} ${CY - 12} C${CX + 16} ${CY - 70}, ${CX + 56} ${CY - 158}, ${CX + 52} ${CY - 185}`, tipX: CX + 52, tipY: CY - 185, delay: 360 },
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
        {/* Stem — brush stroke: wide at flower head, trails to a wisp */}
        <path
          d={`M${CX - 7} ${CY}
              C${CX - 9} ${CY + 25}, ${CX - 10} 280, ${CX - 8} 330
              C${CX - 5} 375, ${CX - 8} 420, ${CX - 10} 470
              C${CX - 9} 515, ${CX - 6} 550, ${CX - 4} 580
              Q${CX - 3} 594, ${CX - 1} 598
              Q${CX + 2} 594, ${CX + 3} 580
              C${CX + 4} 550, ${CX + 1} 515, ${CX} 470
              C${CX - 1} 420, ${CX + 3} 375, ${CX + 5} 330
              C${CX + 7} 280, ${CX + 8} ${CY + 25}, ${CX + 7} ${CY}
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
            <circle
              cx={s.tipX}
              cy={s.tipY}
              r="2.2"
              className={`spider-lily-anther ${stamensActive ? 'spider-lily-anther-active' : ''}`}
              style={{ animationDelay: `${s.delay + STAMEN_DURATION}ms` }}
              filter="url(#stamen-glow)"
            />
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
