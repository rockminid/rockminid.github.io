import React from 'react';
import { AlertTriangle, Info, XCircle, ShieldCheck } from 'lucide-react';
import { DataQualityFlag } from '../types/geochem';

/**
 * Structured data-quality flags.
 *
 * The engine has always produced coded flags with a severity, but the
 * interface only ever showed a single legacy warning string, and only for
 * totals. That meant an estimated iron split, a sparse analysis, a high LOI
 * or an ambiguous iron basis — every one of which changes how much weight a
 * result deserves — were computed and then discarded before reaching the
 * person reading the result.
 *
 * Showing them is the whole point of the "report, don't hide" convention.
 */

const SEVERITY_ORDER: Record<DataQualityFlag['severity'], number> = {
  error: 0,
  warning: 1,
  info: 2,
};

const SEVERITY_STYLE: Record<
  DataQualityFlag['severity'],
  { wrap: string; icon: React.ReactNode; label: string }
> = {
  error: {
    wrap: 'bg-red-950/40 border-red-800/50 text-red-200',
    icon: <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />,
    label: 'Error',
  },
  warning: {
    wrap: 'bg-amber-950/40 border-amber-800/50 text-amber-200',
    icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />,
    label: 'Warning',
  },
  info: {
    wrap: 'bg-sky-950/40 border-sky-800/50 text-sky-200',
    icon: <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />,
    label: 'Note',
  },
};

/** Where in this manual a reader can follow a flag up. */
const FLAG_REFERENCE: Record<string, string> = {
  'low-total':
    'Manual §5.3. Unmeasured volatiles, light elements, alteration or a defocused beam.',
  'high-total':
    'Manual §5.3. Most often iron entered twice — a total and its components.',
  'iron-ambiguous':
    'Manual §4.1. Measured components were used; the reported total disagreed with them.',
  'iron-split-estimated':
    'Manual §4.2. Fe2O3/FeO estimated from silica content after Middlemost (1989).',
  'iron-missing': 'Manual §4.1. The norm, Mg# and the AFM projection all depend on iron.',
  'sparse-analysis': 'Manual §4.4. Fewer analytes means less to discriminate candidates with.',
  'high-loi': 'Manual §6.3. Alteration mobilizes alkalis, and alkalis are half of TAS.',
  'sample-type-mineral':
    'Manual §12.5. TAS, the CIPW norm and the whole-rock ternaries are undefined here.',
};

interface Props {
  flags: DataQualityFlag[];
  className?: string;
}

export const DataQualityPanel: React.FC<Props> = ({ flags, className = '' }) => {
  const sorted = [...flags].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );

  const counts = sorted.reduce<Record<string, number>>((acc, f) => {
    acc[f.severity] = (acc[f.severity] || 0) + 1;
    return acc;
  }, {});

  return (
    <div
      className={`bg-stone-900 border border-stone-800 rounded-xl p-3.5 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-stone-800">
        <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          Data Quality
        </span>
        <span className="text-[10px] text-stone-500 font-mono">
          {sorted.length === 0
            ? 'no flags'
            : [
                counts.error ? `${counts.error} error` : '',
                counts.warning ? `${counts.warning} warning` : '',
                counts.info ? `${counts.info} note` : '',
              ]
                .filter(Boolean)
                .join(' · ')}
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-200">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            No data-quality flags were raised. The analytical total, iron basis and analyte
            coverage are all within their normal ranges.
          </span>
        </div>
      ) : (
        <ul className="space-y-2">
          {sorted.map((flag) => {
            const style = SEVERITY_STYLE[flag.severity];
            return (
              <li
                key={flag.code}
                className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs ${style.wrap}`}
              >
                {style.icon}
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold">{style.label}</span>
                    <code className="text-[10px] font-mono opacity-70 bg-black/30 px-1 py-0.5 rounded">
                      {flag.code}
                    </code>
                  </div>
                  <p className="leading-relaxed opacity-95">{flag.message}</p>
                  {FLAG_REFERENCE[flag.code] && (
                    <p className="text-[10px] opacity-60 leading-relaxed">
                      {FLAG_REFERENCE[flag.code]}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
