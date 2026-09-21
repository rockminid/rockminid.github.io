/**
 * Structural-formula (APFU) mineral identification.
 *
 * Comparing an EPMA analysis to an "ideal" oxide composition by Euclidean
 * distance is a poor way to identify a mineral: solid solutions move the
 * oxide weights around a lot while the *structure* stays fixed. The
 * diagnostic test a petrologist actually applies is stoichiometric — convert
 * the analysis to cations per formula unit on the candidate's oxygen basis
 * and check that the cation totals and site occupancies come out right.
 *
 * This module supplies that test. A forsteritic and a fayalitic olivine sit
 * far apart in oxide space but both give 3.00 cations on 4 oxygens, so both
 * identify as olivine; a pyroxene with the same SiO2 gives 4.00 on 6 oxygens
 * and does not.
 *
 * Oxygen bases follow standard practice (Deer, Howie & Zussman).
 */

import { OxideComposition } from '../types/geochem';
import { resolveIron } from './iron';

/** Cation and oxygen contribution of each oxide. */
const FACTORS: Record<string, { mw: number; cat: number; oxy: number; el: string }> = {
  SiO2: { mw: 60.084, cat: 1, oxy: 2, el: 'Si' },
  TiO2: { mw: 79.866, cat: 1, oxy: 2, el: 'Ti' },
  Al2O3: { mw: 101.961, cat: 2, oxy: 3, el: 'Al' },
  Cr2O3: { mw: 151.99, cat: 2, oxy: 3, el: 'Cr' },
  Fe2O3: { mw: 159.688, cat: 2, oxy: 3, el: 'Fe3' },
  FeO: { mw: 71.844, cat: 1, oxy: 1, el: 'Fe2' },
  MnO: { mw: 70.937, cat: 1, oxy: 1, el: 'Mn' },
  MgO: { mw: 40.304, cat: 1, oxy: 1, el: 'Mg' },
  CaO: { mw: 56.077, cat: 1, oxy: 1, el: 'Ca' },
  NiO: { mw: 74.693, cat: 1, oxy: 1, el: 'Ni' },
  BaO: { mw: 153.326, cat: 1, oxy: 1, el: 'Ba' },
  SrO: { mw: 103.619, cat: 1, oxy: 1, el: 'Sr' },
  Na2O: { mw: 61.979, cat: 2, oxy: 1, el: 'Na' },
  K2O: { mw: 94.196, cat: 2, oxy: 1, el: 'K' },
  P2O5: { mw: 141.945, cat: 2, oxy: 5, el: 'P' },
};

/** Structural expectations for a mineral group. */
export interface StructureSpec {
  /** Oxygens the formula is normalized to. */
  oxygenBasis: number;
  /** Expected total cations per formula unit. */
  idealCations: number;
  /** Acceptable spread in the cation total before the fit is judged poor. */
  cationTolerance: number;
  /** Expected tetrahedral (Si + Al) occupancy, where diagnostic. */
  tetrahedral?: { min: number; max: number };
  /**
   * Cations the structure REQUIRES, as apfu on this oxygen basis. A mica
   * without interlayer K is not a mica however well its cation total adds
   * up; an apatite without P is not an apatite. Without these, loose-
   * tolerance groups like amphibole and mica act as catch-alls and a
   * whole-rock analysis "fits" them.
   */
  requires?: Array<{ el: string | string[]; min: number }>;
  /** Idealized formula, for display. */
  formula?: string;
}

/**
 * Oxygen bases and ideal cation totals by mineral group or species.
 * Keys are matched case-insensitively against the reference name first, then
 * its group.
 */
export const STRUCTURE_SPECS: Record<string, StructureSpec> = {
  // --- Nesosilicates -----------------------------------------------------
  olivine: { oxygenBasis: 4, idealCations: 3, cationTolerance: 0.06, tetrahedral: { min: 0.94, max: 1.12 }, requires: [{ el: ['Mg', 'Fe2', 'Mn'], min: 1.5 }], formula: '(Mg,Fe)2SiO4' },
  forsterite: { oxygenBasis: 4, idealCations: 3, cationTolerance: 0.06, formula: 'Mg2SiO4' },
  fayalite: { oxygenBasis: 4, idealCations: 3, cationTolerance: 0.06, formula: 'Fe2SiO4' },
  garnet: { oxygenBasis: 12, idealCations: 8, cationTolerance: 0.15, tetrahedral: { min: 2.85, max: 3.15 }, formula: 'X3Y2(SiO4)3' },
  zircon: { oxygenBasis: 4, idealCations: 2, cationTolerance: 0.08, formula: 'ZrSiO4' },
  titanite: { oxygenBasis: 5, idealCations: 3, cationTolerance: 0.12, formula: 'CaTiSiO5' },
  'titanite (sphene)': { oxygenBasis: 5, idealCations: 3, cationTolerance: 0.12, formula: 'CaTiSiO5' },
  sphene: { oxygenBasis: 5, idealCations: 3, cationTolerance: 0.12, formula: 'CaTiSiO5' },

  // --- Inosilicates ------------------------------------------------------
  pyroxene: { oxygenBasis: 6, idealCations: 4, cationTolerance: 0.08, tetrahedral: { min: 1.9, max: 2.1 }, formula: 'XYZ2O6' },
  clinopyroxene: { oxygenBasis: 6, idealCations: 4, cationTolerance: 0.08, tetrahedral: { min: 1.9, max: 2.1 }, formula: '(Ca,Mg,Fe)2Si2O6' },
  orthopyroxene: { oxygenBasis: 6, idealCations: 4, cationTolerance: 0.08, tetrahedral: { min: 1.9, max: 2.1 }, formula: '(Mg,Fe)2Si2O6' },
  augite: { oxygenBasis: 6, idealCations: 4, cationTolerance: 0.08, formula: '(Ca,Mg,Fe)2Si2O6' },
  diopside: { oxygenBasis: 6, idealCations: 4, cationTolerance: 0.08, formula: 'CaMgSi2O6' },
  enstatite: { oxygenBasis: 6, idealCations: 4, cationTolerance: 0.08, formula: 'Mg2Si2O6' },
  omphacite: { oxygenBasis: 6, idealCations: 4, cationTolerance: 0.1, formula: '(Ca,Na)(Mg,Fe,Al)Si2O6' },
  pigeonite: { oxygenBasis: 6, idealCations: 4, cationTolerance: 0.08, formula: '(Mg,Fe,Ca)2Si2O6' },
  // Amphiboles are hydrous; the anhydrous analysis is normalized to 23 O.
  amphibole: { oxygenBasis: 23, idealCations: 15.5, cationTolerance: 0.7, tetrahedral: { min: 7.4, max: 8.4 }, requires: [{ el: ['Ca', 'Na', 'K'], min: 1.2 }], formula: 'A0-1B2C5T8O22(OH)2' },
  hornblende: { oxygenBasis: 23, idealCations: 15.5, cationTolerance: 0.7, tetrahedral: { min: 7.4, max: 8.4 }, requires: [{ el: 'Ca', min: 1.2 }], formula: 'Ca2(Mg,Fe,Al)5(Al,Si)8O22(OH)2' },
  kaersutite: { oxygenBasis: 23, idealCations: 15.5, cationTolerance: 0.7, tetrahedral: { min: 7.4, max: 8.4 }, requires: [{ el: 'Ca', min: 1.2 }, { el: 'Ti', min: 0.2 }], formula: 'NaCa2(Mg,Fe,Ti)5Si6Al2O23' },

  // --- Tectosilicates ----------------------------------------------------
  feldspar: { oxygenBasis: 8, idealCations: 5, cationTolerance: 0.07, tetrahedral: { min: 3.9, max: 4.1 }, requires: [{ el: ['Na', 'K', 'Ca', 'Ba'], min: 0.7 }], formula: '(Na,K,Ca)(Al,Si)4O8' },
  plagioclase: { oxygenBasis: 8, idealCations: 5, cationTolerance: 0.07, tetrahedral: { min: 3.9, max: 4.1 }, requires: [{ el: ['Na', 'Ca'], min: 0.7 }], formula: '(Na,Ca)(Al,Si)4O8' },
  'alkali feldspar': { oxygenBasis: 8, idealCations: 5, cationTolerance: 0.07, formula: '(K,Na)AlSi3O8' },
  sanidine: { oxygenBasis: 8, idealCations: 5, cationTolerance: 0.07, formula: 'KAlSi3O8' },
  orthoclase: { oxygenBasis: 8, idealCations: 5, cationTolerance: 0.07, formula: 'KAlSi3O8' },
  microcline: { oxygenBasis: 8, idealCations: 5, cationTolerance: 0.07, formula: 'KAlSi3O8' },
  albite: { oxygenBasis: 8, idealCations: 5, cationTolerance: 0.07, formula: 'NaAlSi3O8' },
  anorthite: { oxygenBasis: 8, idealCations: 5, cationTolerance: 0.07, formula: 'CaAl2Si2O8' },
  anorthoclase: { oxygenBasis: 8, idealCations: 5, cationTolerance: 0.07, formula: '(Na,K)AlSi3O8' },
  quartz: { oxygenBasis: 2, idealCations: 1, cationTolerance: 0.04, formula: 'SiO2' },
  nepheline: { oxygenBasis: 4, idealCations: 3, cationTolerance: 0.1, formula: 'NaAlSiO4' },
  leucite: { oxygenBasis: 6, idealCations: 4, cationTolerance: 0.1, formula: 'KAlSi2O6' },
  feldspathoid: { oxygenBasis: 4, idealCations: 3, cationTolerance: 0.15, formula: '(Na,K)AlSiO4' },

  // --- Phyllosilicates ---------------------------------------------------
  mica: { oxygenBasis: 22, idealCations: 14, cationTolerance: 0.8, requires: [{ el: ['K', 'Na'], min: 1.0 }], formula: 'X2Y4-6Z8O20(OH)4' },
  biotite: { oxygenBasis: 22, idealCations: 15.5, cationTolerance: 0.9, requires: [{ el: 'K', min: 1.0 }, { el: ['Mg', 'Fe2'], min: 3.0 }], formula: 'K2(Mg,Fe)6(Si,Al)8O20(OH)4' },
  phlogopite: { oxygenBasis: 22, idealCations: 15.5, cationTolerance: 0.9, requires: [{ el: 'K', min: 1.0 }, { el: 'Mg', min: 3.0 }], formula: 'K2Mg6(Si,Al)8O20(OH)4' },
  muscovite: { oxygenBasis: 22, idealCations: 14, cationTolerance: 0.8, requires: [{ el: 'K', min: 1.0 }, { el: 'Al', min: 3.0 }], formula: 'K2Al4(Si,Al)8O20(OH)4' },

  // --- Oxides ------------------------------------------------------------
  spinel: { oxygenBasis: 4, idealCations: 3, cationTolerance: 0.1, formula: '(Mg,Fe)(Al,Cr,Fe)2O4' },
  'chrome-spinel': { oxygenBasis: 4, idealCations: 3, cationTolerance: 0.1, formula: '(Mg,Fe)(Cr,Al)2O4' },
  chromite: { oxygenBasis: 4, idealCations: 3, cationTolerance: 0.1, formula: 'FeCr2O4' },
  magnetite: { oxygenBasis: 4, idealCations: 3, cationTolerance: 0.1, formula: 'Fe3O4' },
  'titano-magnetite': { oxygenBasis: 4, idealCations: 3, cationTolerance: 0.12, formula: '(Fe,Ti)3O4' },
  ilmenite: { oxygenBasis: 3, idealCations: 2, cationTolerance: 0.07, formula: 'FeTiO3' },
  rutile: { oxygenBasis: 2, idealCations: 1, cationTolerance: 0.05, formula: 'TiO2' },
  hematite: { oxygenBasis: 3, idealCations: 2, cationTolerance: 0.07, formula: 'Fe2O3' },
  perovskite: { oxygenBasis: 3, idealCations: 2, cationTolerance: 0.1, formula: 'CaTiO3' },

  // --- Others ------------------------------------------------------------
  apatite: { oxygenBasis: 12, idealCations: 8, cationTolerance: 0.3, requires: [{ el: 'P', min: 2.0 }, { el: 'Ca', min: 3.5 }], formula: 'Ca5(PO4)3(F,Cl,OH)' },
  calcite: { oxygenBasis: 3, idealCations: 2, cationTolerance: 0.15, formula: 'CaCO3' },
  dolomite: { oxygenBasis: 6, idealCations: 4, cationTolerance: 0.2, formula: 'CaMg(CO3)2' },
};

/** Group-level fallbacks when the species is not listed. */
const GROUP_SPECS: Record<string, string> = {
  Nesosilicate: 'olivine',
  Inosilicate: 'pyroxene',
  Tectosilicate: 'feldspar',
  Phyllosilicate: 'mica',
  Oxide: 'spinel',
  Phosphate: 'apatite',
  Carbonate: 'calcite',
};

export interface StructuralFormula {
  oxygenBasis: number;
  /** Cations per formula unit, keyed by element. */
  apfu: Record<string, number>;
  /** Sum of all cations. */
  cationSum: number;
  /** Tetrahedral Si + Al. */
  tetrahedral: number;
  /** |cationSum - ideal|, the primary stoichiometric misfit. */
  deviation: number;
  /**
   * 0-1 quality of the structural fit. 1 means the analysis normalizes to the
   * ideal cation total on that oxygen basis.
   */
  fit: number;
  /** Human-readable formula, e.g. "(Mg1.80Fe0.20)Si1.00O4". */
  text: string;
}

/** Looks up the structural expectations for a reference. */
export function structureSpecFor(name: string, group?: string): StructureSpec | undefined {
  const n = name.toLowerCase().trim();
  if (STRUCTURE_SPECS[n]) return STRUCTURE_SPECS[n];
  // Longest matching key that appears in the name: "augite (clinopyroxene)"
  // should prefer "clinopyroxene" over "pyroxene".
  let best: StructureSpec | undefined;
  let bestLen = 0;
  for (const [key, spec] of Object.entries(STRUCTURE_SPECS)) {
    if (n.includes(key) && key.length > bestLen) {
      best = spec;
      bestLen = key.length;
    }
  }
  if (best) return best;
  if (group && GROUP_SPECS[group]) return STRUCTURE_SPECS[GROUP_SPECS[group]];
  return undefined;
}

/**
 * Computes the structural formula of an analysis on a given oxygen basis.
 *
 * Iron is split into Fe2+/Fe3+ only if the analysis reports both; otherwise
 * all iron is carried as Fe2+, which is the usual EPMA convention.
 */
export function structuralFormula(
  oxides: OxideComposition,
  spec: StructureSpec
): StructuralFormula {
  let totalOxygen = 0;
  const moles: Record<string, number> = {};

  const iron = resolveIron(oxides);
  const hasBoth = oxides.FeO !== undefined && oxides.Fe2O3 !== undefined;

  for (const [ox, wt] of Object.entries(oxides)) {
    if (typeof wt !== 'number' || !Number.isFinite(wt) || wt <= 0) continue;
    if (ox === 'FeOT' || ox === 'Fe2O3T' || ox === 'FeO_equiv') continue;
    if (!hasBoth && (ox === 'FeO' || ox === 'Fe2O3')) continue;
    const f = FACTORS[ox];
    if (!f) continue;
    const m = wt / f.mw;
    totalOxygen += m * f.oxy;
    moles[f.el] = (moles[f.el] || 0) + m * f.cat;
  }

  if (!hasBoth && iron.FeOT > 0) {
    const m = iron.FeOT / FACTORS.FeO.mw;
    totalOxygen += m;
    moles.Fe2 = (moles.Fe2 || 0) + m;
  }

  const scale = totalOxygen > 0 ? spec.oxygenBasis / totalOxygen : 0;
  const apfu: Record<string, number> = {};
  let cationSum = 0;
  for (const [el, m] of Object.entries(moles)) {
    const v = m * scale;
    apfu[el] = Number(v.toFixed(4));
    cationSum += v;
  }

  const tetrahedral = (apfu.Si || 0) + (apfu.Al || 0);
  const deviation = Math.abs(cationSum - spec.idealCations);

  // Fit falls off smoothly once the misfit exceeds the tolerance.
  let fit = Math.exp(-Math.pow(deviation / Math.max(spec.cationTolerance, 1e-6), 2));
  if (spec.tetrahedral) {
    const { min, max } = spec.tetrahedral;
    if (tetrahedral < min || tetrahedral > max) {
      const off = tetrahedral < min ? min - tetrahedral : tetrahedral - max;
      fit *= Math.exp(-Math.pow(off / Math.max(0.25, (max - min) / 2), 2));
    }
  }
  // Required site occupancies. A structure that is missing an essential
  // cation does not fit, however well the totals add up.
  if (spec.requires) {
    for (const req of spec.requires) {
      const els = Array.isArray(req.el) ? req.el : [req.el];
      const have = els.reduce((a, e) => a + (apfu[e] || 0), 0);
      if (have < req.min) {
        fit *= Math.max(0, have / req.min) ** 2;
      }
    }
  }

  if (totalOxygen <= 0) fit = 0;

  const order = ['Si', 'Ti', 'Al', 'Cr', 'Fe3', 'Fe2', 'Mn', 'Mg', 'Ni', 'Ca', 'Na', 'K', 'Ba', 'Sr', 'P'];
  const text =
    order
      .filter((el) => (apfu[el] || 0) >= 0.005)
      .map((el) => `${el.replace('Fe2', 'Fe²⁺').replace('Fe3', 'Fe³⁺')}${apfu[el].toFixed(2)}`)
      .join(' ') + ` O${spec.oxygenBasis}`;

  return {
    oxygenBasis: spec.oxygenBasis,
    apfu,
    cationSum: Number(cationSum.toFixed(3)),
    tetrahedral: Number(tetrahedral.toFixed(3)),
    deviation: Number(deviation.toFixed(3)),
    fit: Number(fit.toFixed(4)),
    text,
  };
}

/** End-member proportions for the common solid solutions, where applicable. */
export function endMembers(
  name: string,
  f: StructuralFormula
): { label: string; value: string } | undefined {
  const n = name.toLowerCase();
  const a = f.apfu;
  const mg = a.Mg || 0;
  const fe = (a.Fe2 || 0) + (a.Fe3 || 0);
  const ca = a.Ca || 0;
  const na = a.Na || 0;
  const k = a.K || 0;

  if (n.includes('olivine') || n.includes('forsterite') || n.includes('fayalite')) {
    if (mg + fe <= 0) return undefined;
    return { label: 'Forsterite content', value: `Fo${((mg / (mg + fe)) * 100).toFixed(0)}` };
  }
  if (n.includes('plagioclase') || n.includes('feldspar') || n.includes('albite') || n.includes('anorthite')) {
    const t = ca + na + k;
    if (t <= 0) return undefined;
    return {
      label: 'Feldspar end-members',
      value: `An${((ca / t) * 100).toFixed(0)} Ab${((na / t) * 100).toFixed(0)} Or${((k / t) * 100).toFixed(0)}`,
    };
  }
  if (n.includes('pyroxene') || n.includes('augite') || n.includes('diopside') || n.includes('enstatite')) {
    const t = ca + mg + fe;
    if (t <= 0) return undefined;
    return {
      label: 'Pyroxene quadrilateral',
      value: `Wo${((ca / t) * 100).toFixed(0)} En${((mg / t) * 100).toFixed(0)} Fs${((fe / t) * 100).toFixed(0)}`,
    };
  }
  if (n.includes('spinel') || n.includes('chromite')) {
    const cr = a.Cr || 0;
    const al = a.Al || 0;
    if (cr + al <= 0) return undefined;
    return { label: 'Cr#', value: `${((cr / (cr + al)) * 100).toFixed(0)}` };
  }
  return undefined;
}
