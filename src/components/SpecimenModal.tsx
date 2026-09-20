import React from 'react';
import {
  X,
  Sparkles,
  MapPin,
  FlaskConical,
  Layers,
  Scale,
  Compass,
  Lightbulb,
  ExternalLink,
  ChevronRight,
  Database,
} from 'lucide-react';
import { MineralReference, OxideComposition, RockReference } from '../types/geochem';
import { getEnrichedSpecimen } from '../data/visualDatabase';
import { DatabaseReferencesCard } from './DatabaseReferencesCard';

interface SpecimenModalProps {
  specimen: RockReference | MineralReference | null;
  onClose: () => void;
  onInspect?: (oxides: OxideComposition, name: string) => void;
}

export const SpecimenModal: React.FC<SpecimenModalProps> = ({
  specimen,
  onClose,
  onInspect,
}) => {
  if (!specimen) return null;

  const enriched = getEnrichedSpecimen(specimen);
  const isRock = 'category' in enriched;
  const rock = isRock ? (enriched as RockReference) : null;
  const mineral = !isRock ? (enriched as MineralReference) : null;

  const oxides = isRock ? rock!.meanOxides : mineral!.idealOxides;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md animate-fadeIn">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-900/90">
          <div className="flex items-center gap-3">
            <span
              className={`px-2.5 py-1 text-xs font-semibold tracking-wider uppercase rounded-full border ${
                isRock
                  ? 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                  : 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60'
              }`}
            >
              {isRock ? rock?.category : `${mineral?.group} Mineral`}
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-stone-100 truncate">
              {enriched.name}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Section: Core Geological & Petrographic Properties */}
          <div className="space-y-4">
            {/* Chemical / Assemblage Formula */}
            <div className="p-4 bg-stone-950/80 border border-stone-800 rounded-xl">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                  <FlaskConical className="w-4 h-4" />
                  <span>{isRock ? 'Typical Mineral Assemblage / Rock Formula' : 'Stoichiometric Chemical Formula'}</span>
                </div>
                <span className="text-[11px] font-mono text-stone-400">
                  {isRock ? (rock?.category || 'Rock') : (mineral?.group || 'Mineral')}
                </span>
              </div>
              <div className="text-base sm:text-xl font-mono font-bold text-stone-100 tracking-wide break-words">
                {enriched.formula || (mineral ? mineral.formula : 'Complex Silicate Assemblage')}
              </div>
              {mineral?.solidSolution && (
                <p className="text-xs text-stone-400 mt-2 font-sans border-t border-stone-850 pt-1.5">
                  <span className="text-stone-400 font-medium">Solid Solution Series:</span>{' '}
                  <span className="text-amber-300">{mineral.solidSolution}</span>
                </p>
              )}
            </div>

            {/* Typical Occurrence */}
            <div className="p-4 bg-stone-950/80 border border-stone-800 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 mb-1.5">
                <MapPin className="w-4 h-4" />
                <span>Typical Occurrence &amp; Geological Environment</span>
              </div>
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                {enriched.typicalOccurrence || (isRock ? rock?.typicalTectonicSetting : mineral?.description)}
              </p>
            </div>

            {/* Quick Spec Attributes Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 text-xs">
              {isRock ? (
                <>
                  {rock?.tasField && (
                    <div className="p-2.5 bg-stone-950/60 rounded-xl border border-stone-800">
                      <span className="text-[10px] text-stone-400 block font-medium">TAS Diagram Field</span>
                      <span className="font-semibold text-amber-300 text-xs sm:text-sm">{rock.tasField}</span>
                    </div>
                  )}
                  {rock?.magmaticSeries && (
                    <div className="p-2.5 bg-stone-950/60 rounded-xl border border-stone-800">
                      <span className="text-[10px] text-stone-400 block font-medium">Magmatic Series</span>
                      <span className="font-semibold text-stone-200 text-xs sm:text-sm">{rock.magmaticSeries}</span>
                    </div>
                  )}
                  {rock?.silicaSaturation && (
                    <div className="p-2.5 bg-stone-950/60 rounded-xl border border-stone-800">
                      <span className="text-[10px] text-stone-400 block font-medium">Silica Saturation</span>
                      <span className="font-semibold text-stone-200 text-xs sm:text-sm">{rock.silicaSaturation}</span>
                    </div>
                  )}
                  {rock?.category && (
                    <div className="p-2.5 bg-stone-950/60 rounded-xl border border-stone-800">
                      <span className="text-[10px] text-stone-400 block font-medium">Classification</span>
                      <span className="font-semibold text-stone-200 text-xs sm:text-sm">{rock.category}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {mineral?.crystalSystem && (
                    <div className="p-2.5 bg-stone-950/60 rounded-xl border border-stone-800">
                      <span className="text-[10px] text-stone-400 block font-medium">Crystal System</span>
                      <span className="font-semibold text-stone-200 text-xs sm:text-sm">{mineral.crystalSystem}</span>
                    </div>
                  )}
                  {mineral?.mohsHardness && (
                    <div className="p-2.5 bg-stone-950/60 rounded-xl border border-stone-800">
                      <span className="text-[10px] text-stone-400 block font-medium">Mohs Hardness</span>
                      <span className="font-semibold text-cyan-300 font-mono text-xs sm:text-sm">{mineral.mohsHardness}</span>
                    </div>
                  )}
                  {mineral?.density && (
                    <div className="p-2.5 bg-stone-950/60 rounded-xl border border-stone-800">
                      <span className="text-[10px] text-stone-400 block font-medium">Specific Gravity</span>
                      <span className="font-semibold text-stone-200 font-mono text-xs sm:text-sm">{mineral.density} g/cm³</span>
                    </div>
                  )}
                  {mineral?.group && (
                    <div className="p-2.5 bg-stone-950/60 rounded-xl border border-stone-800">
                      <span className="text-[10px] text-stone-400 block font-medium">Silicate Group</span>
                      <span className="font-semibold text-stone-200 text-xs sm:text-sm">{mineral.group}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Interesting Geological Facts Section */}
          {enriched.geologicalFacts && enriched.geologicalFacts.length > 0 && (
            <div className="bg-stone-950/90 border border-stone-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Lightbulb className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Fascinating Geological Facts
                </h3>
              </div>

              <div className="space-y-2.5">
                {enriched.geologicalFacts.map((fact, index) => (
                  <div
                    key={`fact-${index}`}
                    className="p-3 bg-stone-900/80 border border-stone-800/80 rounded-lg text-xs sm:text-sm text-stone-300 flex items-start gap-2.5 leading-relaxed"
                  >
                    <span className="w-5 h-5 rounded-full bg-stone-800 text-amber-400 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 font-mono">
                      {index + 1}
                    </span>
                    <span>{fact}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Database References (Mindat, Webmineral, RRUFF, EarthChem) */}
          <DatabaseReferencesCard
            name={enriched.name}
            databaseRefs={enriched.databaseRefs}
            isRock={isRock}
          />

          {/* Geochemical Profile (Oxides wt%) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-stone-500" />
                <span>
                  {isRock ? 'Mean Reference Oxides (wt%)' : 'Ideal Stoichiometric Oxides (wt%)'}
                </span>
              </h4>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {Object.entries(oxides)
                .filter(([_, val]) => val !== undefined && val > 0)
                .map(([ox, val]) => (
                  <div
                    key={`ox-display-${ox}`}
                    className="p-2 bg-stone-950/60 rounded border border-stone-850 flex flex-col"
                  >
                    <span className="text-[10px] text-stone-500 font-semibold">{ox}</span>
                    <span className="text-xs font-mono font-bold text-amber-300">
                      {Number(val).toFixed(2)}%
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-stone-800 bg-stone-900/95 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-stone-500">
            {isRock ? (rock?.georocCode ? `GEOROC Code: ${rock.georocCode}` : 'GEOROC Standard') : 'EPMA Database Standard'}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-lg transition-colors"
            >
              Close
            </button>
            {onInspect && (
              <button
                onClick={() => {
                  onInspect(oxides, enriched.name);
                  onClose();
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg shadow-md transition-colors flex items-center gap-1.5"
              >
                <FlaskConical className="w-3.5 h-3.5" />
                <span>Analyze This Composition</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
