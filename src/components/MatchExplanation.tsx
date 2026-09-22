import React from 'react';
import { HelpCircle } from 'lucide-react';
import { MatchScore } from '../types/geochem';

/**
 * "Why this match?" — the per-oxide breakdown behind a similarity score.
 *
 * The engine has always returned `contributions`: each oxide's signed
 * difference from the reference and its weighted contribution to the squared
 * distance, sorted by how much it mattered. Nothing rendered it, so a reader
 * was given a ranking with no way to see what drove it.
 *
 * Reading this panel: a long bar means that oxide is doing most of the work
 * separating the sample from this reference. The sign tells you the
 * direction — "+2.4" means the sample is 2.4 wt% richer than the reference.
 * An oxide contributing almost nothing is one the sample and the reference
 * agree on.
 */

interface Props {
  match: MatchScore;
  /** Score of the runner-up, when there is one, to frame how clear the lead is. */
  runnerUpSimilarity?: number;
  runnerUpName?: string;
  className?: string;
}

/** Subscripts the digits in an oxide formula for display: Al2O3 -> Al₂O₃. */
function prettyOxide(oxide: string): string {
  const SUB: Record<string, string> = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  };
  return oxide.replace(/\d/g, (d) => SUB[d] ?? d);
}

export const MatchExplanation: React.FC<Props> = ({
  match,
  runnerUpSimilarity,
  runnerUpName,
  className = '',
}) => {
  const contributions = match.contributions ?? [];
  if (contributions.length === 0) return null;

  const maxContribution = Math.max(...contributions.map((c) => c.contribution), 1e-9);
  const totalContribution = contributions.reduce((a, c) => a + c.contribution, 0);

  const separation =
    runnerUpSimilarity !== undefined ? match.similarity - runnerUpSimilarity : undefined;
  const ambiguous = separation !== undefined && separation < 3;

  return (
    <div className={`bg-stone-900 border border-stone-800 rounded-xl p-3.5 shadow-sm ${className}`}>
      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-stone-800">
        <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
          Why this match?
        </span>
        <span
          className="text-[10px] text-stone-500 font-mono"
          title="Weighted Euclidean distance in oxide space. Lower is closer."
        >
          d={match.distance} · n={match.analytesUsed ?? 0}
        </span>
      </div>

      <p className="text-[11px] text-stone-400 leading-relaxed mb-2.5">
        The largest contributors to the compositional distance from{' '}
        <span className="text-stone-200 font-medium">{match.reference.name}</span>. A signed
        difference is the sample minus the reference, in wt%.
      </p>

      <ul className="space-y-1.5">
        {contributions.map((c) => {
          const share = totalContribution > 0 ? (c.contribution / totalContribution) * 100 : 0;
          const width = Math.max(2, (c.contribution / maxContribution) * 100);
          const rich = c.delta > 0;
          return (
            <li key={c.oxide} className="flex items-center gap-2 text-[11px]">
              <span className="w-14 shrink-0 font-mono text-stone-300">
                {prettyOxide(c.oxide)}
              </span>
              <span className="flex-1 h-2 bg-stone-950 rounded-full overflow-hidden border border-stone-800">
                <span
                  className={`block h-full rounded-full ${rich ? 'bg-amber-500/70' : 'bg-sky-500/70'}`}
                  style={{ width: `${width}%` }}
                />
              </span>
              <span
                className={`w-16 shrink-0 text-right font-mono ${
                  rich ? 'text-amber-300' : 'text-sky-300'
                }`}
                title={rich ? 'Sample is richer than the reference' : 'Sample is poorer than the reference'}
              >
                {c.delta > 0 ? '+' : ''}
                {c.delta.toFixed(2)}
              </span>
              <span className="w-10 shrink-0 text-right font-mono text-stone-500">
                {share.toFixed(0)}%
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-2.5 pt-2.5 border-t border-stone-800 space-y-1.5">
        {separation !== undefined && (
          <p className={`text-[11px] leading-relaxed ${ambiguous ? 'text-amber-300' : 'text-stone-400'}`}>
            {ambiguous ? (
              <>
                <span className="font-semibold">Ambiguous:</span> only {separation.toFixed(0)}{' '}
                point{separation === 1 ? '' : 's'} separate this from{' '}
                {runnerUpName ?? 'the runner-up'}. Treat the two as indistinguishable on major
                elements alone.
              </>
            ) : (
              <>
                {separation.toFixed(0)} points clear of {runnerUpName ?? 'the runner-up'}.
              </>
            )}
          </p>
        )}

        {match.structuralFit !== undefined && (
          <p className="text-[11px] text-stone-400 leading-relaxed">
            Structural fit {(100 * match.structuralFit).toFixed(0)}% — for a mineral this is the
            decisive test, not the compositional distance above.
          </p>
        )}

        <p className="text-[10px] text-stone-500 leading-relaxed">
          Oxides are weighted by how diagnostic they are (SiO₂ 3.5, alkalis 3.0, MgO/CaO/FeO*
          2.5, Al₂O₃ 2.0, TiO₂ 1.5, others 1.0). Missing analytes are skipped, not treated as
          zero. The score ranks candidates and is not a probability. Manual §4.4.
        </p>
      </div>
    </div>
  );
};
