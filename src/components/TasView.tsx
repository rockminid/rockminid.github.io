import React, { useState, useMemo } from 'react';
import { Layers, Info, Filter, Eye, Trash2 } from 'lucide-react';
import { TasDiagram, TASPoint } from './TasDiagram';
import { CustomPlottedPoint } from './PlotCustomDataModal';
import { ROCKS_DATASET } from '../data/rocksDataset';
import { BatchRowResult, OxideComposition } from '../types/geochem';

interface TasViewProps {
  batchResults: BatchRowResult[];
  activeSampleOxides?: OxideComposition;
  activeSampleName?: string;
  onSelectSample: (oxides: OxideComposition, name: string) => void;
}

export const TasView: React.FC<TasViewProps> = ({
  batchResults,
  activeSampleOxides,
  activeSampleName,
  onSelectSample,
}) => {
  const [includeVolcanicReferences, setIncludeVolcanicReferences] = useState<boolean>(true);
  const [includeBatchSamples, setIncludeBatchSamples] = useState<boolean>(true);
  const [selectedPointId, setSelectedPointId] = useState<string | undefined>(undefined);
  const [customPoints, setCustomPoints] = useState<TASPoint[]>([]);

  const handleAddCustomPoint = (pt: CustomPlottedPoint) => {
    let sio2 = 0;
    let totalAlkalis = 0;
    if (pt.tasCoords) {
      sio2 = pt.tasCoords.sio2;
      totalAlkalis = pt.tasCoords.totalAlkalis;
    } else if (pt.oxides) {
      sio2 = pt.oxides.SiO2 || 0;
      totalAlkalis = (pt.oxides.Na2O || 0) + (pt.oxides.K2O || 0);
    }
    const newPoint: TASPoint = {
      id: `custom-${pt.id}`,
      name: pt.name,
      sio2,
      totalAlkalis,
      category: pt.category || 'User Plotted Data',
      isPrimary: true,
      oxides: pt.oxides,
    };
    setCustomPoints((prev) => [...prev, newPoint]);
  };

  // Volcanic rock reference points from dataset
  const referencePoints: TASPoint[] = useMemo(() => {
    return ROCKS_DATASET.filter((r) => r.category === 'Igneous Volcanic' && r.meanOxides.SiO2).map((r) => {
      const sio2 = r.meanOxides.SiO2 || 0;
      const alk = (r.meanOxides.Na2O || 0) + (r.meanOxides.K2O || 0);
      return {
        id: `ref-${r.id}`,
        name: `Reference: ${r.name}`,
        sio2,
        totalAlkalis: alk,
        category: r.tasField || 'Volcanic',
        field: r.tasField,
        oxides: r.meanOxides,
        isPrimary: false,
      };
    });
  }, []);

  // Batch sample points
  const batchPoints: TASPoint[] = useMemo(() => {
    return batchResults.map((r) => {
      const sio2 = r.normalizedOxides.SiO2 || 0;
      const alk = (r.normalizedOxides.Na2O || 0) + (r.normalizedOxides.K2O || 0);
      return {
        id: `batch-${r.sampleId}`,
        name: `Batch: ${r.sampleId} (${r.primaryName})`,
        sio2,
        totalAlkalis: alk,
        category: r.tasField,
        field: r.tasField,
        confidence: r.primaryConfidence,
        oxides: r.normalizedOxides,
        isPrimary: false,
      };
    });
  }, [batchResults]);

  // Active single sample point
  const activePoint: TASPoint | null = useMemo(() => {
    if (!activeSampleOxides || !activeSampleOxides.SiO2) return null;
    const sio2 = activeSampleOxides.SiO2;
    const alk = (activeSampleOxides.Na2O || 0) + (activeSampleOxides.K2O || 0);
    return {
      id: 'active-workbench-sample',
      name: `Active: ${activeSampleName || 'Current Sample'}`,
      sio2,
      totalAlkalis: alk,
      oxides: activeSampleOxides,
      isPrimary: true,
    };
  }, [activeSampleOxides, activeSampleName]);

  // Combined points
  const allPoints: TASPoint[] = useMemo(() => {
    const list: TASPoint[] = [];
    if (includeVolcanicReferences) {
      list.push(...referencePoints);
    }
    if (includeBatchSamples) {
      list.push(...batchPoints);
    }
    if (activePoint) {
      list.push(activePoint);
    }
    list.push(...customPoints);
    return list;
  }, [includeVolcanicReferences, includeBatchSamples, referencePoints, batchPoints, activePoint, customPoints]);

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-stone-800">
          <div>
            <h2 className="text-base font-bold text-stone-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              Total Alkali - Silica (TAS) Magmatic Projection
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Standard IUGS (Le Bas et al., 1986) volcanic rock classification diagram based on SiO₂ vs. (Na₂O + K₂O) wt%
            </p>
          </div>

          {/* Toggle Layers */}
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs text-stone-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeVolcanicReferences}
                onChange={(e) => setIncludeVolcanicReferences(e.target.checked)}
                className="rounded bg-stone-950 border-stone-700 text-amber-600 focus:ring-0"
              />
              <span>GEOROC Reference Rocks ({referencePoints.length})</span>
            </label>

            {batchResults.length > 0 && (
              <label className="inline-flex items-center gap-2 text-xs text-stone-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeBatchSamples}
                  onChange={(e) => setIncludeBatchSamples(e.target.checked)}
                  className="rounded bg-stone-950 border-stone-700 text-amber-600 focus:ring-0"
                />
                <span>Batch Samples ({batchPoints.length})</span>
              </label>
            )}

            {customPoints.length > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Custom Plotted ({customPoints.length})</span>
              </span>
            )}
          </div>
        </div>

        {/* Large SVG TAS Plot */}
        <div className="w-full flex justify-center py-2">
          <TasDiagram
            points={allPoints}
            selectedPointId={selectedPointId}
            onSelectPoint={(id) => setSelectedPointId(id)}
            onAddCustomPoint={handleAddCustomPoint}
            height={460}
          />
        </div>

        {/* User Plotted Points Card in TAS */}
        {customPoints.length > 0 && (
          <div className="mt-4 p-4 rounded-xl bg-stone-950/70 border border-emerald-900/60">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/30" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                  User Plotted Samples on TAS ({customPoints.length})
                </h4>
              </div>
              <button
                onClick={() => setCustomPoints([])}
                className="text-[11px] text-stone-400 hover:text-red-400 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear All Custom</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {customPoints.map((cp) => (
                <div
                  key={cp.id}
                  className="p-2 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-between text-xs hover:border-emerald-700/60 transition-colors"
                >
                  <div className="truncate">
                    <div className="font-semibold text-stone-200 truncate">{cp.name}</div>
                    <div className="text-[10px] text-stone-400">
                      SiO₂: {cp.sio2.toFixed(2)}% | Alkalis: {cp.totalAlkalis.toFixed(2)}%
                    </div>
                  </div>
                  <button
                    onClick={() => setCustomPoints((prev) => prev.filter((p) => p.id !== cp.id))}
                    className="text-stone-500 hover:text-red-400 p-1 shrink-0 ml-2 transition-colors"
                    title="Remove point"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Geochemical Guide Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Info className="w-4 h-4" />
            Subalkaline vs. Alkaline
          </div>
          <p className="text-xs text-stone-300 leading-relaxed">
            The curved dashed amber line represents the Irvine &amp; Baragar (1971) boundary. Samples plotting above the line are <strong className="text-amber-300">Alkaline</strong> (often silica-undersaturated with nepheline in the norm), typical of ocean islands and continental rifts. Samples below are <strong className="text-amber-300">Subalkaline</strong> (Tholeiitic or Calc-Alkaline), typical of mid-ocean ridges and subduction volcanic arcs.
          </p>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Layers className="w-4 h-4" />
            Volatile-Free Normalization
          </div>
          <p className="text-xs text-stone-300 leading-relaxed">
            Per IUGS guidelines, rocks plotted on TAS <strong className="text-amber-300">must be recalculated to 100% volatile-free</strong> (excluding LOI, H₂O, and CO₂). Volatiles dilute primary silica and alkali concentrations, which could artificially shift an evolved rock into a more primitive field.
          </p>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Eye className="w-4 h-4" />
            Ultramafic &amp; Felsic Limits
          </div>
          <p className="text-xs text-stone-300 leading-relaxed">
            Rocks with <strong className="text-amber-300">SiO₂ &lt; 41 wt%</strong> with high MgO (&gt;18%) are ultramafic (peridotites, komatiites, picrites) and fall off standard TAS boundaries. Very high silica rocks (&gt;75 wt%) are granitic or rhyolitic glasses, where alkalis control peralkaline vs peraluminous character.
          </p>
        </div>
      </div>
    </div>
  );
};
