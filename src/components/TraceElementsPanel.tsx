import React, { useMemo, useState } from 'react';
import { Activity, ChevronRight } from 'lucide-react';
import { OxideComposition } from '../types/geochem';
import {
  CHONDRITE_SM89,
  PM_ORDER,
  PRIMITIVE_MANTLE_SM89,
  REE,
  TRACE_INPUTS,
  TraceElements,
  normalize,
  traceRatios,
  withMajorElements,
} from '../utils/traceElements';
import { SpiderDiagram } from './SpiderDiagram';

const SOURCE = 'Sun & McDonough (1989), doi:10.1144/GSL.SP.1989.042.01.19';

/**
 * Optional trace-element input with chondrite-normalized REE and
 * primitive-mantle-normalized multi-element diagrams. Trace elements do not
 * enter the classification; they are plotted alongside it.
 */
export const TraceElementsPanel: React.FC<{ oxides: OxideComposition; sampleName: string }> = ({
  oxides,
  sampleName,
}) => {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [plot, setPlot] = useState<'ree' | 'pm'>('ree');

  const trace: TraceElements = useMemo(() => {
    const t: TraceElements = {};
    for (const [k, v] of Object.entries(values)) {
      const n = Number(v);
      if (v.trim() !== '' && Number.isFinite(n) && n > 0) t[k] = n;
    }
    return t;
  }, [values]);

  const entered = Object.keys(trace).length;
  const ratios = traceRatios(trace);
  const series =
    plot === 'ree'
      ? [{ name: sampleName, color: '#f59e0b', points: normalize(trace, CHONDRITE_SM89, REE) }]
      : [
          {
            name: sampleName,
            color: '#f59e0b',
            points: normalize(withMajorElements(trace, oxides), PRIMITIVE_MANTLE_SM89, PM_ORDER),
          },
        ];
  const fmt = (v: number | undefined, d = 2) => (v === undefined ? 'n/a' : v.toFixed(d));

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-3 sm:p-4 shadow-xl">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-2 text-xs font-bold text-stone-200 uppercase tracking-wider">
          <Activity className="w-4 h-4 text-amber-400" />
          Trace Elements &amp; Spider Diagrams
          <span className="normal-case font-normal text-stone-500 tracking-normal">(optional, ppm)</span>
        </span>
        <span className="text-[11px] text-stone-400 flex items-center gap-1">
          {entered > 0 ? `${entered} entered` : 'none entered'}
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-90' : ''}`} />
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-4">
          <p className="text-[11px] text-stone-400 leading-relaxed">
            Trace elements are plotted, not used for classification. K, P and Ti on the primitive-mantle diagram are
            calculated from K<sub>2</sub>O, P<sub>2</sub>O<sub>5</sub> and TiO<sub>2</sub> unless you enter them.
          </p>
          <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-9 gap-1.5">
            {TRACE_INPUTS.map((el) => (
              <label key={el} className="flex flex-col text-[10px] text-stone-400">
                <span className="font-mono">{el}</span>
                <input
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={values[el] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [el]: e.target.value }))}
                  className="bg-stone-950 border border-stone-700 rounded px-1.5 py-1 text-xs text-stone-100 font-mono focus:outline-none focus:border-amber-500"
                  aria-label={`${el} (ppm)`}
                />
              </label>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-lg border border-stone-800 text-xs w-fit">
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

          <div className="text-stone-300">
            <SpiderDiagram
              order={plot === 'ree' ? REE : PM_ORDER}
              series={series}
              yLabel={plot === 'ree' ? 'Sample / CI chondrite' : 'Sample / primitive mantle'}
              caption={`Normalized to ${plot === 'ree' ? 'CI chondrite' : 'primitive mantle'}, ${SOURCE}.`}
            />
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            {[
              ['Eu/Eu*', fmt(ratios.euAnomaly), 'Eu_N / √(Sm_N × Gd_N)'],
              ['(La/Yb)N', fmt(ratios.laYbN, 1), 'Chondrite-normalized REE slope'],
              ['Nb/La', fmt(ratios.nbLa), 'Well below 1: arc (subduction) signature'],
              ['Zr/Y', fmt(ratios.zrY, 1), 'Raw ratio'],
            ].map(([k, v, hint]) => (
              <div key={k} className="p-2 rounded-lg bg-stone-950/70 border border-stone-800" title={hint}>
                <dt className="text-stone-500">{k}</dt>
                <dd className="font-mono font-bold text-stone-100">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
};
