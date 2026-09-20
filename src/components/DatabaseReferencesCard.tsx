import React from 'react';
import { ExternalLink, Database, Globe, Compass, Atom, Layers } from 'lucide-react';
import { DatabaseReferences } from '../types/geochem';

interface DatabaseReferencesCardProps {
  name: string;
  databaseRefs?: DatabaseReferences;
  isRock?: boolean;
  compact?: boolean;
}

export const DatabaseReferencesCard: React.FC<DatabaseReferencesCardProps> = ({
  name,
  databaseRefs,
  isRock = false,
  compact = false,
}) => {
  const queryName = encodeURIComponent(name);
  const mindatUrl = databaseRefs?.mindatUrl || `https://www.mindat.org/search.php?search=${queryName}`;
  const webmineralUrl = databaseRefs?.webmineralUrl || `https://webmineral.com/search/search.php?sa=Search&q=${queryName}`;
  const rruffUrl = databaseRefs?.rruffUrl || `https://rruff.info/${queryName}`;
  const earthChemUrl = databaseRefs?.earthChemUrl || `https://search.earthchem.org/?query=${queryName}`;
  const georocUrl = databaseRefs?.georocUrl || 'https://georoc.eu/';

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider flex items-center gap-1">
          <Database className="w-3 h-3 text-stone-400" />
          Databases:
        </span>
        <a
          href={mindatUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-blue-950/60 text-blue-300 border border-blue-800/50 hover:bg-blue-900/60 transition-colors"
          title={`View ${name} on Mindat.org`}
        >
          <span>Mindat</span>
          {databaseRefs?.mindatId && <span className="text-blue-400 font-bold">#{databaseRefs.mindatId}</span>}
          <ExternalLink className="w-2.5 h-2.5" />
        </a>

        {!isRock && (
          <>
            <a
              href={webmineralUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 hover:bg-emerald-900/60 transition-colors"
              title={`View ${name} on Webmineral`}
            >
              <span>Webmineral</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <a
              href={rruffUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950/60 text-purple-300 border border-purple-800/50 hover:bg-purple-900/60 transition-colors"
              title={`View ${name} Raman & XRD spectra on RRUFF`}
            >
              <span>RRUFF</span>
              {databaseRefs?.rruffId && <span className="text-purple-400 font-bold">{databaseRefs.rruffId}</span>}
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </>
        )}

        <a
          href={earthChemUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950/60 text-amber-300 border border-amber-800/50 hover:bg-amber-900/60 transition-colors"
          title={`View ${name} geochemical datasets on EarthChem / PetDB`}
        >
          <span>EarthChem</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>
    );
  }

  return (
    <div className="bg-stone-950/90 border border-stone-800 rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between border-b border-stone-850 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Globe className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-xs font-bold text-stone-200 uppercase tracking-wider">
            Verified External Database Cross-References
          </h4>
        </div>
        <span className="text-[10px] text-stone-500 font-mono">
          Global Petrology &amp; Mineralogy Repositories
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Mindat.org */}
        <div className="p-3 bg-stone-900/80 border border-stone-800 rounded-lg flex flex-col justify-between hover:border-blue-700/50 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                Mindat.org
              </span>
              {databaseRefs?.mindatId && (
                <span className="px-1.5 py-0.2 bg-blue-950 text-blue-300 text-[10px] rounded font-mono border border-blue-800/50">
                  ID: #{databaseRefs.mindatId}
                </span>
              )}
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed mb-2">
              World&apos;s leading open database for minerals, localities, crystal optics, and peer-reviewed IMA status.
            </p>
            {databaseRefs?.imaSymbol && (
              <div className="text-[10px] text-stone-400 mb-1">
                <span className="text-stone-500 font-medium">IMA Symbol:</span>{' '}
                <span className="font-mono text-stone-200 font-bold">{databaseRefs.imaSymbol}</span>
              </div>
            )}
            {databaseRefs?.typeLocality && (
              <div className="text-[10px] text-stone-400 truncate mb-1">
                <span className="text-stone-500 font-medium">Classic Locality:</span>{' '}
                <span className="text-stone-300">{databaseRefs.typeLocality}</span>
              </div>
            )}
          </div>
          <a
            href={mindatUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 pt-2 border-t border-stone-800/60"
          >
            <span>Open in Mindat.org</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Webmineral */}
        {!isRock ? (
          <div className="p-3 bg-stone-900/80 border border-stone-800 rounded-lg flex flex-col justify-between hover:border-emerald-700/50 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Webmineral
                </span>
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed mb-2">
                Standard mineral taxonomy referencing both Dana System of Mineralogy and Strunz Classifications.
              </p>
              {databaseRefs?.danaClassification && (
                <div className="text-[10px] text-stone-400 mb-1">
                  <span className="text-stone-500 font-medium">Dana Class:</span>{' '}
                  <span className="font-mono text-emerald-300">{databaseRefs.danaClassification}</span>
                </div>
              )}
              {databaseRefs?.strunzClassification && (
                <div className="text-[10px] text-stone-400 mb-1">
                  <span className="text-stone-500 font-medium">Strunz Code:</span>{' '}
                  <span className="font-mono text-emerald-300">{databaseRefs.strunzClassification}</span>
                </div>
              )}
            </div>
            <a
              href={webmineralUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 pt-2 border-t border-stone-800/60"
            >
              <span>Explore on Webmineral</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ) : (
          <div className="p-3 bg-stone-900/80 border border-stone-800 rounded-lg flex flex-col justify-between hover:border-emerald-700/50 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" />
                  GEOROC Digis Database
                </span>
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed mb-2">
                Max Planck Institute DIGIS geochemical database for volcanic and plutonic rocks of the oceanic and continental realms.
              </p>
              <div className="text-[10px] text-stone-400 mb-1">
                <span className="text-stone-500 font-medium">Domain:</span>{' '}
                <span className="text-stone-300">Global Geochemistry of Rocks of the Oceans and Continents</span>
              </div>
            </div>
            <a
              href={georocUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 pt-2 border-t border-stone-800/60"
            >
              <span>Access GEOROC Portal</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* RRUFF Database */}
        {!isRock && (
          <div className="p-3 bg-stone-900/80 border border-stone-800 rounded-lg flex flex-col justify-between hover:border-purple-700/50 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                  <Atom className="w-3.5 h-3.5" />
                  RRUFF Project
                </span>
                {databaseRefs?.rruffId && (
                  <span className="px-1.5 py-0.2 bg-purple-950 text-purple-300 text-[10px] rounded font-mono border border-purple-800/50">
                    Sample: {databaseRefs.rruffId}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed mb-2">
                University of Arizona definitive spectral library containing unoriented single-crystal Raman, infrared &amp; X-ray diffraction.
              </p>
              {databaseRefs?.rruffSpaceGroup && (
                <div className="text-[10px] text-stone-400 mb-1">
                  <span className="text-stone-500 font-medium">Space Group:</span>{' '}
                  <span className="font-mono text-purple-300 font-bold">{databaseRefs.rruffSpaceGroup}</span>
                </div>
              )}
              {databaseRefs?.rruffCellParameters && (
                <div className="text-[10px] text-stone-400 font-mono text-[9px] text-stone-300 mb-1 truncate">
                  {databaseRefs.rruffCellParameters}
                </div>
              )}
            </div>
            <a
              href={rruffUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 pt-2 border-t border-stone-800/60"
            >
              <span>View Raman &amp; XRD on RRUFF</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* EarthChem / PetDB */}
        <div className="p-3 bg-stone-900/80 border border-stone-800 rounded-lg flex flex-col justify-between hover:border-amber-700/50 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" />
                EarthChem &amp; PetDB
              </span>
              {databaseRefs?.earthChemId && (
                <span className="px-1.5 py-0.2 bg-amber-950 text-amber-300 text-[10px] rounded font-mono border border-amber-800/50 truncate max-w-[120px]">
                  {databaseRefs.earthChemId}
                </span>
              )}
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed mb-2">
              Interdisciplinary Earth Data Alliance (IEDA) global geochemical repository curated by Columbia University.
            </p>
            {databaseRefs?.earthchemSetting && (
              <div className="text-[10px] text-stone-400 mb-1">
                <span className="text-stone-500 font-medium">Tectonic Environment:</span>{' '}
                <span className="text-amber-200/90">{databaseRefs.earthchemSetting}</span>
              </div>
            )}
          </div>
          <a
            href={earthChemUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 pt-2 border-t border-stone-800/60"
          >
            <span>Search EarthChem Data</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
