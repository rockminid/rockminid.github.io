import React, { useState, useRef, useMemo } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronRight,
  Sparkles,
  ExternalLink,
  BookOpen,
  Undo2,
  Trash2,
  Edit3,
  SlidersHorizontal,
  X,
  RotateCcw,
  Plus,
} from 'lucide-react';
import { BatchRowResult, OxideComposition, RockReference, MineralReference } from '../types/geochem';
import {
  BATCH_LIMIT,
  MAPPABLE_ELEMENTS,
  MAPPABLE_OXIDES,
  autoColumnMap,
  parseCSV,
  processBatchCSV,
  exportBatchToCSV,
  exportBatchComprehensiveCSV,
  SAMPLE_BENCHMARK_CSVS,
  type ColumnMap,
} from '../utils/csv';
import { TRACE_INPUTS } from '../utils/traceElements';
import { BatchSpiderPanel } from './BatchSpiderPanel';
import { ChemFormula } from './ChemFormula';
import { identifyGeochemicalSample } from '../utils/geochemEngine';
import { TasDiagram, TASPoint } from './TasDiagram';
import { SpecimenModal } from './SpecimenModal';
import { ROCKS_DATASET } from '../data/rocksDataset';
import { MINERALS_DATASET } from '../data/mineralsDataset';
import { getEnrichedRock, getEnrichedMineral } from '../data/visualDatabase';
import { getGeorocMinerals, getGeorocRocks } from '../data/georocReference';
import { resolveIron } from '../utils/iron';

/** Fields shown in the edit dialog; any other field the row carries (FeOT,
 *  Fe2O3T, CO2, H2O...) is added, so saving never drops it. */
const EDIT_FIELDS = ['SiO2', 'TiO2', 'Al2O3', 'Fe2O3', 'FeO', 'MnO', 'MgO', 'CaO', 'Na2O', 'K2O', 'P2O5', 'Cr2O3', 'NiO', 'LOI'];

/** Saves a Blob as a download and releases its object URL afterwards. */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

interface BatchProcessorProps {
  onInspectSample: (oxides: OxideComposition, sampleName: string) => void;
  batchResults: BatchRowResult[];
  setBatchResults: React.Dispatch<React.SetStateAction<BatchRowResult[]>>;
}

export const BatchProcessor: React.FC<BatchProcessorProps> = ({
  onInspectSample,
  batchResults,
  setBatchResults,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortField, setSortField] = useState<'row' | 'id' | 'confidence' | 'total'>('row');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showTasPlot, setShowTasPlot] = useState<boolean>(false);
  const [selectedRowId, setSelectedRowId] = useState<string | undefined>(undefined);
  const [activeModalSpecimen, setActiveModalSpecimen] = useState<RockReference | MineralReference | null>(null);

  // Undo History Stack
  const [history, setHistory] = useState<BatchRowResult[][]>([]);

  // Push current state into history before mutating
  const recordHistory = () => {
    setHistory((prev) => [...prev.slice(-19), batchResults]);
  };

  // Undo action
  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setBatchResults(previous);
  };

  // Delete row action
  // Rows are identified by row number: replicate analyses often share a
  // sample ID, and deleting by ID removed every replicate at once.
  const handleDeleteRow = (rowNumber: number) => {
    recordHistory();
    setBatchResults((prev) => prev.filter((r) => r.rowNumber !== rowNumber));
  };

  // Edit row state
  const [editingRow, setEditingRow] = useState<BatchRowResult | null>(null);
  const [editSampleId, setEditSampleId] = useState<string>('');
  const [editOxides, setEditOxides] = useState<Record<string, string>>({});
  const [editFields, setEditFields] = useState<string[]>(EDIT_FIELDS);

  const handleOpenEdit = (row: BatchRowResult) => {
    setEditingRow(row);
    setEditSampleId(row.sampleId);
    const oxStrings: Record<string, string> = {};
    const extra = Object.keys(row.rawOxides).filter((k) => !EDIT_FIELDS.includes(k));
    const oxKeys = [...EDIT_FIELDS, ...extra];
    setEditFields(oxKeys);
    oxKeys.forEach((k) => {
      const val = row.rawOxides[k as keyof OxideComposition];
      oxStrings[k] = val !== undefined && val !== null ? String(val) : '';
    });
    setEditOxides(oxStrings);
  };

  const handleSaveEdit = () => {
    if (!editingRow) return;
    recordHistory();

    const parsedOxides: OxideComposition = {};
    Object.entries(editOxides).forEach(([k, v]) => {
      const num = parseFloat(v);
      if (!isNaN(num) && num > 0) {
        (parsedOxides as any)[k] = num;
      }
    });

    const report = identifyGeochemicalSample(parsedOxides, editSampleId || editingRow.sampleId, 'oxide');
    let qualityStatus: BatchRowResult['qualityStatus'] = 'Acceptable (95-105%)';
    if (report.rawTotal >= 98.0 && report.rawTotal <= 102.0) {
      qualityStatus = 'Good (98-102%)';
    } else if (report.rawTotal < 95.0) {
      qualityStatus = 'Low Total (<95%)';
    } else if (report.rawTotal > 105.0) {
      qualityStatus = 'High Total (>105%)';
    }

    const primary = report.bestOverall;
    const isRock = primary?.type === 'rock';
    const primaryName = primary?.reference?.name || 'Unknown Specimen';
    const primaryConfidence = primary?.confidence ?? 0;

    let secondaryName = 'None';
    let secondaryConfidence = 0;
    if (isRock) {
      if (report.topRocks[1]?.reference?.name) {
        secondaryName = report.topRocks[1].reference.name;
        secondaryConfidence = report.topRocks[1].confidence;
      }
    } else {
      if (report.topMinerals[1]?.reference?.name) {
        secondaryName = report.topMinerals[1].reference.name;
        secondaryConfidence = report.topMinerals[1].confidence;
      }
    }

    const updatedRow: BatchRowResult = {
      ...editingRow,
      sampleId: editSampleId.trim() || editingRow.sampleId,
      rawOxides: parsedOxides,
      normalizedOxides: report.normalizedOxides,
      totalWt: report.rawTotal,
      identifiedCategory: isRock ? 'Rock' : 'Mineral',
      primaryName,
      primaryConfidence,
      secondaryName,
      secondaryConfidence,
      tasField: report.tasField,
      qualityStatus,
      cipwNorm: report.cipwNorm,
      stoichiometry: report.stoichiometry,
      alkaliAffinity: report.alkaliAffinity,
    };

    setBatchResults((prev) =>
      prev.map((r) => (r.rowNumber === editingRow.rowNumber ? updatedRow : r))
    );
    setEditingRow(null);
  };

  // Global Oxide Range Filters
  const [showOxideFilters, setShowOxideFilters] = useState<boolean>(false);
  const [minSiO2, setMinSiO2] = useState<string>('');
  const [maxSiO2, setMaxSiO2] = useState<string>('');
  const [minMgO, setMinMgO] = useState<string>('');
  const [maxMgO, setMaxMgO] = useState<string>('');
  const [minAl2O3, setMinAl2O3] = useState<string>('');
  const [maxAl2O3, setMaxAl2O3] = useState<string>('');
  const [minCaO, setMinCaO] = useState<string>('');
  const [maxCaO, setMaxCaO] = useState<string>('');
  const [minAlkalis, setMinAlkalis] = useState<string>('');
  const [maxAlkalis, setMaxAlkalis] = useState<string>('');
  const [minFeOT, setMinFeOT] = useState<string>('');
  const [maxFeOT, setMaxFeOT] = useState<string>('');

  const activeOxideFiltersCount = useMemo(() => {
    let count = 0;
    if (minSiO2 !== '' || maxSiO2 !== '') count++;
    if (minMgO !== '' || maxMgO !== '') count++;
    if (minAl2O3 !== '' || maxAl2O3 !== '') count++;
    if (minCaO !== '' || maxCaO !== '') count++;
    if (minAlkalis !== '' || maxAlkalis !== '') count++;
    if (minFeOT !== '' || maxFeOT !== '') count++;
    return count;
  }, [minSiO2, maxSiO2, minMgO, maxMgO, minAl2O3, maxAl2O3, minCaO, maxCaO, minAlkalis, maxAlkalis, minFeOT, maxFeOT]);

  const handleResetOxideFilters = () => {
    setMinSiO2('');
    setMaxSiO2('');
    setMinMgO('');
    setMaxMgO('');
    setMinAl2O3('');
    setMaxAl2O3('');
    setMinCaO('');
    setMaxCaO('');
    setMinAlkalis('');
    setMaxAlkalis('');
    setMinFeOT('');
    setMaxFeOT('');
  };

  const handleApplyOxidePreset = (preset: 'basalt' | 'intermediate' | 'felsic' | 'ultramafic' | 'alkaline') => {
    handleResetOxideFilters();
    if (preset === 'basalt') {
      setMinSiO2('45');
      setMaxSiO2('52');
    } else if (preset === 'intermediate') {
      setMinSiO2('52');
      setMaxSiO2('63');
    } else if (preset === 'felsic') {
      setMinSiO2('63');
    } else if (preset === 'ultramafic') {
      setMinMgO('18');
    } else if (preset === 'alkaline') {
      setMinAlkalis('7');
    }
    setShowOxideFilters(true);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to find rock or mineral reference by name
  const findSpecimenByName = (name: string): RockReference | MineralReference | null => {
    const clean = name.trim().toLowerCase();
    const rock = ROCKS_DATASET.find((r) => r.name.toLowerCase() === clean);
    if (rock) return getEnrichedRock(rock);
    const min = MINERALS_DATASET.find((m) => m.name.toLowerCase() === clean);
    if (min) return getEnrichedMineral(min);
    // GEOROC matches are references too; open them in the same dossier.
    const gRock = getGeorocRocks().find((r) => r.name.toLowerCase() === clean);
    if (gRock) return getEnrichedRock(gRock);
    const gMin = getGeorocMinerals().find((m) => m.name.toLowerCase() === clean);
    if (gMin) return getEnrichedMineral(gMin);
    return null;
  };

  // The last uploaded file and how its columns are read, so the mapping can
  // be corrected and the batch re-run without uploading again.
  const [parsedFile, setParsedFile] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [columnMap, setColumnMap] = useState<ColumnMap>({});
  const [showMapping, setShowMapping] = useState<boolean>(false);

  const handleColumnChange = (header: string, key: string) => {
    if (!parsedFile) return;
    const next = { ...columnMap, [header]: key === '' ? null : key };
    setColumnMap(next);
    recordHistory();
    setBatchResults(processBatchCSV(parsedFile.rows, BATCH_LIMIT, next));
  };

  // Parse and process CSV text
  const handleProcessCSVText = (csvText: string) => {
    const { headers, rows } = parseCSV(csvText);
    if (rows.length === 0) {
      alert('The CSV file does not contain valid data rows.');
      return;
    }
    if (rows.length > BATCH_LIMIT) {
      alert(
        `The file has ${rows.length.toLocaleString()} rows; the first ${BATCH_LIMIT.toLocaleString()} are processed. ` +
          'Split the file, or use scripts/classify-csv.ts from the repository for larger datasets.'
      );
    }
    const map = autoColumnMap(headers);
    setParsedFile({ headers, rows });
    setColumnMap(map);
    setShowMapping(headers.some((h) => map[h] === null));
    recordHistory();
    const results = processBatchCSV(rows, BATCH_LIMIT, map);
    setBatchResults(results);
  };

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        handleProcessCSVText(content);
      }
    };
    reader.readAsText(file);
    // reset input
    e.target.value = '';
  };

  // Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        handleProcessCSVText(content);
      }
    };
    reader.readAsText(file);
  };

  // Benchmark suite loaders
  const handleLoadBenchmark = (suiteKey: keyof typeof SAMPLE_BENCHMARK_CSVS) => {
    handleProcessCSVText(SAMPLE_BENCHMARK_CSVS[suiteKey]);
  };

  // Download blank CSV template
  const handleDownloadTemplate = () => {
    const templateContent = `Sample_ID,SiO2,TiO2,Al2O3,Fe2O3,FeO,MnO,MgO,CaO,Na2O,K2O,P2O5,Cr2O3,NiO,LOI
SAMPLE_01,49.80,1.40,15.60,2.10,8.20,0.18,7.90,11.20,2.60,0.25,0.15,0.04,0.02,0.50
SAMPLE_02,72.40,0.28,14.20,0.80,1.40,0.05,0.45,1.20,3.80,4.60,0.06,0.00,0.00,0.70
SAMPLE_03,41.50,0.02,0.05,0.00,8.80,0.15,49.20,0.20,0.01,0.00,0.00,0.12,0.35,0.00`;

    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, 'geochem_input_template.csv');
  };

  // Export comprehensive results to CSV (including calculated stoichiometry, CIPW norms, and classifications)
  const handleExportComprehensiveCSV = () => {
    if (batchResults.length === 0) return;
    const csvStr = exportBatchComprehensiveCSV(batchResults);
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `comprehensive_geochem_stoichiometry_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // Export summary processed results to CSV
  const handleExportCSV = () => {
    if (batchResults.length === 0) return;
    const csvStr = exportBatchToCSV(batchResults);
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `classified_geochem_summary_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // Filtered & Sorted results
  const filteredResults = useMemo(() => {
    const minSiO2Val = minSiO2 !== '' ? parseFloat(minSiO2) : null;
    const maxSiO2Val = maxSiO2 !== '' ? parseFloat(maxSiO2) : null;
    const minMgOVal = minMgO !== '' ? parseFloat(minMgO) : null;
    const maxMgOVal = maxMgO !== '' ? parseFloat(maxMgO) : null;
    const minAl2O3Val = minAl2O3 !== '' ? parseFloat(minAl2O3) : null;
    const maxAl2O3Val = maxAl2O3 !== '' ? parseFloat(maxAl2O3) : null;
    const minCaOVal = minCaO !== '' ? parseFloat(minCaO) : null;
    const maxCaOVal = maxCaO !== '' ? parseFloat(maxCaO) : null;
    const minAlkalisVal = minAlkalis !== '' ? parseFloat(minAlkalis) : null;
    const maxAlkalisVal = maxAlkalis !== '' ? parseFloat(maxAlkalis) : null;
    const minFeOTVal = minFeOT !== '' ? parseFloat(minFeOT) : null;
    const maxFeOTVal = maxFeOT !== '' ? parseFloat(maxFeOT) : null;

    return batchResults.filter((row) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        row.sampleId.toLowerCase().includes(q) ||
        row.primaryName.toLowerCase().includes(q) ||
        row.secondaryName.toLowerCase().includes(q) ||
        row.tasField.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (filterType === 'rocks' && row.identifiedCategory !== 'Rock') return false;
      if (filterType === 'minerals' && row.identifiedCategory !== 'Mineral') return false;
      if (filterType === 'good_quality' && !row.qualityStatus.includes('Good')) return false;
      if (filterType === 'high_confidence' && row.primaryConfidence < 80) return false;

      // Global Oxide Range Filters (applied to normalized oxides for geochemical consistency)
      const ox = row.normalizedOxides;
      const sio2 = ox.SiO2 ?? 0;
      const mgo = ox.MgO ?? 0;
      const al2o3 = ox.Al2O3 ?? 0;
      const cao = ox.CaO ?? 0;
      const na2o = ox.Na2O ?? 0;
      const k2o = ox.K2O ?? 0;
      const alkalis = na2o + k2o;
      // Normalized rows carry FeO, Fe2O3 and FeOT together; summing them
      // doubled total iron. The resolver counts it once.
      const feot = resolveIron(ox).FeOT;

      if (minSiO2Val !== null && sio2 < minSiO2Val) return false;
      if (maxSiO2Val !== null && sio2 > maxSiO2Val) return false;
      if (minMgOVal !== null && mgo < minMgOVal) return false;
      if (maxMgOVal !== null && mgo > maxMgOVal) return false;
      if (minAl2O3Val !== null && al2o3 < minAl2O3Val) return false;
      if (maxAl2O3Val !== null && al2o3 > maxAl2O3Val) return false;
      if (minCaOVal !== null && cao < minCaOVal) return false;
      if (maxCaOVal !== null && cao > maxCaOVal) return false;
      if (minAlkalisVal !== null && alkalis < minAlkalisVal) return false;
      if (maxAlkalisVal !== null && alkalis > maxAlkalisVal) return false;
      if (minFeOTVal !== null && feot < minFeOTVal) return false;
      if (maxFeOTVal !== null && feot > maxFeOTVal) return false;

      return true;
    }).sort((a, b) => {
      let cmp = 0;
      if (sortField === 'row') cmp = a.rowNumber - b.rowNumber;
      else if (sortField === 'id') cmp = a.sampleId.localeCompare(b.sampleId);
      else if (sortField === 'confidence') cmp = a.primaryConfidence - b.primaryConfidence;
      else if (sortField === 'total') cmp = a.totalWt - b.totalWt;
      return sortAsc ? cmp : -cmp;
    });
  }, [
    batchResults,
    searchQuery,
    filterType,
    sortField,
    sortAsc,
    minSiO2,
    maxSiO2,
    minMgO,
    maxMgO,
    minAl2O3,
    maxAl2O3,
    minCaO,
    maxCaO,
    minAlkalis,
    maxAlkalis,
    minFeOT,
    maxFeOT,
  ]);

  // Statistics
  const stats = useMemo(() => {
    if (batchResults.length === 0) return null;
    const rockCount = batchResults.filter((r) => r.identifiedCategory === 'Rock').length;
    const mineralCount = batchResults.filter((r) => r.identifiedCategory === 'Mineral').length;
    const avgConfidence = Math.round(
      batchResults.reduce((acc, r) => acc + r.primaryConfidence, 0) / batchResults.length
    );
    const goodQualityCount = batchResults.filter((r) => r.qualityStatus.includes('Good') || r.qualityStatus.includes('Acceptable')).length;

    return {
      total: batchResults.length,
      rockCount,
      mineralCount,
      avgConfidence,
      goodQualityCount,
    };
  }, [batchResults]);

  // TAS plot points for all batch samples
  const batchTasPoints: TASPoint[] = useMemo(() => {
    return batchResults.map((r) => {
      const sio2 = r.normalizedOxides.SiO2 || 0;
      const alk = (r.normalizedOxides.Na2O || 0) + (r.normalizedOxides.K2O || 0);
      return {
        id: String(r.rowNumber),
        name: `${r.sampleId} (${r.primaryName})`,
        sio2,
        totalAlkalis: alk,
        category: r.tasField,
        isPrimary: selectedRowId === String(r.rowNumber),
      };
    });
  }, [batchResults, selectedRowId]);

  return (
    <div className="space-y-6">
      {/* Specimen Detail Modal */}
      <SpecimenModal
        specimen={activeModalSpecimen}
        onClose={() => setActiveModalSpecimen(null)}
        onInspect={onInspectSample}
      />

      {/* Upload Dropzone & Benchmark Loaders */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-stone-800">
          <div>
            <h2 className="text-base font-bold text-stone-100 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-amber-400" />
              Bulk CSV Geochemical Batch Processor
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-950/60 text-amber-300 border border-amber-800/60 rounded-full">
                Up to {BATCH_LIMIT.toLocaleString()} Samples
              </span>
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Upload multi-sample XRF, ICP-MS, or EPMA microprobe assays in oxide wt% or element wt% (processes up to {BATCH_LIMIT.toLocaleString()} samples per batch)
            </p>
          </div>

          <button
            onClick={handleDownloadTemplate}
            className="px-3 py-1.5 text-xs font-medium bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-lg border border-stone-700 transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            Download CSV Template
          </button>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-amber-400 bg-amber-950/20'
              : 'border-stone-700 hover:border-stone-600 bg-stone-950/40 hover:bg-stone-950/70'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv,.tsv,.txt"
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-full bg-stone-800 flex items-center justify-center text-amber-400 shadow-inner">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-stone-200">
              Click to select or drag and drop your CSV file here
            </div>
            <p className="text-xs text-stone-500 max-w-md">
              Supports up to {BATCH_LIMIT.toLocaleString()} samples per CSV with standard column headers (e.g. SiO2, TiO2, Al2O3, FeOT, MgO, CaO, Na2O, K2O, LOI or elemental Si, Ti, Al, Fe, Mg, Ca)
            </p>
          </div>
        </div>

        {/* Quick Benchmark Batch Buttons */}
        <div className="mt-4 pt-3 border-t border-stone-800 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-stone-400 font-medium flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Load benchmark datasets:
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleLoadBenchmark('georocVolcanicSuite')}
              className="px-2.5 py-1 text-xs rounded-md bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 transition-colors"
            >
              GEOROC Volcanic Suite
            </button>
            <button
              onClick={() => handleLoadBenchmark('epmaMineralsSuite')}
              className="px-2.5 py-1 text-xs rounded-md bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 transition-colors"
            >
              EPMA Minerals Suite
            </button>
            <button
              onClick={() => handleLoadBenchmark('crustalAndSedimentarySuite')}
              className="px-2.5 py-1 text-xs rounded-md bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 transition-colors"
            >
              Crustal &amp; Sedimentary Suite
            </button>
          </div>
        </div>
      </div>

      {/* Column mapping: what each CSV column was read as, editable */}
      {parsedFile && (
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 text-xs">
          <button
            type="button"
            onClick={() => setShowMapping((v) => !v)}
            aria-expanded={showMapping}
            className="w-full flex items-center justify-between gap-2 text-left"
          >
            <span className="font-semibold text-stone-200 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-amber-400" />
              Column mapping
            </span>
            <span className="text-stone-400">
              {parsedFile.headers.filter((h) => columnMap[h]).length} read &middot;{' '}
              <span className={parsedFile.headers.some((h) => !columnMap[h]) ? 'text-amber-400' : ''}>
                {parsedFile.headers.filter((h) => !columnMap[h]).length} ignored
              </span>
              <ChevronRight className={`inline w-3.5 h-3.5 ml-1 transition-transform ${showMapping ? 'rotate-90' : ''}`} />
            </span>
          </button>
          {showMapping && (
            <div className="mt-3 space-y-2">
              <p className="text-stone-400 leading-relaxed">
                Each column of your file and what it is read as. Assign any ignored column that holds an oxide, and
                the batch is re-run. Values such as &ldquo;&lt;0.01&rdquo;, &ldquo;bdl&rdquo;, &ldquo;n.d.&rdquo; or a
                negative number are treated as below detection (missing), never as zero.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {parsedFile.headers.map((h) => (
                  <label key={h} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-stone-950/70 border border-stone-800">
                    <span className="font-mono text-stone-300 truncate" title={h}>{h}</span>
                    <select
                      value={columnMap[h] ?? ''}
                      onChange={(e) => handleColumnChange(h, e.target.value)}
                      className={`bg-stone-900 border rounded px-1.5 py-1 text-xs ${
                        columnMap[h] ? 'border-stone-700 text-stone-100' : 'border-amber-800 text-amber-300'
                      }`}
                    >
                      <option value="">Ignore</option>
                      <option value="sample_id">Sample ID</option>
                      <optgroup label="Oxides">
                        {MAPPABLE_OXIDES.map((o) => (
                          <option key={o} value={o}>{o} (wt%)</option>
                        ))}
                      </optgroup>
                      <optgroup label="Elements">
                        {MAPPABLE_ELEMENTS.map((o) => (
                          <option key={o} value={o}>{o} (wt%)</option>
                        ))}
                      </optgroup>
                      <optgroup label="Trace elements">
                        {TRACE_INPUTS.map((o) => (
                          <option key={o} value={`trace:${o}`}>{o} (ppm)</option>
                        ))}
                      </optgroup>
                    </select>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Spider diagrams for the batch, when the file carries trace elements */}
      {batchResults.some((r) => r.traceElements) && (
        <BatchSpiderPanel results={batchResults} />
      )}

      {/* Summary Metric Strip */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-3.5">
            <div className="text-xs text-stone-400 font-medium">Total Processed</div>
            <div className="text-xl font-bold font-mono text-stone-100 mt-1">
              {stats.total} <span className="text-xs font-normal text-stone-500">samples</span>
            </div>
          </div>

          <div className="bg-stone-900 border border-stone-800 rounded-xl p-3.5">
            <div className="text-xs text-stone-400 font-medium">Rock / Mineral Split</div>
            <div className="text-xl font-bold font-mono text-amber-400 mt-1">
              {stats.rockCount}{' '}
              <span className="text-xs font-normal text-stone-500">Rocks /</span>{' '}
              {stats.mineralCount}{' '}
              <span className="text-xs font-normal text-stone-500">Minerals</span>
            </div>
          </div>

          <div className="bg-stone-900 border border-stone-800 rounded-xl p-3.5">
            <div className="text-xs text-stone-400 font-medium">Mean Similarity Score</div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
              {stats.avgConfidence}
              <span className="text-xs font-normal text-stone-500">/100</span>
            </div>
          </div>

          <div className="bg-stone-900 border border-stone-800 rounded-xl p-3.5">
            <div className="text-xs text-stone-400 font-medium">Analytical Quality Pass</div>
            <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
              {stats.goodQualityCount} / {stats.total}{' '}
              <span className="text-xs font-normal text-stone-500">within 95-105%</span>
            </div>
          </div>
        </div>
      )}

      {/* Batch Results Table & Controls */}
      {batchResults.length > 0 && (
        <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow-sm">
          {/* Table Toolbar */}
          <div className="p-4 border-b border-stone-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[260px]">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by ID, Rock, Mineral, TAS..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Filter Selector */}
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-stone-500" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-stone-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">All Classifications ({batchResults.length})</option>
                  <option value="rocks">Rocks Only</option>
                  <option value="minerals">Minerals Only</option>
                  <option value="good_quality">Good Quality Total (98-102%)</option>
                  <option value="high_confidence">High Similarity (&ge;80)</option>
                </select>
              </div>

              {/* TAS Plot Toggle */}
              <button
                onClick={() => setShowTasPlot(!showTasPlot)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
                  showTasPlot
                    ? 'bg-amber-600/30 text-amber-300 border-amber-500/50'
                    : 'bg-stone-800 text-stone-400 hover:text-stone-200 border-stone-700'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                {showTasPlot ? 'Hide TAS Plot' : 'Plot on TAS'}
              </button>

              {/* Global Oxide Range Filters Toggle */}
              <button
                onClick={() => setShowOxideFilters(!showOxideFilters)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
                  showOxideFilters || activeOxideFiltersCount > 0
                    ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                    : 'bg-stone-800 text-stone-400 hover:text-stone-200 border-stone-700'
                }`}
                title="Filter dataset by oxide ranges (SiO2, MgO, Al2O3, CaO, Alkalis, FeOT)"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Oxide Ranges</span>
                {activeOxideFiltersCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-stone-950 text-amber-300 text-[10px] font-bold">
                    {activeOxideFiltersCount}
                  </span>
                )}
              </button>

              {/* Undo Button */}
              <button
                onClick={handleUndo}
                disabled={history.length === 0}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
                  history.length > 0
                    ? 'bg-stone-800 text-amber-300 hover:bg-stone-700 border-amber-500/40'
                    : 'bg-stone-950 text-stone-600 border-stone-800/80 cursor-not-allowed opacity-60'
                }`}
                title={history.length > 0 ? `Undo last edit or removal (${history.length} state(s) available)` : 'No actions to undo'}
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Undo</span>
                {history.length > 0 && (
                  <span className="text-[10px] text-stone-400 font-mono">({history.length})</span>
                )}
              </button>
            </div>

            {/* Export Classified CSVs */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleExportComprehensiveCSV}
                className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5 shrink-0"
                title="Download full CSV with classification results, calculated stoichiometry (APFU), petrological indices (Mg#, ASI, etc.), and CIPW norms"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Full CSV + Stoichiometry</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="px-2.5 py-1.5 text-xs font-medium bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-lg border border-stone-700 transition-colors flex items-center gap-1.5 shrink-0"
                title="Download fast summary CSV with primary classifications and normalized oxides"
              >
                <Download className="w-3.5 h-3.5 text-stone-400" />
                <span>Summary CSV</span>
              </button>
            </div>
          </div>

          {/* Collapsible Global Oxide Range Filters Panel */}
          {showOxideFilters && (
            <div className="p-4 bg-stone-950 border-b border-stone-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-stone-200 uppercase tracking-wider">
                    Global Oxide Range Filters (wt% Normalized)
                  </span>
                  {activeOxideFiltersCount > 0 && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      {activeOxideFiltersCount} Active Filter{activeOxideFiltersCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {activeOxideFiltersCount > 0 && (
                    <button
                      onClick={handleResetOxideFilters}
                      className="text-xs text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Filters</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowOxideFilters(false)}
                    className="text-stone-500 hover:text-stone-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Quick Geochemical Presets */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1 pb-1 border-b border-stone-900">
                <span className="text-stone-500 text-[11px] font-medium mr-1">Presets:</span>
                <button
                  onClick={() => handleApplyOxidePreset('basalt')}
                  className="px-2.5 py-1 rounded bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-amber-300 border border-stone-800 transition-colors"
                >
                  Basaltic (45–52% SiO₂)
                </button>
                <button
                  onClick={() => handleApplyOxidePreset('intermediate')}
                  className="px-2.5 py-1 rounded bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-amber-300 border border-stone-800 transition-colors"
                >
                  Intermediate (52–63% SiO₂)
                </button>
                <button
                  onClick={() => handleApplyOxidePreset('felsic')}
                  className="px-2.5 py-1 rounded bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-amber-300 border border-stone-800 transition-colors"
                >
                  Felsic (&gt;63% SiO₂)
                </button>
                <button
                  onClick={() => handleApplyOxidePreset('ultramafic')}
                  className="px-2.5 py-1 rounded bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-amber-300 border border-stone-800 transition-colors"
                >
                  Ultramafic (&gt;18% MgO)
                </button>
                <button
                  onClick={() => handleApplyOxidePreset('alkaline')}
                  className="px-2.5 py-1 rounded bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-amber-300 border border-stone-800 transition-colors"
                >
                  Alkaline (&gt;7% Alkalis)
                </button>
              </div>

              {/* Oxide Min-Max Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
                {/* SiO2 */}
                <div className="bg-stone-900/90 p-2.5 rounded-lg border border-stone-800 space-y-1.5">
                  <div className="text-[11px] font-semibold text-amber-300 flex justify-between">
                    <span>SiO₂</span>
                    <span className="text-stone-500">wt%</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="number"
                      placeholder="Min"
                      value={minSiO2}
                      onChange={(e) => setMinSiO2(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded px-1.5 py-1 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={maxSiO2}
                      onChange={(e) => setMaxSiO2(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded px-1.5 py-1 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* MgO */}
                <div className="bg-stone-900/90 p-2.5 rounded-lg border border-stone-800 space-y-1.5">
                  <div className="text-[11px] font-semibold text-emerald-400 flex justify-between">
                    <span>MgO</span>
                    <span className="text-stone-500">wt%</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="number"
                      placeholder="Min"
                      value={minMgO}
                      onChange={(e) => setMinMgO(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded px-1.5 py-1 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={maxMgO}
                      onChange={(e) => setMaxMgO(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded px-1.5 py-1 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Al2O3 */}
                <div className="bg-stone-900/90 p-2.5 rounded-lg border border-stone-800 space-y-1.5">
                  <div className="text-[11px] font-semibold text-sky-400 flex justify-between">
                    <span>Al₂O₃</span>
                    <span className="text-stone-500">wt%</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="number"
                      placeholder="Min"
                      value={minAl2O3}
                      onChange={(e) => setMinAl2O3(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded px-1.5 py-1 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={maxAl2O3}
                      onChange={(e) => setMaxAl2O3(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded px-1.5 py-1 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* CaO */}
                <div className="bg-stone-900/90 p-2.5 rounded-lg border border-stone-800 space-y-1.5">
                  <div className="text-[11px] font-semibold text-indigo-400 flex justify-between">
                    <span>CaO</span>
                    <span className="text-stone-500">wt%</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="number"
                      placeholder="Min"
                      value={minCaO}
                      onChange={(e) => setMinCaO(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded px-1.5 py-1 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={maxCaO}
                      onChange={(e) => setMaxCaO(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded px-1.5 py-1 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Alkalis (Na2O + K2O) */}
                <div className="bg-stone-900/90 p-2.5 rounded-lg border border-stone-800 space-y-1.5">
                  <div className="text-[11px] font-semibold text-purple-400 flex justify-between">
                    <span>Na₂O + K₂O</span>
                    <span className="text-stone-500">wt%</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="number"
                      placeholder="Min"
                      value={minAlkalis}
                      onChange={(e) => setMinAlkalis(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded px-1.5 py-1 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={maxAlkalis}
                      onChange={(e) => setMaxAlkalis(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded px-1.5 py-1 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* FeO / FeOT */}
                <div className="bg-stone-900/90 p-2.5 rounded-lg border border-stone-800 space-y-1.5">
                  <div className="text-[11px] font-semibold text-rose-400 flex justify-between">
                    <span>Total FeO</span>
                    <span className="text-stone-500">wt%</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="number"
                      placeholder="Min"
                      value={minFeOT}
                      onChange={(e) => setMinFeOT(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded px-1.5 py-1 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={maxFeOT}
                      onChange={(e) => setMaxFeOT(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded px-1.5 py-1 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Conditional TAS Diagram View for Batch */}
          {showTasPlot && (
            <div className="p-4 border-b border-stone-800 bg-stone-950/60">
              <TasDiagram
                points={batchTasPoints}
                selectedPointId={selectedRowId}
                onSelectPoint={(id) => setSelectedRowId(id)}
                height={380}
              />
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-300">
              <thead className="bg-stone-950 text-stone-400 text-[11px] uppercase tracking-wider font-semibold border-b border-stone-800 select-none">
                <tr>
                  <th
                    onClick={() => {
                      setSortField('row');
                      setSortAsc(!sortAsc);
                    }}
                    className="py-3 px-3 cursor-pointer hover:text-stone-200 w-12"
                  >
                    #
                  </th>
                  <th
                    onClick={() => {
                      setSortField('id');
                      setSortAsc(!sortAsc);
                    }}
                    className="py-3 px-3 cursor-pointer hover:text-stone-200"
                  >
                    Sample ID
                  </th>
                  <th className="py-3 px-3">Type</th>
                  <th
                    onClick={() => {
                      setSortField('confidence');
                      setSortAsc(!sortAsc);
                    }}
                    className="py-3 px-3 cursor-pointer hover:text-stone-200"
                  >
                    Primary Classification
                  </th>
                  <th className="py-3 px-3">Secondary Match</th>
                  <th className="py-3 px-3">TAS Field</th>
                  <th
                    onClick={() => {
                      setSortField('total');
                      setSortAsc(!sortAsc);
                    }}
                    className="py-3 px-3 cursor-pointer hover:text-stone-200 text-right"
                  >
                    Total wt%
                  </th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 font-sans">
                {filteredResults.map((row) => {
                  const isRock = row.identifiedCategory === 'Rock';
                  const isSelected = selectedRowId === String(row.rowNumber);

                  return (
                    <tr
                      key={`batch-row-${row.rowNumber}`}
                      onClick={() => setSelectedRowId(String(row.rowNumber))}
                      className={`hover:bg-stone-800/40 transition-colors ${
                        isSelected ? 'bg-amber-950/20' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono text-stone-500">{row.rowNumber}</td>
                      <td className="py-2.5 px-3 font-medium text-stone-100 font-mono">
                        {row.sampleId}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                            isRock
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                          }`}
                        >
                          {row.identifiedCategory}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {(() => {
                          const specimen = findSpecimenByName(row.primaryName);
                          return (
                            <div className="flex items-center gap-2">
                              {specimen ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveModalSpecimen(specimen);
                                  }}
                                  className="font-semibold text-stone-200 hover:text-amber-300 transition-colors text-left flex items-center gap-1.5 group"
                                  title="View specimen dossier, formula & geological facts"
                                >
                                  <span>{row.primaryName}</span>
                                  <BookOpen className="w-3 h-3 text-stone-500 group-hover:text-amber-400 transition-colors shrink-0" />
                                </button>
                              ) : (
                                <span className="font-semibold text-stone-200">{row.primaryName}</span>
                              )}
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                                  row.primaryConfidence >= 85
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                                    : row.primaryConfidence >= 65
                                    ? 'bg-amber-950 text-amber-300 border border-amber-800/50'
                                    : 'bg-stone-800 text-stone-400'
                                }`}
                              >
                                {row.primaryConfidence}<span className="text-stone-500">/100</span>
                              </span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-2.5 px-3 text-stone-400">
                        {row.secondaryName}{' '}
                        {row.secondaryConfidence > 0 && (
                          <span className="text-[10px] font-mono text-stone-500">
                            (similarity {row.secondaryConfidence}/100)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-stone-300">{row.tasField}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`inline-block font-mono text-xs px-1.5 py-0.5 rounded ${
                            row.totalWt >= 98.0 && row.totalWt <= 102.0
                              ? 'text-emerald-400'
                              : row.totalWt >= 95.0 && row.totalWt <= 105.0
                              ? 'text-amber-300'
                              : 'text-rose-400'
                          }`}
                        >
                          {row.totalWt.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onInspectSample(row.rawOxides, row.sampleId);
                            }}
                            className="px-2 py-1 text-[11px] font-medium bg-stone-800 hover:bg-amber-600 text-stone-300 hover:text-white rounded border border-stone-700 hover:border-amber-600 transition-colors inline-flex items-center gap-1"
                            title="Inspect sample in Single Workbench"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(row);
                            }}
                            className="p-1 text-stone-400 hover:text-amber-300 hover:bg-stone-800 rounded border border-transparent hover:border-stone-700 transition-colors"
                            title="Edit row data"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRow(row.rowNumber);
                            }}
                            className="p-1 text-stone-500 hover:text-rose-400 hover:bg-stone-800 rounded border border-transparent hover:border-stone-700 transition-colors"
                            title="Remove row from dataset (Undo available)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-stone-950 text-[11px] text-stone-500 flex justify-between items-center border-t border-stone-800">
            <span>
              Showing {filteredResults.length} of {batchResults.length} samples
            </span>
            <span>Click any row or "Inspect" to open in Single Sample workbench</span>
          </div>
        </div>
      )}

      {/* Edit Row Modal */}
      {editingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-stone-100">
                  Edit Sample: {editingRow.sampleId}
                </h3>
              </div>
              <button
                onClick={() => setEditingRow(null)}
                className="text-stone-500 hover:text-stone-300 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-400 mb-1">
                  Sample Identifier
                </label>
                <input
                  type="text"
                  value={editSampleId}
                  onChange={(e) => setEditSampleId(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-400 mb-2">
                  Oxide Composition (wt%)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {editFields.map((ox) => (
                    <div key={ox} className="bg-stone-950 p-2 rounded-lg border border-stone-800">
                      <div className="text-[10px] font-mono text-stone-400 mb-1"><ChemFormula formula={ox} /></div>
                      <input
                        type="number"
                        step="0.01"
                        value={editOxides[ox] || ''}
                        onChange={(e) =>
                          setEditOxides((prev) => ({ ...prev, [ox]: e.target.value }))
                        }
                        placeholder="0.00"
                        className="w-full bg-stone-900 border border-stone-700/60 rounded px-2 py-1 text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setEditingRow(null)}
                className="px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
