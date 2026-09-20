import React, { useEffect, useState } from 'react';
import { Database, Loader2, AlertTriangle } from 'lucide-react';
import {
  getGeorocManifest,
  getLibraryState,
  subscribeToLibrary,
} from '../data/georocReference';

/**
 * Shows which reference library the app is currently matching against.
 *
 * The GEOROC library is fetched after first paint, so for the first moment
 * the app really is running on the small curated dataset. Saying so is more
 * useful than implying a reference set that is not loaded yet.
 */
export const ReferenceLibraryBadge: React.FC<{ curatedRocks: number; curatedMinerals: number }> = ({
  curatedRocks,
  curatedMinerals,
}) => {
  const [, force] = useState(0);

  useEffect(() => subscribeToLibrary(() => force((v) => v + 1)), []);

  const lib = getLibraryState();
  const manifest = getGeorocManifest();

  if (lib.state === 'loading' || lib.state === 'idle') {
    return (
      <span
        className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium bg-stone-950/60 text-stone-400 border border-stone-800 shrink-0"
        title="Loading the GEOROC reference library. All analysis features already work against the curated dataset."
      >
        <Loader2 className="w-3 h-3 animate-spin text-stone-500" />
        <span className="font-mono">{curatedRocks + curatedMinerals} refs</span>
      </span>
    );
  }

  if (lib.state === 'error') {
    return (
      <span
        className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium bg-amber-950/40 text-amber-300 border border-amber-900/60 shrink-0"
        title={`The GEOROC reference library could not be loaded (${lib.error}). Matching is using the curated dataset only; everything else works normally.`}
      >
        <AlertTriangle className="w-3 h-3" />
        <span className="font-mono">curated only</span>
      </span>
    );
  }

  const totalRefs = curatedRocks + curatedMinerals + lib.rockGroups + lib.mineralGroups;
  const analyses = lib.analyses;

  return (
    <span
      className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium bg-emerald-950/40 text-emerald-300 border border-emerald-900/60 shrink-0"
      title={
        `Matching against ${totalRefs} reference compositions: ` +
        `${curatedRocks + curatedMinerals} curated plus ${lib.rockGroups + lib.mineralGroups} ` +
        `GEOROC population distributions built from ${analyses.toLocaleString()} analyses` +
        (manifest ? ` (ingested ${manifest.generated}).` : '.') +
        ' Each GEOROC reference is a median with a 10th-90th percentile range, not a single measurement.'
      }
    >
      <Database className="w-3 h-3" />
      <span className="font-mono">
        {totalRefs} refs · {analyses >= 1000 ? `${Math.round(analyses / 1000)}k` : analyses} analyses
      </span>
    </span>
  );
};
