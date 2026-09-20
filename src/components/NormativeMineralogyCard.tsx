import React from 'react';
import { Sliders, Sparkles, Compass, Info, CheckCircle2, ShieldCheck } from 'lucide-react';
import { CIPWNorm } from '../types/geochem';

interface NormativeMineralogyCardProps {
  norm?: CIPWNorm;
  sampleName?: string;
}

interface MineralMeta {
  symbol: string;
  name: string;
  formula: string;
  category: 'felsic' | 'mafic' | 'accessory';
  color: string;
}

const MINERAL_METAS: Record<string, MineralMeta> = {
  Q: { symbol: 'Q', name: 'Quartz', formula: 'SiO₂', category: 'felsic', color: '#38bdf8' },
  Or: { symbol: 'Or', name: 'Orthoclase', formula: 'KAlSi₃O₈', category: 'felsic', color: '#c084fc' },
  Ab: { symbol: 'Ab', name: 'Albite', formula: 'NaAlSi₃O₈', category: 'felsic', color: '#a855f7' },
  An: { symbol: 'An', name: 'Anorthite', formula: 'CaAl₂Si₂O₈', category: 'felsic', color: '#818cf8' },
  Ne: { symbol: 'Ne', name: 'Nepheline', formula: 'NaAlSiO₄', category: 'felsic', color: '#e879f9' },
  Lc: { symbol: 'Lc', name: 'Leucite', formula: 'KAlSi₂O₆', category: 'felsic', color: '#f472b6' },
  Di: { symbol: 'Di', name: 'Diopside', formula: 'Ca(Mg,Fe)Si₂O₆', category: 'mafic', color: '#34d399' },
  Hy: { symbol: 'Hy', name: 'Hypersthene', formula: '(Mg,Fe)SiO₃', category: 'mafic', color: '#10b981' },
  Ol: { symbol: 'Ol', name: 'Olivine', formula: '(Mg,Fe)₂SiO₄', category: 'mafic', color: '#4ade80' },
  Mt: { symbol: 'Mt', name: 'Magnetite', formula: 'Fe₃O₄', category: 'accessory', color: '#fb923c' },
  Il: { symbol: 'Il', name: 'Ilmenite', formula: 'FeTiO₃', category: 'accessory', color: '#f97316' },
  Ap: { symbol: 'Ap', name: 'Apatite', formula: 'Ca₅(PO₄)₃(F,OH)', category: 'accessory', color: '#fbbf24' },
  C: { symbol: 'C', name: 'Corundum', formula: 'Al₂O₃', category: 'felsic', color: '#f0abfc' },
  Ac: { symbol: 'Ac', name: 'Acmite', formula: 'NaFe³⁺Si₂O₆', category: 'mafic', color: '#2dd4bf' },
  Ns: { symbol: 'Ns', name: 'Sodium metasilicate', formula: 'Na₂SiO₃', category: 'felsic', color: '#67e8f9' },
  Ks: { symbol: 'Ks', name: 'Potassium metasilicate', formula: 'K₂SiO₃', category: 'felsic', color: '#7dd3fc' },
  Wo: { symbol: 'Wo', name: 'Wollastonite', formula: 'CaSiO₃', category: 'mafic', color: '#6ee7b7' },
  Hm: { symbol: 'Hm', name: 'Hematite', formula: 'Fe₂O₃', category: 'accessory', color: '#ef4444' },
  Ru: { symbol: 'Ru', name: 'Rutile', formula: 'TiO₂', category: 'accessory', color: '#fdba74' },
  Cm: { symbol: 'Cm', name: 'Chromite', formula: 'FeCr₂O₄', category: 'accessory', color: '#a3a3a3' },
  Cc: { symbol: 'Cc', name: 'Calcite', formula: 'CaCO₃', category: 'accessory', color: '#e7e5e4' },
};

/** Reads a numeric phase value from a norm, ignoring the diagnostic fields. */
function phase(norm: CIPWNorm, key: string): number {
  const v = norm[key];
  return typeof v === 'number' ? v : 0;
}

export const NormativeMineralogyCard: React.FC<NormativeMineralogyCardProps> = ({
  norm,
  sampleName = 'Sample',
}) => {
  if (!norm) {
    return (
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-8 text-center space-y-3">
        <Sliders className="w-8 h-8 text-stone-600 mx-auto" />
        <h4 className="text-sm font-semibold text-stone-300">Normative Mineralogy Pending</h4>
        <p className="text-xs text-stone-500 max-w-md mx-auto">
          Enter major oxide weight percentages (SiO₂, Al₂O₃, FeO/Fe₂O₃, MgO, CaO, Na₂O, K₂O) on the
          workbench to compute the idealized CIPW anhydrous normative mineralogy.
        </p>
      </div>
    );
  }

  const q = phase(norm, 'Q');
  const or = phase(norm, 'Or');
  const ab = phase(norm, 'Ab');
  const an = phase(norm, 'An');
  const ne = phase(norm, 'Ne');
  const lc = phase(norm, 'Lc');
  const di = phase(norm, 'Di');
  const hy = phase(norm, 'Hy');
  const ol = phase(norm, 'Ol');
  const mt = phase(norm, 'Mt');
  const il = phase(norm, 'Il');
  const ap = phase(norm, 'Ap');

  // Petrological indices
  // Thornton-Tuttle Differentiation Index (DI) = Q + Or + Ab + Ne + Lc
  const differentiationIndex = q + or + ab + ne + lc;

  const co = phase(norm, 'C');
  const ac = phase(norm, 'Ac');
  const wo = phase(norm, 'Wo');

  // Color Index (M') = Di + Hy + Ol + Mt + Il (+ Wo, Ac)
  const colorIndex = di + hy + ol + mt + il + wo + ac;

  // True normative total. A value far from the analytical total signals an
  // allocation problem, so it is shown rather than forced to 100.
  const normSum = typeof norm.normSum === 'number' ? norm.normSum : undefined;
  const silicaResidual =
    typeof norm.silicaBalance === 'number' ? norm.silicaBalance : 0;
  const ironSplitEstimated = norm.ironSplitEstimated === true;

  // Plagioclase Anorthite percentage An# = An / (Ab + An) * 100
  const plagioclaseSum = ab + an;
  const anorthiteNumber = plagioclaseSum > 0 ? (an / plagioclaseSum) * 100 : null;

  // Total Feldspar
  const totalFeldspar = or + ab + an;

  // Silica Saturation status
  let silicaSaturationText = 'Silica-Saturated';
  let silicaSaturationDesc = 'Hypersthene / Olivine normative; balanced SiO₂ activity';
  let silicaSaturationBadgeColor = 'bg-sky-500/20 text-sky-300 border-sky-500/40';

  if (q > 0.1) {
    silicaSaturationText = `Silica-Oversaturated (Q: ${q.toFixed(1)}%)`;
    silicaSaturationDesc = 'Excess SiO₂ crystallizes as free normative Quartz';
    silicaSaturationBadgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
  } else if (ne > 0.1) {
    silicaSaturationText = `Silica-Undersaturated (Ne: ${ne.toFixed(1)}%)`;
    silicaSaturationDesc = 'SiO₂ deficit results in normative feldspathoids (Nepheline)';
    silicaSaturationBadgeColor = 'bg-purple-500/20 text-purple-300 border-purple-500/40';
  }

  // Alumina saturation, read directly off the norm: normative corundum means
  // peraluminous, normative acmite or metasilicate means peralkaline.
  let aluminaText = 'Metaluminous';
  let aluminaBadgeColor = 'bg-stone-700/30 text-stone-300 border-stone-600/40';
  if (co > 0.01) {
    aluminaText = `Peraluminous (C: ${co.toFixed(1)}%)`;
    aluminaBadgeColor = 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40';
  } else if (ac > 0.01 || phase(norm, 'Ns') > 0.01) {
    aluminaText = `Peralkaline (Ac: ${ac.toFixed(1)}%)`;
    aluminaBadgeColor = 'bg-teal-500/20 text-teal-300 border-teal-500/40';
  }

  // Active minerals sorted descending by wt%
  const activeMinerals = Object.keys(MINERAL_METAS)
    .filter((key) => phase(norm, key) > 0)
    .map((key) => ({ ...MINERAL_METAS[key], value: phase(norm, key) }))
    .sort((a, b) => b.value - a.value);

  const felsicMinerals = activeMinerals.filter((m) => m.category === 'felsic');
  const maficMinerals = activeMinerals.filter((m) => m.category === 'mafic' || m.category === 'accessory');

  // Interpret Color Index
  let colorIndexClass = 'Mesocratic';
  if (colorIndex < 30) colorIndexClass = 'Leucocratic (Light-colored)';
  else if (colorIndex > 60 && colorIndex <= 90) colorIndexClass = 'Melanocratic (Dark-colored)';
  else if (colorIndex > 90) colorIndexClass = 'Ultramafic (Dense / Mantle)';

  // Interpret Plagioclase
  let plagioclaseClass = 'Intermediate';
  if (anorthiteNumber !== null) {
    if (anorthiteNumber < 10) plagioclaseClass = 'Albite (An₀–An₁₀)';
    else if (anorthiteNumber < 30) plagioclaseClass = 'Oligoclase (An₁₀–An₃₀)';
    else if (anorthiteNumber < 50) plagioclaseClass = 'Andesine (An₃₀–An₅₀)';
    else if (anorthiteNumber < 70) plagioclaseClass = 'Labradorite (An₅₀–An₇₀)';
    else if (anorthiteNumber < 90) plagioclaseClass = 'Bytownite (An₇₀–An₉₀)';
    else plagioclaseClass = 'Anorthite (An₉₀–An₁₀₀)';
  }

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 sm:p-5 shadow-sm space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm sm:text-base font-bold text-stone-100">
              CIPW Normative Mineralogy
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-850 text-stone-300 border border-stone-750">
              {sampleName}
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-0.5">
            Idealized 1-atm anhydrous equilibrium crystallization assemblage (Cross, Iddings, Pirsson &amp; Washington)
          </p>
        </div>

        {/* Saturation badges */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className={`px-3 py-1 rounded-lg border text-xs font-semibold ${silicaSaturationBadgeColor}`}>
            {silicaSaturationText}
          </div>
          <div className={`px-3 py-1 rounded-lg border text-xs font-semibold ${aluminaBadgeColor}`}>
            {aluminaText}
          </div>
        </div>
      </div>

      {/* Calculation integrity: the true normative total and silica closure.
          These are reported rather than hidden behind a forced 100%. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-stone-400 -mt-2">
        {normSum !== undefined && (
          <span className="font-mono">
            Normative total:{' '}
            <span className={normSum > 0 ? 'text-stone-200' : 'text-red-300'}>
              {normSum.toFixed(2)} wt%
            </span>
          </span>
        )}
        <span className="font-mono">
          Silica closure:{' '}
          <span className={Math.abs(silicaResidual) < 0.01 ? 'text-emerald-300' : 'text-amber-300'}>
            {Math.abs(silicaResidual) < 0.01 ? 'balanced' : `${silicaResidual.toFixed(4)} mol residual`}
          </span>
        </span>
        {ironSplitEstimated && (
          <span className="text-amber-300/90">
            Fe³⁺/Fe²⁺ estimated from silica (Middlemost 1989) — only total iron was reported.
          </span>
        )}
      </div>

      {/* Key Petrological Indices Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Differentiation Index (DI) */}
        <div className="bg-stone-950 p-3 rounded-lg border border-stone-800">
          <div className="text-[11px] font-medium text-stone-400 flex items-center justify-between">
            <span>Thornton-Tuttle DI</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-300 mt-1">
            {differentiationIndex.toFixed(1)}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">
            {differentiationIndex > 70
              ? 'Highly evolved / Felsic'
              : differentiationIndex > 35
              ? 'Moderately fractionated'
              : 'Primitive / Basaltic'}
          </div>
        </div>

        {/* Color Index (M') */}
        <div className="bg-stone-950 p-3 rounded-lg border border-stone-800">
          <div className="text-[11px] font-medium text-stone-400 flex items-center justify-between">
            <span>Color Index (M&apos;)</span>
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-300 mt-1">
            {colorIndex.toFixed(1)}%
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5 truncate" title={colorIndexClass}>
            {colorIndexClass}
          </div>
        </div>

        {/* Plagioclase Anorthite (An#) */}
        <div className="bg-stone-950 p-3 rounded-lg border border-stone-800">
          <div className="text-[11px] font-medium text-stone-400 flex items-center justify-between">
            <span>Plagioclase An#</span>
            <span className="text-[10px] text-stone-400 font-mono">An/(Ab+An)</span>
          </div>
          <div className="text-xl font-bold font-mono text-sky-300 mt-1">
            {anorthiteNumber !== null ? `${anorthiteNumber.toFixed(1)}%` : 'N/A'}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5 truncate" title={plagioclaseClass}>
            {anorthiteNumber !== null ? plagioclaseClass : 'No Plagioclase'}
          </div>
        </div>

        {/* Total Normative Feldspar */}
        <div className="bg-stone-950 p-3 rounded-lg border border-stone-800">
          <div className="text-[11px] font-medium text-stone-400 flex items-center justify-between">
            <span>Total Feldspar</span>
            <span className="text-[10px] text-stone-400 font-mono">Or+Ab+An</span>
          </div>
          <div className="text-xl font-bold font-mono text-purple-300 mt-1">
            {totalFeldspar.toFixed(1)}%
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5 font-mono">
            {totalFeldspar > 0
              ? `Or${((or / totalFeldspar) * 100).toFixed(0)} Ab${((ab / totalFeldspar) * 100).toFixed(0)} An${((an / totalFeldspar) * 100).toFixed(0)}`
              : 'Feldspar absent'}
          </div>
        </div>
      </div>

      {/* Stacked Normative Mineral Proportions Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-xs text-stone-400">
          <span className="font-medium">Cumulative Normative Proportions (100% Anhydrous Basis)</span>
          <span className="text-stone-400 font-mono">{activeMinerals.length} minerals calculated</span>
        </div>
        <div className="h-4 w-full bg-stone-950 rounded-full overflow-hidden flex border border-stone-800 p-0.5">
          {activeMinerals.map((m) => (
            <div
              key={`bar-${m.symbol}`}
              style={{ width: `${Math.max(1.5, m.value)}%`, backgroundColor: m.color }}
              className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-300"
              title={`${m.name} (${m.symbol}): ${m.value.toFixed(1)}%`}
            />
          ))}
        </div>
        {/* Color Legend */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] pt-1">
          {activeMinerals.map((m) => (
            <div key={`legend-${m.symbol}`} className="flex items-center gap-1.5 text-stone-300">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
              <span className="font-semibold">{m.symbol}</span>
              <span className="text-stone-400 font-mono">{m.value.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dual Mineral Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Felsic / Leucocratic Minerals */}
        <div className="bg-stone-950/70 border border-stone-800/90 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-stone-850">
            <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              Felsic / Leucocratic Norm (DI: {differentiationIndex.toFixed(1)}%)
            </h4>
            <span className="text-[10px] text-stone-400 font-mono">Quartz, Feldspars &amp; Feldspathoids</span>
          </div>

          {felsicMinerals.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {felsicMinerals.map((m) => (
                <div
                  key={`felsic-${m.symbol}`}
                  className="p-2.5 bg-stone-900/90 rounded-lg border border-stone-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-stone-200 flex items-center gap-1">
                        <span>{m.name}</span>
                        <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-stone-800 text-amber-300">
                          {m.symbol}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-stone-400">{m.formula}</div>
                    </div>
                    <div className="text-sm font-mono font-bold text-sky-300">
                      {m.value.toFixed(1)}%
                    </div>
                  </div>
                  <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, m.value * 1.5)}%`,
                        backgroundColor: m.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-stone-400 italic">
              No felsic minerals present in normative assemblage
            </div>
          )}
        </div>

        {/* Mafic / Melanocratic & Accessory Minerals */}
        <div className="bg-stone-950/70 border border-stone-800/90 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-stone-850">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Mafic &amp; Accessory Norm (M&apos;: {colorIndex.toFixed(1)}%)
            </h4>
            <span className="text-[10px] text-stone-400 font-mono">Pyroxenes, Olivine &amp; Fe-Ti Oxides</span>
          </div>

          {maficMinerals.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {maficMinerals.map((m) => (
                <div
                  key={`mafic-${m.symbol}`}
                  className="p-2.5 bg-stone-900/90 rounded-lg border border-stone-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-stone-200 flex items-center gap-1">
                        <span>{m.name}</span>
                        <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-stone-800 text-emerald-400">
                          {m.symbol}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-stone-400">{m.formula}</div>
                    </div>
                    <div className="text-sm font-mono font-bold text-emerald-300">
                      {m.value.toFixed(1)}%
                    </div>
                  </div>
                  <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, m.value * 1.5)}%`,
                        backgroundColor: m.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-stone-400 italic">
              No mafic or accessory minerals present in normative assemblage
            </div>
          )}
        </div>
      </div>

      {/* Geochemical Explanation Footer */}
      <div className="p-3 bg-stone-950 rounded-lg border border-stone-800/80 text-[11px] text-stone-400 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-stone-300">Petrological Interpretation: </span>
          <span>{silicaSaturationDesc}. </span>
          <span>
            The CIPW norm reflects the stoichiometric mineral balance that would crystallize from an anhydrous silicate melt at 1 atmosphere without water or hydrous phases like biotite or hornblende.
          </span>
        </div>
      </div>
    </div>
  );
};
