import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  FileText,
  Search,
  Download,
  Printer,
  X,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Sliders,
  Layers,
  Compass,
  Database,
  FlaskConical,
  ChevronRight,
  ShieldCheck,
  Info,
  Bookmark,
  Hash,
  AlertTriangle,
  ListOrdered,
  FileSpreadsheet,
} from 'lucide-react';
import { PETROLOGICAL_GLOSSARY, GlossaryTerm } from '../data/petrologicalGlossary';
import { generateRockMinManualPDF } from '../utils/pdfManualGenerator';

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'manual' | 'glossary' | 'cite';
}

type TabType = 'manual' | 'glossary' | 'cite';

export const DocumentationModal: React.FC<DocumentationModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'manual',
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [glossaryQuery, setGlossaryQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [activeManualSection, setActiveManualSection] = useState<string>('sec-00');

  // Categories for glossary
  const categories = [
    'All',
    'Classification Schemes',
    'Geochemical Indices',
    'Petrogenetic Processes',
    'Mineral Stoichiometry & CIPW',
    'Analytical Instrumentation',
    'Tectonic Discriminants',
  ];

  // Filtered glossary terms
  const filteredGlossary = useMemo(() => {
    const q = glossaryQuery.trim().toLowerCase();
    return PETROLOGICAL_GLOSSARY.filter((item) => {
      const matchCategory = selectedCategory === 'All' || item.category === selectedCategory;
      if (!matchCategory) return false;

      if (!q) return true;
      return (
        item.term.toLowerCase().includes(q) ||
        (item.acronym && item.acronym.toLowerCase().includes(q)) ||
        item.definition.toLowerCase().includes(q) ||
        (item.formula && item.formula.toLowerCase().includes(q)) ||
        item.significance.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [glossaryQuery, selectedCategory]);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      // Awaited: the generator now loads jsPDF dynamically, so the spinner
      // must stay up until the library has downloaded and the PDF is built.
      await generateRockMinManualPDF();
    } catch (err) {
      console.error('Failed to generate PDF manual:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const manualSections = [
    { id: 'sec-00', num: '00', label: 'Contents & Quick Start' },
    { id: 'sec-01', num: '01', label: 'Application Architecture' },
    { id: 'sec-02', num: '02', label: 'Interface & Navigation' },
    { id: 'sec-03', num: '03', label: 'Single Sample Analyzer' },
    { id: 'sec-04', num: '04', label: 'Normalization & Iron Handling' },
    { id: 'sec-05', num: '05', label: 'Stoichiometry & QA/QC' },
    { id: 'sec-06', num: '06', label: 'TAS Volcanic Classification' },
    { id: 'sec-07', num: '07', label: 'Ternary Systems & Projections' },
    { id: 'sec-08', num: '08', label: 'CIPW Normative Engine' },
    { id: 'sec-09', num: '09', label: 'Batch CSV Processor' },
    { id: 'sec-10', num: '10', label: 'Reference Datasets' },
    { id: 'sec-11', num: '11', label: 'Saved Collection & Cloud' },
    { id: 'sec-12', num: '12', label: 'Plotting & Figure Export' },
    { id: 'sec-13', num: '13', label: 'AI Petrogenetic Interpretation' },
    { id: 'sec-14', num: '14', label: 'QC & Troubleshooting' },
    { id: 'sec-15', num: '15', label: 'Recommended Research Workflow' },
    { id: 'sec-16', num: '16', label: 'Technical Data Schema' },
    { id: 'sec-17', num: '17', label: 'Diagram Implementation Notes' },
    { id: 'sec-18', num: '18', label: 'Glossary & Literature' },
    { id: 'sec-19', num: '19', label: 'Final Research Checklist' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-6xl h-[94vh] bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-stone-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Top Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-stone-800 bg-stone-950 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-600/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-100 tracking-tight flex items-center gap-2">
                <span>RockMin ID Documentation</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/60 font-medium">
                  v2.4.0
                </span>
              </h2>
              <p className="text-xs text-stone-400 hidden sm:block">
                Professional User Manual, Analytical Guide &amp; Technical Reference (20 Chapters)
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-xs transition-colors shadow-sm disabled:opacity-50"
              title="Download formatted multi-page PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">
                {isGeneratingPdf ? 'Generating PDF...' : 'Download Formatted PDF'}
              </span>
            </button>

            <button
              onClick={handlePrint}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs border border-stone-700 transition-colors"
              title="Print document"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
              aria-label="Close documentation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="px-4 sm:px-6 border-b border-stone-800 bg-stone-950/50 flex items-center gap-1 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all shrink-0 ${
              activeTab === 'manual'
                ? 'border-amber-500 text-amber-300 font-semibold'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Professional User Manual (20 Chapters)</span>
          </button>

          <button
            onClick={() => setActiveTab('glossary')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all shrink-0 ${
              activeTab === 'glossary'
                ? 'border-amber-500 text-amber-300 font-semibold'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Petrological Glossary</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-stone-800 text-stone-300">
              {PETROLOGICAL_GLOSSARY.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('cite')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all shrink-0 ${
              activeTab === 'cite'
                ? 'border-amber-500 text-amber-300 font-semibold'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>How to Cite</span>
          </button>
        </div>

        {/* Tab 1: Comprehensive Professional User Manual */}
        {activeTab === 'manual' && (
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* Sidebar TOC */}
            <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-stone-800 p-3.5 bg-stone-950/60 shrink-0 flex flex-col overflow-y-auto">
              <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Manual Chapters</span>
                <span className="text-amber-400 font-mono text-[10px]">20 Sections</span>
              </div>
              <nav className="space-y-0.5 flex-1 pr-1">
                {manualSections.map((sec) => (
                  <button
                    key={sec.id}
                    onClick={() => {
                      setActiveManualSection(sec.id);
                      document.getElementById(sec.id)?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                      activeManualSection === sec.id
                        ? 'bg-amber-600/20 text-amber-300 font-semibold border border-amber-600/40'
                        : 'text-stone-400 hover:text-stone-200 hover:bg-stone-850'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono text-[10px] text-amber-400/80 shrink-0">{sec.num}</span>
                      <span className="truncate">{sec.label}</span>
                    </div>
                    <ChevronRight className="w-3 h-3 opacity-40 shrink-0" />
                  </button>
                ))}
              </nav>

              <div className="pt-3 mt-2 border-t border-stone-800">
                <button
                  onClick={handleDownloadPdf}
                  className="w-full py-2 px-3 rounded-lg bg-amber-600/15 hover:bg-amber-600/25 text-amber-300 border border-amber-600/40 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Complete PDF</span>
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-5 sm:p-8 overflow-y-auto space-y-10 text-sm leading-relaxed text-stone-300">
              {/* Header Box */}
              <div className="p-5 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xl sm:text-2xl font-black text-amber-400">RockMin ID</h3>
                  <span className="text-xs font-mono px-2.5 py-1 rounded bg-stone-850 text-stone-300 border border-stone-750">
                    Version 2.4.0 • Technical Reference
                  </span>
                </div>
                <p className="text-sm text-stone-200 font-medium">
                  Professional User Manual, Analytical Guide &amp; Technical Reference
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs text-stone-400">
                  <div>
                    <strong className="text-stone-300">Purpose:</strong> Major-element geochemical screening, rock/mineral similarity matching, classification diagrams, normative calculations, batch processing and specimen archiving.
                  </div>
                  <div>
                    <strong className="text-stone-300">Audience:</strong> Petrologists, mineralogists, geochemists, planetary scientists, geology students, laboratory technicians and researchers.
                  </div>
                </div>

                <div className="p-3 bg-amber-950/40 rounded-xl border border-amber-800/60 text-xs text-amber-200/90 flex items-start gap-2.5 mt-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>Scientific-use note:</strong> RockMin ID is a computational screening and visualization platform. Some classification and normative routines are implemented as simplified or proxy calculations. For publication-grade work, verify final classifications against the authoritative published scheme, analytical convention, petrography and primary literature.
                  </div>
                </div>
              </div>

              {/* 00 Contents & Quick Start */}
              <section id="sec-00" className="space-y-4 pb-6 border-b border-stone-800">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-base sm:text-lg">
                  <ListOrdered className="w-5 h-5" />
                  <h3>00. Contents and Quick-Start Workflow</h3>
                </div>
                <p className="text-xs text-stone-300">
                  Follow this 5-step standardized protocol for laboratory or educational specimen evaluations:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs font-medium text-center">
                  {[
                    { step: '1', title: 'Enter Composition', desc: 'Input oxides or element wt%' },
                    { step: '2', title: 'Check Raw Total', desc: 'Verify 98.5%–101.5% bounds' },
                    { step: '3', title: 'Review Matches', desc: 'Inspect candidate similarity' },
                    { step: '4', title: 'Inspect Diagrams', desc: 'TAS, AFM, QAPF, CIPW norm' },
                    { step: '5', title: 'Save / Export', desc: 'CSV, high-res figures & PDF' },
                  ].map((s) => (
                    <div key={s.step} className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-1">
                      <div className="w-5 h-5 rounded-full bg-amber-600/30 text-amber-400 border border-amber-500/40 text-[11px] font-bold mx-auto flex items-center justify-center">
                        {s.step}
                      </div>
                      <div className="text-stone-200 font-bold text-xs">{s.title}</div>
                      <div className="text-stone-500 text-[11px]">{s.desc}</div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 01 Application Overview */}
              <section id="sec-01" className="space-y-3 pb-6 border-b border-stone-800">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-base sm:text-lg">
                  <FlaskConical className="w-5 h-5" />
                  <h3>01. Application Overview and Architecture</h3>
                </div>
                <p>
                  RockMin ID converts major-element chemical compositions into a structured petrological report. The central analytical pipeline standardizes the composition, evaluates rock and mineral similarity, computes TAS and ternary coordinates, derives stoichiometric indices and generates a simplified CIPW normative assemblage.
                </p>
                <p className="text-xs text-stone-400">
                  The software is organized around six principal analytical surfaces: Single, Batch, TAS, Ternary, Dataset and Collection. The Single Analyzer is the main workbench; the other modules extend visualization, comparison, batch processing and archiving.
                </p>
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-xs text-stone-400 space-y-1">
                  <div className="text-stone-200 font-semibold">What RockMin ID does not replace:</div>
                  <div>Petrographic thin-section observation, quantitative modal analysis, phase identification by X-ray diffraction (XRD) or Raman spectroscopy, analytical uncertainty assessment, or thermodynamic equilibrium modeling (e.g. MELTS). A high similarity score should therefore be treated as a screening hypothesis, not proof of identity.</div>
                </div>
              </section>

              {/* 02 Interface & Navigation */}
              <section id="sec-02" className="space-y-3 pb-6 border-b border-stone-800">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-base sm:text-lg">
                  <Layers className="w-5 h-5" />
                  <h3>02. Interface and Navigation</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-stone-800 rounded-lg overflow-hidden">
                    <thead className="bg-stone-950 text-stone-300 font-semibold border-b border-stone-800">
                      <tr>
                        <th className="p-2.5">Module</th>
                        <th className="p-2.5">Purpose</th>
                        <th className="p-2.5">Typical Laboratory Use</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-850 text-stone-400">
                      <tr><td className="p-2.5 font-bold text-amber-300">Single</td><td className="p-2.5 text-stone-300">Single Sample Analyzer</td><td className="p-2.5">Detailed analysis of one composition with dual rock/mineral ranking</td></tr>
                      <tr><td className="p-2.5 font-bold text-amber-300">Batch</td><td className="p-2.5 text-stone-300">Bulk CSV Processor</td><td className="p-2.5">Process up to 100 imported analyses with global oxide range filters</td></tr>
                      <tr><td className="p-2.5 font-bold text-amber-300">TAS</td><td className="p-2.5 text-stone-300">Total Alkali–Silica Projection</td><td className="p-2.5">Volcanic classification, rock comparison and alkaline/subalkaline dividers</td></tr>
                      <tr><td className="p-2.5 font-bold text-amber-300">Ternary</td><td className="p-2.5 text-stone-300">Ten Compositional Systems</td><td className="p-2.5">AFM, QAPF, feldspar, pyroxene, and ultramafic Ol-Opx-Cpx projections</td></tr>
                      <tr><td className="p-2.5 font-bold text-amber-300">Dataset</td><td className="p-2.5 text-stone-300">Reference Mineral &amp; Rock Database</td><td className="p-2.5">Explore benchmark records, petrogenesis facts and external database links</td></tr>
                      <tr><td className="p-2.5 font-bold text-amber-300">Collection</td><td className="p-2.5 text-stone-300">Saved Specimen Archive</td><td className="p-2.5">Search, tag, export and reload analyses with optional cloud sync</td></tr>
                      <tr><td className="p-2.5 font-bold text-amber-300">Documentation</td><td className="p-2.5 text-stone-300">Manual / Glossary / Citation</td><td className="p-2.5">Reference manual, searchable petrological glossary and PDF export</td></tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* 03 Single Sample Analyzer */}
              <section id="sec-03" className="space-y-4 pb-6 border-b border-stone-800">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-base sm:text-lg">
                  <Sliders className="w-5 h-5" />
                  <h3>03. Single Sample Analyzer</h3>
                </div>
                <p>The Single Analyzer is the primary workbench for detailed interpretation of one composition.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-stone-950 rounded-xl border border-stone-800 space-y-1.5">
                    <div className="font-bold text-stone-200">3.1 Input Modes:</div>
                    <ul className="list-disc list-inside text-stone-400 space-y-1">
                      <li><strong>Oxide wt%:</strong> For laboratory analyses reporting SiO₂, TiO₂, Al₂O₃, FeO, Fe₂O₃, MgO, CaO, Na₂O, K₂O, etc.</li>
                      <li><strong>Element wt%:</strong> For elemental measurements; automatically converted to oxide stoichiometry using elemental molar weights.</li>
                    </ul>
                  </div>
                  <div className="p-3.5 bg-stone-950 rounded-xl border border-stone-800 space-y-1.5">
                    <div className="font-bold text-stone-200">3.2 Reading the Primary Results:</div>
                    <ul className="list-disc list-inside text-stone-400 space-y-1">
                      <li><strong>Best overall match:</strong> Highest-ranked rock or mineral under the application&apos;s decision rules.</li>
                      <li><strong>Match score:</strong> Distance-derived similarity score (5–99 range). Treat as a similarity metric, not a calibrated probability.</li>
                      <li><strong>TAS Field:</strong> Piecewise IUGS volcanic field assignment.</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 04 Normalization & Iron Handling */}
              <section id="sec-04" className="space-y-4 pb-6 border-b border-stone-800">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-base sm:text-lg">
                  <ShieldCheck className="w-5 h-5" />
                  <h3>04. Normalization, Iron Handling and Similarity Scoring</h3>
                </div>
                <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 space-y-2 text-xs">
                  <div className="font-bold text-amber-300">4.1 Volatile-Free Normalization:</div>
                  <p className="text-stone-300">
                    When the classification pipeline uses a volatile-free basis, selected volatile fields such as LOI, H₂O, CO₂ and SO₃ are excluded from the denominator. The remaining included oxides are rescaled to 100%:
                  </p>
                  <code className="block p-2 rounded bg-stone-900 font-mono text-amber-300 text-xs">
                    X_i(norm) = X_i(raw) * 100 / Sum(X_non-volatile)
                  </code>
                  <p className="text-stone-400">
                    The raw analytical total and the normalized total answer different questions: the raw total is primarily a QA/QC indicator; the normalized composition is the basis for many classification calculations.
                  </p>
                </div>

                <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 space-y-2 text-xs">
                  <div className="font-bold text-amber-300">4.2 Total Iron Conversion (FeO*):</div>
                  <p className="text-stone-300">
                    Where total iron expressed as FeO-equivalent is required, the implementation uses:
                  </p>
                  <code className="block p-2 rounded bg-stone-900 font-mono text-amber-300 text-xs">
                    FeO* = FeO + 0.8998 * Fe2O3
                  </code>
                  <p className="text-stone-400">
                    This convention affects AFM coordinates and several indices. If a laboratory reports FeOT/FeO(total), do not enter the same iron twice as separate FeO + Fe₂O₃.
                  </p>
                </div>
              </section>

              {/* 05 Stoichiometry, Indices & QA/QC */}
              <section id="sec-05" className="space-y-4 pb-6 border-b border-stone-800">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-base sm:text-lg">
                  <Check className="w-5 h-5" />
                  <h3>05. Stoichiometry, Indices and Analytical QA/QC</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-stone-800 rounded-lg overflow-hidden">
                    <thead className="bg-stone-950 text-stone-300 font-semibold border-b border-stone-800">
                      <tr>
                        <th className="p-2">Output</th>
                        <th className="p-2">Implementation Basis</th>
                        <th className="p-2">Interpretation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-850 text-stone-400">
                      <tr><td className="p-2 font-bold text-stone-200">APFU / Cations</td><td className="p-2">Oxide molecular proportions normalized to oxygen basis</td><td className="p-2">Approximate structural cation proportions</td></tr>
                      <tr><td className="p-2 font-bold text-stone-200">Mg#</td><td className="p-2">100 * Mg / (Mg + Fe) molar</td><td className="p-2">Relative Mg enrichment / primitive magma fraction</td></tr>
                      <tr><td className="p-2 font-bold text-stone-200">ASI</td><td className="p-2">Al / (Ca + Na + K) molar cations</td><td className="p-2">Alumina saturation screening (&gt;1.0 = peraluminous)</td></tr>
                      <tr><td className="p-2 font-bold text-stone-200">A/NK</td><td className="p-2">Al / (Na + K) molar cations</td><td className="p-2">Alkali-related alumina ratio</td></tr>
                      <tr><td className="p-2 font-bold text-stone-200">Fe-index</td><td className="p-2">FeO* / (FeO* + MgO) wt%</td><td className="p-2">Relative Fe enrichment (ferroan vs magnesian)</td></tr>
                      <tr><td className="p-2 font-bold text-stone-200">Total Alkalis</td><td className="p-2">Na₂O + K₂O wt%</td><td className="p-2">TAS Y coordinate</td></tr>
                      <tr><td className="p-2 font-bold text-stone-200">Silica Saturation</td><td className="p-2">Normative Q versus Ne balance</td><td className="p-2">Oversaturated / Saturated / Undersaturated</td></tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-3.5 bg-stone-950 rounded-xl border border-stone-800 space-y-2 text-xs">
                  <div className="font-bold text-stone-200">Analytical-Total Screening Thresholds:</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="p-2 rounded bg-emerald-950/40 border border-emerald-800/40 text-emerald-300">
                      <div className="font-bold">98–102 wt%</div>
                      <div className="text-[10px] text-stone-400">Good Quality</div>
                    </div>
                    <div className="p-2 rounded bg-sky-950/40 border border-sky-800/40 text-sky-300">
                      <div className="font-bold">95–105 wt%</div>
                      <div className="text-[10px] text-stone-400">Acceptable</div>
                    </div>
                    <div className="p-2 rounded bg-amber-950/40 border border-amber-800/40 text-amber-300">
                      <div className="font-bold">&lt;95 wt%</div>
                      <div className="text-[10px] text-stone-400">Low Total</div>
                    </div>
                    <div className="p-2 rounded bg-rose-950/40 border border-rose-800/40 text-rose-300">
                      <div className="font-bold">&gt;105 wt%</div>
                      <div className="text-[10px] text-stone-400">High Total</div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 06 TAS Diagram */}
              <section id="sec-06" className="space-y-3 pb-6 border-b border-stone-800">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-base sm:text-lg">
                  <Compass className="w-5 h-5" />
                  <h3>06. TAS Diagram (Total Alkali–Silica)</h3>
                </div>
                <p className="text-xs">
                  The TAS module plots total alkalis, Na₂O + K₂O, against SiO₂ and is intended primarily for volcanic-rock classification and comparison after Le Bas et al. (1986).
                </p>
                <div className="p-3.5 bg-stone-950 rounded-xl border border-stone-800 text-xs space-y-1.5">
                  <div className="font-bold text-amber-300">Field Assignment &amp; Boundaries:</div>
                  <p className="text-stone-300">
                    The engine uses piecewise SiO₂ intervals and total-alkali thresholds to assign fields such as Picrobasalt, Basalt, Basaltic Andesite, Andesite, Dacite, Rhyolite, Trachybasalt, Tephrite/Basanite, Phonotephrite, Tephriphonolite and Phonolite. An alkaline/subalkaline boundary (Miyashiro, 1978; Irvine &amp; Baragar, 1971) is also implemented.
                  </p>
                </div>
              </section>

              {/* 07 Ternary Systems */}
              <section id="sec-07" className="space-y-3 pb-6 border-b border-stone-800">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-base sm:text-lg">
                  <Layers className="w-5 h-5" />
                  <h3>07. Ternary Systems &amp; Projections</h3>
                </div>
                <p className="text-xs">
                  RockMin ID converts bulk chemistry to ten specialized ternary and quadrilateral coordinate projections:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    { name: '1. AFM (Igneous)', comps: 'F = FeO*, A = Na2O + K2O, M = MgO', desc: 'Tholeiitic vs Calc-Alkaline' },
                    { name: '2. AFM (Metamorphic)', comps: 'A = Al2O3, F = FeO*, M = MgO', desc: 'Pelitic schist projection' },
                    { name: '3. QAPF (Plutonic)', comps: 'Q, A, P modal/normative', desc: 'Plutonic rock classification' },
                    { name: '4. QAPF (Volcanic)', comps: 'Q, A, P from CIPW norm', desc: 'Volcanic normative screening' },
                    { name: '5. APF (Plutonic)', comps: 'F, A, P', desc: 'Foid-bearing plutonic rocks' },
                    { name: '6. APF (Volcanic)', comps: 'F, A, P', desc: 'Foid-bearing volcanic rocks' },
                    { name: '7. Basalt Tetrahedron', comps: 'Di, Ol, silica proxy', desc: 'Basaltic evolutionary relations' },
                    { name: '8. Pyroxene Quad', comps: 'Wo, En, Fs', desc: 'Pyroxene solid solutions' },
                    { name: '9. Feldspar Ternary', comps: 'Or, Ab, An', desc: 'Feldspar solvus compositions' },
                    { name: '10. Ultramafic Ol-Opx-Cpx', comps: 'Ol, Opx, Cpx', desc: 'Peridotite & pyroxenite' },
                  ].map((t) => (
                    <div key={t.name} className="p-2.5 bg-stone-950 rounded-lg border border-stone-800">
                      <div className="font-bold text-amber-300">{t.name}</div>
                      <div className="font-mono text-[11px] text-stone-300">{t.comps}</div>
                      <div className="text-[10px] text-stone-500">{t.desc}</div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 08 CIPW Normative Mineralogy */}
              <section id="sec-08" className="space-y-3 pb-6 border-b border-stone-800">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-base sm:text-lg">
                  <Sparkles className="w-5 h-5" />
                  <h3>08. CIPW Normative Mineralogy</h3>
                </div>
                <p className="text-xs">
                  The normative panel calculates an idealized anhydrous mineral assemblage: Quartz (Q), Orthoclase (Or), Albite (Ab), Anorthite (An), Nepheline (Ne), Diopside (Di), Hypersthene (Hy), Olivine (Ol), Magnetite (Mt), Ilmenite (Il) and Apatite (Ap).
                </p>
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-xs space-y-1">
                  <div className="font-bold text-stone-200">Interpretation Guidelines:</div>
                  <ul className="list-disc list-inside text-stone-400 space-y-1">
                    <li>Normative quartz indicates excess silica under the implemented allocation rules.</li>
                    <li>Normative nepheline indicates silica undersaturation.</li>
                    <li>Normative feldspar abundance is not equivalent to observed modal feldspar abundance.</li>
                    <li>Normative olivine/pyroxene values are chemical allocations, not proof that those phases crystallized.</li>
                  </ul>
                </div>
              </section>

              {/* 09 Batch Geochemical Processor */}
              <section id="sec-09" className="space-y-3 pb-6 border-b border-stone-800">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-base sm:text-lg">
                  <FileSpreadsheet className="w-5 h-5" />
                  <h3>09. Batch Geochemical Processor</h3>
                </div>
                <p className="text-xs">
                  The Batch Processor processes suites of analyses from CSV files, supporting up to 100 rows per batch.
                </p>
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-xs space-y-1.5">
                  <div className="font-bold text-amber-300">Recommended CSV Header Format:</div>
                  <code className="block p-2 rounded bg-stone-900 font-mono text-amber-200 text-xs">
                    Sample_ID, SiO2, TiO2, Al2O3, FeO, Fe2O3, MnO, MgO, CaO, Na2O, K2O, P2O5, Cr2O3, NiO, LOI
                  </code>
                  <p className="text-stone-400 text-[11px]">
                    Features search, rock/mineral filtering, inline cell editing with undo history, global oxide range sliders, and dual export modes (Summary CSV vs Full CSV + Stoichiometry).
                  </p>
                </div>
              </section>

              {/* 10 Reference Dataset Explorer */}
              <section id="sec-10" className="space-y-3 pb-6 border-b border-stone-800">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-base sm:text-lg">
                  <Database className="w-5 h-5" />
                  <h3>10. Reference Dataset Explorer</h3>
                </div>
                <p className="text-xs">
                  Provides bundled reference records for rocks and minerals supporting benchmarking, candidate matching, teaching and independent inspection of reference chemistry.
                </p>
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-xs space-y-1">
                  <div className="font-bold text-stone-200">External Database Cross-References:</div>
                  <p className="text-stone-400">
                    Includes cross-references to Mindat.org (mineral IDs, IMA symbols), Webmineral (Dana/Strunz), RRUFF (Raman/EPMA spectra), EarthChem/PetDB, and GEOROC.
                  </p>
                </div>
              </section>

              {/* 11 Saved Collection */}
              <section id="sec-11" className="space-y-3 pb-6 border-b border-stone-800">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-base sm:text-lg">
                  <Bookmark className="w-5 h-5" />
                  <h3>11. Saved Collection and Cloud Synchronization</h3>
                </div>
                <p className="text-xs">
                  Functions as a specimen archive. Saved samples are written to browser local storage. When the user signs in with Google, the application synchronizes the collection to Firestore under the authenticated user&apos;s account.
                </p>
              </section>

              {/* 12 Custom Plotting & Figure Export */}
              <section id="sec-12" className="space-y-3 pb-6 border-b border-stone-800">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-base sm:text-lg">
                  <Download className="w-5 h-5" />
                  <h3>12. Custom Plotting and Figure Export</h3>
                </div>
                <p className="text-xs">
                  TAS and ternary views allow users to add custom points and export figures in PNG, JPEG, and vector SVG formats with configurable DPI resolution, backgrounds, and optional publication headers.
                </p>
              </section>

              {/* 13 AI Petrogenesis */}
              <section id="sec-13" className="space-y-3 pb-6 border-b border-stone-800">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-base sm:text-lg">
                  <Sparkles className="w-5 h-5" />
                  <h3>13. AI Petrogenesis and Tectonic Interpretation</h3>
                </div>
                <p className="text-xs">
                  Optional AI service called via <code>/api/georoc/interpret</code>. It receives sample chemistry, leading candidates, TAS field, and CIPW norm to generate hypothesis-provoking petrogenetic narratives. Always treat AI outputs as screening hypotheses requiring independent verification.
                </p>
              </section>

              {/* 14 Quality Control */}
              <section id="sec-14" className="space-y-3 pb-6 border-b border-stone-800">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-base sm:text-lg">
                  <ShieldCheck className="w-5 h-5" />
                  <h3>14. Quality Control and Troubleshooting</h3>
                </div>
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-xs space-y-1">
                  <div className="font-bold text-stone-200">Missing Data vs. Zero:</div>
                  <p className="text-stone-400">
                    Several scoring routines treat an absent oxide as zero. Scientifically, not measured is not necessarily equivalent to 0 wt%. If missing-data handling materially affects your project, verify whether unmeasured oxides (e.g. minor alkalis or volatiles) bias composition-distance scores.
                  </p>
                </div>
              </section>

              {/* 15 Recommended Research Workflow */}
              <section id="sec-15" className="space-y-3 pb-6 border-b border-stone-800">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-base sm:text-lg">
                  <Check className="w-5 h-5" />
                  <h3>15. Recommended Research Workflow</h3>
                </div>
                <div className="space-y-1.5 text-xs text-stone-300">
                  <div><strong>Step 1 — Preserve raw data:</strong> Keep original XRF/EPMA/SEM-EDS files unchanged.</div>
                  <div><strong>Step 2 — Validate chemistry:</strong> Check totals, units, Fe reporting convention, LOI and missing components.</div>
                  <div><strong>Step 3 — Run RockMin ID:</strong> Use Single Analyzer for representative samples and Batch for larger suites.</div>
                  <div><strong>Step 4 — Cross-check diagrams:</strong> Compare relevant TAS, AFM, QAPF, pyroxene, feldspar or ultramafic projections.</div>
                  <div><strong>Step 5 — Compare with observed mineralogy:</strong> Use thin-section petrography to test computational classifications.</div>
                  <div><strong>Step 6 — Use AI as an assistant:</strong> Treat AI-generated statements as hypotheses requiring validation.</div>
                  <div><strong>Step 7 — Archive everything:</strong> Save raw data, normalized outputs, exported figures, and citation metadata.</div>
                </div>
              </section>

              {/* 16 Technical Reference */}
              <section id="sec-16" className="space-y-3 pb-6 border-b border-stone-800">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-base sm:text-lg">
                  <Database className="w-5 h-5" />
                  <h3>16. Technical Reference &amp; Input Schema</h3>
                </div>
                <p className="text-xs">
                  Standard input schema covers 14 major oxides (wt%), elemental concentrations (wt% element), and string specimen identifiers with strict boundary sanitization.
                </p>
              </section>

              {/* 17 Diagram Notes */}
              <section id="sec-17" className="space-y-3 pb-6 border-b border-stone-800">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-base sm:text-lg">
                  <Compass className="w-5 h-5" />
                  <h3>17. Diagram Implementation Notes</h3>
                </div>
                <p className="text-xs">
                  The application cites established classification traditions, but the source code contains explicit simplified/proxy rules for several projections. In a manuscript, describe the actual computational implementation rather than implying that the software reproduces every detail of the original classification scheme.
                </p>
              </section>

              {/* 18 Glossary & Literature */}
              <section id="sec-18" className="space-y-3 pb-6 border-b border-stone-800">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-base sm:text-lg">
                  <BookOpen className="w-5 h-5" />
                  <h3>18. Glossary and Literature Framework</h3>
                </div>
                <p className="text-xs">
                  Literature framework represents Le Bas et al. (1986), Le Maitre (2002), Irvine &amp; Baragar (1971), Streckeisen (1976), Thompson (1957), Morimoto et al. (1988), Deer, Howie &amp; Zussman (1992), and Yoder &amp; Tilley (1962).
                </p>
              </section>

              {/* 19 Final Research Checklist */}
              <section id="sec-19" className="space-y-4">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-base sm:text-lg">
                  <Check className="w-5 h-5" />
                  <h3>19. Final Research Checklist &amp; Suggested Methods Wording</h3>
                </div>
                <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 space-y-3 text-xs">
                  <div>
                    <div className="font-bold text-amber-300 mb-1">Standard Academic Citation:</div>
                    <blockquote className="p-3 bg-stone-900 rounded-lg border border-stone-850 font-mono text-[11px] text-stone-300">
                      Tiwari, K. (2026). RockMin ID: Automated Geochemical Classifier and Petrological Analysis Platform (Version 2.4.0) [Computer software]. Zenodo. https://doi.org/10.5281/zenodo.22875578 &mdash; created by <a href="https://kishangeo.github.io" target="_blank" rel="noopener noreferrer" className="text-amber-400 underline">Kishan Tiwari</a>.
                    </blockquote>
                  </div>

                  <div>
                    <div className="font-bold text-amber-300 mb-1">Suggested Methods Section Wording:</div>
                    <blockquote className="p-3 bg-stone-900 rounded-lg border border-stone-850 italic text-stone-300">
                      &ldquo;Major-element compositions were screened and visualized using RockMin ID (v2.4.0, created by Kishan Tiwari). Compositions were evaluated using the application&apos;s normalization, similarity-matching, TAS/ternary projection and normative-mineralogy routines. Final classifications were independently checked against the relevant IUGS classification scheme, analytical conventions and geological observations.&rdquo;
                    </blockquote>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* Tab 2: Searchable Petrological Glossary */}
        {activeTab === 'glossary' && (
          <div className="flex-1 overflow-hidden flex flex-col p-4 sm:p-6 space-y-4">
            {/* Search & Category Filter Controls */}
            <div className="space-y-3 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={glossaryQuery}
                  onChange={(e) => setGlossaryQuery(e.target.value)}
                  placeholder="Search petrological terms, acronyms (e.g., TAS, CIPW, An#, EPMA, AFM), formulas, or definitions..."
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs sm:text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
                {glossaryQuery && (
                  <button
                    onClick={() => setGlossaryQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200 text-xs"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-stone-500 font-medium mr-1 flex items-center gap-1">
                  <Hash className="w-3 h-3" /> Categories:
                </span>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 text-xs rounded-lg transition-colors shrink-0 ${
                      selectedCategory === cat
                        ? 'bg-amber-600 text-stone-950 font-bold shadow-sm'
                        : 'bg-stone-950 hover:bg-stone-850 text-stone-400 hover:text-stone-200 border border-stone-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-stone-500 px-1">
                <span>
                  Showing {filteredGlossary.length} of {PETROLOGICAL_GLOSSARY.length} terms
                </span>
                {glossaryQuery && (
                  <span>
                    Filtered by: &ldquo;{glossaryQuery}&rdquo;
                  </span>
                )}
              </div>
            </div>

            {/* Glossary Term Cards List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3">
              {filteredGlossary.length > 0 ? (
                filteredGlossary.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-stone-950/80 rounded-xl border border-stone-800 hover:border-stone-700 transition-colors space-y-2.5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm sm:text-base font-bold text-stone-100">{item.term}</h4>
                        {item.acronym && (
                          <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-amber-950/80 text-amber-300 border border-amber-800/60">
                            {item.acronym}
                          </span>
                        )}
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-stone-850 text-stone-400 border border-stone-800">
                          {item.category}
                        </span>
                      </div>

                      <button
                        onClick={() => handleCopy(`${item.term}: ${item.definition}`, item.id)}
                        className="p-1.5 rounded-md hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors"
                        title="Copy term and definition"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                      {item.definition}
                    </p>

                    {item.formula && (
                      <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800 font-mono text-xs text-amber-300 flex items-center justify-between gap-2">
                        <span>{item.formula}</span>
                        <button
                          onClick={() => handleCopy(item.formula!, `formula-${item.id}`)}
                          className="text-stone-500 hover:text-stone-300 transition-colors shrink-0"
                          title="Copy formula"
                        >
                          {copiedId === `formula-${item.id}` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    )}

                    <div className="text-xs text-stone-400 bg-stone-900/60 p-2.5 rounded-lg border border-stone-850 space-y-1">
                      <div className="font-semibold text-stone-300 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Petrological Significance:</span>
                      </div>
                      <p>{item.significance}</p>
                    </div>

                    {item.reference && (
                      <div className="text-[11px] text-stone-500 italic">
                        Classic Reference: {item.reference}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1 pt-1">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          onClick={() => setGlossaryQuery(tag)}
                          className="px-2 py-0.5 text-[10px] rounded bg-stone-900 text-stone-400 hover:text-amber-300 hover:bg-stone-850 cursor-pointer transition-colors border border-stone-855"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-stone-500 space-y-2">
                  <BookOpen className="w-8 h-8 mx-auto text-stone-600" />
                  <p className="text-sm font-medium">No matching petrological terms found.</p>
                  <p className="text-xs">
                    Try checking your spelling or clearing the category filter.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: How to Cite */}
        {activeTab === 'cite' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 text-sm text-stone-300">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-stone-800">
              <div>
                <h3 className="text-lg font-bold text-stone-100 flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-amber-400" />
                  How to Cite RockMin ID
                </h3>
                <p className="text-xs text-stone-400 mt-1">
                  If you use RockMin ID in research publications, master&apos;s or doctoral theses, or geochemical laboratory analytical reports, please cite using the standard formats below.
                </p>
              </div>
              <div className="text-xs px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-stone-300 shrink-0 self-start sm:self-center">
                Created by{' '}
                <a
                  href="https://kishangeo.github.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-amber-400 hover:text-amber-300 underline inline-flex items-center gap-1 transition-colors"
                >
                  Kishan Tiwari
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* APA Citation */}
            <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  APA 7th Edition
                </span>
                <button
                  onClick={() =>
                    handleCopy(
                      'Tiwari, K. (2026). RockMin ID: Automated Geochemical Classifier and Petrological Analysis Platform (Version 2.4.0) [Computer software]. Zenodo. https://doi.org/10.5281/zenodo.22875578',
                      'apa'
                    )
                  }
                  className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-200 transition-colors"
                >
                  {copiedId === 'apa' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy APA</span>
                    </>
                  )}
                </button>
              </div>
              <p className="font-mono text-xs text-stone-300 p-2.5 bg-stone-900 rounded border border-stone-850">
                Tiwari, K. (2026). RockMin ID: Automated Geochemical Classifier and Petrological Analysis Platform (Version 2.4.0) [Computer software]. Zenodo. https://doi.org/10.5281/zenodo.22875578
              </p>
              <div className="text-xs text-stone-400 flex items-center gap-1.5 pt-1">
                <span>Created by</span>
                <a
                  href="https://kishangeo.github.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-amber-400 hover:text-amber-300 underline inline-flex items-center gap-0.5"
                >
                  Kishan Tiwari
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span className="text-stone-600">&bull;</span>
                <span className="text-stone-500">Updated: 2026</span>
              </div>
            </div>

            {/* BibTeX Citation */}
            <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  BibTeX Entry
                </span>
                <button
                  onClick={() =>
                    handleCopy(
                      `@software{tiwari_rockmin_id_2026,
  author    = {Tiwari, Kishan},
  title     = {RockMin ID: Automated Geochemical Classifier and Petrological Analysis Platform},
  year      = {2026},
  version   = {2.4.0},
  publisher = {Zenodo},
  doi       = {10.5281/zenodo.22875578},
  url       = {https://doi.org/10.5281/zenodo.22875578},
  note      = {Calibrated with IUGS Le Maitre (2002) and GEOROC datasets}
}`,
                      'bibtex'
                    )
                  }
                  className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-200 transition-colors"
                >
                  {copiedId === 'bibtex' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy BibTeX</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="font-mono text-xs text-stone-300 p-3 bg-stone-900 rounded border border-stone-850 overflow-x-auto">
{`@software{tiwari_rockmin_id_2026,
  author    = {Tiwari, Kishan},
  title     = {RockMin ID: Automated Geochemical Classifier and Petrological Analysis Platform},
  year      = {2026},
  version   = {2.4.0},
  publisher = {Zenodo},
  doi       = {10.5281/zenodo.22875578},
  url       = {https://doi.org/10.5281/zenodo.22875578},
  note      = {Calibrated with IUGS Le Maitre (2002) and GEOROC datasets}
}`}
              </pre>
            </div>

            {/* Foundational Scientific References */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-stone-300 uppercase tracking-wider">
                Primary Scientific Standards &amp; Classifications Integrated:
              </h4>
              <ul className="space-y-2 text-xs text-stone-400 list-disc list-inside">
                <li>
                  <strong>Le Maitre, R. W. (Ed.). (2002).</strong> <em>Igneous Rocks: A Classification and Glossary of Terms.</em> Recommendations of the International Union of Geological Sciences Subcommission on the Systematics of Igneous Rocks. Cambridge University Press.
                </li>
                <li>
                  <strong>Le Bas, M. J., Le Maitre, R. W., Streckeisen, A., &amp; Zanettin, B. (1986).</strong> A chemical classification of volcanic rocks based on the total alkali-silica diagram. <em>Journal of Petrology</em>, 27(3), 745–750.
                </li>
                <li>
                  <strong>Cross, W., Iddings, J. P., Pirsson, L. V., &amp; Washington, H. S. (1902).</strong> A quantitative chemico-mineralogical classification and nomenclature of igneous rocks. <em>The Journal of Geology</em>, 10(6), 555–690.
                </li>
                <li>
                  <strong>Irvine, T. N., &amp; Baragar, W. R. A. (1971).</strong> A guide to the chemical classification of the common volcanic rocks. <em>Canadian Journal of Earth Sciences</em>, 8(5), 523–548.
                </li>
                <li>
                  <strong>Streckeisen, A. (1976).</strong> To each plutonic rock its proper name. <em>Earth-Science Reviews</em>, 12(1), 1–33.
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-stone-800 bg-stone-950 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-400 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>RockMin ID Computational Geochemistry Engine</span>
            <span>&bull;</span>
            <span className="text-stone-500">IUGS Le Maitre Standard</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadPdf}
              className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Complete 20-Chapter PDF</span>
            </button>
            <span className="text-stone-700">|</span>
            <button
              onClick={onClose}
              className="text-stone-300 hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
