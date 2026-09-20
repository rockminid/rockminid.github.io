import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { SingleAnalyzer } from './components/SingleAnalyzer';

// Views and modals are code-split: only the Single Analyzer is needed for the
// first paint. Previously every view, plus jsPDF, d3 and the full Firebase
// SDK, shipped in one ~1.9 MB entry chunk.
const BatchProcessor = lazy(() =>
  import('./components/BatchProcessor').then((m) => ({ default: m.BatchProcessor }))
);
const TasView = lazy(() => import('./components/TasView').then((m) => ({ default: m.TasView })));
const TernaryView = lazy(() =>
  import('./components/TernaryView').then((m) => ({ default: m.TernaryView }))
);
const DatasetExplorer = lazy(() =>
  import('./components/DatasetExplorer').then((m) => ({ default: m.DatasetExplorer }))
);
const SavedCollection = lazy(() =>
  import('./components/SavedCollection').then((m) => ({ default: m.SavedCollection }))
);
const DocumentationModal = lazy(() =>
  import('./components/DocumentationModal').then((m) => ({ default: m.DocumentationModal }))
);
const ShareModal = lazy(() =>
  import('./components/ShareModal').then((m) => ({ default: m.ShareModal }))
);
const FeedbackModal = lazy(() =>
  import('./components/FeedbackModal').then((m) => ({ default: m.FeedbackModal }))
);
const PrivacyPolicyModal = lazy(() =>
  import('./components/PrivacyPolicyModal').then((m) => ({ default: m.PrivacyPolicyModal }))
);
const MobileAppModal = lazy(() =>
  import('./components/MobileAppModal').then((m) => ({ default: m.MobileAppModal }))
);

/** Lightweight placeholder shown while a view chunk loads. */
const ViewFallback: React.FC = () => (
  <div className="flex items-center justify-center py-24" role="status" aria-live="polite">
    <div className="flex items-center gap-3 text-stone-400 text-sm">
      <span className="w-4 h-4 rounded-full border-2 border-stone-600 border-t-amber-500 animate-spin" />
      Loading view...
    </div>
  </div>
);
import { BatchRowResult, OxideComposition } from './types/geochem';
import { SAMPLE_BENCHMARK_CSVS, parseCSV, processBatchCSV } from './utils/csv';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { getSavedCollection } from './services/collectionService';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('single');
  const [collectionCount, setCollectionCount] = useState<number>(0);

  // Benchmark samples are classified AFTER first paint. Running the full
  // batch (CIPW + rock/mineral scoring + stoichiometry for every row) inside
  // a render-phase useMemo blocked the main thread before anything appeared.
  const [batchResults, setBatchResults] = useState<BatchRowResult[]>([]);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      const { rows } = parseCSV(SAMPLE_BENCHMARK_CSVS.georocVolcanicSuite);
      const processed = processBatchCSV(rows);
      if (!cancelled) setBatchResults(processed);
    };
    const id =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback(run, { timeout: 2000 })
        : window.setTimeout(run, 0);
    return () => {
      cancelled = true;
      if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(id as number);
      else window.clearTimeout(id as number);
    };
  }, []);

  // Update collection count
  const refreshCollectionCount = () => {
    const items = getSavedCollection();
    setCollectionCount(items.length);
  };

  // Documentation & Petrological Glossary Modal state
  const [isDocModalOpen, setIsDocModalOpen] = useState<boolean>(false);
  const [docInitialTab, setDocInitialTab] = useState<'manual' | 'glossary' | 'cite'>('manual');

  // Share, Feedback, Privacy, and Mobile APK Modal states
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [shareSampleDetail, setShareSampleDetail] = useState<{ name?: string; summary?: string }>({});

  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);
  const [feedbackSampleDetail, setFeedbackSampleDetail] = useState<{ name?: string; context?: string }>({});

  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState<boolean>(false);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState<boolean>(false);

  const openDocumentation = (tab: 'manual' | 'glossary' | 'cite' = 'manual') => {
    setDocInitialTab(tab);
    setIsDocModalOpen(true);
  };

  useEffect(() => {
    refreshCollectionCount();
    // Listen for storage events across tabs or local updates
    const handleStorage = () => refreshCollectionCount();
    window.addEventListener('storage', handleStorage);

    // Global listener to open documentation or glossary from any subcomponent
    const handleOpenDoc = (e: Event) => {
      const customEvent = e as CustomEvent<{ tab?: 'manual' | 'glossary' | 'cite' }>;
      openDocumentation(customEvent.detail?.tab || 'manual');
    };
    window.addEventListener('open-rockmin-doc', handleOpenDoc);

    const handleOpenShare = (e: Event) => {
      const customEvent = e as CustomEvent<{ sampleName?: string; summary?: string }>;
      if (customEvent.detail) {
        setShareSampleDetail(customEvent.detail);
      }
      setIsShareModalOpen(true);
    };
    window.addEventListener('open-rockmin-share', handleOpenShare);

    const handleOpenFeedback = (e: Event) => {
      const customEvent = e as CustomEvent<{ sampleName?: string; context?: string }>;
      if (customEvent.detail) {
        setFeedbackSampleDetail(customEvent.detail);
      }
      setIsFeedbackModalOpen(true);
    };
    window.addEventListener('open-rockmin-feedback', handleOpenFeedback);

    const handleOpenPrivacy = () => setIsPrivacyModalOpen(true);
    window.addEventListener('open-rockmin-privacy', handleOpenPrivacy);

    const handleOpenMobile = () => setIsMobileModalOpen(true);
    window.addEventListener('open-rockmin-mobile', handleOpenMobile);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('open-rockmin-doc', handleOpenDoc);
      window.removeEventListener('open-rockmin-share', handleOpenShare);
      window.removeEventListener('open-rockmin-feedback', handleOpenFeedback);
      window.removeEventListener('open-rockmin-privacy', handleOpenPrivacy);
      window.removeEventListener('open-rockmin-mobile', handleOpenMobile);
    };
    // Listeners are global and stable; they must not be torn down and
    // re-registered on every tab change.
  }, []);

  // Active sample state for Single Analyzer workbench
  const [activeSampleName, setActiveSampleName] = useState<string>('N-MORB Basalt (Pacific)');
  const [activeOxides, setActiveOxides] = useState<OxideComposition>({
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
  });

  // Handler to inspect a sample from batch, dataset, or collection in the Single Analyzer
  const handleInspectSample = (oxides: OxideComposition, sampleName: string) => {
    setActiveOxides(oxides);
    setActiveSampleName(sampleName);
    setActiveTab('single');
  };

  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-600 selection:text-white transition-colors duration-200">
          {/* Top Navigation */}
          <Navbar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            batchCount={batchResults.length}
            collectionCount={collectionCount}
            onOpenDocumentation={openDocumentation}
            onOpenShare={() => setIsShareModalOpen(true)}
            onOpenFeedback={() => setIsFeedbackModalOpen(true)}
            onOpenPrivacy={() => setIsPrivacyModalOpen(true)}
            onOpenMobileApp={() => setIsMobileModalOpen(true)}
          />

          {/* Main Content Area */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {activeTab === 'single' && (
              <SingleAnalyzer
                key={activeSampleName}
                initialOxides={activeOxides}
                sampleName={activeSampleName}
              />
            )}

            <Suspense fallback={<ViewFallback />}>
              {activeTab === 'batch' && (
                <BatchProcessor
                  batchResults={batchResults}
                  setBatchResults={setBatchResults}
                  onInspectSample={handleInspectSample}
                />
              )}

              {activeTab === 'tas' && (
                <TasView
                  batchResults={batchResults}
                  activeSampleOxides={activeOxides}
                  activeSampleName={activeSampleName}
                  onSelectSample={handleInspectSample}
                />
              )}

              {activeTab === 'ternary' && (
                <TernaryView
                  batchResults={batchResults}
                  activeSampleOxides={activeOxides}
                  activeSampleName={activeSampleName}
                  onSelectSample={handleInspectSample}
                />
              )}

              {activeTab === 'dataset' && (
                <DatasetExplorer onSelectComposition={handleInspectSample} />
              )}

              {activeTab === 'collection' && (
                <SavedCollection onLoadSampleToAnalyzer={handleInspectSample} />
              )}
            </Suspense>
          </main>

          {/* Modals are mounted only while open, so their chunks (and jsPDF,
              which the documentation manual pulls in) are never fetched
              unless the user actually opens them. */}
          <Suspense fallback={null}>
            {isDocModalOpen && (
              <DocumentationModal
                isOpen={isDocModalOpen}
                onClose={() => setIsDocModalOpen(false)}
                initialTab={docInitialTab}
              />
            )}

            {isShareModalOpen && (
              <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                activeSampleName={shareSampleDetail.name || activeSampleName}
                activeSampleSummary={shareSampleDetail.summary}
              />
            )}

            {isFeedbackModalOpen && (
              <FeedbackModal
                isOpen={isFeedbackModalOpen}
                onClose={() => setIsFeedbackModalOpen(false)}
                activeSampleName={feedbackSampleDetail.name || activeSampleName}
                activeSampleContext={feedbackSampleDetail.context}
              />
            )}

            {isPrivacyModalOpen && (
              <PrivacyPolicyModal
                isOpen={isPrivacyModalOpen}
                onClose={() => setIsPrivacyModalOpen(false)}
              />
            )}

            {isMobileModalOpen && (
              <MobileAppModal
                isOpen={isMobileModalOpen}
                onClose={() => setIsMobileModalOpen(false)}
              />
            )}
          </Suspense>

          {/* Global Footer */}
          <footer className="w-full bg-stone-900 border-t border-stone-800 py-6 text-xs text-stone-500">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span className="text-stone-400 font-medium">RockMin ID</span>
                <span>&bull;</span>
                <span>Mineral &amp; Rock Geochemical Engine</span>
                <span>&bull;</span>
                <span>
                  Created by{' '}
                  <a
                    href="https://kishangeo.github.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-400 hover:text-amber-300 font-medium underline transition-colors"
                  >
                    Kishan Tiwari
                  </a>
                </span>
              </div>

              {/* Quick documentation, privacy, feedback, APK shortcuts */}
              <div className="flex flex-wrap items-center gap-3 text-stone-400">
                <button
                  onClick={() => setIsPrivacyModalOpen(true)}
                  className="hover:text-amber-300 transition-colors font-medium cursor-pointer"
                >
                  Privacy Policy
                </button>
                <span>&bull;</span>
                <button
                  onClick={() => setIsFeedbackModalOpen(true)}
                  className="hover:text-amber-300 transition-colors font-medium cursor-pointer"
                >
                  Feedback
                </button>
                <span>&bull;</span>
                <button
                  onClick={() => setIsShareModalOpen(true)}
                  className="hover:text-amber-300 transition-colors font-medium cursor-pointer"
                >
                  Share
                </button>
                <span>&bull;</span>
                <button
                  onClick={() => setIsMobileModalOpen(true)}
                  className="hover:text-emerald-400 transition-colors font-medium cursor-pointer"
                >
                  Download APK / App
                </button>
                <span>&bull;</span>
                <button
                  onClick={() => openDocumentation('manual')}
                  className="hover:text-amber-300 transition-colors font-medium cursor-pointer"
                >
                  Manual
                </button>
                <span>&bull;</span>
                <button
                  onClick={() => openDocumentation('glossary')}
                  className="hover:text-amber-300 transition-colors font-medium cursor-pointer"
                >
                  Glossary
                </button>
                <span>&bull;</span>
                <button
                  onClick={() => openDocumentation('cite')}
                  className="hover:text-amber-300 transition-colors font-medium cursor-pointer"
                >
                  How to Cite
                </button>
              </div>
            </div>
          </footer>
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}
