import React from 'react';
import { NormalizedPoint } from '../utils/traceElements';

export interface SpiderSeries {
  name: string;
  color: string;
  points: NormalizedPoint[];
}

interface SpiderDiagramProps {
  /** Elements along the x axis, in plotting order. */
  order: readonly string[];
  series: SpiderSeries[];
  yLabel: string;
  /** Caption naming the normalizing composition. */
  caption: string;
}

const W = 640;
const H = 300;
const M = { top: 14, right: 14, bottom: 34, left: 52 };

/**
 * Normalized multi-element ("spider") diagram on a log scale. A line is
 * broken where an element is missing rather than drawn across the gap, so a
 * missing analysis never looks like a smooth pattern.
 */
export const SpiderDiagram: React.FC<SpiderDiagramProps> = ({ order, series, yLabel, caption }) => {
  const values = series.flatMap((s) => s.points.map((p) => p.value));
  if (values.length === 0) {
    return <p className="text-xs text-stone-500">No trace-element data to plot.</p>;
  }
  const lo = Math.floor(Math.log10(Math.min(...values)));
  const hi = Math.max(lo + 1, Math.ceil(Math.log10(Math.max(...values))));
  const pw = W - M.left - M.right;
  const ph = H - M.top - M.bottom;
  const x = (i: number) => M.left + (order.length === 1 ? pw / 2 : (i / (order.length - 1)) * pw);
  const y = (v: number) => M.top + ph - ((Math.log10(v) - lo) / (hi - lo)) * ph;
  const decades = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`${yLabel} spider diagram`}>
        {decades.map((d) => (
          <g key={d}>
            <line x1={M.left} x2={W - M.right} y1={y(10 ** d)} y2={y(10 ** d)} stroke="currentColor" strokeOpacity={0.15} />
            <text x={M.left - 6} y={y(10 ** d) + 3} textAnchor="end" fontSize={10} fill="currentColor" fillOpacity={0.7}>
              {10 ** d >= 1 ? (10 ** d).toLocaleString() : (10 ** d).toString()}
            </text>
          </g>
        ))}
        {order.map((el, i) => (
          <text key={el} x={x(i)} y={H - M.bottom + 14} textAnchor="middle" fontSize={10} fill="currentColor" fillOpacity={0.8}>
            {el}
          </text>
        ))}
        <text
          transform={`translate(12 ${M.top + ph / 2}) rotate(-90)`}
          textAnchor="middle"
          fontSize={10}
          fill="currentColor"
          fillOpacity={0.8}
        >
          {yLabel}
        </text>
        {series.map((s) => {
          const idx = new Map(s.points.map((p) => [p.element, p.value]));
          // Split into runs of consecutive elements that are present.
          const runs: Array<Array<[number, number]>> = [];
          let run: Array<[number, number]> = [];
          order.forEach((el, i) => {
            const v = idx.get(el);
            if (v === undefined) {
              if (run.length) runs.push(run);
              run = [];
            } else run.push([x(i), y(v)]);
          });
          if (run.length) runs.push(run);
          return (
            <g key={s.name} stroke={s.color} fill={s.color}>
              <title>{s.name}</title>
              {runs.map((r, k) =>
                r.length > 1 ? (
                  <polyline key={k} points={r.map((p) => p.join(',')).join(' ')} fill="none" strokeWidth={1.5} />
                ) : null
              )}
              {runs.flat().map(([px, py], k) => (
                <circle key={k} cx={px} cy={py} r={2.5} />
              ))}
            </g>
          );
        })}
      </svg>
      <figcaption className="text-[10px] text-stone-500">{caption}</figcaption>
    </figure>
  );
};
