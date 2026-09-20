/**
 * GEOROC-derived reference library.
 *
 * The bundled curated datasets (`ROCKS_DATASET`, `MINERALS_DATASET`) are a
 * few dozen hand-written compositions. This module loads a far larger library
 * built offline from the staged GEOROC extracts by `scripts/ingest-georoc.mjs`
 * — hundreds of thousands of real analyses, reduced to a per-name
 * distribution (n, p10/p25/p50/p75/p90 per oxide).
 *
 * The JSON is fetched at runtime from `public/data/`, never imported, so it
 * stays out of the main bundle. It is precached by the service worker, so
 * offline field use keeps the full library.
 *
 * Matching uses the median as the reference composition and the p10-p90 band
 * as the observed range, which is why a match can report "within the observed
 * range of N analyses" rather than "close to one hand-picked number".
 */

import {
  MineralGroup,
  MineralReference,
  OxideComposition,
  RockClass,
  RockReference,
} from '../types/geochem';

interface OxideStats {
  n: number;
  p10?: number;
  p25?: number;
  p50?: number;
  p75?: number;
  p90?: number;
}

interface GeorocEntry {
  name: string;
  n: number;
  oxides: Record<string, OxideStats>;
  tectonicSettings: Array<{ value: string; n: number }>;
  groupTags: Array<{ value: string; n: number }>;
  variants?: Array<{ value: string; n: number }>;
}

interface GeorocFile {
  kind: string;
  entries: GeorocEntry[];
}

export interface GeorocManifest {
  generated: string;
  source: string;
  license: string;
  method: string;
  minimumGroupSize: number;
  datasets: Record<string, { rows: number; accepted: number; groups: number }>;
}

/** Extra provenance carried on every GEOROC-derived reference. */
export interface GeorocProvenance {
  /** Number of analyses the distribution was built from. */
  analyses: number;
  /** Mineralogical variants folded into this root, e.g. "OLIVINE" basalt. */
  variants: Array<{ value: string; n: number }>;
  /** Per-oxide percentile statistics, for the "why this match" panel. */
  stats: Record<string, OxideStats>;
  tectonicSettings: Array<{ value: string; n: number }>;
}

const ROCK_CLASS_BY_TAG: Record<string, RockClass> = {
  vol: 'Igneous Volcanic',
  plu: 'Igneous Plutonic',
  per: 'Ultramafic / Mantle',
  met: 'Metamorphic',
  sed: 'Sedimentary',
};

/** Title-cases a GEOROC upper-case name: "ALKALI BASALT" -> "Alkali Basalt". */
function titleCase(name: string): string {
  return name
    .toLowerCase()
    .replace(/(^|[\s\-/(])([a-z])/g, (_, p, c) => p + c.toUpperCase());
}

function medians(oxides: Record<string, OxideStats>, key: 'p10' | 'p50' | 'p90'): OxideComposition {
  const out: OxideComposition = {};
  for (const [ox, s] of Object.entries(oxides)) {
    const v = s[key];
    if (typeof v === 'number') out[ox] = v;
  }
  // Iron is compared as total iron; leave FeO/Fe2O3 out so a partial median
  // of each cannot be double counted against FeOT.
  delete out.FeO;
  delete out.Fe2O3;
  return out;
}

function toRockReference(e: GeorocEntry): RockReference {
  const tag = e.groupTags[0]?.value ?? '';
  const category = ROCK_CLASS_BY_TAG[tag] ?? 'Igneous Volcanic';
  const setting = e.tectonicSettings[0]?.value;

  return {
    id: `georoc-rock-${e.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name: titleCase(e.name),
    category,
    meanOxides: medians(e.oxides, 'p50'),
    minOxides: medians(e.oxides, 'p10'),
    maxOxides: medians(e.oxides, 'p90'),
    description:
      `Median composition of ${e.n.toLocaleString()} GEOROC analyses; the quoted range is the ` +
      `10th-90th percentile of that population.` +
      (e.variants?.length
        ? ` Includes petrographic variants (${e.variants.slice(0, 3).map((v) => v.value.toLowerCase()).join(', ')}), which are mineralogical rather than chemical distinctions.`
        : ''),
    keyMinerals: [],
    typicalTectonicSetting: setting ? titleCase(setting) : undefined,
    georocCode: e.name,
    source: 'GEOROC',
    georoc: {
      analyses: e.n,
      variants: e.variants ?? [],
      stats: e.oxides,
      tectonicSettings: e.tectonicSettings,
    },
  } as RockReference & { source: string; georoc: GeorocProvenance };
}

const MINERAL_GROUP_BY_TAG: Record<string, MineralGroup> = {
  olivines: 'Nesosilicate',
  garnets: 'Nesosilicate',
  zircons: 'Nesosilicate',
  titanites: 'Nesosilicate',
  clinopyroxenes: 'Inosilicate',
  orthopyroxenes: 'Inosilicate',
  pyroxenes: 'Inosilicate',
  amphiboles: 'Inosilicate',
  feldspars: 'Tectosilicate',
  feldspathoides: 'Tectosilicate',
  quartz: 'Tectosilicate',
  mica: 'Phyllosilicate',
  clay_minerals: 'Phyllosilicate',
  spinels: 'Oxide',
  ilmenites: 'Oxide',
  perovskites: 'Oxide',
  carbonates: 'Carbonate',
  apatites: 'Phosphate',
  chalcogenides: 'Sulfide',
};

function toMineralReference(e: GeorocEntry): MineralReference {
  const tag = e.groupTags[0]?.value ?? '';
  return {
    id: `georoc-min-${e.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name: titleCase(e.name),
    formula: 'Natural composition (GEOROC EPMA population)',
    group: MINERAL_GROUP_BY_TAG[tag] ?? 'Nesosilicate',
    crystalSystem: 'Not specified',
    idealOxides: medians(e.oxides, 'p50'),
    typicalRange: {
      min: medians(e.oxides, 'p10'),
      max: medians(e.oxides, 'p90'),
    },
    description: `Median of ${e.n.toLocaleString()} GEOROC microprobe analyses. The quoted range is the 10th-90th percentile of that population, so it reflects real solid-solution spread rather than an ideal formula.`,
    source: 'GEOROC',
    georoc: {
      analyses: e.n,
      variants: e.variants ?? [],
      stats: e.oxides,
      tectonicSettings: e.tectonicSettings,
    },
  } as MineralReference & { source: string; georoc: GeorocProvenance };
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

let georocRocks: RockReference[] = [];
let georocMinerals: MineralReference[] = [];
let manifest: GeorocManifest | null = null;
let state: 'idle' | 'loading' | 'ready' | 'error' = 'idle';
let lastError: string | null = null;

const listeners = new Set<() => void>();
function notify() {
  for (const l of listeners) l();
}

/** Subscribe to library changes; returns an unsubscribe function. */
export function subscribeToLibrary(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getGeorocRocks(): RockReference[] {
  return georocRocks;
}
export function getGeorocMinerals(): MineralReference[] {
  return georocMinerals;
}
export function getGeorocManifest(): GeorocManifest | null {
  return manifest;
}
export function getLibraryState() {
  return {
    state,
    error: lastError,
    rockGroups: georocRocks.length,
    mineralGroups: georocMinerals.length,
    analyses:
      (manifest?.datasets?.rocks?.accepted ?? 0) + (manifest?.datasets?.minerals?.accepted ?? 0),
  };
}

/**
 * Loads the GEOROC library. Safe to call repeatedly; only the first call does
 * work. Failure is non-fatal — the app keeps running on the curated dataset.
 */
export async function loadGeorocLibrary(): Promise<void> {
  if (state === 'loading' || state === 'ready') return;
  state = 'loading';
  notify();

  const base = import.meta.env.BASE_URL || '/';
  try {
    const [rocksRes, minsRes, manRes] = await Promise.all([
      fetch(`${base}data/georoc-rocks.json`),
      fetch(`${base}data/georoc-minerals.json`),
      fetch(`${base}data/georoc-manifest.json`),
    ]);
    if (!rocksRes.ok || !minsRes.ok) {
      throw new Error(`Reference library not available (HTTP ${rocksRes.status}/${minsRes.status}).`);
    }
    const rocks: GeorocFile = await rocksRes.json();
    const mins: GeorocFile = await minsRes.json();
    manifest = manRes.ok ? await manRes.json() : null;

    georocRocks = rocks.entries.map(toRockReference);
    georocMinerals = mins.entries.map(toMineralReference);
    state = 'ready';
    lastError = null;
  } catch (err) {
    state = 'error';
    lastError = err instanceof Error ? err.message : String(err);
    georocRocks = [];
    georocMinerals = [];
    console.warn('GEOROC reference library unavailable; using the curated dataset only.', lastError);
  }
  notify();
}

/** Test seam: inject a library without fetching. */
export function __setGeorocLibraryForTests(
  rocks: RockReference[],
  minerals: MineralReference[]
): void {
  georocRocks = rocks;
  georocMinerals = minerals;
  state = rocks.length || minerals.length ? 'ready' : 'idle';
  notify();
}
