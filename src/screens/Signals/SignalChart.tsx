/**
 * Inline SVG charts for signal bodies, authored as a ```chart fenced block
 * whose body is a JSON spec (see `ChartSpec`). Rendered by `MarkdownBody`.
 *
 * Monochrome on purpose: every mark takes its color from the ink tokens in
 * index.css, so a chart tracks the theme the same way the prose does.
 * Container styles live under `.signal-chart` in index.css.
 *
 * @see AGENTS.md → "Signals markdown reference" → Charts
 */
import type { ReactNode } from 'react';

type Tone = 'ink' | 'soft' | 'faint' | 'ghost';

type DumbbellSpec = {
  type: 'dumbbell';
  caption?: string;
  /** Legend labels for the start and end dots. */
  from: string;
  to: string;
  /** Small muted note at the end of the legend row (e.g. sample size). */
  note?: string;
  domain: [number, number];
  ticks: number[];
  /** Decimal places for tick and value labels (default 3 for values). */
  precision?: number;
  rows: {
    label: string;
    /** Sub-label at the right edge of the label column (e.g. an arm). */
    group?: string;
    from: number;
    to: number;
  }[];
};

type LineSeries = {
  label: string;
  tone?: Tone;
  dash?: boolean;
  /** Dots at each point: none (default), solid, or hollow. */
  markers?: 'none' | 'solid' | 'hollow';
  /** Print each point's y value beside its marker. */
  annotate?: boolean;
  points: [number, number][];
};

type LineSpec = {
  type: 'line';
  caption?: string;
  note?: string;
  x: { domain: [number, number]; ticks: number[]; labels?: string[] };
  y: { domain: [number, number]; ticks: number[]; precision?: number };
  series: LineSeries[];
};

export type ChartSpec = DumbbellSpec | LineSpec;

const W = 672;
const TONES: Record<Tone, string> = {
  ink: 'var(--color-ink)',
  soft: 'var(--color-ink-soft)',
  faint: 'var(--color-ink-faint)',
  ghost: 'var(--color-ink-ghost)',
};
const AXIS = 'var(--color-ink-hair)';
const SURFACE = 'var(--color-surface)';

const fmt = (v: number, precision: number) => v.toFixed(precision);

function Legend({
  items,
  note,
}: {
  items: { swatch: ReactNode; label: string }[];
  note?: string;
}) {
  return (
    <div className='signal-chart-legend'>
      {items.map(item => (
        <span key={item.label}>
          {item.swatch}
          {item.label}
        </span>
      ))}
      {note && <span className='signal-chart-note'>{note}</span>}
    </div>
  );
}

const Dot = ({ tone }: { tone: Tone }) => (
  <b className='signal-chart-swatch-dot' style={{ background: TONES[tone] }} />
);

const Line = ({
  tone,
  dash,
  hollow,
}: {
  tone: Tone;
  dash?: boolean;
  hollow?: boolean;
}) => (
  <i
    className='signal-chart-swatch-line'
    style={{
      borderTopColor: TONES[tone],
      borderTopStyle: dash ? 'dashed' : 'solid',
    }}
  >
    {hollow && <b style={{ borderColor: TONES[tone] }} />}
  </i>
);

function Dumbbell({ spec }: { spec: DumbbellSpec }) {
  const L = 176;
  const R = 48;
  const rowH = 24;
  const top = 22;
  const precision = spec.precision ?? 3;
  const H = top + spec.rows.length * rowH + 28;
  const [lo, hi] = spec.domain;
  const x = (v: number) => L + ((v - lo) / (hi - lo)) * (W - L - R);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role='img' aria-label={spec.caption}>
      {spec.ticks.map(t => (
        <g key={t}>
          <line x1={x(t)} y1={top - 8} x2={x(t)} y2={H - 22} stroke={AXIS} />
          <text x={x(t)} y={H - 6} textAnchor='middle'>
            {fmt(t, 1)}
          </text>
        </g>
      ))}
      {spec.rows.map((row, i) => {
        const y = top + i * rowH + rowH / 2;
        const firstOfLabel = i === 0 || spec.rows[i - 1].label !== row.label;
        return (
          <g key={`${row.label}-${row.group ?? ''}`}>
            {firstOfLabel && (
              <text x={0} y={y + 4} style={{ fill: TONES.soft }}>
                {row.label}
              </text>
            )}
            {row.group && (
              <text
                x={L - 12}
                y={y + 4}
                textAnchor='end'
                style={{ fill: TONES.ghost }}
              >
                {row.group}
              </text>
            )}
            <line
              x1={x(row.from)}
              y1={y}
              x2={x(row.to)}
              y2={y}
              stroke={TONES.faint}
              strokeWidth={1.5}
            />
            <circle cx={x(row.from)} cy={y} r={4.5} fill={TONES.faint} />
            <circle cx={x(row.to)} cy={y} r={4.5} fill={TONES.ink} />
            <text
              x={x(Math.min(row.from, row.to)) - 10}
              y={y + 4}
              textAnchor='end'
            >
              {fmt(Math.min(row.from, row.to), precision)}
            </text>
            <text
              x={x(Math.max(row.from, row.to)) + 10}
              y={y + 4}
              style={{ fill: TONES.ink }}
            >
              {fmt(Math.max(row.from, row.to), precision)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function LineChart({ spec }: { spec: LineSpec }) {
  const H = 220;
  const L = 36;
  const R = 12;
  const T = 14;
  const B = 26;
  const [x0, x1] = spec.x.domain;
  const [y0, y1] = spec.y.domain;
  const precision = spec.y.precision ?? 1;
  const xs = (v: number) => L + 14 + ((v - x0) / (x1 - x0)) * (W - L - R - 28);
  const ys = (v: number) => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  const path = (pts: [number, number][]) =>
    pts.map((p, i) => `${i ? 'L' : 'M'}${xs(p[0])} ${ys(p[1])}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role='img' aria-label={spec.caption}>
      {spec.y.ticks.map(t => (
        <g key={t}>
          <line x1={L} y1={ys(t)} x2={W - R} y2={ys(t)} stroke={AXIS} />
          <text x={L - 8} y={ys(t) + 4} textAnchor='end'>
            {fmt(t, precision)}
          </text>
        </g>
      ))}
      {spec.x.ticks.map((t, i) => (
        <text key={t} x={xs(t)} y={H - 6} textAnchor='middle'>
          {spec.x.labels?.[i] ?? t}
        </text>
      ))}
      {spec.series.map(s => {
        const color = TONES[s.tone ?? 'ink'];
        return (
          <g key={s.label}>
            <path
              d={path(s.points)}
              fill='none'
              stroke={color}
              strokeWidth={1.5}
              strokeLinejoin='round'
              strokeDasharray={s.dash ? '3 4' : undefined}
            />
            {s.markers &&
              s.markers !== 'none' &&
              s.points.map(p => (
                <circle
                  key={p[0]}
                  cx={xs(p[0])}
                  cy={ys(p[1])}
                  r={4}
                  fill={s.markers === 'hollow' ? SURFACE : color}
                  stroke={s.markers === 'hollow' ? TONES.ink : undefined}
                  strokeWidth={s.markers === 'hollow' ? 1.5 : undefined}
                />
              ))}
            {s.annotate &&
              s.points.map(p => (
                <text
                  key={p[0]}
                  x={xs(p[0]) + 9}
                  y={ys(p[1]) - 9}
                  style={{ fill: TONES.soft }}
                >
                  {fmt(p[1], 3)}
                </text>
              ))}
          </g>
        );
      })}
    </svg>
  );
}

function legendFor(spec: ChartSpec) {
  if (spec.type === 'dumbbell') {
    return [
      { swatch: <Dot tone='faint' />, label: spec.from },
      { swatch: <Dot tone='ink' />, label: spec.to },
    ];
  }
  return spec.series.map(s => ({
    swatch: (
      <Line
        tone={s.tone ?? 'ink'}
        dash={s.dash}
        hollow={s.markers === 'hollow'}
      />
    ),
    label: s.label,
  }));
}

function parseSpec(source: string): ChartSpec {
  const spec = JSON.parse(source) as Partial<ChartSpec>;
  if (spec.type !== 'dumbbell' && spec.type !== 'line')
    throw new Error(`unknown chart type "${String(spec.type)}"`);
  return spec as ChartSpec;
}

const SignalChart = ({ source }: { source: string }) => {
  let spec: ChartSpec;
  try {
    spec = parseSpec(source);
  } catch (err) {
    return (
      <pre>
        <code>
          chart error: {err instanceof Error ? err.message : `${err}`}
        </code>
      </pre>
    );
  }
  return (
    <figure className='signal-chart'>
      <Legend items={legendFor(spec)} note={spec.note} />
      <div className='signal-chart-scroll'>
        {spec.type === 'dumbbell' ? (
          <Dumbbell spec={spec} />
        ) : (
          <LineChart spec={spec} />
        )}
      </div>
      {spec.caption && <figcaption>{spec.caption}</figcaption>}
    </figure>
  );
};

export { SignalChart };
