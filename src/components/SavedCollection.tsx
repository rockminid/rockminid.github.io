import React, { useState, useEffect } from 'react';
import {
  Bookmark,
  Search,
  Filter,
  Trash2,
  FlaskConical,
  ExternalLink,
  Download,
  Cloud,
  HardDrive,
  Calendar,
  Tag,
  FileText,
  Sparkles,
  Database,
  Globe,
  LogIn,
  Check,
} from 'lucide-react';
import { SavedSample, OxideComposition } from '../types/geochem';
import {
  getSavedCollection,
  deleteSampleFromCollection,
  syncLocalCollectionToCloud,
} from '../services/collectionService';
import { useAuth } from '../context/AuthContext';
import { DatabaseReferencesCard } from './DatabaseReferencesCard';

interface SavedCollectionProps {
  onLoadSampleToAnalyzer: (oxides: OxideComposition, name: string) => void;
}

export const SavedCollection: React.FC<SavedCollectionProps> = ({ onLoadSampleToAnalyzer }) => {
  const { user, signIn, cloudEnabled } = useAuth();
  const [collection, setCollection] = useState<SavedSample[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'rock' | 'mineral' | 'custom'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadCollection = () => {
    const data = getSavedCollection();
    setCollection(data);
  };

  useEffect(() => {
    loadCollection();
  }, [user]);

  const handleSync = async () => {
    if (!user) {
      await signIn();
      return;
    }
    setIsSyncing(true);
    try {
      await syncLocalCollectionToCloud(user);
      loadCollection();
    } catch (e) {
      console.error('Manual sync failed:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteSampleFromCollection(id, user);
    setDeleteConfirmId(null);
    loadCollection();
  };

  // Collect all unique tags
  const allTags = Array.from(new Set(collection.flatMap((item) => item.tags || [])));

  // Filter collection
  const filteredCollection = collection.filter((item) => {
    if (selectedFilter !== 'all' && item.type !== selectedFilter) return false;
    if (selectedTag && (!item.tags || !item.tags.includes(selectedTag))) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchIdent = (item.identifiedAs || item.identifiedName || '').toLowerCase().includes(q);
      const matchNotes = item.notes?.toLowerCase().includes(q);
      const matchTag = item.tags?.some((t) => t.toLowerCase().includes(q));
      return matchName || matchIdent || matchNotes || matchTag;
    }

    return true;
  });

  // Export to CSV
  const handleExportCSV = () => {
    if (collection.length === 0) return;

    const headers = ['Name', 'Type', 'IdentifiedAs', 'Confidence', 'SiO2', 'TiO2', 'Al2O3', 'FeO', 'Fe2O3', 'MnO', 'MgO', 'CaO', 'Na2O', 'K2O', 'P2O5', 'LOI', 'Notes', 'SavedAt'];
    const rows = collection.map((item) => [
      `"${item.name.replace(/"/g, '""')}"`,
      item.type || item.sampleType || 'custom',
      `"${(item.identifiedAs || item.identifiedName || '').replace(/"/g, '""')}"`,
      item.confidence || 0,
      item.oxides.SiO2 || 0,
      item.oxides.TiO2 || 0,
      item.oxides.Al2O3 || 0,
      item.oxides.FeO || 0,
      item.oxides.Fe2O3 || 0,
      item.oxides.MnO || 0,
      item.oxides.MgO || 0,
      item.oxides.CaO || 0,
      item.oxides.Na2O || 0,
      item.oxides.K2O || 0,
      item.oxides.P2O5 || 0,
      item.oxides.LOI || 0,
      `"${(item.notes || '').replace(/"/g, '""')}"`,
      item.savedAt || item.createdAt || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `geochem_specimens_collection_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header and Sync Status Card */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-stone-100">
                  Specimen Collection &amp; Field Archive
                </h2>
                <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {collection.length} {collection.length === 1 ? 'Specimen' : 'Specimens'}
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Saved geochemical profiles, petrographic notes &amp; integrated database references (Mindat, Webmineral, RRUFF, EarthChem)
              </p>
            </div>
          </div>

          {/* Sync / Auth Control */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={collection.length === 0}
              className="px-3 py-1.5 text-xs font-medium bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-lg border border-stone-700 transition-colors flex items-center gap-1.5 disabled:opacity-40"
              title="Export saved collection to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            {user ? (
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="px-3 py-1.5 text-xs font-medium bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 rounded-lg border border-emerald-800/50 transition-colors flex items-center gap-1.5"
                title={`Synced with Firestore as ${user.email}`}
              >
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isSyncing ? 'Syncing...' : 'Cloud Synced'}</span>
              </button>
            ) : cloudEnabled ? (
              <button
                onClick={handleSync}
                className="px-3 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                title="Sign in with Google to sync your collection across devices"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In to Sync</span>
              </button>
            ) : (
              <span
                className="px-3 py-1.5 text-xs font-medium bg-stone-900 text-stone-400 rounded-lg border border-stone-800 flex items-center gap-1.5 cursor-default"
                title="Cloud sync is not configured for this deployment. Specimens are stored in this browser; use Export to move them between devices."
              >
                <Cloud className="w-3.5 h-3.5 text-stone-600" />
                <span>Stored Locally</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, identified rock, notes or tags..."
              className="w-full bg-stone-950 border border-stone-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {(['all', 'rock', 'mineral', 'custom'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize whitespace-nowrap ${
                  selectedFilter === filter
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800'
                }`}
              >
                {filter === 'all' ? 'All Types' : filter}
              </button>
            ))}
          </div>
        </div>

        {/* Tag filters (if tags exist) */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 pt-2 border-t border-stone-800/80 overflow-x-auto">
            <span className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider flex items-center gap-1 shrink-0">
              <Tag className="w-3 h-3 text-stone-400" />
              Tags:
            </span>
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-2 py-0.5 rounded text-[11px] border transition-colors shrink-0 ${
                selectedTag === null
                  ? 'bg-stone-800 text-stone-200 border-stone-600 font-semibold'
                  : 'bg-stone-950/60 text-stone-400 border-stone-850 hover:text-stone-300'
              }`}
            >
              All Tags
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-2 py-0.5 rounded text-[11px] border transition-colors shrink-0 ${
                  selectedTag === tag
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-semibold'
                    : 'bg-stone-950/60 text-stone-400 border-stone-850 hover:text-stone-300'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Collection Grid / List */}
      {filteredCollection.length === 0 ? (
        <div className="bg-stone-900 border border-dashed border-stone-800 rounded-2xl p-12 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-stone-800 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <Bookmark className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-stone-200 mb-1">
            {collection.length === 0 ? 'Your Collection is Empty' : 'No matching specimens found'}
          </h3>
          <p className="text-xs text-stone-400 leading-relaxed max-w-md mx-auto mb-5">
            {collection.length === 0
              ? 'Analyze any sample in the Single Sample tab and click "Save to Collection" to archive your custom rock or mineral compositions, petrographic observations, and external database links.'
              : 'Try clearing your search query or tag filters to view all saved items.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredCollection.map((sample) => (
            <div
              key={sample.id}
              className="bg-stone-900 border border-stone-800 hover:border-stone-700 rounded-xl p-5 transition-all shadow-sm flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Card Top: Title & Badges */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded ${
                          sample.type === 'rock'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : sample.type === 'mineral'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        }`}
                      >
                        {sample.type}
                      </span>
                      <span className="text-xs text-stone-400 font-mono">
                        {sample.confidence ? `similarity ${sample.confidence}/100` : ''}
                      </span>
                      {sample.syncedToCloud ? (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 font-mono" title="Synced to Firebase Firestore">
                          <Cloud className="w-2.5 h-2.5" /> Synced
                        </span>
                      ) : (
                        <span className="text-[10px] text-stone-500 flex items-center gap-0.5 font-mono" title="Saved locally in browser">
                          <HardDrive className="w-2.5 h-2.5" /> Local
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-stone-100">{sample.name}</h3>
                    <p className="text-xs text-stone-400 font-medium">
                      Identified as:{' '}
                      <span className="text-amber-300 font-semibold">{sample.identifiedAs}</span>
                    </p>
                  </div>

                  {/* Delete button with confirmation */}
                  {deleteConfirmId === sample.id ? (
                    <div className="flex items-center gap-1.5 bg-stone-950 p-1 rounded-lg border border-rose-800">
                      <span className="text-[10px] text-rose-400 font-medium px-1">Delete?</span>
                      <button
                        onClick={() => handleDelete(sample.id)}
                        className="px-2 py-0.5 text-xs bg-rose-600 hover:bg-rose-500 text-white rounded font-medium"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-0.5 text-xs bg-stone-800 hover:bg-stone-700 text-stone-300 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(sample.id)}
                      className="w-7 h-7 rounded-md bg-stone-950 hover:bg-stone-800 text-stone-500 hover:text-rose-400 flex items-center justify-center transition-colors"
                      title="Delete saved sample"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Notes Section (if present) */}
                {sample.notes && (
                  <div className="p-2.5 bg-stone-950/60 rounded-lg border border-stone-850 text-xs text-stone-300 leading-relaxed flex items-start gap-2">
                    <FileText className="w-3.5 h-3.5 text-stone-500 shrink-0 mt-0.5" />
                    <p className="line-clamp-2">{sample.notes}</p>
                  </div>
                )}

                {/* Major Oxides Mini Bar */}
                <div className="bg-stone-950/70 rounded-lg p-2.5 border border-stone-850">
                  <span className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider block mb-1.5">
                    Major Oxides (wt%)
                  </span>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 text-center">
                    {(['SiO2', 'TiO2', 'Al2O3', 'FeO', 'MgO', 'CaO', 'Na2O', 'K2O'] as const)
                      .filter((ox) => sample.oxides[ox] !== undefined && sample.oxides[ox]! > 0)
                      .slice(0, 6)
                      .map((ox) => (
                        <div key={ox} className="bg-stone-900/90 rounded p-1 border border-stone-800">
                          <span className="text-[9px] text-stone-400 block font-semibold">{ox}</span>
                          <span className="text-[11px] font-mono text-amber-300 font-bold">
                            {Number(sample.oxides[ox]).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Tags */}
                {sample.tags && sample.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {sample.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-[10px] rounded bg-stone-950 text-stone-400 border border-stone-800 font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Database Quick Cross-references */}
                <DatabaseReferencesCard
                  name={sample.identifiedAs || sample.identifiedName || sample.name}
                  databaseRefs={sample.databaseRefs}
                  isRock={(sample.type || sample.sampleType) === 'rock'}
                  compact={true}
                />
              </div>

              {/* Card Footer: Saved Date & Analyze CTA */}
              <div className="pt-4 mt-3 border-t border-stone-800 flex items-center justify-between">
                <span className="text-[10px] text-stone-500 flex items-center gap-1 font-mono">
                  <Calendar className="w-3 h-3" />
                  {new Date(sample.savedAt || sample.createdAt || 0).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>

                <button
                  onClick={() => onLoadSampleToAnalyzer(sample.oxides, sample.name)}
                  className="px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span>Analyze in Single Sample</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
