#!/usr/bin/env node
/**
 * Builds RockMin ID's reference library from the FULL GEOROC precompiled
 * archives (the files GEOROC publishes directly, not the staged extracts).
 *
 *   node scripts/ingest-georoc-raw.mjs --src ../georoc-raw
 *
 * Expects:
 *   <src>/rocks/*.csv      one file per rock type, e.g. ..._KOMATIITE.csv
 *   <src>/minerals/*.csv   one file per mineral group, e.g. ..._OLIVINES.csv
 *
 * Run offline; commit only the derived JSON. The source archives (~2.8 GB
 * uncompressed) must never enter the repository or the client bundle.
 *
 * Why this replaces the staged ingester
 * -------------------------------------
 * 1. GEOROC names each precompiled file after the rock type it contains, so
 *    the FILE NAME is an authoritative grouping key curated by GEOROC. The
 *    free-text ROCK NAME column inside the file is messier and fragments
 *    badly. Names recorded in that column are kept as variants.
 * 2. The full archives carry BaO and SrO, which the staged extracts dropped,
 *    and every analysis rather than the first 6,000 rows per mineral group.
 * 3. Columns are addressed by header name, so the positional mis-alignment
 *    that affects the staged files cannot occur.
 *
 * Rows are read with a real streaming CSV parser: GEOROC files contain
 * quoted fields with embedded newlines, and each one ends with a
 * bibliography block that is not tabular at all.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsvRows } from './lib/csv-stream.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const arg = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const SRC = path.resolve(ROOT, arg('src', '../georoc-raw'));
const OUT = path.resolve(ROOT, arg('out', 'public/data'));
const MIN_N = Number(arg('min-n', 30));
// 'rocks', 'minerals', or 'both' (default). Lets a long run be resumed.
const ONLY = arg('only', 'both');

/** Header name in the GEOROC file -> oxide key used by the app. */
const OXIDE_HEADERS = {
  'SIO2(WT%)': 'SiO2',
  'TIO2(WT%)': 'TiO2',
  'AL2O3(WT%)': 'Al2O3',
  'CR2O3(WT%)': 'Cr2O3',
  'FE2O3(WT%)': 'Fe2O3',
  'FEO(WT%)': 'FeO',
  'FEOT(WT%)': 'FeOT',
  'FE2O3T(WT%)': 'Fe2O3T',
  'CAO(WT%)': 'CaO',
  'MGO(WT%)': 'MgO',
  'MNO(WT%)': 'MnO',
  'NIO(WT%)': 'NiO',
  'K2O(WT%)': 'K2O',
  'NA2O(WT%)': 'Na2O',
  'P2O5(WT%)': 'P2O5',
  'BAO(WT%)': 'BaO',
  'SRO(WT%)': 'SrO',
  'LOI(WT%)': 'LOI',
  'H2O(WT%)': 'H2O',
  'CO2(WT%)': 'CO2',
};

/** Oxides that count toward the major-element total. */
const MAJORS = [
  'SiO2', 'TiO2', 'Al2O3', 'Cr2O3', 'MnO', 'MgO', 'CaO',
  'Na2O', 'K2O', 'P2O5', 'NiO', 'BaO', 'SrO',
];

const FE2O3_TO_FEO = 0.8998;

function num(v) {
  if (v == null) return undefined;
  const s = String(v).trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n < 100 ? n : undefined;
}

function totalIronAsFeO(rec) {
  const feo = num(rec.FeO);
  const fe2o3 = num(rec.Fe2O3);
  if (feo !== undefined || fe2o3 !== undefined) return (feo ?? 0) + FE2O3_TO_FEO * (fe2o3 ?? 0);
  const feot = num(rec.FeOT);
  if (feot !== undefined) return feot;
  const fe2o3t = num(rec.Fe2O3T);
  if (fe2o3t !== undefined) return FE2O3_TO_FEO * fe2o3t;
  return undefined;
}

function analyticalTotal(rec) {
  let t = 0;
  for (const ox of MAJORS) t += num(rec[ox]) ?? 0;
  const feo = num(rec.FeO);
  const fe2o3 = num(rec.Fe2O3);
  if (feo !== undefined || fe2o3 !== undefined) t += (feo ?? 0) + (fe2o3 ?? 0);
  else {
    const feot = num(rec.FeOT);
    if (feot !== undefined) t += feot;
    else t += num(rec.Fe2O3T) ?? 0;
  }
  return t;
}

/** "2026-09-2JETOA_THOLEIITIC_BASALT_part2.csv" -> "THOLEIITIC BASALT" */
function groupFromFilename(file) {
  let n = path.basename(file, '.csv');
  n = n.replace(/^[\d-]+[A-Z0-9]*_/i, '');      // strip the GEOROC date/run prefix
  n = n.replace(/_part\d+$/i, '');               // strip the split suffix
  return n.replace(/_/g, ' ').trim().toUpperCase();
}

const NOT_A_NAME = new Set(['', 'NOT GIVEN', 'UNKNOWN', 'N/A', 'NA', 'UNSPECIFIED', 'OTHER']);

/** GEOROC spellings that are awkward to read as-is. */
const NAME_FIXES = new Map([
  ['(AL)KALIFELDSPAR', 'ALKALI FELDSPAR'],
  ['KALIFELDSPAR', 'ALKALI FELDSPAR'],
  ['TITANITE (SPHENE)', 'TITANITE'],
]);

/** Strips "[12345]" citations and takes the first real alternative. */
function cleanValue(raw) {
  if (!raw) return '';
  const s = raw.replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
  for (const part of s.split('/')) {
    const p = part.trim();
    if (p && !NOT_A_NAME.has(p)) return p;
  }
  return '';
}

function percentile(sorted, p) {
  if (!sorted.length) return undefined;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i), hi = Math.ceil(i);
  const v = lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
  return Number(v.toFixed(3));
}

function summarize(values) {
  const s = values.slice().sort((a, b) => a - b);
  return {
    n: s.length,
    p10: percentile(s, 0.1), p25: percentile(s, 0.25), p50: percentile(s, 0.5),
    p75: percentile(s, 0.75), p90: percentile(s, 0.9),
  };
}

const topCounts = (m, k) =>
  [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([value, n]) => ({ value, n }));

const ALL_OXIDES = [...new Set(Object.values(OXIDE_HEADERS))].filter((o) => o !== 'H2O' && o !== 'LOI' && o !== 'CO2');

async function ingest(kind) {
  const dir = path.join(SRC, kind);
  if (!fs.existsSync(dir)) throw new Error(`Missing source directory: ${dir}`);
  const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.csv')).sort();
  if (!files.length) throw new Error(`No CSV files in ${dir}`);

  const groups = new Map();
  const stats = {
    files: files.length, rows: 0, nonTabular: 0, rejectedMaterial: 0,
    rejectedSparse: 0, rejectedTotal: 0, rejectedName: 0, accepted: 0,
  };

  for (const file of files) {
    const full = path.join(dir, file);
    const fileGroup = groupFromFilename(file);
    let header = null;
    let idx = null;
    let localRows = 0;

    for await (const row of readCsvRows(full)) {
      if (!header) {
        header = row.map((h) => h.trim().toUpperCase());
        idx = {};
        for (const [hName, ox] of Object.entries(OXIDE_HEADERS)) {
          const i = header.indexOf(hName);
          if (i >= 0) idx[ox] = i;
        }
        idx.__name = header.indexOf(kind === 'minerals' ? 'MINERAL' : 'ROCK NAME');
        idx.__material = header.indexOf('MATERIAL');
        idx.__setting = header.indexOf('TECTONIC SETTING');
        idx.__rockName = header.indexOf('ROCK NAME');
        continue;
      }

      stats.rows++;
      localRows++;
      // The bibliography block after the data is not tabular.
      if (row.length !== header.length) { stats.nonTabular++; continue; }

      const rec = {};
      for (const [ox, i] of Object.entries(idx)) {
        if (!ox.startsWith('__')) rec[ox] = row[i];
      }

      if (kind === 'rocks') {
        const mat = cleanValue(idx.__material >= 0 ? row[idx.__material] : '');
        // WR = whole rock, GL = volcanic glass. Anything else (inclusions,
        // mineral separates, leachates) is not a whole-rock analysis.
        if (mat && !(mat.startsWith('WR') || mat.startsWith('GL'))) {
          stats.rejectedMaterial++; continue;
        }
      }

      const present = ALL_OXIDES.filter((o) => num(rec[o]) !== undefined).length;
      if (present < (kind === 'minerals' ? 4 : 6)) { stats.rejectedSparse++; continue; }

      const total = analyticalTotal(rec);
      if (total < 97 || total > 103) { stats.rejectedTotal++; continue; }

      // Rocks group by GEOROC's own file name; minerals by the MINERAL
      // column, falling back to the file's group.
      let name = NAME_FIXES.get(fileGroup) ?? fileGroup;
      if (kind === 'minerals') {
        const m = cleanValue(idx.__name >= 0 ? row[idx.__name] : '');
        const root = m.split(',')[0].trim();
        if (root && !NOT_A_NAME.has(root) && root.length <= 40) name = NAME_FIXES.get(root) ?? root;
      }
      if (!name) { stats.rejectedName++; continue; }

      let g = groups.get(name);
      if (!g) {
        g = {
          name, n: 0,
          values: Object.fromEntries(ALL_OXIDES.map((o) => [o, []])),
          feot: [], settings: new Map(), variants: new Map(), hostRocks: new Map(),
          fileGroups: new Map(),
        };
        groups.set(name, g);
      }
      g.n++;
      for (const ox of ALL_OXIDES) {
        const v = num(rec[ox]);
        if (v !== undefined) g.values[ox].push(v);
      }
      const fe = totalIronAsFeO(rec);
      if (fe !== undefined) g.feot.push(fe);

      if (idx.__setting >= 0) {
        const s = cleanValue(row[idx.__setting]);
        if (s) g.settings.set(s, (g.settings.get(s) || 0) + 1);
      }
      if (kind === 'rocks' && idx.__rockName >= 0) {
        const rn = cleanValue(row[idx.__rockName]);
        const mods = rn.split(',').slice(1).map((x) => x.trim()).filter(Boolean);
        for (const m of mods) g.variants.set(m, (g.variants.get(m) || 0) + 1);
      } else if (kind === 'minerals' && idx.__rockName >= 0) {
        const hr = cleanValue(row[idx.__rockName]).split(',')[0].trim();
        if (hr) g.hostRocks.set(hr, (g.hostRocks.get(hr) || 0) + 1);
      }
      g.fileGroups.set(fileGroup, (g.fileGroups.get(fileGroup) || 0) + 1);

      stats.accepted++;
    }
    process.stderr.write(`  ${file}: ${localRows} rows (${stats.accepted} accepted so far)\n`);
  }

  const entries = [...groups.values()]
    .filter((g) => g.n >= MIN_N)
    .sort((a, b) => b.n - a.n)
    .map((g) => {
      const oxides = {};
      for (const ox of ALL_OXIDES) {
        // Require the oxide to be reported for a decent share of the group,
        // otherwise its percentiles describe a biased sub-population.
        if (g.values[ox].length >= Math.max(10, g.n * 0.25)) oxides[ox] = summarize(g.values[ox]);
      }
      if (g.feot.length >= Math.max(10, g.n * 0.25)) oxides.FeOT = summarize(g.feot);
      delete oxides.Fe2O3T;
      return {
        name: g.name,
        n: g.n,
        oxides,
        tectonicSettings: topCounts(g.settings, 4),
        groupTags: topCounts(g.fileGroups, 3),
        variants: topCounts(g.variants, 6),
        hostRocks: topCounts(g.hostRocks, 5),
      };
    });

  return { entries, stats };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const manifest = {
    generated: new Date().toISOString().slice(0, 10),
    source: 'GEOROC precompiled archives (DIGIS, Georg-August-Universitaet Goettingen)',
    sourceKind: 'full-archive',
    license:
      'GEOROC data are provided under the DIGIS/GEOROC data policy. Users must cite ' +
      'GEOROC and the original publications for any analysis used.',
    method:
      'Per-group distributions (n, p10/p25/p50/p75/p90) of major oxides. Rocks are grouped by ' +
      "GEOROC's own precompiled file name; minerals by the MINERAL column. Rows filtered to " +
      'whole-rock or glass material (rocks), a 97-103 wt% major-oxide total counting iron once, ' +
      'and at least 6 (rocks) or 4 (minerals) reported oxides.',
    minimumGroupSize: MIN_N,
    parser:
      'Streaming RFC 4180 reader; GEOROC files contain quoted fields with embedded newlines and ' +
      'a trailing bibliography block, both of which defeat line-based parsing.',
    datasets: {},
  };

  const kinds = ONLY === 'both' ? ['rocks', 'minerals'] : [ONLY];
  // Preserve the other dataset's manifest entry when only one kind is run.
  const manifestPath = path.join(OUT, 'georoc-manifest.json');
  if (ONLY !== 'both' && fs.existsSync(manifestPath)) {
    try {
      const prev = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      manifest.datasets = { ...prev.datasets };
    } catch { /* start fresh */ }
  }

  for (const kind of kinds) {
    process.stderr.write(`\nIngesting ${kind} from ${path.join(SRC, kind)}\n`);
    const t0 = Date.now();
    const { entries, stats } = await ingest(kind);
    const file = path.join(OUT, `georoc-${kind}.json`);
    fs.writeFileSync(file, JSON.stringify({ kind, entries }));
    const bytes = fs.statSync(file).size;
    manifest.datasets[kind] = { ...stats, groups: entries.length, bytes };
    process.stderr.write(
      `  -> ${entries.length} groups from ${stats.accepted}/${stats.rows} rows, ` +
        `${(bytes / 1024).toFixed(0)} kB, ${((Date.now() - t0) / 1000).toFixed(0)}s\n`
    );
    console.log(`${kind}:`, JSON.stringify(stats));
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  process.stderr.write(`\nWrote ${OUT}\n`);
}

main().catch((e) => {
  console.error(e.stack || e.message);
  process.exit(1);
});
