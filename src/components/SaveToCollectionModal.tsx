import React, { useState } from 'react';
import {
  X,
  Bookmark,
  Check,
  Tag,
  FileText,
  Cloud,
  HardDrive,
  Database,
  Sparkles,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { OxideComposition, ElementComposition, DatabaseReferences, SavedSample } from '../types/geochem';
import { useAuth } from '../context/AuthContext';
import { saveSampleToCollection } from '../services/collectionService';

interface SaveToCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultName: string;
  identifiedName: string;
  identifiedType: 'rock' | 'mineral' | 'custom';
  confidence: number;
  oxides: OxideComposition;
  elements: ElementComposition;
  databaseRefs?: DatabaseReferences;
  onSavedSuccess?: (savedItem: SavedSample) => void;
}

const COMMON_TAGS = [
  'Field Specimen',
  'Thin Section',
  'EPMA Microprobe',
  'XRF Lab Assay',
  'Volcanic Arc',
  'Mantle Xenolith',
  'Ophiolite Suite',
  'Ore Deposit',
  'Pegmatite',
  'Metamorphic Aureole',
];

export const SaveToCollectionModal: React.FC<SaveToCollectionModalProps> = ({
  isOpen,
  onClose,
  defaultName,
  identifiedName,
  identifiedType,
  confidence,
  oxides,
  elements,
  databaseRefs,
  onSavedSuccess,
}) => {
  const { user, cloudEnabled } = useAuth();
  const [name, setName] = useState(defaultName || identifiedName);
  const [sampleType, setSampleType] = useState<'rock' | 'mineral' | 'custom'>(identifiedType);
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>(['Field Specimen']);
  const [customTag, setCustomTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customTag.trim();
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setCustomTag('');
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setErrorMsg('Please enter a sample name or identifier.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const samplePayload: Omit<SavedSample, 'id' | 'savedAt' | 'syncedToCloud'> = {
        name: name.trim(),
        type: sampleType,
        identifiedAs: identifiedName,
        confidence: confidence,
        oxides: { ...oxides },
        elements: { ...elements },
        notes: notes.trim(),
        tags: tags,
        databaseRefs: databaseRefs,
      };

      const saved = await saveSampleToCollection(samplePayload, user);
      setIsSaving(false);
      setSaveSuccess(true);

      if (onSavedSuccess) {
        onSavedSuccess(saved);
      }

      setTimeout(() => {
        onClose();
        setSaveSuccess(false);
      }, 1400);
    } catch (err: any) {
      console.error('Save failed:', err);
      setIsSaving(false);
      setErrorMsg(err.message || 'Failed to save sample.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md animate-fadeIn">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-100">Save Specimen to Collection</h3>
              <p className="text-[11px] text-stone-400">
                Persist custom composition, petrographic notes &amp; database links
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/60 text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Storage destination indicator */}
          <div className="p-2.5 bg-stone-950/80 rounded-xl border border-stone-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <Cloud className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="font-semibold text-stone-200">Cloud Synced (Firestore)</span>
                    <span className="text-[10px] text-stone-400 block truncate max-w-[240px]">
                      {user.email || user.displayName}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <HardDrive className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="font-semibold text-stone-200">Local Browser Storage</span>
                    <span className="text-[10px] text-stone-400 block">
                      {cloudEnabled
                        ? 'Saved in this browser. Sign in any time to sync to the cloud.'
                        : 'Saved in this browser. Use Export to move specimens between devices.'}
                    </span>
                  </div>
                </>
              )}
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-stone-800 text-stone-300">
              {user ? 'Authenticated' : 'Local Cache'}
            </span>
          </div>

          {/* Sample Name Field */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1">
              Sample Name / Field ID *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. MORB-PAC-04 or My Peridotite"
              className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500 font-medium"
            />
          </div>

          {/* Classification & Confidence Preview */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-stone-950/60 rounded-xl border border-stone-850 text-xs">
            <div>
              <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-semibold">
                Classified Identification
              </span>
              <span className="font-semibold text-stone-200 truncate block mt-0.5">
                {identifiedName}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-semibold">
                Match Confidence
              </span>
              <span className="font-bold text-amber-400 font-mono block mt-0.5">
                Similarity {confidence}/100
              </span>
            </div>
          </div>

          {/* Sample Category Selection */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {(['rock', 'mineral', 'custom'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSampleType(t)}
                  className={`py-1.5 px-3 rounded-lg border text-center font-medium capitalize transition-colors ${
                    sampleType === t
                      ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                      : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Petrographic Notes / Geological Observations */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-stone-400" />
                Petrographic Notes &amp; Locality
              </span>
              <span className="text-[10px] text-stone-500 font-normal">Optional</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Fine-grained basalt collected from pillow lava margin; phenocrysts of olivine and plagioclase..."
              className="w-full bg-stone-950 border border-stone-700 rounded-lg p-2.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500 leading-relaxed"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-stone-400" />
              Tags &amp; Geological Context
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_TAGS.map((tag) => {
                const isSelected = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleToggleTag(tag)}
                    className={`px-2 py-0.5 rounded-md text-[11px] border transition-colors ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:text-stone-300'
                    }`}
                  >
                    {isSelected && <span className="mr-1">✓</span>}
                    {tag}
                  </button>
                );
              })}
            </div>

            {/* Custom Tag input */}
            <div className="flex gap-1.5">
              <input
                type="text"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomTag(e);
                  }
                }}
                placeholder="Add custom tag..."
                className="flex-1 bg-stone-950 border border-stone-700 rounded-md px-2.5 py-1 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleAddCustomTag}
                className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs rounded-md border border-stone-700"
              >
                + Add
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-800 bg-stone-900/95 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-3.5 py-1.5 text-xs font-medium text-stone-400 hover:text-stone-200 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || saveSuccess}
            className={`px-5 py-2 text-xs font-semibold rounded-lg shadow-md flex items-center gap-2 transition-all ${
              saveSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50'
            }`}
          >
            {isSaving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved to Collection!</span>
              </>
            ) : (
              <>
                <Bookmark className="w-3.5 h-3.5" />
                <span>Save to Collection</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
