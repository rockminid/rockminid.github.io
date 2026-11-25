import React, { useState } from 'react';
import { Activity } from 'lucide-react';
import { BatchRowResult } from '../types/geochem';
import {
  CHONDRITE_SM89,
  PM_ORDER,
  PRIMITIVE_MANTLE_SM89,
  REE,
  normalize,
  withMajorElements,
} from '../utils/traceElements';
import { SpiderDiagram } from './SpiderDiagram';

/** Distinct, colour-blind-safe series colours (Okabe & Ito), repeated as needed. */
const COLORS = ['#E69F00', '#56B4E9', '#009E73', '#F0E442', '#0072B2', '#D55E00', '#CC79A7', '#999999'];

/** Spider diagrams of every batch row that carries trace elements. */
export const BatchSpiderPanel: React.FC<{ results: BatchRowResult[] }> = ({ results }) => {
  const [plot, setPlot] = useState<'ree' | 'pm'>('ree');
  const rows = results.filter((r) => r.traceElements);

  const series = rows.map((r, i) => ({
    name: r.sampleId,
    color: COLORS[i % COLORS.length],
    points:
      plot === 'ree'
        ? normalize(r.traceElements!, CHONDRITE_SM89, REE)
        : normalize(withMajorElements(r.traceElements!, r.rawOxides), PRIMITIVE_MANTLE_SM89, PM_ORDER),
  }));

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-bold text-stone-200 uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400" />
          Trace-element patterns ({rows.length} samples)
        </h3>
        <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-lg border border-stone-800 text-xs">
          {(
            [
              ['ree', 'REE / chondrite'],
              ['pm', 'Multi-element / primitive mantle'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPlot(id)}
              className={`px-2.5 py-1 rounded-md font-medium ${
                plot === id ? 'bg-amber-600 text-white' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="text-stone-300">
        <SpiderDiagram
          order={plot === 'ree' ? REE : PM_ORDER}
          series={series}
          yLabel={plot === 'ree' ? 'Sample / CI chondrite' : 'Sample / primitive mantle'}
          caption={`Normalized to ${
            plot === 'ree' ? 'CI chondrite' : 'primitive mantle'
          }, Sun & McDonough (1989), doi:10.1144/GSL.SP.1989.042.01.19. Hover a line for its sample.`}
        />
      </div>
      {rows.length <= 12 && (
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-stone-300">
          {series.map((s) => (
            <li key={s.name} className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 inline-block" style={{ background: s.color }} />
              {s.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
