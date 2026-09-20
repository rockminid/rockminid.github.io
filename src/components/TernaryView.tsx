import React, { useState, useMemo } from 'react';
import {
  Layers,
  Compass,
  Sliders,
  Filter,
  Eye,
  Info,
  Sparkles,
  BookOpen,
  FlaskConical,
  ChevronRight,
  TrendingUp,
  Flame,
  Plus,
  Trash2,
  Atom,
  Mountain,
  Table,
  Download,
  Search,
  ArrowUpDown,
  Check,
} from 'lucide-react';
import { TernaryDiagram } from './TernaryDiagram';
import {
  TernarySystemId,
  TERNARY_SYSTEMS_MAP,
  TernaryPoint,
} from '../utils/ternaryCalculations';
import { ROCKS_DATASET } from '../data/rocksDataset';
import { MINERALS_DATASET } from '../data/mineralsDataset';
import { BatchRowResult, OxideComposition } from '../types/geochem';
import { CustomPlottedPoint } from './PlotCustomDataModal';

interface TernaryViewProps {
  batchResults: BatchRowResult[];
  activeSampleOxides?: OxideComposition;
  activeSampleName?: string;
  onSelectSample: (oxides: OxideComposition, name: string) => void;
}

export const TernaryView: React.FC<TernaryViewProps> = ({
  batchResults,
  activeSampleOxides,
  activeSampleName,
  onSelectSample,
}) => {
  const [selectedSystemId, setSelectedSystemId] = useState<TernarySystemId>('afm-igneous');
  const [includeReferences, setIncludeReferences] = useState<boolean>(true);
  const [includeBatch, setIncludeBatch] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showFieldColors, setShowFieldColors] = useState<boolean>(true);
  const [selectedPointId, setSelectedPointId] = useState<string | undefined>(undefined);
  const [customPoints, setCustomPoints] = useState<CustomPlottedPoint[]>([]);

  // Layout View Mode: Diagram | Table | Split
  const [viewLayout, setViewLayout] = useState<'diagram' | 'table' | 'split'>('diagram');
  const [tableSearch, setTableSearch] = useState<string>('');
  const [tableCategoryFilter, setTableCategoryFilter] = useState<string>('all');
  const [tableSortField, setTableSortField] = useState<'name' | 'field' | 'a' | 'b' | 'c'>('name');
  const [tableSortAsc, setTableSortAsc] = useState<boolean>(true);

  const currentSystem = TERNARY_SYSTEMS_MAP[selectedSystemId];

  // Active specimen projection
  const activeProjection = useMemo(() => {
    if (!activeSampleOxides) return null;
    return currentSystem.projectOxides(activeSampleOxides);
  }, [activeSampleOxides, currentSystem]);

  // Reference points from dataset appropriate for the active system
  const referencePoints: TernaryPoint[] = useMemo(() => {
    if (!includeReferences) return [];

    if (selectedSystemId === 'pyroxene-quad') {
      const pyxMinerals = MINERALS_DATASET.filter((m) =>
        ['diopside', 'augite', 'enstatite', 'hedenbergite'].includes(m.id) ||
        m.name.toLowerCase().includes('pyroxene') ||
        m.description?.toLowerCase().includes('pyroxene')
      );

      return pyxMinerals.map((m) => {
        const proj = currentSystem.projectOxides(m.idealOxides);
        return {
          id: `ref-min-${m.id}`,
          name: `Ref: ${m.name}`,
          a: proj.a,
          b: proj.b,
          c: proj.c,
          category: 'Reference Mineral',
          field: proj.fieldName,
          color: '#38bdf8',
          oxides: m.idealOxides,
        };
      });
    }

    if (selectedSystemId === 'afm-metamorphic') {
      const metaMinerals = MINERALS_DATASET.filter((m) =>
        ['garnet-almandine', 'staurolite', 'kyanite', 'sillimanite', 'cordierite', 'biotite'].some((k) =>
          m.id.includes(k)
        )
      );

      return metaMinerals.map((m) => {
        const proj = currentSystem.projectOxides(m.idealOxides);
        return {
          id: `ref-min-${m.id}`,
          name: `Ref: ${m.name}`,
          a: proj.a,
          b: proj.b,
          c: proj.c,
          category: 'Metamorphic Phase',
          field: proj.fieldName,
          color: '#818cf8',
          oxides: m.idealOxides,
        };
      });
    }

    if (selectedSystemId === 'feldspar') {
      const feldsparMinerals = MINERALS_DATASET.filter((m) =>
        ['albite', 'anorthite', 'orthoclase', 'microcline'].some((k) => m.id.includes(k)) ||
        m.name.toLowerCase().includes('feldspar') ||
        m.description?.toLowerCase().includes('feldspar')
      );

      return feldsparMinerals.map((m) => {
        const proj = currentSystem.projectOxides(m.idealOxides);
        return {
          id: `ref-min-${m.id}`,
          name: `Ref: ${m.name}`,
          a: proj.a,
          b: proj.b,
          c: proj.c,
          category: 'Feldspar Phase',
          field: proj.fieldName,
          color: '#10b981',
          oxides: m.idealOxides,
        };
      });
    }

    if (selectedSystemId === 'apf-plutonic') {
      return ROCKS_DATASET.filter(
        (r) =>
          r.category.includes('Igneous') &&
          r.meanOxides.SiO2 &&
          (r.name.toLowerCase().includes('syenite') ||
            r.name.toLowerCase().includes('ijolite') ||
            r.name.toLowerCase().includes('foid') ||
            r.name.toLowerCase().includes('monzonite') ||
            r.name.toLowerCase().includes('gabbro') ||
            r.name.toLowerCase().includes('alkali'))
      ).map((r) => {
        const proj = currentSystem.projectOxides(r.meanOxides);
        return {
          id: `ref-rock-${r.id}`,
          name: `Ref: ${r.name}`,
          a: proj.a,
          b: proj.b,
          c: proj.c,
          category: 'Alkaline Plutonic Rock',
          field: proj.fieldName,
          color: '#64748b',
          oxides: r.meanOxides,
        };
      });
    }

    if (selectedSystemId === 'apf-volcanic') {
      return ROCKS_DATASET.filter(
        (r) =>
          r.category.includes('Igneous') &&
          r.meanOxides.SiO2 &&
          (r.name.toLowerCase().includes('phonolite') ||
            r.name.toLowerCase().includes('tephrite') ||
            r.name.toLowerCase().includes('basanite') ||
            r.name.toLowerCase().includes('trachyte') ||
            r.name.toLowerCase().includes('basalt'))
      ).map((r) => {
        const proj = currentSystem.projectOxides(r.meanOxides);
        return {
          id: `ref-rock-${r.id}`,
          name: `Ref: ${r.name}`,
          a: proj.a,
          b: proj.b,
          c: proj.c,
          category: 'Alkaline Volcanic Rock',
          field: proj.fieldName,
          color: '#64748b',
          oxides: r.meanOxides,
        };
      });
    }

    if (selectedSystemId === 'basalt-tetrahedron') {
      return ROCKS_DATASET.filter(
        (r) =>
          r.category.includes('Igneous') &&
          r.meanOxides.SiO2 &&
          (r.name.toLowerCase().includes('basalt') ||
            r.name.toLowerCase().includes('picrite') ||
            r.name.toLowerCase().includes('komatiite') ||
            r.name.toLowerCase().includes('gabbro'))
      ).map((r) => {
        const proj = currentSystem.projectOxides(r.meanOxides);
        return {
          id: `ref-rock-${r.id}`,
          name: `Ref: ${r.name}`,
          a: proj.a,
          b: proj.b,
          c: proj.c,
          category: 'Basaltic Rock Suite',
          field: proj.fieldName,
          color: '#64748b',
          oxides: r.meanOxides,
        };
      });
    }

    // Default: Igneous & QAPF use igneous rocks from ROCKS_DATASET
    return ROCKS_DATASET.filter((r) => r.category.includes('Igneous') && r.meanOxides.SiO2).map((r) => {
      const proj = currentSystem.projectOxides(r.meanOxides);
      return {
        id: `ref-rock-${r.id}`,
        name: `Ref: ${r.name}`,
        a: proj.a,
        b: proj.b,
        c: proj.c,
        category: r.category,
        field: proj.fieldName,
        color: '#64748b',
        oxides: r.meanOxides,
      };
    });
  }, [selectedSystemId, includeReferences, currentSystem]);

  // Batch sample points
  const batchPoints: TernaryPoint[] = useMemo(() => {
    if (!includeBatch) return [];

    return batchResults.map((b) => {
      const proj = currentSystem.projectOxides(b.normalizedOxides);
      return {
        id: `batch-${b.sampleId}`,
        name: `Batch: ${b.sampleId} (${b.primaryName})`,
        a: proj.a,
        b: proj.b,
        c: proj.c,
        category: 'Batch Sample',
        field: proj.fieldName,
        color: '#34d399',
        oxides: b.normalizedOxides,
      };
    });
  }, [batchResults, includeBatch, currentSystem]);

  // User custom plotted points
  const userPlottedPoints: TernaryPoint[] = useMemo(() => {
    return customPoints.map((cp) => {
      let a = 0;
      let b = 0;
      let c = 0;
      let field = cp.category;

      if (cp.oxides) {
        const proj = currentSystem.projectOxides(cp.oxides);
        a = proj.a;
        b = proj.b;
        c = proj.c;
        field = proj.fieldName;
      } else if (cp.directCoords) {
        a = cp.directCoords.a;
        b = cp.directCoords.b;
        c = cp.directCoords.c;
      }

      return {
        id: cp.id,
        name: `User: ${cp.name}`,
        a,
        b,
        c,
        category: cp.category || 'Custom Plotted Data',
        field,
        color: cp.color || '#ec4899',
        oxides: cp.oxides,
      };
    });
  }, [customPoints, currentSystem]);

  // Active specimen point
  const activePoint: TernaryPoint | null = useMemo(() => {
    if (!activeProjection) return null;
    return {
      id: 'active-sample-point',
      name: activeSampleName || 'Active Sample',
      a: activeProjection.a,
      b: activeProjection.b,
      c: activeProjection.c,
      isPrimary: true,
      category: 'Current Analysis',
      field: activeProjection.fieldName,
      color: '#f59e0b',
      oxides: activeSampleOxides,
    };
  }, [activeProjection, activeSampleName, activeSampleOxides]);

  // All combined points
  const allPoints: TernaryPoint[] = useMemo(() => {
    const pts: TernaryPoint[] = [...referencePoints, ...batchPoints, ...userPlottedPoints];
    if (activePoint) {
      pts.push(activePoint);
    }
    return pts;
  }, [referencePoints, batchPoints, userPlottedPoints, activePoint]);

  // Prepared filtered & sorted points for Table View
  const tablePoints = useMemo(() => {
    return allPoints
      .filter((pt) => {
        const q = tableSearch.toLowerCase().trim();
        const matchesSearch =
          !q ||
          pt.name.toLowerCase().includes(q) ||
          (pt.field && pt.field.toLowerCase().includes(q)) ||
          (pt.category && pt.category.toLowerCase().includes(q));

        if (!matchesSearch) return false;

        if (tableCategoryFilter === 'active') return !!pt.isPrimary;
        if (tableCategoryFilter === 'batch') return pt.category === 'Batch Sample';
        if (tableCategoryFilter === 'references')
          return (
            (pt.category?.includes('Reference') ||
              pt.category?.includes('Phase') ||
              pt.category?.includes('Rock') ||
              pt.category?.includes('Suite')) ??
            false
          );
        if (tableCategoryFilter === 'custom') return pt.category === 'Custom Plotted Data';

        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (tableSortField === 'name') cmp = a.name.localeCompare(b.name);
        else if (tableSortField === 'field') cmp = (a.field || '').localeCompare(b.field || '');
        else if (tableSortField === 'a') cmp = a.a - b.a;
        else if (tableSortField === 'b') cmp = a.b - b.b;
        else if (tableSortField === 'c') cmp = a.c - b.c;
        return tableSortAsc ? cmp : -cmp;
      });
  }, [allPoints, tableSearch, tableCategoryFilter, tableSortField, tableSortAsc]);

  // Export ternary data table to CSV
  const handleExportTernaryCSV = () => {
    if (tablePoints.length === 0) return;
    const apexA = currentSystem.apices.top.id;
    const apexB = currentSystem.apices.bottomLeft.id;
    const apexC = currentSystem.apices.bottomRight.id;

    const headers = [
      'Sample_Name',
      'Category',
      'Stability_Field',
      `${apexA}_pct`,
      `${apexB}_pct`,
      `${apexC}_pct`,
      'SiO2',
      'Al2O3',
      'FeO',
      'MgO',
      'CaO',
      'Na2O',
      'K2O',
    ];
    const rows = tablePoints.map((pt) => {
      const ox = pt.oxides || {};
      return [
        `"${pt.name.replace(/"/g, '""')}"`,
        `"${pt.category || ''}"`,
        `"${pt.field || ''}"`,
        pt.a.toFixed(2),
        pt.b.toFixed(2),
        pt.c.toFixed(2),
        ox.SiO2 ?? '',
        ox.Al2O3 ?? '',
        ox.FeO ?? ox.FeOT ?? '',
        ox.MgO ?? '',
        ox.CaO ?? '',
        ox.Na2O ?? '',
        ox.K2O ?? '',
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `ternary_${selectedSystemId}_data_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Selected sample metadata
  const selectedPoint = useMemo(() => {
    if (!selectedPointId) return activePoint;
    return allPoints.find((p) => p.id === selectedPointId) || activePoint;
  }, [selectedPointId, allPoints, activePoint]);

  // Preset typical geochemical suites for quick comparison
  const presetSuites = [
    {
      name: 'Mid-Ocean Ridge Basalt (MORB)',
      system: 'afm-igneous' as TernarySystemId,
      oxides: { SiO2: 50.1, TiO2: 1.45, Al2O3: 15.2, FeO: 9.8, MgO: 7.9, CaO: 11.3, Na2O: 2.7, K2O: 0.15 },
      desc: 'Typical depleted tholeiitic magma with Fe-enrichment trend.',
    },
    {
      name: 'Cascades Arc Andesite (Calc-Alkaline)',
      system: 'afm-igneous' as TernarySystemId,
      oxides: { SiO2: 58.6, TiO2: 0.85, Al2O3: 17.1, FeO: 6.2, MgO: 3.4, CaO: 6.8, Na2O: 3.8, K2O: 1.6 },
      desc: 'Subduction-zone calc-alkaline series with silica enrichment.',
    },
    {
      name: 'Continental Crust Granite',
      system: 'qapf-plutonic' as TernarySystemId,
      oxides: { SiO2: 72.8, TiO2: 0.28, Al2O3: 14.2, FeO: 1.9, MgO: 0.55, CaO: 1.4, Na2O: 3.5, K2O: 4.8 },
      desc: 'Monzogranite with subequal quartz, K-feldspar, and plagioclase.',
    },
    {
      name: 'Khibina Nepheline Syenite',
      system: 'apf-plutonic' as TernarySystemId,
      oxides: { SiO2: 54.8, TiO2: 0.65, Al2O3: 20.8, FeO: 3.8, MgO: 0.6, CaO: 1.8, Na2O: 8.9, K2O: 6.4 },
      desc: 'Alkaline feldspathoid-bearing plutonic rock (APF lower triangle).',
    },
    {
      name: 'Tahiti Phonolitic Tephrite',
      system: 'apf-volcanic' as TernarySystemId,
      oxides: { SiO2: 46.2, TiO2: 2.8, Al2O3: 16.5, FeO: 10.2, MgO: 5.6, CaO: 8.9, Na2O: 4.8, K2O: 3.2 },
      desc: 'Silica-undersaturated foid-bearing volcanic rock with normative nepheline.',
    },
    {
      name: 'Hawaiian Alkali Basalt',
      system: 'basalt-tetrahedron' as TernarySystemId,
      oxides: { SiO2: 47.1, TiO2: 3.1, Al2O3: 14.8, FeO: 11.8, MgO: 9.2, CaO: 9.8, Na2O: 3.2, K2O: 1.1 },
      desc: 'Silica-undersaturated alkali basalt in the Yoder-Tilley Basalt Tetrahedron.',
    },
    {
      name: 'Skaergaard Layered Gabbro (Cpx)',
      system: 'pyroxene-quad' as TernarySystemId,
      oxides: { SiO2: 51.5, TiO2: 0.6, Al2O3: 2.8, FeO: 8.5, MgO: 15.2, CaO: 20.8, Na2O: 0.35, K2O: 0.05 },
      desc: 'Cumulate augite/diopside in a layered mafic intrusion.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Introduction */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-600/20 border border-amber-600/40 flex items-center justify-center text-amber-400 shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-stone-100">
                  Interactive Ternary &amp; Quadrilateral Mineral Systems
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-950 text-amber-300 border border-amber-800">
                  D3 Engine
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-400 mt-1 max-w-3xl">
                Comprehensive geochemical classification and phase-equilibrium visualizer for AFM diagrams,
                IUGS QAPF classification, the Pyroxene Quadrilateral, Feldspar solid-solutions, and Ultramafic rock suites.
              </p>
            </div>
          </div>

          {/* Preset Suite Quick-Loader */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-stone-400 font-medium hidden lg:inline">Quick Test:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {presetSuites.map((ps) => (
                <button
                  key={ps.name}
                  onClick={() => {
                    setSelectedSystemId(ps.system);
                    onSelectSample(ps.oxides, ps.name);
                  }}
                  title={ps.desc}
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 transition-colors flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>{ps.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* System Selector Tabs & View Mode Switcher */}
        <div className="mt-5 pt-4 border-t border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 max-w-full">
          <button
            onClick={() => setSelectedSystemId('afm-igneous')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedSystemId === 'afm-igneous'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-stone-800/80 hover:bg-stone-700 text-stone-300 border border-stone-700/60'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-red-400" />
            <span>AFM (Igneous)</span>
          </button>

          <button
            onClick={() => setSelectedSystemId('afm-metamorphic')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedSystemId === 'afm-metamorphic'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-stone-800/80 hover:bg-stone-700 text-stone-300 border border-stone-700/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>AFM (Metamorphic)</span>
          </button>

          <button
            onClick={() => setSelectedSystemId('qapf-plutonic')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedSystemId === 'qapf-plutonic'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-stone-800/80 hover:bg-stone-700 text-stone-300 border border-stone-700/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-sky-400" />
            <span>QAPF (Plutonic)</span>
          </button>

          <button
            onClick={() => setSelectedSystemId('qapf-volcanic')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedSystemId === 'qapf-volcanic'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-stone-800/80 hover:bg-stone-700 text-stone-300 border border-stone-700/60'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
            <span>QAPF (Volcanic)</span>
          </button>

          <button
            onClick={() => setSelectedSystemId('apf-plutonic')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedSystemId === 'apf-plutonic'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-stone-800/80 hover:bg-stone-700 text-stone-300 border border-stone-700/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-pink-400" />
            <span>APF (Plutonic Foids)</span>
          </button>

          <button
            onClick={() => setSelectedSystemId('apf-volcanic')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedSystemId === 'apf-volcanic'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-stone-800/80 hover:bg-stone-700 text-stone-300 border border-stone-700/60'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
            <span>APF (Volcanic Foids)</span>
          </button>

          <button
            onClick={() => setSelectedSystemId('basalt-tetrahedron')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedSystemId === 'basalt-tetrahedron'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-stone-800/80 hover:bg-stone-700 text-stone-300 border border-stone-700/60'
            }`}
          >
            <Mountain className="w-3.5 h-3.5 text-cyan-400" />
            <span>Basalt Tetrahedron</span>
          </button>

          <button
            onClick={() => setSelectedSystemId('pyroxene-quad')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedSystemId === 'pyroxene-quad'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-stone-800/80 hover:bg-stone-700 text-stone-300 border border-stone-700/60'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span>Pyroxene Quadrilateral</span>
          </button>

          <button
            onClick={() => setSelectedSystemId('feldspar')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedSystemId === 'feldspar'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-stone-800/80 hover:bg-stone-700 text-stone-300 border border-stone-700/60'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5 text-amber-400" />
            <span>Feldspar (Or-Ab-An)</span>
          </button>

          <button
            onClick={() => setSelectedSystemId('ultramafic')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedSystemId === 'ultramafic'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-stone-800/80 hover:bg-stone-700 text-stone-300 border border-stone-700/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-lime-400" />
            <span>Ultramafic (Ol-Opx-Cpx)</span>
          </button>
          </div>

          {/* View Mode Switcher: Diagram vs Table vs Split */}
          <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-lg border border-stone-800 text-xs shrink-0 self-start md:self-auto">
            <button
              onClick={() => setViewLayout('diagram')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                viewLayout === 'diagram'
                  ? 'bg-stone-800 text-stone-100 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>Diagram</span>
            </button>
            <button
              onClick={() => setViewLayout('table')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                viewLayout === 'table'
                  ? 'bg-stone-800 text-stone-100 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Table className="w-3.5 h-3.5 text-amber-400" />
              <span>Table View ({tablePoints.length})</span>
            </button>
            <button
              onClick={() => setViewLayout('split')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                viewLayout === 'split'
                  ? 'bg-stone-800 text-stone-100 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Split</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: D3 Plot + Petrological Analysis Panel (shown in 'diagram' or 'split' modes) */}
      {(viewLayout === 'diagram' || viewLayout === 'split') && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Center: Interactive D3 Ternary Plot */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <TernaryDiagram
            system={currentSystem}
            points={allPoints}
            selectedPointId={selectedPointId}
            onSelectPoint={setSelectedPointId}
            onAddCustomPoint={(newPt) => setCustomPoints((prev) => [...prev, newPt])}
            showGrid={showGrid}
            showLabels={showLabels}
            showFieldColors={showFieldColors}
            width={640}
            height={540}
          />

          {/* View Toggles & Overlay Options */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer text-stone-300 hover:text-stone-100">
                <input
                  type="checkbox"
                  checked={includeReferences}
                  onChange={(e) => setIncludeReferences(e.target.checked)}
                  className="rounded border-stone-700 bg-stone-800 text-amber-500 focus:ring-amber-500"
                />
                <span>Reference Standards ({referencePoints.length})</span>
              </label>

              {batchResults.length > 0 && (
                <label className="flex items-center gap-2 cursor-pointer text-stone-300 hover:text-stone-100">
                  <input
                    type="checkbox"
                    checked={includeBatch}
                    onChange={(e) => setIncludeBatch(e.target.checked)}
                    className="rounded border-stone-700 bg-stone-800 text-amber-500 focus:ring-amber-500"
                  />
                  <span>Batch Samples ({batchResults.length})</span>
                </label>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-1.5 cursor-pointer text-stone-400 hover:text-stone-200">
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                  className="rounded border-stone-700 bg-stone-800 text-amber-500"
                />
                <span>20% Grid</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-stone-400 hover:text-stone-200">
                <input
                  type="checkbox"
                  checked={showLabels}
                  onChange={(e) => setShowLabels(e.target.checked)}
                  className="rounded border-stone-700 bg-stone-800 text-amber-500"
                />
                <span>Field Labels</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-stone-400 hover:text-stone-200">
                <input
                  type="checkbox"
                  checked={showFieldColors}
                  onChange={(e) => setShowFieldColors(e.target.checked)}
                  className="rounded border-stone-700 bg-stone-800 text-amber-500"
                />
                <span>Field Shading</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Petrological Interpretation & System Details */}
        <div className="lg:col-span-4 space-y-4">
          {/* Active Sample Classification Card */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 sm:p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Sample Classification</span>
              </h3>
              <span className="text-[11px] font-mono text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60">
                {activeProjection?.fieldName || 'Evaluated'}
              </span>
            </div>

            <div className="mt-3 space-y-3">
              <div>
                <div className="text-xs text-stone-400">Specimen Name</div>
                <div className="text-base font-semibold text-stone-100 mt-0.5">
                  {activeSampleName || 'Current Active Sample'}
                </div>
              </div>

              {/* Calculated Barycentric Coordinates */}
              {activeProjection && (
                <div className="bg-stone-950 rounded-lg p-3 border border-stone-800">
                  <div className="text-[11px] font-medium text-stone-400 mb-2 uppercase tracking-wider">
                    {currentSystem.isQuadrilateral ? 'Calculated Cation Mol%' : 'Normalized Ternary Proportions'}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-stone-900/90 rounded p-2 border border-stone-800">
                      <div className="text-xs font-bold text-amber-400">
                        {currentSystem.apices.top.id}
                      </div>
                      <div className="text-sm font-mono font-semibold text-stone-100 mt-0.5">
                        {activeProjection.a.toFixed(1)}%
                      </div>
                    </div>
                    <div className="bg-stone-900/90 rounded p-2 border border-stone-800">
                      <div className="text-xs font-bold text-emerald-400">
                        {currentSystem.apices.bottomLeft.id}
                      </div>
                      <div className="text-sm font-mono font-semibold text-stone-100 mt-0.5">
                        {activeProjection.b.toFixed(1)}%
                      </div>
                    </div>
                    <div className="bg-stone-900/90 rounded p-2 border border-stone-800">
                      <div className="text-xs font-bold text-red-400">
                        {currentSystem.apices.bottomRight.id}
                      </div>
                      <div className="text-sm font-mono font-semibold text-stone-100 mt-0.5">
                        {activeProjection.c.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* System Guide & Petrology Context */}
              <div className="text-xs text-stone-300 leading-relaxed bg-stone-800/50 rounded-lg p-3 border border-stone-800/80">
                <p className="font-medium text-stone-200 mb-1">Petrological Significance:</p>
                {selectedSystemId === 'afm-igneous' && (
                  <span>
                    In the AFM system, magmas that accumulate iron relative to magnesium during early fractionation plot in the{' '}
                    <strong className="text-red-400">Tholeiitic field</strong>, typical of mid-ocean ridges (MORBs) and continental flood basalts.
                    Magmas that fractionate magnetite early plot in the{' '}
                    <strong className="text-sky-400">Calc-Alkaline field</strong>, indicative of subduction arc volcanism with high water fugacity.
                  </span>
                )}
                {selectedSystemId === 'afm-metamorphic' && (
                  <span>
                    The Thompson AFM diagram maps pelitic metamorphism projected through quartz and muscovite. Tie-lines delineate
                    coexisting equilibrium mineral assemblages from chlorite through garnet, staurolite, and kyanite/sillimanite zones.
                  </span>
                )}
                {selectedSystemId === 'qapf-plutonic' && (
                  <span>
                    The IUGS standard for coarse-grained intrusive rocks based on modal or normative Quartz (Q), Alkali Feldspar (A), and
                    Plagioclase (P). Subdivides granites, granodiorites, tonalites, syenites, diorites, and gabbros.
                  </span>
                )}
                {selectedSystemId === 'qapf-volcanic' && (
                  <span>
                    Extrusive equivalent of the QAPF system classifying Rhyolite, Dacite, Trachyte, Latite, Andesite, and Basalt based on
                    phenocryst or normative felsic minerals.
                  </span>
                )}
                {selectedSystemId === 'apf-plutonic' && (
                  <span>
                    The lower inverted triangle of the IUGS QAPF classification for coarse-grained plutonic rocks that are silica-undersaturated
                    and contain essential feldspathoids (Foids: nepheline, sodalite, leucite, cancrinite, analcime). Classifies foid syenites,
                    foid monzosyenites, foid diorites, foid gabbros, and foidites (ijolites, urtites).
                  </span>
                )}
                {selectedSystemId === 'apf-volcanic' && (
                  <span>
                    The lower triangle of the IUGS volcanic QAPF system for extrusive rocks containing modal or normative feldspathoids (F).
                    Delineates phonolites, tephritic phonolites, phonolitic tephrites, basanites (modal olivine &gt; 10%), tephrites, and foidites
                    (nephelinites, leucitites).
                  </span>
                )}
                {selectedSystemId === 'basalt-tetrahedron' && (
                  <span>
                    The Yoder &amp; Tilley (1962) Basalt Tetrahedron visualizes the critical planes of silica saturation and undersaturation.
                    Projects mafic magmas based on normative Nepheline (Ne), Diopside (Di), Olivine (Ol), and Quartz (Qz). Separates silica-saturated
                    tholeiites (containing normative hypersthene and quartz) from silica-undersaturated alkali basalts (containing normative olivine and nepheline).
                  </span>
                )}
                {selectedSystemId === 'pyroxene-quad' && (
                  <span>
                    The pyroxene trapezoid separates calcium-rich clinopyroxenes (Diopside, Augite) from calcium-poor orthopyroxenes (Enstatite-Ferrosilite)
                    and high-temperature pigeonite. Miscibility gaps (solvus) provide geothermometric constraints on crystallization temperatures.
                  </span>
                )}
                {selectedSystemId === 'feldspar' && (
                  <span>
                    The Or-Ab-An ternary delineates alkali feldspar solid solutions at high temperature and the plagioclase series (Albite, Oligoclase,
                    Andesine, Labradorite, Bytownite, Anorthite).
                  </span>
                )}
                {selectedSystemId === 'ultramafic' && (
                  <span>
                    Mantle and cumulate ultramafic rocks classified by relative modal abundance of Olivine (Ol), Orthopyroxene (Opx), and Clinopyroxene (Cpx).
                    Differentiates mantle lherzolite, harzburgite, dunite, and pyroxenites.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* System Fields Reference Card */}
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 sm:p-5 shadow-xl max-h-80 overflow-y-auto">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3 flex items-center justify-between">
              <span>System Stability Fields</span>
              <span className="text-amber-500 font-mono text-[11px]">{currentSystem.fields.length} Fields</span>
            </h4>

            <div className="space-y-2">
              {currentSystem.fields.map((f) => (
                <div
                  key={f.id}
                  className="p-2 rounded-lg bg-stone-950/60 border border-stone-800/80 text-xs hover:border-stone-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-medium text-stone-200">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: f.color }}
                      />
                      <span>{f.name}</span>
                    </div>
                    {f.code && (
                      <span className="font-mono text-[10px] text-stone-400 bg-stone-900 px-1.5 py-0.5 rounded border border-stone-800">
                        {f.code}
                      </span>
                    )}
                  </div>
                  {f.description && (
                    <p className="text-[11px] text-stone-400 mt-1 pl-4 leading-relaxed">
                      {f.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* User Custom Plotted Data Card */}
          {customPoints.length > 0 && (
            <div className="bg-stone-900 border border-emerald-900/60 rounded-xl p-4 sm:p-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/30" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                    User Plotted Data ({customPoints.length})
                  </h4>
                </div>
                <button
                  onClick={() => setCustomPoints([])}
                  className="text-[11px] text-stone-400 hover:text-red-400 transition-colors flex items-center gap-1"
                  title="Clear all custom plotted points"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear All</span>
                </button>
              </div>

              <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                {customPoints.map((cp) => (
                  <div
                    key={cp.id}
                    className="p-2 rounded-lg bg-stone-950/70 border border-stone-800 flex items-center justify-between text-xs hover:border-emerald-700/60 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cp.color || '#10b981' }}
                      />
                      <div className="truncate">
                        <div className="font-semibold text-stone-200 truncate">{cp.name}</div>
                        <div className="text-[10px] text-stone-400 truncate">
                          {cp.category ? `Category: ${cp.category}` : cp.oxides ? 'Calculated from oxides' : 'Direct coordinates'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setCustomPoints((prev) => prev.filter((p) => p.id !== cp.id))}
                      className="text-stone-500 hover:text-red-400 p-1 shrink-0 transition-colors"
                      title="Delete this point"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Dedicated, Well-Organized Ternary Data Table (shown in 'table' or 'split' modes) */}
      {(viewLayout === 'table' || viewLayout === 'split') && (
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 sm:p-6 shadow-xl space-y-4">
          {/* Table Header Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-800">
            <div>
              <div className="flex items-center gap-2">
                <Table className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-stone-100">
                  {currentSystem.name} – Ternary Data Table
                </h3>
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-stone-800 text-stone-300 font-mono">
                  {tablePoints.length} Specimens
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-1">
                Barycentric coordinates, stability fields, and normalized oxide compositions for all plotted points.
              </p>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              <button
                onClick={handleExportTernaryCSV}
                className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                title="Download this table as a CSV file"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Filters & Search Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Search sample name, field, or rock type..."
                className="w-full pl-9 pr-8 py-1.5 rounded-lg bg-stone-950 border border-stone-800 text-stone-200 placeholder-stone-500 text-xs focus:outline-none focus:border-amber-500"
              />
              {tableSearch && (
                <button
                  onClick={() => setTableSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 text-xs"
                >
                  ×
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setTableCategoryFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  tableCategoryFilter === 'all'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800'
                }`}
              >
                All ({allPoints.length})
              </button>
              <button
                onClick={() => setTableCategoryFilter('active')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  tableCategoryFilter === 'active'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800'
                }`}
              >
                Active Sample
              </button>
              {batchResults.length > 0 && (
                <button
                  onClick={() => setTableCategoryFilter('batch')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    tableCategoryFilter === 'batch'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800'
                  }`}
                >
                  Batch ({batchResults.length})
                </button>
              )}
              {referencePoints.length > 0 && (
                <button
                  onClick={() => setTableCategoryFilter('references')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    tableCategoryFilter === 'references'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800'
                  }`}
                >
                  References ({referencePoints.length})
                </button>
              )}
              {customPoints.length > 0 && (
                <button
                  onClick={() => setTableCategoryFilter('custom')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    tableCategoryFilter === 'custom'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800'
                  }`}
                >
                  Custom ({customPoints.length})
                </button>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-lg border border-stone-800 bg-stone-950/60 shadow-inner max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs text-stone-300">
              <thead className="bg-stone-950 text-stone-400 text-[11px] uppercase tracking-wider font-semibold border-b border-stone-800 sticky top-0 z-10 select-none">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th
                    onClick={() => {
                      if (tableSortField === 'name') setTableSortAsc(!tableSortAsc);
                      else {
                        setTableSortField('name');
                        setTableSortAsc(true);
                      }
                    }}
                    className="py-3 px-3 cursor-pointer hover:text-stone-200"
                  >
                    <div className="flex items-center gap-1">
                      <span>Sample / Specimen</span>
                      <ArrowUpDown className="w-3 h-3 text-stone-500" />
                    </div>
                  </th>
                  <th
                    onClick={() => {
                      if (tableSortField === 'field') setTableSortAsc(!tableSortAsc);
                      else {
                        setTableSortField('field');
                        setTableSortAsc(true);
                      }
                    }}
                    className="py-3 px-3 cursor-pointer hover:text-stone-200"
                  >
                    <div className="flex items-center gap-1">
                      <span>Stability Field</span>
                      <ArrowUpDown className="w-3 h-3 text-stone-500" />
                    </div>
                  </th>
                  <th
                    onClick={() => {
                      if (tableSortField === 'a') setTableSortAsc(!tableSortAsc);
                      else {
                        setTableSortField('a');
                        setTableSortAsc(false);
                      }
                    }}
                    className="py-3 px-3 cursor-pointer hover:text-stone-200"
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-amber-400">{currentSystem.apices.top.id} %</span>
                      <ArrowUpDown className="w-3 h-3 text-stone-500" />
                    </div>
                  </th>
                  <th
                    onClick={() => {
                      if (tableSortField === 'b') setTableSortAsc(!tableSortAsc);
                      else {
                        setTableSortField('b');
                        setTableSortAsc(false);
                      }
                    }}
                    className="py-3 px-3 cursor-pointer hover:text-stone-200"
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-emerald-400">{currentSystem.apices.bottomLeft.id} %</span>
                      <ArrowUpDown className="w-3 h-3 text-stone-500" />
                    </div>
                  </th>
                  <th
                    onClick={() => {
                      if (tableSortField === 'c') setTableSortAsc(!tableSortAsc);
                      else {
                        setTableSortField('c');
                        setTableSortAsc(false);
                      }
                    }}
                    className="py-3 px-3 cursor-pointer hover:text-stone-200"
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-red-400">{currentSystem.apices.bottomRight.id} %</span>
                      <ArrowUpDown className="w-3 h-3 text-stone-500" />
                    </div>
                  </th>
                  <th className="py-3 px-3 min-w-[120px]">Proportion Bar</th>
                  <th className="py-3 px-3 text-stone-400">Key Oxides</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 font-sans">
                {tablePoints.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-stone-500 italic">
                      No matching points found for this filter in {currentSystem.name}.
                    </td>
                  </tr>
                ) : (
                  tablePoints.map((pt, idx) => {
                    const isSelected = selectedPointId === pt.id;
                    const isPrimary = pt.isPrimary;
                    const ox = pt.oxides || {};

                    return (
                      <tr
                        key={`tbl-pt-${pt.id}-${idx}`}
                        onClick={() => setSelectedPointId(pt.id)}
                        className={`hover:bg-stone-800/50 transition-colors cursor-pointer ${
                          isPrimary
                            ? 'bg-amber-950/25 border-l-2 border-amber-500'
                            : isSelected
                            ? 'bg-sky-950/20'
                            : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono text-stone-500 text-center text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/20"
                              style={{ backgroundColor: pt.color || '#38bdf8' }}
                            />
                            <div>
                              <div className="font-semibold text-stone-100 flex items-center gap-1.5">
                                <span>{pt.name}</span>
                                {isPrimary && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                    ACTIVE
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-stone-400">{pt.category}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-stone-900 border border-stone-800 text-stone-300">
                            {pt.field || 'Unspecified'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-amber-300 font-semibold">
                          {pt.a.toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-3 font-mono text-emerald-400 font-semibold">
                          {pt.b.toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-3 font-mono text-red-400 font-semibold">
                          {pt.c.toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-3">
                          <div
                            className="w-24 h-2 rounded-full bg-stone-800 overflow-hidden flex"
                            title={`${currentSystem.apices.top.id}: ${pt.a.toFixed(1)}% | ${currentSystem.apices.bottomLeft.id}: ${pt.b.toFixed(1)}% | ${currentSystem.apices.bottomRight.id}: ${pt.c.toFixed(1)}%`}
                          >
                            <div
                              style={{
                                width: `${pt.a}%`,
                                backgroundColor: currentSystem.apices.top.color || '#f59e0b',
                              }}
                              className="h-full"
                            />
                            <div
                              style={{
                                width: `${pt.b}%`,
                                backgroundColor: currentSystem.apices.bottomLeft.color || '#10b981',
                              }}
                              className="h-full"
                            />
                            <div
                              style={{
                                width: `${pt.c}%`,
                                backgroundColor: currentSystem.apices.bottomRight.color || '#ef4444',
                              }}
                              className="h-full"
                            />
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[10px] text-stone-400 whitespace-nowrap">
                          {ox.SiO2 !== undefined && (
                            <span className="mr-2">SiO₂: {ox.SiO2.toFixed(1)}</span>
                          )}
                          {ox.MgO !== undefined && (
                            <span className="mr-2 text-emerald-400/80">MgO: {ox.MgO.toFixed(1)}</span>
                          )}
                          {(ox.FeO !== undefined || ox.FeOT !== undefined) && (
                            <span className="mr-2 text-red-400/80">
                              FeO: {(ox.FeO || ox.FeOT || 0).toFixed(1)}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {pt.oxides && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectSample(pt.oxides as OxideComposition, pt.name);
                                }}
                                className="px-2 py-1 text-[10px] font-medium rounded bg-stone-800 hover:bg-amber-600 text-stone-300 hover:text-white transition-colors border border-stone-700"
                                title="Set as Active Sample in Single Workbench"
                              >
                                Set Active
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-2 text-[11px] text-stone-500 flex justify-between items-center">
            <span>
              Showing {tablePoints.length} of {allPoints.length} total system points
            </span>
            <span>Click any row to select &amp; highlight the point in the ternary diagram</span>
          </div>
        </div>
      )}
    </div>
  );
};
