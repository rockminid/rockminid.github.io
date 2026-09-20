#!/usr/bin/env node
/**
 * Builds RockMin ID's reference library from the staged GEOROC extracts.
 *
 * Run offline; commit only the derived JSON. The source CSVs (~210 MB) must
 * never enter the repository or the client bundle — `.gitignore` excludes
 * them, and the manifest written here records exactly what they were.
 *
 *   node scripts/ingest-georoc.mjs --src "../RockMin_Improvement steps/data"
 *
 * What it produces
 * ----------------
 * For every rock name and mineral species with enough surviving analyses, a
 * distribution rather than a single "typical" composition: n, and the 10th,
 * 25th, 50th, 75th and 90th percentile of each major oxide. Medians and
 * percentiles are used because geochemical data are skewed and carry
 * outliers; a mean would be dragged around by both.
 *
 * KNOWN DEFECT IN THE STAGED CSVs
 * -------------------------------
 * Every staged file declares a 45-column header but writes only 39 columns
 * per row. The six volatile columns (H2O, CO2, F, Cl, SO3, S) are named in
 * the header and never emitted, so a naive header-based parse silently maps
 * `fe_basis` into `H2O_wt_pct`, `FeO_equiv_wt_pct` into `CO2_wt_pct` and
 * `major_oxide_total_wt_pct` into `F_wt_pct`. This script detects the row
 * width and remaps explicitly, and refuses to run if it sees a shape it does
 * not recognise.
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// --- CLI ------------------------------------------------------------------
const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}
const SRC = path.resolve(ROOT, arg('src', '../RockMin_Improvement steps/data'));
const OUT = path.resolve(ROOT, arg('out', 'public/data'));
const MIN_N = Number(arg('min-n', 25));

// --- Column layout --------------------------------------------------------

/** The 39 columns the staged files actually write, in order. */
const ACTUAL_COLUMNS = [
  'source_record_id', 'source_file', 'source_db', 'record_type', 'material_type',
  'citation', 'sample_name', 'tectonic_setting', 'location',
  'latitude_min', 'latitude_max', 'longitude_min', 'longitude_max',
  'rock_name', 'geol', 'age_text', 'rock_texture', 'rock_type', 'alteration',
  'mineral', 'material',
  'SiO2', 'TiO2', 'Al2O3', 'Cr2O3', 'Fe2O3', 'FeO', 'FeOT', 'CaO', 'MgO',
  'MnO', 'NiO', 'K2O', 'Na2O', 'P2O5', 'LOI',
  'fe_basis', 'FeO_equiv', 'major_oxide_total',
];

/** Mineral files use the same widths but a few different label columns. */
const ACTUAL_COLUMNS_MIN = [
  'source_record_id', 'source_file', 'source_db', 'record_type', 'mineral_group',
  'citation', 'sample_name', 'tectonic_setting', 'location',
  'latitude_min', 'latitude_max', 'longitude_min', 'longitude_max',
  'rock_name', 'alteration', 'mineral', 'spot', 'crystal', 'rim_core',
  'grain_size', 'primary_secondary',
  'SiO2', 'TiO2', 'Al2O3', 'Cr2O3', 'Fe2O3', 'FeO', 'FeOT', 'CaO', 'MgO',
  'MnO', 'NiO', 'K2O', 'Na2O', 'P2O5', 'LOI',
  'fe_basis', 'FeO_equiv', 'major_oxide_total',
];

const OXIDES = [
  'SiO2', 'TiO2', 'Al2O3', 'Fe2O3', 'FeO', 'FeOT', 'MnO', 'MgO',
  'CaO', 'Na2O', 'K2O', 'P2O5', 'Cr2O3', 'NiO',
];

// --- CSV --------------------------------------------------------------------

/** Minimal RFC4180 line splitter (quoted fields, doubled quotes). */
function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

// --- Cleaning ---------------------------------------------------------------

const NOT_A_NAME = new Set([
  '', 'NOT GIVEN', 'UNKNOWN', 'N/A', 'NA', 'UNSPECIFIED', 'OTHER', 'UNDIFFERENTIATED',
]);

/**
 * GEOROC names carry bibliographic references and sometimes several
 * alternatives: "ANDESITE [13695] / NOT GIVEN [11543]". Strip the citations,
 * take the first real alternative, and normalize case and spacing.
 *
 * GEOROC also uses a "ROOT, MODIFIER" convention for mineralogical variants:
 * "GRANODIORITE, BIOTITE", "BASALT, OLIVINE", "LHERZOLITE, SPINEL, XENOLITH".
 * Those modifiers are petrographic, not chemical, so the variants are
 * aggregated into their root and the modifiers kept as metadata. Splitting
 * them out instead fragments the library: eighteen near-identical
 * granodiorite/tonalite/dacite variants all sit at 63-69 wt% SiO2 and crowd
 * each other out of the candidate list without adding any information a
 * chemical classifier can act on.
 */
function cleanName(raw) {
  if (!raw) return { root: '', modifiers: [] };
  const noCites = raw.replace(/\[[^\]]*\]/g, ' ');
  for (const part of noCites.split('/')) {
    const n = part.replace(/\s+/g, ' ').trim().toUpperCase();
    if (!n || NOT_A_NAME.has(n)) continue;
    const [root, ...mods] = n.split(',').map((x) => x.trim()).filter(Boolean);
    if (!root || NOT_A_NAME.has(root)) continue;
    return { root, modifiers: mods };
  }
  return { root: '', modifiers: [] };
}

function num(v) {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n < 100 ? n : undefined;
}

/** Same iron convention as the app: components win, a total is never added on top. */
const FE2O3_TO_FEO = 0.8998;
function totalIronAsFeO(rec) {
  const feo = num(rec.FeO);
  const fe2o3 = num(rec.Fe2O3);
  if (feo !== undefined || fe2o3 !== undefined) {
    return (feo ?? 0) + FE2O3_TO_FEO * (fe2o3 ?? 0);
  }
  const feot = num(rec.FeOT);
  if (feot !== undefined) return feot;
  return undefined;
}

/** Major-oxide total, counting iron exactly once. */
function analyticalTotal(rec) {
  let t = 0;
  for (const ox of OXIDES) {
    if (ox === 'FeO' || ox === 'Fe2O3' || ox === 'FeOT') continue;
    t += num(rec[ox]) ?? 0;
  }
  const feo = num(rec.FeO);
  const fe2o3 = num(rec.Fe2O3);
  if (feo !== undefined || fe2o3 !== undefined) t += (feo ?? 0) + (fe2o3 ?? 0);
  else t += num(rec.FeOT) ?? 0;
  return t;
}

// --- Aggregation ------------------------------------------------------------

function percentile(sorted, p) {
  if (!sorted.length) return undefined;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  const v = lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
  return Number(v.toFixed(3));
}

function summarize(values) {
  const s = values.slice().sort((a, b) => a - b);
  return {
    n: s.length,
    p10: percentile(s, 0.1),
    p25: percentile(s, 0.25),
    p50: percentile(s, 0.5),
    p75: percentile(s, 0.75),
    p90: percentile(s, 0.9),
  };
}

function topCounts(counter, k) {
  return [...counter.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([v, n]) => ({ value: v, n }));
}

// --- Main -------------------------------------------------------------------

async function ingest(kind) {
  const dir = path.join(SRC, kind);
  if (!fs.existsSync(dir)) {
    throw new Error(`Source directory not found: ${dir}`);
  }
  const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.csv')).sort();
  if (!files.length) throw new Error(`No CSV files in ${dir}`);

  const cols = kind === 'minerals' ? ACTUAL_COLUMNS_MIN : ACTUAL_COLUMNS;
  const groups = new Map();
  const stats = {
    files: files.length, rows: 0, rejectedShape: 0, rejectedName: 0,
    rejectedMaterial: 0, rejectedTotal: 0, rejectedSparse: 0, accepted: 0,
  };

  for (const file of files) {
    const rl = readline.createInterface({
      input: fs.createReadStream(path.join(dir, file), { encoding: 'utf8' }),
      crlfDelay: Infinity,
    });
    let headerSeen = false;

    for await (const line of rl) {
      if (!line.trim()) continue;
      if (!headerSeen) {
        headerSeen = true;
        const h = splitCsvLine(line.replace(/^﻿/, ''));
        if (h.length !== 45) {
          throw new Error(
            `${file}: expected the known 45-column header, saw ${h.length}. ` +
              `The staged export format has changed; re-check the column mapping before trusting this ingest.`
          );
        }
        continue;
      }

      stats.rows++;
      const f = splitCsvLine(line);
      if (f.length !== cols.length) { stats.rejectedShape++; continue; }

      const rec = {};
      for (let i = 0; i < cols.length; i++) rec[cols[i]] = f[i];

      // --- filters ---
      if (kind === 'rocks') {
        const mt = (rec.material_type || '').trim();
        if (mt !== 'whole_rock' && mt !== 'volcanic_glass') { stats.rejectedMaterial++; continue; }
      }

      const { root: name, modifiers } = cleanName(kind === 'minerals' ? rec.mineral : rec.rock_name);
      if (!name || name.length > 60) { stats.rejectedName++; continue; }

      const present = OXIDES.filter((o) => num(rec[o]) !== undefined).length;
      if (present < (kind === 'minerals' ? 4 : 6)) { stats.rejectedSparse++; continue; }

      const total = analyticalTotal(rec);
      if (total < 97 || total > 103) { stats.rejectedTotal++; continue; }

      // --- accumulate ---
      let g = groups.get(name);
      if (!g) {
        g = {
          name,
          values: Object.fromEntries(OXIDES.map((o) => [o, []])),
          feot: [],
          settings: new Map(),
          groupTag: new Map(),
          variants: new Map(),
          n: 0,
        };
        groups.set(name, g);
      }
      g.n++;
      for (const ox of OXIDES) {
        const v = num(rec[ox]);
        if (v !== undefined) g.values[ox].push(v);
      }
      const fe = totalIronAsFeO(rec);
      if (fe !== undefined) g.feot.push(fe);

      const setting = (rec.tectonic_setting || '').trim().toUpperCase();
      if (setting) g.settings.set(setting, (g.settings.get(setting) || 0) + 1);
      const tag = (kind === 'minerals' ? rec.mineral_group : rec.rock_type || '').trim().toLowerCase();
      if (tag) g.groupTag.set(tag, (g.groupTag.get(tag) || 0) + 1);
      for (const m of modifiers) g.variants.set(m, (g.variants.get(m) || 0) + 1);

      stats.accepted++;
    }
    process.stderr.write(`  ${kind}/${file}: ${stats.rows} rows seen\n`);
  }

  const entries = [...groups.values()]
    .filter((g) => g.n >= MIN_N)
    .sort((a, b) => b.n - a.n)
    .map((g) => {
      const oxides = {};
      for (const ox of OXIDES) {
        if (g.values[ox].length >= Math.max(10, g.n * 0.25)) {
          oxides[ox] = summarize(g.values[ox]);
        }
      }
      if (g.feot.length >= Math.max(10, g.n * 0.25)) oxides.FeOT = summarize(g.feot);
      return {
        name: g.name,
        n: g.n,
        oxides,
        tectonicSettings: topCounts(g.settings, 4),
        groupTags: topCounts(g.groupTag, 3),
        variants: topCounts(g.variants, 6),
      };
    });

  return { entries, stats };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const manifest = {
    generated: new Date().toISOString().slice(0, 10),
    source: 'GEOROC (DIGIS, Georg-August-Universitaet Goettingen) staged extracts',
    license:
      'GEOROC data are provided under the terms of the DIGIS/GEOROC data policy. ' +
      'Users must cite GEOROC and the original publications for any analysis used.',
    method:
      'Per-name distributions (n, p10/p25/p50/p75/p90) of major oxides. Rows filtered to ' +
      'whole-rock or volcanic-glass material with a 97-103 wt% major-oxide total counting ' +
      'iron once, and at least 6 (rocks) or 4 (minerals) reported oxides.',
    minimumGroupSize: MIN_N,
    knownSourceDefect:
      'Staged CSVs declare a 45-column header but emit 39 columns; the six volatile ' +
      'columns (H2O, CO2, F, Cl, SO3, S) are named and never written. Columns are ' +
      'remapped positionally by this script.',
    datasets: {},
  };

  for (const kind of ['rocks', 'minerals']) {
    process.stderr.write(`\nIngesting ${kind}...\n`);
    const { entries, stats } = await ingest(kind);
    const file = path.join(OUT, `georoc-${kind}.json`);
    fs.writeFileSync(file, JSON.stringify({ kind, entries }, null, 0));
    const bytes = fs.statSync(file).size;
    manifest.datasets[kind] = { ...stats, groups: entries.length, bytes };
    process.stderr.write(
      `  -> ${entries.length} groups from ${stats.accepted}/${stats.rows} rows ` +
        `(${(bytes / 1024).toFixed(0)} kB)\n`
    );
    console.log(`${kind}:`, JSON.stringify(stats));
  }

  fs.writeFileSync(path.join(OUT, 'georoc-manifest.json'), JSON.stringify(manifest, null, 2));
  process.stderr.write(`\nWrote ${OUT}\n`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
