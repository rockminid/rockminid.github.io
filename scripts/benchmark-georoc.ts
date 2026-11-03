/**
 * Real-data benchmark on GEOROC analyses that the reference library never saw.
 *
 *   node scripts/ingest-georoc-raw.mjs --holdout 50 --out <lib>
 *   npx vite-node scripts/benchmark-georoc.ts -- --src ../georoc-raw --lib <lib> --out <dir>
 *
 * The ingest run leaves every 50th data row of each GEOROC file out of the
 * library; this script draws its test analyses from exactly those rows, so
 * the GEOROC distributions it uses contain none of them.
 *
 * Minerals: each analysis is labelled by GEOROC's MINERAL column (the name
 * given by the original authors) and scored at mineral-family level, with
 * the curated library alone and with the GEOROC distributions added, and
 * once more without declaring the sample type.
 *
 * Rocks: held-out whole-rock analyses are run with the sample type left
 * undeclared, to count how often a whole rock is mistaken for a mineral, and
 * the TAS field and CIPW norm are written out for comparison with pyrolite
 * (scripts/compare-pyrolite.py).
 */

import fs from 'node:fs';
import path from 'node:path';
import { readCsvRows } from './lib/csv-stream.mjs';
import { identifyGeochemicalSample } from '../src/utils/geochemEngine';
import { resolveIron, suggestedFe2O3FeORatio } from '../src/utils/iron';
import { __setGeorocLibraryForTests, toMineralReference, toRockReference } from '../src/data/georocReference';

const args = process.argv.slice(2);
const arg = (n: string, d: string) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const SRC = path.resolve(arg('src', '../georoc-raw'));
const LIB = path.resolve(arg('lib', 'public/data'));
const OUT = path.resolve(arg('out', 'benchmark-out'));
const HOLDOUT = Number(arg('holdout', '50'));
const PER_FAMILY = Number(arg('per-family', '100'));
const N_ROCKS = Number(arg('rocks', '1000'));

const HEADERS: Record<string, string> = {
  'SIO2(WT%)': 'SiO2', 'TIO2(WT%)': 'TiO2', 'AL2O3(WT%)': 'Al2O3', 'CR2O3(WT%)': 'Cr2O3',
  'FE2O3(WT%)': 'Fe2O3', 'FEO(WT%)': 'FeO', 'FEOT(WT%)': 'FeOT', 'FE2O3T(WT%)': 'Fe2O3T',
  'CAO(WT%)': 'CaO', 'MGO(WT%)': 'MgO', 'MNO(WT%)': 'MnO', 'NIO(WT%)': 'NiO',
  'K2O(WT%)': 'K2O', 'NA2O(WT%)': 'Na2O', 'P2O5(WT%)': 'P2O5', 'BAO(WT%)': 'BaO',
  'SRO(WT%)': 'SrO', 'LOI(WT%)': 'LOI', 'H2O(WT%)': 'H2O', 'CO2(WT%)': 'CO2',
};
const MAJORS = ['SiO2', 'TiO2', 'Al2O3', 'Cr2O3', 'MnO', 'MgO', 'CaO', 'Na2O', 'K2O', 'P2O5', 'NiO', 'BaO', 'SrO'];
const COUNTED = Object.values(HEADERS).filter((o) => !['LOI', 'H2O', 'CO2'].includes(o));

const num = (v: unknown) => {
  const s = String(v ?? '').trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n < 100 ? n : undefined;
};

/** Same total as the ingest script: majors plus iron counted once. */
function total(rec: Record<string, number>) {
  let t = MAJORS.reduce((a, o) => a + (rec[o] ?? 0), 0);
  if (rec.FeO !== undefined || rec.Fe2O3 !== undefined) t += (rec.FeO ?? 0) + (rec.Fe2O3 ?? 0);
  else t += rec.FeOT ?? rec.Fe2O3T ?? 0;
  return t;
}

/** Mineral family from a GEOROC label or a reference name. Order matters. */
const FAMILIES: Array<[RegExp, string]> = [
  [/ORTHOPYROXENE|ENSTATITE|HYPERSTHENE|BRONZITE|FERROSILITE/, 'orthopyroxene'],
  [/CLINOPYROXENE|AUGITE|DIOPSIDE|HEDENBERGITE|SALITE|PIGEONITE|OMPHACITE|AEGIRINE|JADEITE|FASSAITE/, 'clinopyroxene'],
  [/OLIVINE|FORSTERITE|FAYALITE|CHRYSOLITE/, 'olivine'],
  [/ALKALI FELDSPAR|K-FELDSPAR|SANIDINE|ORTHOCLASE|MICROCLINE|ANORTHOCLASE|PERTHITE/, 'alkali feldspar'],
  [/PLAGIOCLASE|ALBITE|OLIGOCLASE|ANDESINE|LABRADORITE|BYTOWNITE|ANORTHITE/, 'plagioclase'],
  [/AMPHIBOLE|HORNBLENDE|KAERSUTITE|PARGASITE|HASTINGSITE|EDENITE|ACTINOLITE|TREMOLITE|RICHTERITE|ARFVEDSONITE|TSCHERMAKITE|CUMMINGTONITE|GLAUCOPHANE|RIEBECKITE/, 'amphibole'],
  [/BIOTITE|PHLOGOPITE|MUSCOVITE|MICA|ANNITE|PARAGONITE/, 'mica'],
  [/GARNET|PYROPE|ALMANDINE|GROSSULAR|ANDRADITE|SPESSARTINE|UVAROVITE|MELANITE/, 'garnet'],
  [/ILMENITE/, 'ilmenite'],
  [/SPINEL|MAGNETITE|CHROMITE|HERCYNITE|PLEONASTE/, 'spinel group'],
  [/TITANITE|SPHENE/, 'titanite'],
  [/APATITE/, 'apatite'],
  [/NEPHELINE/, 'nepheline'],
  [/LEUCITE/, 'leucite'],
  [/QUARTZ/, 'quartz'],
  [/RUTILE/, 'rutile'],
  [/PEROVSKITE/, 'perovskite'],
];
const familyOf = (name: string) => FAMILIES.find(([re]) => re.test(name.toUpperCase()))?.[1];

/** GEOROC label as the ingest script reads it: first alternative, root name. */
function label(raw: string) {
  const s = raw.replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
  return (s.split('/').map((p) => p.trim()).find(Boolean) ?? '').split(',')[0].trim();
}

/** Seeded shuffle, so the test set is the same on every run. */
function shuffle<T>(a: T[], seed = 20261031) {
  let s = seed;
  const rnd = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Row { file: string; row: number; label: string; oxides: Record<string, number> }

/** Held-out rows of one kind that pass the ingest filters. */
async function heldOut(kind: 'rocks' | 'minerals'): Promise<Row[]> {
  const dir = path.join(SRC, kind);
  const out: Row[] = [];
  for (const file of fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.csv')).sort()) {
    let header: string[] | null = null;
    let local = 0;
    for await (const row of readCsvRows(path.join(dir, file)) as AsyncIterable<string[]>) {
      if (!header) { header = row.map((h) => h.trim().toUpperCase()); continue; }
      local++;
      if (local % HOLDOUT !== 0 || row.length !== header.length) continue;
      const rec: Record<string, number> = {};
      for (const [h, ox] of Object.entries(HEADERS)) {
        const i = header.indexOf(h);
        const v = i >= 0 ? num(row[i]) : undefined;
        if (v !== undefined) rec[ox] = v;
      }
      if (kind === 'rocks') {
        const m = label(row[header.indexOf('MATERIAL')] ?? '');
        if (m && !(m.startsWith('WR') || m.startsWith('GL'))) continue;
      }
      if (COUNTED.filter((o) => rec[o] !== undefined).length < (kind === 'minerals' ? 4 : 6)) continue;
      const t = total(rec);
      if (t < 97 || t > 103) continue;
      const name = kind === 'minerals' ? label(row[header.indexOf('MINERAL')] ?? '') : file;
      out.push({ file, row: local, label: name, oxides: rec });
    }
    process.stderr.write(`  ${kind}/${file}: ${out.length} held-out rows so far\n`);
  }
  return out;
}

const pct = (k: number, n: number) => (n ? Number(((100 * k) / n).toFixed(1)) : null);

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const lib = (f: string) => JSON.parse(fs.readFileSync(path.join(LIB, f), 'utf8'));
  const georoc = {
    rocks: lib('georoc-rocks.json').entries.map(toRockReference),
    minerals: lib('georoc-minerals.json').entries.map(toMineralReference),
  };

  // ---- Minerals ----------------------------------------------------------
  const pool = (await heldOut('minerals')).filter((r) => familyOf(r.label));
  const byFamily = new Map<string, Row[]>();
  for (const r of shuffle(pool)) {
    const f = familyOf(r.label)!;
    const list = byFamily.get(f) ?? [];
    if (list.length < PER_FAMILY) list.push(r);
    byFamily.set(f, list);
  }

  const run = (r: Row, withGeoroc: boolean, declared: boolean) => {
    __setGeorocLibraryForTests(withGeoroc ? georoc.rocks : [], withGeoroc ? georoc.minerals : []);
    return identifyGeochemicalSample(r.oxides, r.label, 'oxide', { sampleType: declared ? 'mineral' : 'unknown' });
  };

  const families: Record<string, unknown> = {};
  const totals = { n: 0, curated: 0, georoc: 0, top3: 0, inferred: 0, ambiguous: 0, ambiguousSameFamily: 0 };
  const misses: Record<string, number> = {};
  // One line per undeclared run, so the mineral-or-rock decision can be audited.
  const decisions = ['kind,label,fit,mineralScore,rockScore,familyOk'];
  const decide = (kind: string, lbl: string, rep: ReturnType<typeof identifyGeochemicalSample>, ok: boolean) =>
    decisions.push([kind, `"${lbl}"`, rep.topMinerals[0]?.structuralFit ?? 0, rep.topMinerals[0]?.similarity ?? 0, rep.topRocks[0]?.similarity ?? 0, ok ? 1 : 0].join(','));
  for (const [fam, rows] of [...byFamily.entries()].sort()) {
    const c = { n: rows.length, curated: 0, georoc: 0, top3: 0, inferred: 0, ambiguous: 0, ambiguousSameFamily: 0 };
    for (const r of rows) {
      const a = run(r, false, true);
      const b = run(r, true, true);
      const u = run(r, true, false);
      if (familyOf(a.bestOverall.reference.name) === fam) c.curated++;
      if (familyOf(b.bestOverall.reference.name) === fam) c.georoc++;
      else {
        const k = `${fam} -> ${familyOf(b.bestOverall.reference.name) ?? b.bestOverall.reference.name}`;
        misses[k] = (misses[k] ?? 0) + 1;
      }
      if (b.topMinerals.slice(0, 3).some((m) => familyOf(m.reference.name) === fam)) c.top3++;
      if (u.sampleType === 'mineral' && familyOf(u.bestOverall.reference.name) === fam) c.inferred++;
      if ((b.scoreSeparation ?? 99) < 3) {
        c.ambiguous++;
        const [m1, m2] = b.topMinerals;
        if (m2 && familyOf(m1.reference.name) === familyOf(m2.reference.name)) c.ambiguousSameFamily++;
      }
      decide('mineral', fam, u, familyOf(u.topMinerals[0].reference.name) === fam);
    }
    for (const k of Object.keys(totals) as Array<keyof typeof totals>) totals[k] += c[k];
    families[fam] = {
      n: c.n, curatedTop1: pct(c.curated, c.n), georocTop1: pct(c.georoc, c.n),
      georocTop3: pct(c.top3, c.n), undeclaredCorrect: pct(c.inferred, c.n), ambiguous: pct(c.ambiguous, c.n),
    };
  }

  // ---- Rocks -------------------------------------------------------------
  const rocks = shuffle(
    (await heldOut('rocks')).filter((r) => r.oxides.SiO2 !== undefined && r.oxides.Na2O !== undefined && r.oxides.K2O !== undefined)
  ).slice(0, N_ROCKS);
  __setGeorocLibraryForTests(georoc.rocks, georoc.minerals);
  let asMineral = 0;
  const asMineralBy: Record<string, number> = {};
  const t0 = performance.now();
  const reports = rocks.map((r) => identifyGeochemicalSample(r.oxides, r.label));
  const engineMs = performance.now() - t0;
  const NORM = ['Q', 'C', 'Or', 'Ab', 'An', 'Lc', 'Ne', 'Kp', 'Ac', 'Ns', 'Ks', 'Di', 'Wo', 'Cs', 'Hy', 'Ol', 'Mt', 'Hm', 'Il', 'Ru', 'Cm', 'Ap', 'Cc'];
  const OX = ['SiO2', 'TiO2', 'Al2O3', 'Cr2O3', 'FeO', 'Fe2O3', 'MnO', 'NiO', 'MgO', 'CaO', 'Na2O', 'K2O', 'P2O5', 'CO2'];
  const lines = [['id', 'file', 'tasCode', 'tasField', ...OX, ...NORM.map((m) => `n_${m}`), 'normSum'].join(',')];
  reports.forEach((rep, i) => {
    decide('rock', rocks[i].file, rep, false);
    if (rep.sampleType === 'mineral') {
      asMineral++;
      const k = `${rocks[i].file.replace(/^[\d-]+[A-Z0-9]*_|(_part\d+)?\.csv$/gi, '')} -> ${rep.bestOverall.reference.name}`;
      asMineralBy[k] = (asMineralBy[k] ?? 0) + 1;
    }
    const n = rep.normalizedOxides;
    // The iron the norm actually used, so pyrolite is given the same split.
    const fe = resolveIron(n, { fe2o3FeoRatio: suggestedFe2O3FeORatio(n.SiO2) });
    const v = (o: string) => (o === 'FeO' ? fe.FeO : o === 'Fe2O3' ? fe.Fe2O3 : (n[o] as number) ?? 0);
    lines.push([
      i, rocks[i].file, rep.tasCode ?? '', `"${rep.tasField}"`,
      ...OX.map((o) => Number(v(o).toFixed(4))),
      ...NORM.map((m) => Number(((rep.cipwNorm?.[m] as number) ?? 0).toFixed(4))),
      Number((rep.cipwNorm?.normSum ?? 0).toFixed(4)),
    ].join(','));
  });
  fs.writeFileSync(path.join(OUT, 'rocks-rockminid.csv'), lines.join('\n'));
  fs.writeFileSync(path.join(OUT, 'undeclared.csv'), decisions.join('\n'));

  const summary = {
    holdoutEvery: HOLDOUT,
    minerals: {
      heldOutLabelled: pool.length,
      tested: totals.n,
      curatedTop1: pct(totals.curated, totals.n),
      georocTop1: pct(totals.georoc, totals.n),
      georocTop3: pct(totals.top3, totals.n),
      undeclaredCorrect: pct(totals.inferred, totals.n),
      ambiguous: pct(totals.ambiguous, totals.n),
      ambiguousWithRunnerUpInSameFamily: pct(totals.ambiguousSameFamily, totals.ambiguous),
      families,
      commonMisses: Object.entries(misses).sort((a, b) => b[1] - a[1]).slice(0, 15),
    },
    rocks: {
      tested: rocks.length,
      inferredAsMineral: asMineral,
      inferredAsMineralBy: Object.entries(asMineralBy).sort((a, b) => b[1] - a[1]).slice(0, 25),
      engineMsTotal: Number(engineMs.toFixed(0)),
      engineMsPerSample: Number((engineMs / rocks.length).toFixed(2)),
    },
  };
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main();
