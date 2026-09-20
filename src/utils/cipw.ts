/**
 * CIPW normative mineralogy (Cross, Iddings, Pirsson & Washington 1902),
 * in the modern form described by Kelsey (1965) and Le Maitre (2002).
 *
 * Design note
 * -----------
 * Phase masses are accumulated from the actual oxide masses each phase
 * consumes, rather than from a fixed formula weight per phase. That makes
 * mass balance exact by construction and correctly handles solid solutions
 * (Mg-Fe in olivine, hypersthene and diopside), which a fixed formula weight
 * cannot. The previous implementation used constant weights (Hy = 110,
 * Ol = 150, Di = 216.5) and then force-renormalized the result to 100, which
 * hid errors of 20-35% in Fe-rich compositions.
 *
 * `normSum` reports the true normative total and `silicaBalance` the residual
 * silica misfit, so the calculation can be checked rather than trusted.
 */

import { CIPWNorm, OxideComposition } from '../types/geochem';
import { resolveIron, suggestedFe2O3FeORatio } from './iron';

/** Oxide formula weights (g/mol). */
const FW = {
  SiO2: 60.084,
  TiO2: 79.866,
  Al2O3: 101.961,
  Fe2O3: 159.688,
  FeO: 71.844,
  MnO: 70.937,
  MgO: 40.304,
  CaO: 56.077,
  Na2O: 61.979,
  K2O: 94.196,
  P2O5: 141.945,
  Cr2O3: 151.99,
  NiO: 74.693,
  CO2: 44.009,
  SO3: 80.063,
} as const;

type OxideKey = keyof typeof FW;

export interface CIPWOptions {
  /**
   * Fe2O3/FeO weight ratio used when the analysis reports only total iron.
   * Defaults to the Middlemost (1989) silica-dependent value, so that
   * FeOT-only data (the GEOROC norm) still yields normative magnetite.
   * Pass 0 to treat all iron as ferrous.
   */
  fe2o3FeoRatio?: number;
}

interface MaficDraw {
  mass: number;
  mgFraction: number;
}

/**
 * A pool of divalent mafic oxides (MgO, FeO, MnO, NiO) drawn on
 * proportionally, as CIPW treats them as one (Mg,Fe) component.
 */
class MaficPool {
  private pools: Partial<Record<OxideKey, number>> = {};

  constructor(initial: Partial<Record<OxideKey, number>>) {
    this.pools = { ...initial };
  }

  get moles(): number {
    return Object.values(this.pools).reduce((a, v) => a + (v || 0), 0);
  }

  get mgFraction(): number {
    const total = this.moles;
    if (total <= 0) return 0.5;
    return (this.pools.MgO || 0) / total;
  }

  /** Removes `n` moles proportionally and returns the mass removed. */
  take(n: number): MaficDraw {
    const total = this.moles;
    if (total <= 0 || n <= 0) return { mass: 0, mgFraction: this.mgFraction };
    const draw = Math.min(n, total);
    const frac = draw / total;
    const mgFraction = this.mgFraction;
    let mass = 0;
    for (const key of Object.keys(this.pools) as OxideKey[]) {
      const removed = (this.pools[key] || 0) * frac;
      mass += removed * FW[key];
      this.pools[key] = (this.pools[key] || 0) - removed;
    }
    return { mass, mgFraction };
  }
}

/**
 * Computes the CIPW norm.
 *
 * @param oxides wt% oxides. Should normally be normalized volatile-free first,
 *               but the calculation is valid on any consistent basis.
 */
export function calculateCIPWNorm(
  oxides: OxideComposition,
  options: CIPWOptions = {}
): CIPWNorm {
  const sio2Wt = val(oxides.SiO2);
  const ratio =
    options.fe2o3FeoRatio !== undefined
      ? options.fe2o3FeoRatio
      : suggestedFe2O3FeORatio(sio2Wt);

  const iron = resolveIron(oxides, { fe2o3FeoRatio: ratio });

  // --- Molar proportions -------------------------------------------------
  let Si = val(oxides.SiO2) / FW.SiO2;
  let Ti = val(oxides.TiO2) / FW.TiO2;
  let Al = val(oxides.Al2O3) / FW.Al2O3;
  let Fe3 = iron.Fe2O3 / FW.Fe2O3;
  const Fe2 = iron.FeO / FW.FeO;
  let Ca = val(oxides.CaO) / FW.CaO;
  let Na = val(oxides.Na2O) / FW.Na2O;
  let K = val(oxides.K2O) / FW.K2O;
  const P = val(oxides.P2O5) / FW.P2O5;
  let Cr = val(oxides.Cr2O3) / FW.Cr2O3;
  const CO2 = val(oxides.CO2) / FW.CO2;

  // Divalent mafic pool: MgO + FeO + MnO + NiO, treated as one component.
  const mafic = new MaficPool({
    MgO: val(oxides.MgO) / FW.MgO,
    FeO: Fe2,
    MnO: val(oxides.MnO) / FW.MnO,
    NiO: val(oxides.NiO) / FW.NiO,
  });

  // Phase masses are accumulated in a plain numeric map, then copied onto the
  // CIPWNorm (whose index signature also admits strings and booleans for the
  // diagnostic fields).
  const phases: Record<string, number> = {};
  const add = (phase: string, mass: number) => {
    if (mass > 1e-9) phases[phase] = (phases[phase] || 0) + mass;
  };

  // Formula-moles of each normative phase, tracked in parallel with mass so
  // the cation norm can be derived without a second allocation pass.
  // Irvine & Baragar (1971) express every criterion in the CATION norm, so
  // this is needed for their published equations.
  const molesOf: Record<string, number> = {};
  const addMol = (phase: string, n: number) => {
    if (n > 1e-12) molesOf[phase] = (molesOf[phase] || 0) + n;
  };

  // --- 1. Calcite from CO2 ----------------------------------------------
  if (CO2 > 0 && Ca > 0) {
    const cc = Math.min(CO2, Ca);
    Ca -= cc;
    add('Cc', cc * (FW.CaO + FW.CO2));
    addMol('Cc', cc);
  }

  // --- 2. Apatite: Ca5(PO4)3(OH), 3.333 CaO per P2O5 ---------------------
  if (P > 0) {
    const caNeeded = 3.3333 * P;
    const ap = Ca >= caNeeded ? P : Ca / 3.3333;
    const caUsed = 3.3333 * ap;
    Ca -= caUsed;
    add('Ap', ap * FW.P2O5 + caUsed * FW.CaO);
    addMol('Ap', ap / 1.5); // Ca5(PO4)3 contains 1.5 P2O5
  }

  // --- 3. Chromite: FeCr2O4 ---------------------------------------------
  if (Cr > 0 && mafic.moles > 0) {
    const cm = Math.min(Cr, mafic.moles);
    const drawn = mafic.take(cm);
    Cr -= cm;
    add('Cm', cm * FW.Cr2O3 + drawn.mass);
    addMol('Cm', cm);
  }

  // --- 4. Ilmenite: FeTiO3; leftover TiO2 -> rutile ----------------------
  if (Ti > 0 && mafic.moles > 0) {
    const il = Math.min(Ti, mafic.moles);
    const drawn = mafic.take(il);
    Ti -= il;
    add('Il', il * FW.TiO2 + drawn.mass);
    addMol('Il', il);
  }
  if (Ti > 0) {
    add('Ru', Ti * FW.TiO2);
    addMol('Ru', Ti);
    Ti = 0;
  }

  // --- 5. Feldspars (provisional), with peralkaline handling -------------
  // Orthoclase: 1 K2O + 1 Al2O3 + 6 SiO2 (= 2 KAlSi3O8)
  let or_ = Math.min(K, Al);
  Al -= or_;
  K -= or_;

  // Albite: 1 Na2O + 1 Al2O3 + 6 SiO2 (= 2 NaAlSi3O8)
  let ab = Math.min(Na, Al);
  Al -= ab;
  Na -= ab;

  // Excess Na (peralkaline): acmite first, then sodium metasilicate.
  let ac = 0;
  let ns = 0;
  if (Na > 0) {
    ac = Math.min(Na, Fe3);
    Fe3 -= ac;
    Na -= ac;
    if (Na > 0) {
      ns = Na;
      Na = 0;
    }
  }

  // Excess K (very rare): potassium metasilicate.
  let ks = 0;
  if (K > 0) {
    ks = K;
    K = 0;
  }

  // --- 6. Magnetite from remaining Fe2O3; leftover -> hematite -----------
  let mt = 0;
  if (Fe3 > 0 && mafic.moles > 0) {
    mt = Math.min(Fe3, mafic.moles);
    Fe3 -= mt;
  }
  // (mass accounted below, after the mafic pool is drawn on)

  // --- 7. Anorthite, corundum -------------------------------------------
  const an = Math.min(Al, Ca);
  Al -= an;
  Ca -= an;
  const co = Al > 0 ? Al : 0; // corundum
  Al = 0;

  // --- 8. Diopside and hypersthene --------------------------------------
  // Magnetite draws from the mafic pool before the silicates.
  const mtDraw = mafic.take(mt);
  add('Mt', mt * FW.Fe2O3 + mtDraw.mass);
  addMol('Mt', mt);
  if (Fe3 > 0) {
    add('Hm', Fe3 * FW.Fe2O3);
    addMol('Hm', Fe3);
    Fe3 = 0;
  }

  let di = Math.min(Ca, mafic.moles);
  let wo = Ca - di; // excess Ca -> wollastonite
  Ca = 0;

  // --- 9. Silica budget --------------------------------------------------
  // SiO2 per unit: Or 6, Ab 6, An 2, Ac 4, Ns 1, Ks 1, Di 2, Wo 1, Hy 1,
  //                Ne 2, Lc 4, Ol 0.5 per mafic mole.
  let hy = mafic.moles - di;
  if (hy < 0) hy = 0;
  let ol = 0;
  let ne = 0;
  let lc = 0;

  const siFor = () =>
    or_ * 6 + ab * 6 + an * 2 + ac * 4 + ns + ks + di * 2 + wo + hy + ol * 0.5 + ne * 2 + lc * 4;

  let deficit = siFor() - Si;

  if (deficit > 1e-12) {
    // (a) Hypersthene -> olivine. 2 Hy -> 1 Ol releases 1 SiO2;
    //     expressed per mafic mole, the release is 0.5 SiO2.
    const fromHy = Math.min(hy, deficit * 2);
    hy -= fromHy;
    ol += fromHy;
    deficit -= fromHy * 0.5;
  }

  if (deficit > 1e-12 && ab > 0) {
    // (b) Albite -> nepheline. Releases 4 SiO2 per Na2O unit.
    const conv = Math.min(ab, deficit / 4);
    ab -= conv;
    ne += conv;
    deficit -= conv * 4;
  }

  if (deficit > 1e-12 && or_ > 0) {
    // (c) Orthoclase -> leucite. Releases 2 SiO2 per K2O unit.
    const conv = Math.min(or_, deficit / 2);
    or_ -= conv;
    lc += conv;
    deficit -= conv * 2;
  }

  if (deficit > 1e-12 && di > 0) {
    // (d) Diopside -> wollastonite + olivine. Releases 0.5 SiO2 per unit.
    const conv = Math.min(di, deficit * 2);
    di -= conv;
    wo += conv;
    ol += conv;
    deficit -= conv * 0.5;
  }

  const quartz = deficit < 0 ? -deficit : 0;
  const silicaBalance = deficit > 1e-9 ? deficit : 0;

  // --- 10. Accumulate silicate masses -----------------------------------
  if (or_ > 0) { add('Or', or_ * (FW.K2O + FW.Al2O3 + 6 * FW.SiO2)); addMol('Or', 2 * or_); }
  if (lc > 0) { add('Lc', lc * (FW.K2O + FW.Al2O3 + 4 * FW.SiO2)); addMol('Lc', 2 * lc); }
  if (ks > 0) { add('Ks', ks * (FW.K2O + FW.SiO2)); addMol('Ks', ks); }
  if (ab > 0) { add('Ab', ab * (FW.Na2O + FW.Al2O3 + 6 * FW.SiO2)); addMol('Ab', 2 * ab); }
  if (ne > 0) { add('Ne', ne * (FW.Na2O + FW.Al2O3 + 2 * FW.SiO2)); addMol('Ne', 2 * ne); }
  if (ac > 0) { add('Ac', ac * (FW.Na2O + FW.Fe2O3 + 4 * FW.SiO2)); addMol('Ac', 2 * ac); }
  if (ns > 0) { add('Ns', ns * (FW.Na2O + FW.SiO2)); addMol('Ns', ns); }
  if (an > 0) { add('An', an * (FW.CaO + FW.Al2O3 + 2 * FW.SiO2)); addMol('An', an); }
  if (co > 0) { add('C', co * FW.Al2O3); addMol('C', co); }
  if (wo > 0) { add('Wo', wo * (FW.CaO + FW.SiO2)); addMol('Wo', wo); }

  if (di > 0) {
    const drawn = mafic.take(di);
    add('Di', di * FW.CaO + drawn.mass + di * 2 * FW.SiO2);
    addMol('Di', di);
  }
  if (hy > 0) {
    const drawn = mafic.take(hy);
    add('Hy', drawn.mass + hy * FW.SiO2);
    addMol('Hy', hy);
  }
  if (ol > 0) {
    const drawn = mafic.take(ol);
    add('Ol', drawn.mass + ol * 0.5 * FW.SiO2);
    addMol('Ol', ol);
  }
  if (quartz > 0) { add('Q', quartz * FW.SiO2); addMol('Q', quartz); }

  // --- 11. Totals and diagnostics ---------------------------------------
  const norm: CIPWNorm = {};
  let normSum = 0;
  for (const v of Object.values(phases)) normSum += v;
  for (const [k, v] of Object.entries(phases)) {
    norm[k] = Number(v.toFixed(2));
  }

  norm.normSum = Number(normSum.toFixed(2));
  norm.totalNorm = Number(normSum.toFixed(2));
  norm.silicaBalance = Number(silicaBalance.toFixed(6));
  norm.ironBasis = iron.basis;
  norm.ironSplitEstimated = iron.isSplitEstimated;

  lastCationNorm = cationNormFrom(molesOf);

  return norm;
}

/** Cations per formula unit of each normative phase. */
const CATIONS_PER_FORMULA: Record<string, number> = {
  Q: 1,      // SiO2
  C: 2,      // Al2O3
  Or: 5,     // KAlSi3O8
  Ab: 5,     // NaAlSi3O8
  An: 5,     // CaAl2Si2O8
  Lc: 4,     // KAlSi2O6
  Ne: 3,     // NaAlSiO4
  Ac: 4,     // NaFe3+Si2O6
  Ns: 3,     // Na2SiO3
  Ks: 3,     // K2SiO3
  Di: 4,     // Ca(Mg,Fe)Si2O6
  Wo: 2,     // CaSiO3
  Hy: 2,     // (Mg,Fe)SiO3
  Ol: 3,     // (Mg,Fe)2SiO4
  Mt: 3,     // Fe3O4
  Hm: 2,     // Fe2O3
  Il: 2,     // FeTiO3
  Ru: 1,     // TiO2
  Cm: 3,     // FeCr2O4
  Ap: 8,     // Ca5(PO4)3
  Cc: 2,     // CaCO3
};

function cationNormFrom(molesOf: Record<string, number>): CationNorm {
  const cations: Record<string, number> = {};
  let total = 0;
  for (const [ph, n] of Object.entries(molesOf)) {
    const c = (CATIONS_PER_FORMULA[ph] ?? 1) * n;
    cations[ph] = c;
    total += c;
  }
  const pct: Record<string, number> = {};
  if (total > 0) {
    for (const [ph, c] of Object.entries(cations)) pct[ph] = (c / total) * 100;
  }

  const An = pct.An || 0;
  const Ab = pct.Ab || 0;
  const Ne = pct.Ne || 0;
  // Table 1: Ab' = Ab + 5/3 Ne; plagioclase composition = 100 An/(An + Ab')
  const abPrime = Ab + (5 / 3) * Ne;
  const plagioclase = An + abPrime > 0 ? (100 * An) / (An + abPrime) : undefined;

  // Table 1: color index = Ol + Opx + Cpx + Mt + Il + Hm
  const colorIndex =
    (pct.Ol || 0) + (pct.Hy || 0) + (pct.Di || 0) + (pct.Mt || 0) + (pct.Il || 0) + (pct.Hm || 0);

  return { percent: pct, plagioclase, colorIndex, abPrime };
}

/**
 * Cation norm derived from the most recent `calculateCIPWNorm` call.
 *
 * Irvine & Baragar (1971) express every classification criterion in cation
 * norm percentages (their Table 1), so their published equations cannot be
 * evaluated from the weight norm alone.
 */
export interface CationNorm {
  /** Normative phases in cation percent. */
  percent: Record<string, number>;
  /** 100 An / (An + Ab'), where Ab' = Ab + 5/3 Ne. Their "P". */
  plagioclase?: number;
  /** Ol + Opx + Cpx + Mt + Il + Hm, cation percent. Their "CI". */
  colorIndex: number;
  /** Ab' = Ab + 5/3 Ne. */
  abPrime: number;
}

let lastCationNorm: CationNorm = { percent: {}, colorIndex: 0, abPrime: 0 };

/**
 * Computes the cation norm for a composition.
 * Runs the weight norm internally and converts the phase amounts.
 */
export function calculateCationNorm(
  oxides: OxideComposition,
  options: CIPWOptions = {}
): CationNorm {
  calculateCIPWNorm(oxides, options);
  return lastCationNorm;
}

/**
 * Renormalizes a norm to 100 wt%, returning only the mineral phases.
 * Use this for display and for ternary projections; use the raw norm for QC.
 */
export function normToPercent(norm: CIPWNorm): Record<string, number> {
  const sum = (norm.normSum as number) || 0;
  const out: Record<string, number> = {};
  if (sum <= 0) return out;
  for (const [key] of CIPW_PHASE_ORDER) {
    const v = norm[key];
    if (typeof v === 'number' && v > 0) {
      out[key] = Number(((v / sum) * 100).toFixed(2));
    }
  }
  return out;
}

/** Normative phase display names, in conventional CIPW order. */
export const CIPW_PHASE_ORDER: Array<[string, string]> = [
  ['Q', 'Quartz'],
  ['C', 'Corundum'],
  ['Or', 'Orthoclase'],
  ['Ab', 'Albite'],
  ['An', 'Anorthite'],
  ['Lc', 'Leucite'],
  ['Ne', 'Nepheline'],
  ['Ac', 'Acmite'],
  ['Ns', 'Sodium metasilicate'],
  ['Ks', 'Potassium metasilicate'],
  ['Di', 'Diopside'],
  ['Wo', 'Wollastonite'],
  ['Hy', 'Hypersthene'],
  ['Ol', 'Olivine'],
  ['Mt', 'Magnetite'],
  ['Hm', 'Hematite'],
  ['Il', 'Ilmenite'],
  ['Ru', 'Rutile'],
  ['Cm', 'Chromite'],
  ['Ap', 'Apatite'],
  ['Cc', 'Calcite'],
];

/** Differentiation index (Thornton & Tuttle 1960): Q + Or + Ab + Ne + Lc. */
export function differentiationIndex(norm: CIPWNorm): number {
  return Number(
    (
      (norm.Q || 0) +
      (norm.Or || 0) +
      (norm.Ab || 0) +
      (norm.Ne || 0) +
      (norm.Lc || 0)
    ).toFixed(2)
  );
}

/** Normative plagioclase anorthite content, An / (An + Ab) x 100. */
export function normativeAn(norm: CIPWNorm): number | undefined {
  const an = norm.An || 0;
  const ab = norm.Ab || 0;
  if (an + ab <= 0) return undefined;
  return Number(((an / (an + ab)) * 100).toFixed(1));
}

function val(v: number | undefined): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0;
}
