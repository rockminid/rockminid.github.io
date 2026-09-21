import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Info,
  Layers,
  ChevronRight,
  TrendingUp,
  Percent,
  BookOpen,
  MapPin,
  Lightbulb,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Compass,
  FileText,
  SlidersHorizontal,
  LayoutGrid,
  Share2,
  MessageSquarePlus,
} from 'lucide-react';
import { InputMode, OxideComposition, ElementComposition, RockReference, MineralReference } from '../types/geochem';
import { MAJOR_OXIDES, identifyGeochemicalSample } from '../utils/geochemEngine';
import { STOICHIOMETRY_TABLE, oxidesToElements, elementsToOxides } from '../data/stoichiometry';
import { TasDiagram, TASPoint } from './TasDiagram';
import { TernaryDiagram } from './TernaryDiagram';
import {
  AFM_IGNEOUS_CONFIG,
  QAPF_PLUTONIC_CONFIG,
  PYROXENE_QUAD_CONFIG,
  TernaryPoint,
} from '../utils/ternaryCalculations';
import { SpecimenModal } from './SpecimenModal';
import { getEnrichedSpecimen } from '../data/visualDatabase';
import { DatabaseReferencesCard } from './DatabaseReferencesCard';
import { SaveToCollectionModal } from './SaveToCollectionModal';
import { NormativeMineralogyCard } from './NormativeMineralogyCard';
import { generateInterpretation } from '../services/interpretationService';

interface SingleAnalyzerProps {
  initialOxides?: OxideComposition;
  sampleName?: string;
}

export interface PresetItem {
  name: string;
  shortLabel: string;
  type: 'Rock' | 'Mineral';
  oxides: OxideComposition;
}

export interface PresetGroup {
  category: string;
  items: PresetItem[];
}

// Grouped Benchmark Geological Suites
const PRESET_GROUPS: PresetGroup[] = [
  {
    category: 'Volcanic Rocks (Extrusive)',
    items: [
      {
        name: 'N-MORB Basalt (Pacific)',
        shortLabel: 'MORB Basalt',
        type: 'Rock',
        oxides: { SiO2: 50.45, TiO2: 1.48, Al2O3: 15.28, FeO: 8.85, Fe2O3: 1.45, MnO: 0.17, MgO: 7.78, CaO: 11.62, Na2O: 2.65, K2O: 0.14, P2O5: 0.12, LOI: 0.45 },
      },
      {
        name: 'OIB Shield Basalt (Kilauea)',
        shortLabel: 'OIB Basalt',
        type: 'Rock',
        oxides: { SiO2: 51.10, TiO2: 2.65, Al2O3: 13.90, FeO: 9.90, Fe2O3: 1.95, MnO: 0.17, MgO: 7.20, CaO: 10.40, Na2O: 2.35, K2O: 0.48, P2O5: 0.26, LOI: 0.35 },
      },
      {
        name: 'Calc-Alkaline Andesite (Arc)',
        shortLabel: 'Arc Andesite',
        type: 'Rock',
        oxides: { SiO2: 59.20, TiO2: 0.85, Al2O3: 16.80, FeO: 5.20, Fe2O3: 1.95, MnO: 0.12, MgO: 3.40, CaO: 6.20, Na2O: 3.65, K2O: 1.85, P2O5: 0.20, LOI: 1.25 },
      },
      {
        name: 'High-Silica Rhyolite (Yellowstone)',
        shortLabel: 'Rhyolite',
        type: 'Rock',
        oxides: { SiO2: 74.20, TiO2: 0.22, Al2O3: 13.50, FeO: 1.25, Fe2O3: 0.95, MnO: 0.05, MgO: 0.35, CaO: 1.15, Na2O: 3.65, K2O: 4.45, P2O5: 0.04, LOI: 0.95 },
      },
      {
        name: 'Komatiite (Archean Lava)',
        shortLabel: 'Komatiite',
        type: 'Rock',
        oxides: { SiO2: 46.20, TiO2: 0.42, Al2O3: 6.80, FeO: 9.80, Fe2O3: 1.90, MnO: 0.18, MgO: 28.50, CaO: 5.60, Na2O: 0.38, K2O: 0.08, Cr2O3: 0.42, LOI: 2.80 },
      },
    ],
  },
  {
    category: 'Plutonic & Mantle (Intrusive)',
    items: [
      {
        name: 'Mantle Dunite (Peridotite)',
        shortLabel: 'Dunite',
        type: 'Rock',
        oxides: { SiO2: 40.50, TiO2: 0.05, Al2O3: 0.95, FeO: 8.20, Fe2O3: 1.10, MnO: 0.14, MgO: 47.80, CaO: 0.65, Na2O: 0.05, K2O: 0.02, Cr2O3: 0.45, NiO: 0.28, LOI: 0.85 },
      },
      {
        name: 'Tholeiitic Gabbro (Bushveld)',
        shortLabel: 'Gabbro',
        type: 'Rock',
        oxides: { SiO2: 50.85, TiO2: 0.90, Al2O3: 15.65, FeO: 8.40, Fe2O3: 2.10, MnO: 0.16, MgO: 8.10, CaO: 11.20, Na2O: 2.30, K2O: 0.25, P2O5: 0.08, LOI: 0.65 },
      },
      {
        name: 'Granodiorite (Sierra Nevada)',
        shortLabel: 'Granodiorite',
        type: 'Rock',
        oxides: { SiO2: 66.80, TiO2: 0.55, Al2O3: 15.90, FeO: 2.80, Fe2O3: 1.45, MnO: 0.07, MgO: 1.80, CaO: 3.90, Na2O: 3.80, K2O: 2.65, P2O5: 0.16, LOI: 0.75 },
      },
      {
        name: 'S-Type Peraluminous Granite',
        shortLabel: 'S-Type Granite',
        type: 'Rock',
        oxides: { SiO2: 73.10, TiO2: 0.25, Al2O3: 14.80, FeO: 1.65, Fe2O3: 0.45, MnO: 0.04, MgO: 0.55, CaO: 0.95, Na2O: 2.95, K2O: 4.85, P2O5: 0.22, LOI: 0.85 },
      },
      {
        name: 'Anorthosite (Plagioclase-rich)',
        shortLabel: 'Anorthosite',
        type: 'Rock',
        oxides: { SiO2: 53.60, TiO2: 0.25, Al2O3: 27.20, FeO: 1.20, Fe2O3: 0.60, MnO: 0.02, MgO: 0.80, CaO: 12.80, Na2O: 3.10, K2O: 0.45, LOI: 0.70 },
      },
    ],
  },
  {
    category: 'Rock-Forming Minerals',
    items: [
      {
        name: 'Forsterite Olivine (Fo90)',
        shortLabel: 'Olivine (Fo90)',
        type: 'Mineral',
        oxides: { SiO2: 41.50, MgO: 49.50, FeO: 8.80, MnO: 0.15, NiO: 0.35 },
      },
      {
        name: 'Labradorite Plagioclase (An60)',
        shortLabel: 'Plagioclase (An60)',
        type: 'Mineral',
        oxides: { SiO2: 55.40, Al2O3: 28.50, CaO: 12.30, Na2O: 3.80, FeO: 0.35, K2O: 0.25 },
      },
      {
        name: 'Augite Clinopyroxene',
        shortLabel: 'Augite Cpx',
        type: 'Mineral',
        oxides: { SiO2: 51.20, TiO2: 1.10, Al2O3: 4.50, FeO: 8.20, MgO: 15.20, CaO: 19.20, Na2O: 0.70 },
      },
      {
        name: 'Quartz Crystal',
        shortLabel: 'Quartz',
        type: 'Mineral',
        oxides: { SiO2: 99.80, Al2O3: 0.10, Fe2O3: 0.05 },
      },
      {
        name: 'Pure Calcite',
        shortLabel: 'Calcite',
        type: 'Mineral',
        oxides: { CaO: 55.80, LOI: 43.80, MgO: 0.30 },
      },
    ],
  },
];

const ALL_PRESETS = PRESET_GROUPS.flatMap((g) => g.items);

// Major rock-forming oxides vs Minor/Volatiles
const CORE_MAJOR_OXIDES = ['SiO2', 'Al2O3', 'FeO', 'Fe2O3', 'MgO', 'CaO', 'Na2O', 'K2O'];
const MINOR_OXIDES = ['TiO2', 'MnO', 'P2O5', 'Cr2O3', 'NiO', 'LOI'];

export const SingleAnalyzer: React.FC<SingleAnalyzerProps> = ({ initialOxides, sampleName: propSampleName }) => {
  const [sampleName, setSampleName] = useState<string>(propSampleName || 'Sample-X1');
  const [inputMode, setInputMode] = useState<InputMode>('oxide');
  const [oxides, setOxides] = useState<OxideComposition>(
    initialOxides || {
      SiO2: 50.45,
      TiO2: 1.48,
      Al2O3: 15.28,
      FeO: 8.85,
      Fe2O3: 1.45,
      MnO: 0.17,
      MgO: 7.78,
      CaO: 11.62,
      Na2O: 2.65,
      K2O: 0.14,
      P2O5: 0.12,
      LOI: 0.45,
    }
  );

  // Minor oxides collapsible toggle
  const [showMinorOxides, setShowMinorOxides] = useState<boolean>(false);

  // Result section tabs: 'candidates' | 'diagrams' | 'norm' | 'research'
  type ResultSection = 'candidates' | 'diagrams' | 'norm' | 'research';
  const [activeSection, setActiveSection] = useState<ResultSection>('candidates');
  const [viewMode, setViewMode] = useState<'tabs' | 'all'>('tabs');
  const [showAllPresets, setShowAllPresets] = useState<boolean>(false);

  const [aiInterpretation, setAiInterpretation] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [activeModalSpecimen, setActiveModalSpecimen] = useState<RockReference | MineralReference | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);

  // Synchronized element representation
  const elements = useMemo(() => oxidesToElements(oxides), [oxides]);

  // Count active minor oxides
  const activeMinorCount = useMemo(() => {
    return MINOR_OXIDES.filter((ox) => oxides[ox] !== undefined && (oxides[ox] as number) > 0)
      .length;
  }, [oxides]);

  // Analytical Total Calculation
  const rawTotal = useMemo(() => {
    return Number(
      Object.values(oxides).reduce((acc: number, val) => (val !== undefined && !isNaN(val) ? acc + val : acc), 0).toFixed(2)
    );
  }, [oxides]);

  // Evaluation by Geochemical Identification Engine
  const classificationReport = useMemo(() => {
    return identifyGeochemicalSample(oxides, sampleName, inputMode);
  }, [oxides, sampleName, inputMode]);

  // Standard geochemical ratios and petrological indices.
  //
  // These come straight from the engine rather than being recomputed here.
  // The previous inline copy omitted the apatite correction and, worse,
  // classified any ASI below 0.95 as peralkaline. Peralkaline is defined by
  // A/NK < 1 (molar Al below Na+K), not by ASI < 1, so ordinary metaluminous
  // basalts and gabbros were all mislabelled.
  const geochemicalIndices = useMemo(() => {
    const st = classificationReport.stoichiometry;
    return {
      asi: st?.asi !== undefined ? st.asi.toFixed(2) : 'N/A',
      asiClassification: st?.aluminaSaturation ?? 'Undetermined',
      ank: st?.ank !== undefined ? st.ank.toFixed(2) : 'N/A',
      mgNumber: st?.mgNumber !== undefined ? st.mgNumber.toFixed(1) : 'N/A',
      totalAlkalis: (st?.totalAlkalis ?? 0).toFixed(2),
    };
  }, [classificationReport.stoichiometry]);

  // Handle Oxide Input Change
  const handleOxideChange = (key: string, valueStr: string) => {
    const val = valueStr === '' ? undefined : parseFloat(valueStr);
    setOxides((prev) => {
      const next = { ...prev };
      if (val === undefined || isNaN(val)) {
        delete next[key];
      } else {
        next[key] = Math.max(0, val);
      }
      return next;
    });
  };

  // Handle Element Input Change (automatically converts to oxide)
  const handleElementChange = (elKey: string, valueStr: string) => {
    const val = valueStr === '' ? undefined : parseFloat(valueStr);
    const updatedElements: ElementComposition = { ...elements };
    if (val === undefined || isNaN(val)) {
      delete updatedElements[elKey];
    } else {
      updatedElements[elKey] = Math.max(0, val);
    }
    const convertedOxides = elementsToOxides(updatedElements);
    setOxides(convertedOxides);
  };

  // Clear all values
  const handleReset = () => {
    setOxides({});
    setAiInterpretation(null);
  };

  // Normalize current inputs to exactly 100%
  const handleNormalize = () => {
    if (rawTotal <= 0) return;
    const factor = 100 / rawTotal;
    const normalized: OxideComposition = {};
    for (const [k, v] of Object.entries(oxides)) {
      if (v !== undefined) {
        normalized[k] = Number((v * factor).toFixed(2));
      }
    }
    setOxides(normalized);
  };

  // Load a Preset
  const handleLoadPreset = (preset: PresetItem) => {
    setSampleName(preset.name);
    setOxides({ ...preset.oxides });
    setAiInterpretation(null);
    const hasMinors = MINOR_OXIDES.some(
      (ox) => preset.oxides[ox as keyof OxideComposition] !== undefined
    );
    if (hasMinors) setShowMinorOxides(true);
  };

  // Petrological interpretation. Uses a configured AI backend when present,
  // otherwise a deterministic rule-based summary so that static and offline
  // deployments still produce a report instead of a connection error.
  const handleGenerateAiReport = async () => {
    setIsAiLoading(true);
    try {
      const result = await generateInterpretation(classificationReport, inputMode);
      setAiInterpretation(result.interpretation);
    } catch (err: any) {
      setAiInterpretation(
        `Interpretation failed: ${err?.message || 'unknown error'}`
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  // TAS plot point for the current sample
  const currentTasPoints: TASPoint[] = useMemo(() => {
    const s = classificationReport.normalizedOxides.SiO2 || 0;
    const alk =
      (classificationReport.normalizedOxides.Na2O || 0) +
      (classificationReport.normalizedOxides.K2O || 0);
    return [
      {
        id: 'active-sample',
        name: sampleName,
        sio2: s,
        totalAlkalis: alk,
        category: classificationReport.tasField,
        isPrimary: true,
      },
    ];
  }, [classificationReport, sampleName]);

  const [activeDiagramTab, setActiveDiagramTab] = useState<'tas' | 'afm' | 'qapf' | 'pyroxene'>('tas');

  const afmSamplePoint: TernaryPoint[] = useMemo(() => {
    const proj = AFM_IGNEOUS_CONFIG.projectOxides(classificationReport.normalizedOxides);
    return [
      {
        id: 'active-afm-sample',
        name: sampleName,
        a: proj.a,
        b: proj.b,
        c: proj.c,
        isPrimary: true,
        field: proj.fieldName,
        color: '#f59e0b',
      },
    ];
  }, [classificationReport, sampleName]);

  const qapfSamplePoint: TernaryPoint[] = useMemo(() => {
    const proj = QAPF_PLUTONIC_CONFIG.projectOxides(classificationReport.normalizedOxides);
    return [
      {
        id: 'active-qapf-sample',
        name: sampleName,
        a: proj.a,
        b: proj.b,
        c: proj.c,
        isPrimary: true,
        field: proj.fieldName,
        color: '#f59e0b',
      },
    ];
  }, [classificationReport, sampleName]);

  const pyxSamplePoint: TernaryPoint[] = useMemo(() => {
    const proj = PYROXENE_QUAD_CONFIG.projectOxides(classificationReport.normalizedOxides);
    return [
      {
        id: 'active-pyx-sample',
        name: sampleName,
        a: proj.a,
        b: proj.b,
        c: proj.c,
        isPrimary: true,
        field: proj.fieldName,
        color: '#f59e0b',
      },
    ];
  }, [classificationReport, sampleName]);

  const bestMatch = classificationReport.bestOverall;
  const isRock = bestMatch.type === 'rock';
  const enrichedBest = useMemo(() => getEnrichedSpecimen(bestMatch.reference), [bestMatch.reference]);

  return (
    <div className="space-y-6">
      {/* Specimen Detail Modal */}
      <SpecimenModal
        specimen={activeModalSpecimen}
        onClose={() => setActiveModalSpecimen(null)}
        onInspect={(newOx, newName) => {
          setOxides(newOx);
          setSampleName(newName);
        }}
      />

      {/* Save Specimen to Collection Modal */}
      <SaveToCollectionModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        defaultName={sampleName}
        identifiedName={bestMatch.reference.name}
        identifiedType={isRock ? 'rock' : 'mineral'}
        confidence={bestMatch.similarity}
        oxides={oxides}
        elements={elements}
        databaseRefs={enrichedBest.databaseRefs}
      />

      {/* Preset Quick Select Bar - Streamlined & Decluttered */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-3 sm:p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
              Geological Benchmark Suites
            </span>
            <span className="text-[11px] text-stone-500 hidden sm:inline">
              Autofill reference standards
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowAllPresets(!showAllPresets)}
            className="px-2.5 py-1 text-xs rounded-lg bg-stone-850 hover:bg-stone-800 text-amber-300 border border-stone-750 transition-colors flex items-center gap-1.5"
          >
            <span>{showAllPresets ? 'Hide Full Suites' : 'Browse All Suites (15)'}</span>
            {showAllPresets ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Streamlined Quick-Pick Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-stone-500 font-medium mr-1">Quick Picks:</span>
          {[
            PRESET_GROUPS[0]?.items[0], // MORB Basalt
            PRESET_GROUPS[0]?.items[2], // Arc Andesite
            PRESET_GROUPS[0]?.items[3], // Rhyolite
            PRESET_GROUPS[1]?.items[0], // Dunite
            PRESET_GROUPS[1]?.items[1], // Gabbro
            PRESET_GROUPS[1]?.items[3], // Granite
            PRESET_GROUPS[2]?.items[0], // Forsterite
            PRESET_GROUPS[2]?.items[2], // Augite Cpx
          ]
            .filter((preset): preset is PresetItem => Boolean(preset && preset.name))
            .map((preset, idx) => (
              <button
                key={`quick-preset-${preset.name}-${idx}`}
                onClick={() => handleLoadPreset(preset)}
                className="px-2.5 py-1 text-xs rounded-md bg-stone-950 hover:bg-stone-800 text-stone-300 hover:text-amber-300 border border-stone-800 transition-colors font-medium"
                title={`Load ${preset.name} (${preset.type})`}
              >
                {preset.shortLabel || preset.name}
              </button>
            ))}
        </div>

        {/* Collapsible Full Categorized Grid */}
        {showAllPresets && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-3 mt-3 border-t border-stone-800/80 animate-in fade-in duration-200">
            {PRESET_GROUPS.map((group, gIdx) => (
              <div
                key={`grp-${gIdx}`}
                className="bg-stone-950/60 border border-stone-800/80 rounded-lg p-2.5 flex flex-col justify-between gap-2"
              >
                <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      group.category.includes('Volcanic')
                        ? 'bg-amber-400'
                        : group.category.includes('Plutonic')
                        ? 'bg-orange-400'
                        : 'bg-cyan-400'
                    }`}
                  />
                  {group.category}
                </div>
                <div className="flex flex-wrap gap-1">
                  {group.items.map((preset, idx) => (
                    <button
                      key={`preset-${gIdx}-${idx}`}
                      onClick={() => handleLoadPreset(preset)}
                      className="px-2 py-1 text-xs rounded bg-stone-850 hover:bg-stone-700/80 text-stone-300 hover:text-white border border-stone-750/70 transition-colors"
                      title={`Load ${preset.name}`}
                    >
                      {preset.shortLabel || preset.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Composition Inputs */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
            {/* Header: Sample Name & Mode Switch */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-stone-800">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-[11px] font-medium text-stone-400 mb-1">
                  Sample ID / Name
                </label>
                <input
                  type="text"
                  value={sampleName}
                  onChange={(e) => setSampleName(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-md px-2.5 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                  placeholder="e.g. MORB-PAC-04"
                />
              </div>

              {/* Mode Toggle: Oxide vs Element */}
              <div>
                <label className="block text-[11px] font-medium text-stone-400 mb-1">
                  Input Mode
                </label>
                <div className="inline-flex rounded-md bg-stone-950 p-0.5 border border-stone-700">
                  <button
                    onClick={() => setInputMode('oxide')}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      inputMode === 'oxide'
                        ? 'bg-amber-600 text-white shadow'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    Oxide wt%
                  </button>
                  <button
                    onClick={() => setInputMode('element')}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      inputMode === 'element'
                        ? 'bg-amber-600 text-white shadow'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    Element wt%
                  </button>
                </div>
              </div>
            </div>

            {/* Inputs: Major Oxides vs Collapsible Minor Oxides */}
            {inputMode === 'oxide' ? (
              <div className="space-y-3">
                {/* 8 Core Rock-Forming Oxides */}
                <div>
                  <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Essential Major Oxides</span>
                    <span className="text-[10px] text-stone-500 font-normal">wt% oxides</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {CORE_MAJOR_OXIDES.map((ox) => {
                      const val = oxides[ox];
                      const factor = STOICHIOMETRY_TABLE[ox]?.oxideToElement;
                      const elName = STOICHIOMETRY_TABLE[ox]?.element;

                      return (
                        <div
                          key={`input-${ox}`}
                          className="bg-stone-950/70 border border-stone-800/90 rounded-lg p-2 hover:border-amber-600/40 transition-colors"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-semibold text-stone-200">{ox}</label>
                            {elName && (
                              <span className="text-[10px] text-stone-500 font-mono">
                                {elName} {(val ? val * factor : 0).toFixed(1)}%
                              </span>
                            )}
                          </div>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={val !== undefined ? val : ''}
                              onChange={(e) => handleOxideChange(ox, e.target.value)}
                              placeholder="0.00"
                              className="w-full bg-stone-900/90 border border-stone-800 rounded px-2 py-1 text-xs font-mono text-stone-100 text-right pr-5 focus:outline-none focus:border-amber-500"
                            />
                            <span className="absolute right-1.5 top-1 text-[10px] text-stone-500 pointer-events-none">
                              %
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Collapsible Minor Oxides & Volatiles */}
                <div className="border border-stone-800/80 rounded-lg bg-stone-950/40 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowMinorOxides(!showMinorOxides)}
                    className="w-full px-3 py-2 text-xs font-medium text-stone-300 hover:text-white flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                      <span>Minor Oxides &amp; Volatiles (TiO₂, MnO, P₂O₅, LOI...)</span>
                      {activeMinorCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {activeMinorCount} active
                        </span>
                      )}
                    </div>
                    {showMinorOxides ? (
                      <ChevronUp className="w-4 h-4 text-stone-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-stone-400" />
                    )}
                  </button>

                  {showMinorOxides && (
                    <div className="p-3 pt-1 border-t border-stone-850/80 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {MINOR_OXIDES.map((ox) => {
                        const val = oxides[ox];
                        const factor = STOICHIOMETRY_TABLE[ox]?.oxideToElement;
                        const elName = STOICHIOMETRY_TABLE[ox]?.element;

                        return (
                          <div
                            key={`input-minor-${ox}`}
                            className="bg-stone-900/80 border border-stone-800/90 rounded-lg p-2 hover:border-amber-600/40 transition-colors"
                          >
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-xs font-semibold text-stone-300">{ox}</label>
                              {elName && (
                                <span className="text-[10px] text-stone-500 font-mono">
                                  {elName} {(val ? val * factor : 0).toFixed(1)}%
                                </span>
                              )}
                            </div>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={val !== undefined ? val : ''}
                                onChange={(e) => handleOxideChange(ox, e.target.value)}
                                placeholder="0.00"
                                className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-xs font-mono text-stone-100 text-right pr-5 focus:outline-none focus:border-amber-500"
                              />
                              <span className="absolute right-1.5 top-1 text-[10px] text-stone-500 pointer-events-none">
                                %
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Element Inputs Grid with Collapsible Minors */
              <div className="space-y-3">
                <div>
                  <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Primary Elements</span>
                    <span className="text-[10px] text-amber-400 font-mono">wt% element</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['Si', 'Al', 'Fe', 'Mg', 'Ca', 'Na', 'K'].map((el) => {
                      const val = elements[el];
                      return (
                        <div
                          key={`input-el-${el}`}
                          className="bg-stone-950/70 border border-stone-800/90 rounded-lg p-2 hover:border-amber-600/40 transition-colors"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-semibold text-stone-200">{el}</label>
                            <span className="text-[10px] text-amber-500/80 font-mono">Element</span>
                          </div>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={val !== undefined ? val.toFixed(2) : ''}
                              onChange={(e) => handleElementChange(el, e.target.value)}
                              placeholder="0.00"
                              className="w-full bg-stone-900/90 border border-stone-800 rounded px-2 py-1 text-xs font-mono text-stone-100 text-right pr-5 focus:outline-none focus:border-amber-500"
                            />
                            <span className="absolute right-1.5 top-1 text-[10px] text-stone-500 pointer-events-none">
                              %
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border border-stone-800/80 rounded-lg bg-stone-950/40 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowMinorOxides(!showMinorOxides)}
                    className="w-full px-3 py-2 text-xs font-medium text-stone-300 hover:text-white flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                      <span>Minor &amp; Trace Elements (Ti, Mn, P, Cr, Ni...)</span>
                    </div>
                    {showMinorOxides ? (
                      <ChevronUp className="w-4 h-4 text-stone-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-stone-400" />
                    )}
                  </button>

                  {showMinorOxides && (
                    <div className="p-3 pt-1 border-t border-stone-850/80 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {['Ti', 'Mn', 'P', 'Cr', 'Ni'].map((el) => {
                        const val = elements[el];
                        return (
                          <div
                            key={`input-el-minor-${el}`}
                            className="bg-stone-900/80 border border-stone-800/90 rounded-lg p-2 hover:border-amber-600/40 transition-colors"
                          >
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-xs font-semibold text-stone-300">{el}</label>
                              <span className="text-[10px] text-stone-500 font-mono">Minor</span>
                            </div>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={val !== undefined ? val.toFixed(2) : ''}
                                onChange={(e) => handleElementChange(el, e.target.value)}
                                placeholder="0.00"
                                className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-xs font-mono text-stone-100 text-right pr-5 focus:outline-none focus:border-amber-500"
                              />
                              <span className="absolute right-1.5 top-1 text-[10px] text-stone-500 pointer-events-none">
                                %
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Total Sum & Normalization Actions */}
            <div className="mt-4 pt-3 border-t border-stone-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-400">Total Sum:</span>
                <span
                  className={`text-sm font-mono font-bold px-2 py-0.5 rounded ${
                    rawTotal >= 98.5 && rawTotal <= 101.5
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                      : rawTotal >= 95.0 && rawTotal <= 105.0
                      ? 'bg-amber-950 text-amber-300 border border-amber-800/60'
                      : 'bg-rose-950 text-rose-300 border border-rose-800/60'
                  }`}
                >
                  {rawTotal.toFixed(2)} wt%
                </span>
                {rawTotal >= 98.5 && rawTotal <= 101.5 ? (
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> High Quality
                  </span>
                ) : (
                  <span className="text-[11px] text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {rawTotal < 98.5 ? 'Volatiles/Unmeasured' : 'Over 100%'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleNormalize}
                  disabled={rawTotal <= 0}
                  className="px-2.5 py-1 text-xs font-medium bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded border border-stone-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  <Percent className="w-3 h-3 text-amber-400" />
                  Normalize 100%
                </button>
                <button
                  onClick={handleReset}
                  className="px-2.5 py-1 text-xs font-medium bg-stone-800/60 hover:bg-stone-800 text-stone-400 hover:text-rose-300 rounded border border-stone-800 transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Clear
                </button>
              </div>
            </div>

            {classificationReport.dataQualityWarning && (
              <div className="mt-3 p-2.5 bg-amber-950/40 border border-amber-800/40 rounded-lg text-xs text-amber-300 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{classificationReport.dataQualityWarning}</span>
              </div>
            )}
          </div>

          {/* Quick Petrological & Geochemical Indices Card */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-stone-800">
              <span className="text-xs font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                Key Geochemical Indices
              </span>
              <span className="text-[10px] text-stone-500 font-mono">Calculated from Oxides</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-stone-950/80 border border-stone-800/80 rounded-lg p-2">
                <div className="text-[10px] text-stone-400 font-medium">ASI (Shand)</div>
                <div className="text-xs font-bold font-mono text-stone-100 mt-0.5">
                  {geochemicalIndices.asi}
                </div>
                <div className="text-[9px] text-amber-400 truncate mt-0.5">
                  {geochemicalIndices.asiClassification}
                </div>
              </div>
              <div className="bg-stone-950/80 border border-stone-800/80 rounded-lg p-2">
                <div className="text-[10px] text-stone-400 font-medium">Mg# Number</div>
                <div className="text-xs font-bold font-mono text-stone-100 mt-0.5">
                  {geochemicalIndices.mgNumber}
                </div>
                <div className="text-[9px] text-stone-500 truncate mt-0.5">Mg / (Mg + Fe)</div>
              </div>
              <div className="bg-stone-950/80 border border-stone-800/80 rounded-lg p-2">
                <div className="text-[10px] text-stone-400 font-medium">Total Alkalis</div>
                <div className="text-xs font-bold font-mono text-stone-100 mt-0.5">
                  {geochemicalIndices.totalAlkalis}%
                </div>
                <div className="text-[9px] text-stone-500 truncate mt-0.5">Na₂O + K₂O</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Classification Results, Comparative Breakdown & TAS */}
        <div className="lg:col-span-7 space-y-4">
          {/* Primary Match Highlight Card */}
          <div className="bg-gradient-to-br from-stone-900 via-stone-900 to-amber-950/40 border border-stone-800 rounded-xl p-5 shadow-lg relative overflow-hidden space-y-4">
            {/* Header & Confidence */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span
                    className={`px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-full border ${
                      isRock
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    }`}
                  >
                    {isRock ? (bestMatch.reference as any).category : (bestMatch.reference as any).group}
                  </span>
                  {/* TAS and its derivatives are defined for whole-rock
                      analyses only, so they are hidden for a mineral grain
                      rather than shown with a caveat. */}
                  {classificationReport.sampleType !== 'mineral' ? (
                    <>
                  <span
                    className="text-xs text-stone-400 font-mono bg-stone-950/70 px-2 py-0.5 rounded border border-stone-850"
                    title={`Le Bas et al. (1986) TAS field${classificationReport.tasCode ? ` ${classificationReport.tasCode}` : ''}. ${classificationReport.tasWarnings?.join(' ') || ''}`}
                  >
                    TAS: {classificationReport.tasField}
                  </span>
                  {/* IUGS sub-root name: the name a petrologist would actually
                      use, derived from the norm (Le Maitre 2002, s.2.12.2). */}
                  {classificationReport.tasSubRootName &&
                    classificationReport.tasSubRootName !== classificationReport.tasField && (
                      <span
                        className="text-xs font-mono bg-emerald-950/50 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/50"
                        title={classificationReport.tasSubRoot?.reasons.join(' ')}
                      >
                        {classificationReport.tasSubRootName}
                      </span>
                    )}
                  {classificationReport.tasSubRoot?.potassiumSeries && (
                    <span
                      className="text-xs text-stone-400 font-mono bg-stone-950/70 px-2 py-0.5 rounded border border-stone-850"
                      title="Peccerillo & Taylor series, as redrawn in Le Maitre (2002) Fig. 2.17. High-K is not the same as potassic."
                    >
                      {classificationReport.tasSubRoot.potassiumSeries}
                    </span>
                  )}
                  <span className="text-xs text-stone-400 font-mono bg-stone-950/70 px-2 py-0.5 rounded border border-stone-850">
                    Affinity: {classificationReport.alkaliAffinity}
                  </span>
                    </>
                  ) : (
                    <span
                      className="text-xs text-stone-400 font-mono bg-stone-950/70 px-2 py-0.5 rounded border border-stone-850"
                      title="TAS, the CIPW norm and the whole-rock ternary diagrams are not defined for a single mineral analysis."
                    >
                      Mineral grain — whole-rock diagrams not applicable
                    </span>
                  )}
                  {classificationReport.sampleType !== 'mineral' &&
                    classificationReport.tasSubRoot?.peralkaline && (
                    <span
                      className="text-xs font-mono bg-fuchsia-950/50 text-fuchsia-300 px-2 py-0.5 rounded border border-fuchsia-800/50"
                      title={`Peralkaline index (molar Na2O+K2O / Al2O3) = ${classificationReport.tasSubRoot.peralkalineIndex?.toFixed(2)}`}
                    >
                      peralkaline
                    </span>
                  )}
                </div>

                <h2 className="text-2xl sm:text-3xl font-bold text-stone-100 tracking-tight">
                  {bestMatch.reference.name}
                </h2>
              </div>

              {/* Similarity score.
                  Deliberately NOT shown as a percentage: it is a bounded
                  compositional-distance score used to rank candidates, and
                  carries no probabilistic meaning. */}
              <div
                className="flex flex-col items-center justify-center p-2.5 bg-stone-950/90 rounded-xl border border-stone-800 min-w-[110px] shrink-0"
                title={`Weighted compositional distance ${bestMatch.distance} over ${bestMatch.analytesUsed ?? 0} analytes. Similarity ranks candidates and is not a probability.`}
              >
                <span className="text-2xl font-bold font-mono text-amber-400">
                  {bestMatch.similarity}
                  <span className="text-sm text-stone-500">/100</span>
                </span>
                <span className="text-[9px] text-stone-400 uppercase tracking-wider font-semibold">
                  Similarity
                </span>
                <span className="text-[9px] text-stone-500 font-mono mt-0.5">
                  d={bestMatch.distance} &bull; n={bestMatch.analytesUsed ?? 0}
                </span>
                {classificationReport.scoreSeparation !== undefined && (
                  <span
                    className={`text-[9px] font-mono mt-0.5 ${
                      classificationReport.scoreSeparation < 3 ? 'text-amber-400' : 'text-stone-500'
                    }`}
                  >
                    {classificationReport.scoreSeparation < 3
                      ? `ambiguous (+${classificationReport.scoreSeparation})`
                      : `+${classificationReport.scoreSeparation} vs next`}
                  </span>
                )}
              </div>
            </div>

            {/* Structural formula: the diagnostic test for a mineral ID.
                Shown for mineral matches only, where it is meaningful. */}
            {!isRock && bestMatch.structuralFormula && (
              <div className="p-3 bg-stone-950/80 rounded-xl border border-stone-800 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-stone-400 uppercase tracking-wider font-semibold">
                    Structural Formula
                  </span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      (bestMatch.structuralFit ?? 0) > 0.6
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50'
                        : (bestMatch.structuralFit ?? 0) > 0.25
                        ? 'bg-amber-950/60 text-amber-300 border-amber-800/50'
                        : 'bg-red-950/60 text-red-300 border-red-800/50'
                    }`}
                    title="Cations per formula unit, recast on this mineral's oxygen basis. This is the diagnostic test for a mineral identification; compositional similarity alone is not."
                  >
                    fit {(100 * (bestMatch.structuralFit ?? 0)).toFixed(0)}%
                  </span>
                </div>
                <div className="text-xs sm:text-sm font-mono text-amber-300 break-words">
                  {bestMatch.structuralFormula.text}
                </div>
                <div className="text-[11px] text-stone-400 font-mono">
                  {bestMatch.structuralFormula.cationSum.toFixed(3)} cations on{' '}
                  {bestMatch.structuralFormula.oxygenBasis} oxygens
                </div>
              </div>
            )}

            {/* Formula & Mineral Assemblage Bar */}
            <div className="p-3 bg-stone-950/80 rounded-xl border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-[11px] text-stone-400 uppercase tracking-wider font-semibold shrink-0">
                {isRock ? 'Typical Mineral Assemblage' : 'Stoichiometric Formula'}:
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-amber-300 break-words">
                {enrichedBest.formula || 'Complex Silicate'}
              </span>
            </div>

            {/* Geological Occurrence */}
            <div className="text-xs text-stone-300 flex items-start gap-2 leading-relaxed bg-stone-950/50 p-3 rounded-xl border border-stone-850">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-stone-400 font-semibold block text-[11px] mb-0.5">
                  Typical Geological Occurrence &amp; Setting:
                </span>
                <span>{enrichedBest.typicalOccurrence}</span>
              </div>
            </div>

            {/* Highlight Geological Fact */}
            {enrichedBest.geologicalFacts && enrichedBest.geologicalFacts.length > 0 && (
              <div className="p-3 bg-stone-950/80 border border-stone-800/80 rounded-xl text-xs text-stone-300 flex items-start gap-2 leading-relaxed">
                <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-amber-400 font-semibold block text-[10px] uppercase tracking-wider mb-0.5">
                    Geological Fact
                  </span>
                  <span>{enrichedBest.geologicalFacts[0]}</span>
                </div>
              </div>
            )}

            {/* Action buttons: Open full modal dossier & Save to Collection */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-stone-850/80">
              <button
                onClick={() => setActiveModalSpecimen(enrichedBest)}
                className="px-3.5 py-1.5 text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-amber-300 hover:text-white rounded-lg border border-amber-600/30 flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>View Specimen Dossier &amp; Facts</span>
              </button>

              <button
                onClick={() => setIsSaveModalOpen(true)}
                className="px-3.5 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                title="Save this sample profile to your collection"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Save to Collection</span>
              </button>

              <button
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent('open-rockmin-share', {
                      detail: {
                        sampleName,
                        summary: `Geochemical analysis for ${sampleName}: Identified as ${bestMatch.reference.name} (${isRock ? 'Rock' : 'Mineral'}) with a similarity score of ${bestMatch.similarity}/100 (compositional distance ${bestMatch.distance}) via RockMin ID.`,
                      },
                    })
                  );
                }}
                className="px-3 py-1.5 text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-amber-300 rounded-lg border border-stone-700 flex items-center gap-1.5 transition-colors shadow-sm"
                title="Share this geochemical classification and parameters"
              >
                <Share2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Share</span>
              </button>

              <button
                onClick={() => {
                  const oxideSummary = Object.entries(oxides)
                    .filter(([_, v]) => (v || 0) > 0)
                    .map(([k, v]) => `${k}:${v}%`)
                    .join(', ');
                  window.dispatchEvent(
                    new CustomEvent('open-rockmin-feedback', {
                      detail: {
                        sampleName,
                        context: `Sample: ${sampleName} | Classified: ${bestMatch.reference.name} (similarity ${bestMatch.similarity}/100) | Oxides: [${oxideSummary}]`,
                      },
                    })
                  );
                }}
                className="px-3 py-1.5 text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-stone-100 rounded-lg border border-stone-700 flex items-center gap-1.5 transition-colors shadow-sm"
                title="Send feedback or correction for this classification"
              >
                <MessageSquarePlus className="w-3.5 h-3.5 text-amber-400" />
                <span>Report / Feedback</span>
              </button>
            </div>

            {/* Diagnostic Criteria Tags */}
            {bestMatch.matchedCriteria.length > 0 && (
              <div className="pt-3 border-t border-stone-800/80 flex flex-wrap gap-1.5">
                {bestMatch.matchedCriteria.map((crit, idx) => (
                  <span
                    key={`crit-${idx}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-stone-800/80 text-stone-300 border border-stone-700/50"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    {crit}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Results Navigation Bar: Organized Tabs to eliminate clutter */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-stone-900 border border-stone-800 rounded-xl p-1.5 shadow-sm">
            <div className="flex items-center gap-1 overflow-x-auto py-0.5">
              <button
                type="button"
                onClick={() => setActiveSection('candidates')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeSection === 'candidates'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Candidate Matches</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('diagrams')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeSection === 'diagrams'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Classification Diagrams</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('norm')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeSection === 'norm'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Normative Mineralogy</span>
                {classificationReport.cipwNorm && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('research')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeSection === 'research'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>AI Petrogenesis</span>
              </button>
            </div>

            {/* View Mode Toggle: Tabbed vs Stacked */}
            <div className="flex items-center gap-1 bg-stone-950 p-0.5 rounded-lg border border-stone-800 text-[11px]">
              <button
                type="button"
                onClick={() => setViewMode('tabs')}
                className={`px-2 py-1 rounded transition-colors ${
                  viewMode === 'tabs'
                    ? 'bg-stone-800 text-stone-100 font-semibold'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
                title="Tabbed focus mode (less clustered)"
              >
                Tabs
              </button>
              <button
                type="button"
                onClick={() => setViewMode('all')}
                className={`px-2 py-1 rounded transition-colors ${
                  viewMode === 'all'
                    ? 'bg-stone-800 text-stone-100 font-semibold'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
                title="Show all sections stacked"
              >
                Stacked
              </button>
            </div>
          </div>

          {/* Tab Content / Stacked Content */}
          <div className="space-y-4">
            {/* Section: Candidate Matches */}
            {(viewMode === 'all' || activeSection === 'candidates') && (
              <div className="space-y-4">
                {/* Top Ranked Candidates Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Top Rock Matches */}
                  <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-stone-800">
                      <h3 className="text-xs font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        Top Rock Matches
                      </h3>
                      <span className="text-[10px] font-mono text-stone-500">
                        {classificationReport.referenceLibrarySize
                          ? `${classificationReport.referenceLibrarySize.rocks.toLocaleString()} refs`
                          : ''}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {classificationReport.topRocks.slice(0, 3).map((match, idx) => {
                        const enriched = getEnrichedSpecimen(match.reference);
                        return (
                          <div
                            key={`top-rock-${idx}`}
                            onClick={() => setActiveModalSpecimen(enriched)}
                            className="p-2.5 rounded-lg bg-stone-950/60 border border-stone-850 hover:border-amber-600/50 flex items-center justify-between gap-2 cursor-pointer transition-all group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-amber-950/60 border border-amber-800/50 flex items-center justify-center shrink-0">
                                <Layers className="w-4 h-4 text-amber-400" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-stone-200 group-hover:text-amber-300 truncate transition-colors">
                                  {match.reference.name}
                                </div>
                                <div className="text-[10px] text-stone-500 font-mono truncate">
                                  {(match.reference as any).category}
                                  {(match.reference as any).georoc ? (
                                    <>
                                      {' '}&bull;{' '}
                                      <span className="text-emerald-500/90">
                                        GEOROC n={(match.reference as any).georoc.analyses.toLocaleString()}
                                      </span>
                                    </>
                                  ) : (
                                    <> &bull; TAS: {(match.reference as any).tasField || 'N/A'}</>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs font-mono font-bold text-amber-400">
                                {match.similarity}
                                <span className="text-stone-500">/100</span>
                              </div>
                              <div className="text-[9px] font-mono text-stone-500">
                                d={match.distance}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Top Mineral Matches */}
                  <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-stone-800">
                      <h3 className="text-xs font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                        Top Mineral Matches
                      </h3>
                      <span className="text-[10px] font-mono text-stone-500">
                        {classificationReport.referenceLibrarySize
                          ? `${classificationReport.referenceLibrarySize.minerals.toLocaleString()} refs`
                          : ''}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {classificationReport.topMinerals.slice(0, 3).map((match, idx) => {
                        const enriched = getEnrichedSpecimen(match.reference);
                        return (
                          <div
                            key={`top-min-${idx}`}
                            onClick={() => setActiveModalSpecimen(enriched)}
                            className="p-2.5 rounded-lg bg-stone-950/60 border border-stone-850 hover:border-cyan-600/50 flex items-center justify-between gap-2 cursor-pointer transition-all group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-800/50 flex items-center justify-center shrink-0">
                                <Sparkles className="w-4 h-4 text-cyan-400" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-stone-200 group-hover:text-cyan-300 truncate transition-colors">
                                  {match.reference.name}
                                </div>
                                <div className="text-[10px] text-stone-500 font-mono truncate">
                                  {(match.reference as any).georoc ? (
                                    <span className="text-emerald-500/90">
                                      GEOROC n={(match.reference as any).georoc.analyses.toLocaleString()} &bull; {(match.reference as any).group}
                                    </span>
                                  ) : (
                                    <>{(match.reference as any).formula} &bull; {(match.reference as any).group}</>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs font-mono font-bold text-cyan-400">
                                {match.similarity}
                                <span className="text-stone-500">/100</span>
                              </div>
                              <div className="text-[9px] font-mono text-stone-500">
                                d={match.distance}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Verified External Database Cross-References */}
                <DatabaseReferencesCard
                  name={enrichedBest.name}
                  databaseRefs={enrichedBest.databaseRefs}
                  isRock={isRock}
                />
              </div>
            )}

            {/* Section: Geochemical Classification Diagrams */}
            {(viewMode === 'all' || activeSection === 'diagrams') && (
              <div className="bg-stone-900 border border-stone-800 rounded-xl p-3 sm:p-4 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-stone-800">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-bold text-stone-200 uppercase tracking-wider">
                      Classification Diagrams &amp; Projections
                    </h4>
                  </div>

                  {/* Diagram Sub-Tabs */}
                  <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-lg border border-stone-800 text-xs">
                    <button
                      onClick={() => setActiveDiagramTab('tas')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        activeDiagramTab === 'tas'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      TAS Diagram
                    </button>
                    <button
                      onClick={() => setActiveDiagramTab('afm')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        activeDiagramTab === 'afm'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      AFM Ternary
                    </button>
                    <button
                      onClick={() => setActiveDiagramTab('qapf')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        activeDiagramTab === 'qapf'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      QAPF
                    </button>
                    <button
                      onClick={() => setActiveDiagramTab('pyroxene')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        activeDiagramTab === 'pyroxene'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      Pyroxene Quad
                    </button>
                  </div>
                </div>

                {activeDiagramTab === 'tas' && (
                  <TasDiagram points={currentTasPoints} selectedPointId="active-sample" height={320} />
                )}

                {activeDiagramTab === 'afm' && (
                  <TernaryDiagram
                    system={AFM_IGNEOUS_CONFIG}
                    points={afmSamplePoint}
                    selectedPointId="active-afm-sample"
                    height={380}
                  />
                )}

                {activeDiagramTab === 'qapf' && (
                  <TernaryDiagram
                    system={QAPF_PLUTONIC_CONFIG}
                    points={qapfSamplePoint}
                    selectedPointId="active-qapf-sample"
                    height={380}
                  />
                )}

                {activeDiagramTab === 'pyroxene' && (
                  <TernaryDiagram
                    system={PYROXENE_QUAD_CONFIG}
                    points={pyxSamplePoint}
                    selectedPointId="active-pyx-sample"
                    height={380}
                  />
                )}
              </div>
            )}

            {/* Section: CIPW Normative Mineralogy */}
            {(viewMode === 'all' || activeSection === 'norm') && (
              <NormativeMineralogyCard
                norm={classificationReport.cipwNorm}
                sampleName={sampleName}
              />
            )}

            {/* Section: AI Petrogenesis */}
            {(viewMode === 'all' || activeSection === 'research') && (
              <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-stone-800">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-semibold text-stone-200 uppercase tracking-wider">
                      AI Petrological &amp; Tectonic Interpretation
                    </h4>
                  </div>
                  <button
                    onClick={handleGenerateAiReport}
                    disabled={isAiLoading || rawTotal <= 0}
                    className="px-3.5 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {isAiLoading ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Analyzing Petrogenesis...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Generate Interpretation
                      </>
                    )}
                  </button>
                </div>

                {aiInterpretation ? (
                  <div className="p-4 bg-stone-950 rounded-lg border border-stone-800 text-xs text-stone-300 space-y-3 leading-relaxed whitespace-pre-line font-sans">
                    {aiInterpretation}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-stone-500 italic bg-stone-950/40 rounded-lg border border-dashed border-stone-800">
                    Click "Generate Interpretation" above to synthesize tectonic provenance, crystallization order, and silica saturation based on your sample's geochemical fingerprint.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
