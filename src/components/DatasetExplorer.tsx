import React, { useState, useMemo } from 'react';
import {
  Search,
  Database,
  ArrowRight,
  Sparkles,
  Lightbulb,
  MapPin,
  FlaskConical,
  Layers,
  BookOpen,
  Info,
} from 'lucide-react';
import { ROCKS_DATASET } from '../data/rocksDataset';
import { MINERALS_DATASET } from '../data/mineralsDataset';
import { OxideComposition, RockReference, MineralReference } from '../types/geochem';
import { SpecimenModal } from './SpecimenModal';
import { getEnrichedMineral, getEnrichedRock, getEnrichedSpecimen } from '../data/visualDatabase';
import { DatabaseReferencesCard } from './DatabaseReferencesCard';

interface DatasetExplorerProps {
  onSelectComposition: (oxides: OxideComposition, name: string) => void;
}

export const DatasetExplorer: React.FC<DatasetExplorerProps> = ({ onSelectComposition }) => {
  const [activeTab, setActiveTab] = useState<'rocks' | 'minerals'>('rocks');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeModalSpecimen, setActiveModalSpecimen] = useState<
    RockReference | MineralReference | null
  >(null);

  // Categories for Rocks
  const rockCategories = [
    'all',
    'Igneous Volcanic',
    'Igneous Plutonic',
    'Ultramafic / Mantle',
    'Sedimentary',
    'Metamorphic',
  ];

  // Groups for Minerals
  const mineralGroups = [
    'all',
    'Nesosilicate',
    'Inosilicate',
    'Phyllosilicate',
    'Tectosilicate',
    'Oxide',
    'Carbonate',
    'Phosphate',
  ];

  // Enriched datasets with high-res photos, formulas, occurrences, and geological facts
  const enrichedRocks = useMemo(() => {
    return ROCKS_DATASET.map(getEnrichedRock);
  }, []);

  const enrichedMinerals = useMemo(() => {
    return MINERALS_DATASET.map(getEnrichedMineral);
  }, []);

  // Filtered Rocks
  const filteredRocks = useMemo(() => {
    return enrichedRocks.filter((rock) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        rock.name.toLowerCase().includes(q) ||
        rock.category.toLowerCase().includes(q) ||
        rock.description.toLowerCase().includes(q) ||
        (rock.formula && rock.formula.toLowerCase().includes(q)) ||
        (rock.typicalOccurrence && rock.typicalOccurrence.toLowerCase().includes(q)) ||
        (rock.tasField && rock.tasField.toLowerCase().includes(q));

      if (!matchesSearch) return false;
      if (selectedCategory !== 'all' && rock.category !== selectedCategory) return false;
      return true;
    });
  }, [enrichedRocks, searchQuery, selectedCategory]);

  // Filtered Minerals
  const filteredMinerals = useMemo(() => {
    return enrichedMinerals.filter((min) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        min.name.toLowerCase().includes(q) ||
        min.group.toLowerCase().includes(q) ||
        min.formula.toLowerCase().includes(q) ||
        min.description.toLowerCase().includes(q) ||
        (min.typicalOccurrence && min.typicalOccurrence.toLowerCase().includes(q));

      if (!matchesSearch) return false;
      if (selectedCategory !== 'all' && !min.group.toLowerCase().includes(selectedCategory.toLowerCase())) return false;
      return true;
    });
  }, [enrichedMinerals, searchQuery, selectedCategory]);

  // Spotlight Specimen (changes or highlights a classic archetype)
  const spotlightSpecimen = useMemo(() => {
    return activeTab === 'rocks'
      ? enrichedRocks.find((r) => r.id === 'rock-eclogite') || enrichedRocks[0]
      : enrichedMinerals.find((m) => m.id === 'min-forsterite') || enrichedMinerals[0];
  }, [activeTab, enrichedRocks, enrichedMinerals]);

  return (
    <div className="space-y-6">
      {/* Specimen Detail Modal */}
      <SpecimenModal
        specimen={activeModalSpecimen}
        onClose={() => setActiveModalSpecimen(null)}
        onInspect={onSelectComposition}
      />

      {/* Hero Header & Search Controls */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 mb-5 border-b border-stone-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <BookOpen className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-stone-100 tracking-tight">
                Reference Mineral &amp; Rock Database
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-stone-400 mt-1 max-w-2xl">
              Explore stoichiometric chemical formulas, typical geological occurrences,
              benchmark oxide compositions, and verified petrological facts.
            </p>
          </div>

          {/* Database Toggle (Rocks vs Minerals) */}
          <div className="inline-flex rounded-xl bg-stone-950 p-1.5 border border-stone-700 shrink-0 self-start md:self-auto">
            <button
              onClick={() => {
                setActiveTab('rocks');
                setSelectedCategory('all');
              }}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'rocks'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Rocks ({enrichedRocks.length})</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('minerals');
                setSelectedCategory('all');
              }}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'minerals'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Minerals ({enrichedMinerals.length})</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Chips */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder={`Search by name, chemical formula, occurrence, or setting...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-stone-950 border border-stone-700/80 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors shadow-inner"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(activeTab === 'rocks' ? rockCategories : mineralGroups).map((cat) => (
              <button
                key={`cat-${cat}`}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${
                  selectedCategory === cat
                    ? activeTab === 'rocks'
                      ? 'bg-amber-950 text-amber-300 border-amber-600 shadow-sm'
                      : 'bg-cyan-950 text-cyan-300 border-cyan-600 shadow-sm'
                    : 'bg-stone-800/60 text-stone-400 border-stone-700/60 hover:text-stone-200 hover:bg-stone-800'
                }`}
              >
                {cat === 'all' ? 'All Classes' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Spotlight Feature Banner */}
      {spotlightSpecimen && !searchQuery && selectedCategory === 'all' && (
        <div className="relative overflow-hidden bg-gradient-to-r from-stone-900 via-stone-900 to-amber-950/40 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-lg">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Featured Geological Benchmark
                </span>
                <span className="text-xs text-stone-400 font-mono">
                  {spotlightSpecimen.formula}
                </span>
              </div>
              <span className="text-xs text-stone-500 font-mono">
                {'category' in spotlightSpecimen ? (spotlightSpecimen as RockReference).category : `${(spotlightSpecimen as MineralReference).group} Mineral`}
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-stone-100 tracking-tight">
              {spotlightSpecimen.name}
            </h3>

            {spotlightSpecimen.geologicalFacts && (
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed max-w-3xl">
                {spotlightSpecimen.geologicalFacts[0]}
              </p>
            )}

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setActiveModalSpecimen(spotlightSpecimen)}
                className="px-3 py-1.5 text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-amber-300 rounded-lg border border-amber-600/30 transition-colors flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>View Geological Dossier</span>
              </button>
              <button
                onClick={() =>
                  onSelectComposition(
                    'meanOxides' in spotlightSpecimen
                      ? (spotlightSpecimen as RockReference).meanOxides
                      : (spotlightSpecimen as MineralReference).idealOxides,
                    spotlightSpecimen.name
                  )
                }
                className="px-3.5 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <FlaskConical className="w-3.5 h-3.5" />
                <span>Load into Single Analyzer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid of Specimen Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {(activeTab === 'rocks' ? filteredRocks : filteredMinerals).map((item) => {
          const isRock = 'category' in item;
          const rock = isRock ? (item as RockReference) : null;
          const mineral = !isRock ? (item as MineralReference) : null;
          const oxides = isRock ? rock!.meanOxides : mineral!.idealOxides;

          return (
            <div
              key={item.id}
              className="bg-stone-900 border border-stone-800 hover:border-amber-600/50 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-200 shadow-md group"
            >
              {/* Card Header */}
              <div className="p-4 pb-3 border-b border-stone-800/80 bg-stone-950/40 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span
                    className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${
                      isRock
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                    }`}
                  >
                    {isRock ? rock?.category : `${mineral?.group}`}
                  </span>
                  <h3 className="text-base font-bold text-stone-100 group-hover:text-amber-300 transition-colors mt-1.5 truncate">
                    {item.name}
                  </h3>
                </div>
                <div className="w-8 h-8 rounded-lg bg-stone-800/70 border border-stone-700/60 flex items-center justify-center shrink-0">
                  {isRock ? (
                    <Layers className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  {/* Chemical Formula / Assemblage */}
                  <div className="text-xs font-mono font-bold text-amber-400/90 break-words">
                    {item.formula || (mineral ? mineral.formula : 'Complex Silicate')}
                  </div>

                  {/* Occurrence snippet */}
                  <div className="mt-2 text-xs text-stone-400 flex items-start gap-1.5 line-clamp-2">
                    <MapPin className="w-3.5 h-3.5 text-stone-500 shrink-0 mt-0.5" />
                    <span>{item.typicalOccurrence}</span>
                  </div>

                  {/* 1 Highlight Geological Fact */}
                  {item.geologicalFacts && item.geologicalFacts.length > 0 && (
                    <div className="mt-2.5 p-2 bg-stone-950/70 border border-stone-800/80 rounded-lg text-[11px] text-stone-300 flex items-start gap-1.5 leading-snug">
                      <Lightbulb className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{item.geologicalFacts[0]}</span>
                    </div>
                  )}

                  {/* Compact Database References (Mindat, Webmineral, RRUFF, EarthChem) */}
                  <DatabaseReferencesCard
                    name={item.name}
                    databaseRefs={item.databaseRefs}
                    isRock={isRock}
                    compact={true}
                  />
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setActiveModalSpecimen(item)}
                    className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 transition-colors"
                  >
                    <span>View Facts</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>

                  <button
                    onClick={() => onSelectComposition(oxides, item.name)}
                    className="px-2.5 py-1 text-xs font-medium bg-stone-800 hover:bg-amber-600 text-stone-300 hover:text-white rounded-lg border border-stone-700 transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <FlaskConical className="w-3 h-3" />
                    <span>Analyze</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty Search State */}
      {((activeTab === 'rocks' && filteredRocks.length === 0) ||
        (activeTab === 'minerals' && filteredMinerals.length === 0)) && (
        <div className="text-center py-16 bg-stone-900 border border-stone-800 rounded-2xl">
          <Info className="w-8 h-8 text-stone-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-stone-300">No matching specimens found</p>
          <p className="text-xs text-stone-500 mt-1">Try searching with a broader keyword or resetting filters.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="mt-3 px-3 py-1.5 text-xs font-medium bg-stone-800 hover:bg-stone-700 text-amber-400 rounded-lg transition-colors"
          >
            Clear Search &amp; Filters
          </button>
        </div>
      )}
    </div>
  );
};
