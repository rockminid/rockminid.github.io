/**
 * Row filters for building the GEOROC reference library.
 *
 * Kept apart from the ingest script so each rule can be tested on its own.
 * Every rule exists because a reviewer found a group corrupted without it:
 * GEOROC CALCITE with a median of 93 wt% CaO, QUARTZ missing its purest
 * analyses, FERROSILITE with 18.6 wt% CaO, TITAN-AUGITE with whole-rock K2O
 * and P2O5.
 */

export const FE2O3_TO_FEO = 0.8998;

/** wt% value, or undefined. Up to 102 is accepted: a pure phase can read 100.4. */
export function num(v) {
  if (v == null) return undefined;
  const s = String(v).trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n <= 102 ? n : undefined;
}

/**
 * Total iron as FeO. FeO + Fe2O3 only when BOTH are reported; a row with
 * FeO alone next to FeOT would otherwise drop its ferric iron. Then FeOT,
 * then Fe2O3T, and a single valence column only as a last resort.
 */
export function totalIronAsFeO(rec) {
  const feo = num(rec.FeO);
  const fe2o3 = num(rec.Fe2O3);
  if (feo !== undefined && fe2o3 !== undefined) return feo + FE2O3_TO_FEO * fe2o3;
  const feot = num(rec.FeOT);
  if (feot !== undefined) return feot;
  const fe2o3t = num(rec.Fe2O3T);
  if (fe2o3t !== undefined) return FE2O3_TO_FEO * fe2o3t;
  if (feo !== undefined) return feo;
  if (fe2o3 !== undefined) return FE2O3_TO_FEO * fe2o3;
  return undefined;
}

/** Iron as it contributes to the analytical total (oxides as reported). */
function ironForTotal(rec) {
  const feo = num(rec.FeO);
  const fe2o3 = num(rec.Fe2O3);
  if (feo !== undefined && fe2o3 !== undefined) return feo + fe2o3;
  const feot = num(rec.FeOT);
  if (feot !== undefined) return feot;
  const fe2o3t = num(rec.Fe2O3T);
  if (fe2o3t !== undefined) return fe2o3t;
  return num(rec.FeO) ?? num(rec.Fe2O3) ?? 0;
}

export const MAJORS = ['SiO2', 'TiO2', 'Al2O3', 'Cr2O3', 'MnO', 'MgO', 'CaO', 'Na2O', 'K2O', 'P2O5', 'NiO', 'BaO', 'SrO'];
const VOLATILES = ['LOI', 'H2O', 'CO2'];

/**
 * Volatiles as they count toward the total. LOI already includes the water
 * and CO2 driven off, so when it is reported H2O and CO2 are not added again;
 * otherwise H2O and CO2 count individually.
 */
function volatilesForTotal(rec) {
  const loi = num(rec.LOI);
  if (loi !== undefined) return loi;
  return (num(rec.H2O) ?? 0) + (num(rec.CO2) ?? 0);
}

/**
 * Analytical total, with iron counted once and volatiles counted once. A
 * kimberlite with 15 wt% LOI totals 100, not 85.
 */
export function analyticalTotal(rec) {
  let t = ironForTotal(rec) + volatilesForTotal(rec);
  for (const ox of MAJORS) t += num(rec[ox]) ?? 0;
  return t;
}

/**
 * Acceptable totals for minerals whose analyses legitimately fall short of
 * 100 wt% because water or CO2 is not measured. [pattern, min, max].
 */
const MINERAL_TOTAL_WINDOWS = [
  [/^(CALCITE|ARAGONITE)$/, 52, 60],
  [/^DOLOMITE$/, 48, 58],
  [/^(ANKERITE|MAGNESITE|SIDERITE|RHODOCHROSITE)$/, 44, 66],
  [/SERPENTINE|ANTIGORITE|LIZARDITE|CHRYSOTILE|CHLORITE|CLINOCHLORE|CHAMOSITE|KAOLINITE/, 82, 92],
  [/^(TALC)$/, 92, 98],
  [/MICA|BIOTITE|PHLOGOPITE|MUSCOVITE|PARAGONITE|LEPIDOLITE|SERICITE|ANNITE|GLAUCONITE/, 91, 100],
  [/AMPHIBOLE|HORNBLENDE|PARGASITE|KAERSUTITE|EDENITE|TSCHERMAKITE|HASTINGSITE|ACTINOLITE|TREMOLITE|RICHTERITE|RIEBECKITE|ARFVEDSONITE|GLAUCOPHANE|CUMMINGTONITE|ANTHOPHYLLITE|GEDRITE/, 94, 101],
  [/EPIDOTE|ZOISITE|ALLANITE|LAWSONITE|PUMPELLYITE|PREHNITE|STAUROLITE|CHLORITOID|TOURMALINE|VESUVIANITE/, 84, 101],
  [/ZEOLITE|ANALCIME|NATROLITE|CHABAZITE|STILBITE|HEULANDITE|SCOLECITE|THOMSONITE/, 78, 95],
  [/APATITE/, 94, 102],
];

/** The [min, max] total window for a group: volatile-aware for minerals. */
export function totalWindow(kind, name, rec) {
  // A reported volatile already brings the total to ~100.
  const volatilesReported = VOLATILES.some((v) => (num(rec[v]) ?? 0) > 0);
  if (kind === 'minerals' && !volatilesReported) {
    for (const [re, lo, hi] of MINERAL_TOTAL_WINDOWS) if (re.test(name)) return [lo, hi];
  }
  return [97, 103];
}

// --- Stoichiometric sanity checks -----------------------------------------

const OX = {
  SiO2: [60.084, 1, 2], TiO2: [79.866, 1, 2], Al2O3: [101.961, 2, 3], Cr2O3: [151.99, 2, 3],
  FeO: [71.844, 1, 1], MnO: [70.937, 1, 1], MgO: [40.304, 1, 1], CaO: [56.077, 1, 1],
  NiO: [74.693, 1, 1], Na2O: [61.979, 2, 1], K2O: [94.196, 2, 1], P2O5: [141.945, 2, 5],
  BaO: [153.326, 1, 1], SrO: [103.619, 1, 1],
};

/** Cations per formula unit on `oxygens`, iron as FeO; element apfu too. */
export function cations(rec, oxygens) {
  const moles = {};
  let oxy = 0;
  const comp = { ...rec, FeO: totalIronAsFeO(rec) };
  for (const [ox, [mw, cat, o]] of Object.entries(OX)) {
    const v = ox === 'FeO' ? comp.FeO : num(comp[ox]);
    if (!v) continue;
    const m = v / mw;
    moles[ox] = m * cat;
    oxy += m * o;
  }
  if (!oxy) return { sum: 0 };
  const f = oxygens / oxy;
  const out = { sum: 0 };
  for (const [ox, m] of Object.entries(moles)) {
    out[ox] = m * f;
    out.sum += m * f;
  }
  return out;
}

/**
 * [pattern, oxygens, min cations, max cations]. Wide enough for real
 * solid solutions and for modest Fe3+ carried as Fe2+ (which raises the
 * sum); all-ferric phases (aegirine, andradite) are left out for that
 * reason. A whole-rock or glass analysis filed under a mineral name
 * a whole-rock or glass analysis filed under a mineral name falls outside.
 */
const STOICHIOMETRY = [
  [/OLIVINE|FORSTERITE|FAYALITE|CHRYSOLITE/, 4, 2.9, 3.1],
  [/PYROXENE|AUGITE|DIOPSIDE|HEDENBERGITE|SALITE|ENSTATITE|FERROSILITE|HYPERSTHENE|BRONZITE|PIGEONITE|OMPHACITE|JADEITE/, 6, 3.9, 4.15],
  [/GARNET|PYROPE|ALMANDINE|GROSSULAR|SPESSARTINE/, 12, 7.8, 8.25],
  [/FELDSPAR|PLAGIOCLASE|ALBITE|OLIGOCLASE|ANDESINE|LABRADORITE|BYTOWNITE|ANORTHITE|ORTHOCLASE|SANIDINE|MICROCLINE|ANORTHOCLASE/, 8, 4.9, 5.1],
];

/** Plagioclase species and their An ranges (IUGS), with a 5-unit margin. */
const AN_RANGES = [
  [/^ALBITE$/, 0, 10], [/^OLIGOCLASE$/, 10, 30], [/^ANDESINE$/, 30, 50],
  [/^LABRADORITE$/, 50, 70], [/^BYTOWNITE$/, 70, 90], [/^ANORTHITE$/, 90, 100],
];

const ORTHOPYROXENE = /ENSTATITE|FERROSILITE|HYPERSTHENE|BRONZITE|ORTHOPYROXENE/;
const ANHYDROUS_SILICATE = /OLIVINE|FORSTERITE|FAYALITE|PYROXENE|AUGITE|DIOPSIDE|HEDENBERGITE|SALITE|ENSTATITE|FERROSILITE|HYPERSTHENE|BRONZITE|PIGEONITE|GARNET|PYROPE|ALMANDINE|GROSSULAR/;

/**
 * Reason a mineral row is chemically inconsistent with its label, or null.
 * Rows that fail are mislabelled or are not single-mineral analyses.
 */
export function stoichiometryProblem(name, rec) {
  for (const [re, oxygens, lo, hi] of STOICHIOMETRY) {
    if (!re.test(name)) continue;
    const c = cations(rec, oxygens);
    if (c.sum < lo || c.sum > hi) return `cations ${c.sum.toFixed(2)} on ${oxygens} O outside ${lo}-${hi}`;
    break;
  }
  if (ORTHOPYROXENE.test(name)) {
    const ca = cations(rec, 6).CaO ?? 0;
    if (ca > 0.15) return `Ca ${ca.toFixed(2)} apfu is too high for orthopyroxene`;
  }
  // Hedenbergite is CaFeSi2O6; rows with several wt% Al2O3 or TiO2 under
  // that name are aluminous augite (e.g. from monchiquites).
  if (/^HEDENBERGITE$/.test(name) && ((num(rec.Al2O3) ?? 0) > 3 || (num(rec.TiO2) ?? 0) > 1)) {
    return 'Al2O3 or TiO2 too high for hedenbergite (aluminous augite)';
  }
  if (ANHYDROUS_SILICATE.test(name) && ((num(rec.K2O) ?? 0) > 0.5 || (num(rec.P2O5) ?? 0) > 0.3)) {
    return 'K2O or P2O5 too high for this mineral (whole-rock or melt analysis)';
  }
  for (const [re, lo, hi] of AN_RANGES) {
    if (!re.test(name)) continue;
    const c = cations(rec, 8);
    const ca = c.CaO ?? 0, na = c.Na2O ?? 0, k = c.K2O ?? 0;
    const an = ca + na + k > 0 ? (100 * ca) / (ca + na + k) : NaN;
    if (!(an >= lo - 5 && an <= hi + 5)) return `An${Math.round(an)} outside the ${lo}-${hi} range of the name`;
  }
  return null;
}
