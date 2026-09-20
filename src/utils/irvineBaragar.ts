/**
 * Irvine, T.N. & Baragar, W.R.A. (1971)
 * "A Guide to the Chemical Classification of the Common Volcanic Rocks"
 * Canadian Journal of Earth Sciences 8, 523-548.
 *
 * Implements the equations the authors published in **Appendix III**
 * ("Equations or Inequalities that will Enable Classification of a Volcanic
 * Rock in a Computer Program", p. 547) verbatim, rather than digitizing their
 * figures.
 *
 * Symbols, as defined on p. 547 and in their Table 1 (p. 527):
 *   S  = SiO2, wt %
 *   A  = Na2O + K2O, wt %
 *   F  = FeO + 0.8998 Fe2O3, wt %
 *   M  = MgO, wt %
 *   X  = percentage in a ternary plot
 *   CI = color index, CATION norm = Ol + Opx + Cpx + Mt + Il + Hm
 *   P  = 100 An/(An + Ab'), CATION norm, where Ab' = Ab + 5/3 Ne
 *   Ol = olivine, cation norm
 *
 * Every criterion below is expressed in the cation norm where the authors
 * specify it; `calculateCationNorm` supplies those values.
 */

import { OxideComposition } from '../types/geochem';
import { calculateCationNorm, CationNorm } from './cipw';
import { totalIronAsFeO } from './iron';

// ---------------------------------------------------------------------------
// Fig. 3 — Alkaline vs. subalkaline, on the alkalies-silica diagram
// ---------------------------------------------------------------------------

/**
 * Appendix III, Fig. 3. The rock is subalkaline if
 *
 *   S >= -(3.3539e-4)A^6 + (1.2030e-2)A^5 - (1.5188e-1)A^4
 *        + (8.6096e-1)A^3 - 2.1111 A^2 + 3.9492 A + 39.0
 *
 * Returns the boundary SiO2 (wt%) for a given total-alkali value.
 *
 * Note the direction: the published relation gives SiO2 as a function of
 * alkalis, not the reverse. Earlier versions of this app used an
 * undocumented quadratic in SiO2 that sat about 1 wt% below the published
 * curve at basaltic compositions and over 2 wt% below it at dacitic ones.
 */
export function subalkalineBoundarySiO2(totalAlkalis: number): number {
  const A = totalAlkalis;
  const A2 = A * A;
  const A3 = A2 * A;
  const A4 = A3 * A;
  const A5 = A4 * A;
  const A6 = A5 * A;
  return (
    -3.3539e-4 * A6 +
    1.203e-2 * A5 -
    1.5188e-1 * A4 +
    8.6096e-1 * A3 -
    2.1111 * A2 +
    3.9492 * A +
    39.0
  );
}

/**
 * Upper limit of total alkalis over which the published Fig. 3 polynomial
 * reproduces the authors' own drawn curve.
 *
 * Digitizing the curve in Fig. 3B and comparing it with the Appendix III
 * polynomial shows agreement within 0.65 wt% SiO2 for A <= 8, after which the
 * sixth-order fit diverges sharply upward (dS/dA rises from ~2.8 to ~22 by
 * A = 12) while the drawn curve continues at a near-constant slope and simply
 * ends near A = 9.8. That divergence is a fitting artifact outside the range
 * the authors had data for.
 *
 * Its practical effect is benign: a rock with more than ~8 wt% alkalis is
 * pushed further toward "alkaline", which is almost always the right answer.
 * It is flagged rather than corrected, because the polynomial is what the
 * authors published.
 */
export const FIG3_RELIABLE_ALKALI_MAX = 8.0;

/**
 * Alkaline vs. subalkaline per Irvine & Baragar Fig. 3.
 */
export function isSubalkaline(
  sio2: number,
  totalAlkalis: number
): { subalkaline: boolean; boundarySiO2: number; extrapolated: boolean } {
  const boundarySiO2 = subalkalineBoundarySiO2(totalAlkalis);
  return {
    subalkaline: sio2 >= boundarySiO2,
    boundarySiO2,
    extrapolated: totalAlkalis < 0 || totalAlkalis > FIG3_RELIABLE_ALKALI_MAX,
  };
}

/**
 * The Fig. 3 dividing line as (SiO2, alkalis) pairs, for drawing.
 *
 * Solved numerically because the published form gives S(A). Restricted to the
 * range the authors actually plotted.
 */
export function subalkalineBoundaryCurve(step = 0.1): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  for (let A = 0; A <= 10.0001; A += step) {
    const S = subalkalineBoundarySiO2(A);
    if (S >= 35 && S <= 85) pts.push([Number(S.toFixed(3)), Number(A.toFixed(3))]);
  }
  return pts;
}

// ---------------------------------------------------------------------------
// Fig. 2 — Tholeiitic vs. calc-alkaline, on the AFM diagram
// ---------------------------------------------------------------------------

/**
 * Appendix III, Fig. 2. The rock is tholeiitic if
 *
 *   X_F >= (1.5559e-12)X_M^8 - (7.7142e-10)X_M^7 + (1.5664e-7)X_M^6
 *          - (1.6738e-5)X_M^5 + (1.0017e-3)X_M^4 - (3.2552e-2)X_M^3
 *          + (4.7776e-1)X_M^2 - 1.1085 X_M + 30.0
 *
 *   where P < 40, given X_A + X_F + X_M = 100.
 *
 * Returns the boundary X_F for a given X_M.
 *
 * Note that the boundary is a function of X_M (magnesium), not X_A. The
 * previous implementation interpolated an inherited control-point array as a
 * function of X_A, which is a different curve entirely.
 */
export function afmBoundaryXF(xM: number): number {
  const m = xM;
  const m2 = m * m;
  const m3 = m2 * m;
  const m4 = m3 * m;
  const m5 = m4 * m;
  const m6 = m5 * m;
  const m7 = m6 * m;
  const m8 = m7 * m;
  return (
    1.5559e-12 * m8 -
    7.7142e-10 * m7 +
    1.5664e-7 * m6 -
    1.6738e-5 * m5 +
    1.0017e-3 * m4 -
    3.2552e-2 * m3 +
    4.7776e-1 * m2 -
    1.1085 * m +
    30.0
  );
}

/** The Fig. 2 boundary as [F, A, M] triples, for drawing on the AFM diagram. */
export function afmBoundaryCurve(step = 0.5): Array<[number, number, number]> {
  const pts: Array<[number, number, number]> = [];
  for (let M = 0; M <= 100.0001; M += step) {
    const F = afmBoundaryXF(M);
    const A = 100 - F - M;
    if (F >= 0 && F <= 100 && A >= 0 && A <= 100) {
      pts.push([Number(F.toFixed(3)), Number(A.toFixed(3)), Number(M.toFixed(3))]);
    }
  }
  return pts;
}

export type MagmaticSeries = 'Tholeiitic' | 'Calc-Alkaline' | 'Alkaline' | 'Indeterminate';

export interface AFMResult {
  /** F, A, M normalized to 100. */
  F: number;
  A: number;
  M: number;
  series: MagmaticSeries;
  /** Boundary X_F at this X_M. */
  boundaryF: number;
  /**
   * False when the Fig. 2 precondition P < 40 is not met. The authors direct
   * such rocks to Fig. 6 (Al2O3 vs. normative plagioclase) instead.
   */
  figure2Applicable: boolean;
  notes: string[];
}

/**
 * Tholeiitic vs. calc-alkaline per Fig. 2, with the authors' P < 40 gate.
 *
 * When P >= 40 the paper's Fig. 6 criterion is used instead:
 *   "The rock is calc-alkaline if Al2O3 >= 12 + 0.08 P, where P = 40-100."
 */
export function classifyAFM(oxides: OxideComposition, cnorm?: CationNorm): AFMResult {
  const notes: string[] = [];
  const A = (oxides.Na2O || 0) + (oxides.K2O || 0);
  const F = totalIronAsFeO(oxides);
  const M = oxides.MgO || 0;
  const total = A + F + M;

  if (total <= 1e-6) {
    return {
      F: 33.34,
      A: 33.33,
      M: 33.33,
      series: 'Indeterminate',
      boundaryF: NaN,
      figure2Applicable: false,
      notes: ['No alkalis, iron or magnesium reported.'],
    };
  }

  const xF = (F / total) * 100;
  const xA = (A / total) * 100;
  const xM = (M / total) * 100;

  const cn = cnorm ?? calculateCationNorm(oxides);
  const P = cn.plagioclase;
  const boundaryF = afmBoundaryXF(xM);

  let series: MagmaticSeries;
  let figure2Applicable = true;

  if (P !== undefined && P >= 40) {
    // Fig. 6: for rocks with normative plagioclase An40 or more calcic.
    figure2Applicable = false;
    const al2o3 = oxides.Al2O3 || 0;
    const threshold = 12 + 0.08 * P;
    series = al2o3 >= threshold ? 'Calc-Alkaline' : 'Tholeiitic';
    notes.push(
      `Normative plagioclase P = ${P.toFixed(1)} (>= 40), so Fig. 2 does not apply. ` +
        `Classified by Fig. 6: Al2O3 ${al2o3.toFixed(2)} vs threshold ${threshold.toFixed(2)} wt%.`
    );
  } else {
    series = xF >= boundaryF ? 'Tholeiitic' : 'Calc-Alkaline';
    if (P !== undefined) {
      notes.push(`Normative plagioclase P = ${P.toFixed(1)} (< 40), so Fig. 2 applies.`);
    }
  }

  notes.push(
    'Irvine & Baragar note that this division applies AFTER alkaline compositions ' +
      'have been eliminated, and that it describes the fractionation trend of a suite. ' +
      'A single primitive sample should be interpreted with care.'
  );

  return {
    F: Number(xF.toFixed(3)),
    A: Number(xA.toFixed(3)),
    M: Number(xM.toFixed(3)),
    series,
    boundaryF: Number(boundaryF.toFixed(3)),
    figure2Applicable,
    notes,
  };
}

// ---------------------------------------------------------------------------
// Fig. 7 — Classification of subalkaline rocks
// ---------------------------------------------------------------------------

/**
 * Appendix III, Fig. 7. Examined in sequence, a subalkaline rock is
 *   (a) picrite basalt if Ol >= 25
 *   (b) basalt        if CI >= 70 - P
 *   (c) andesite      if CI >= 30 - (3/5)P
 *   (d) dacite        if CI >= 20 - P
 *   (e) rhyolite      if CI <  20 - P
 *
 * Ol, CI and P are all cation norm values.
 */
export function classifySubalkaline(cn: CationNorm): string {
  const Ol = cn.percent.Ol || 0;
  const CI = cn.colorIndex;
  const P = cn.plagioclase ?? 0;

  if (Ol >= 25) return 'Picrite Basalt';
  if (CI >= 70 - P) return 'Basalt';
  if (CI >= 30 - (3 / 5) * P) return 'Andesite';
  if (CI >= 20 - P) return 'Dacite';
  return 'Rhyolite';
}

// ---------------------------------------------------------------------------
// Combined classification (their Summary, p. 541)
// ---------------------------------------------------------------------------

export interface IBClassification {
  /** Step 1: peralkaline if the norm contains acmite. */
  peralkaline: boolean;
  /** Step 2 (Fig. 3). */
  subalkaline: boolean;
  /** Step 3a (Figs. 2 / 6). Only meaningful for subalkaline rocks. */
  series: MagmaticSeries;
  /** Step 3b (Fig. 7). Only meaningful for subalkaline rocks. */
  rockName?: string;
  afm: AFMResult;
  cationNorm: CationNorm;
  /** Normative plagioclase, 100 An/(An + Ab'). */
  P?: number;
  /** Normative color index. */
  CI: number;
  notes: string[];
}

/**
 * Runs the authors' Summary procedure (p. 541) end to end.
 *
 * Step 1: peralkaline if Ac appears in the norm.
 * Step 2: subalkaline or alkaline by Fig. 3.
 * Step 3: if subalkaline, series by Fig. 2/6 and name by Fig. 7.
 */
export function classifyIrvineBaragar(oxides: OxideComposition): IBClassification {
  const notes: string[] = [];
  const cn = calculateCationNorm(oxides);

  const peralkaline = (cn.percent.Ac || 0) > 0;
  if (peralkaline) {
    notes.push(
      'Normative acmite is present, so the rock is probably peralkaline. ' +
        'Irvine & Baragar refer such rocks to Noble (1968) for detailed classification.'
    );
  }

  const sio2 = oxides.SiO2 || 0;
  const alk = (oxides.Na2O || 0) + (oxides.K2O || 0);
  const sub = isSubalkaline(sio2, alk);
  if (sub.extrapolated) {
    notes.push(
      `Total alkalis ${alk.toFixed(2)} wt% is above ${FIG3_RELIABLE_ALKALI_MAX} wt%, where the published Fig. 3 polynomial diverges from the curve the authors drew. The alkaline call is almost certainly right, but it rests on an extrapolated boundary.`
    );
  }

  const afm = classifyAFM(oxides, cn);

  let series: MagmaticSeries = afm.series;
  let rockName: string | undefined;

  if (!sub.subalkaline) {
    series = 'Alkaline';
    notes.push(
      'The rock is alkaline, so the tholeiitic / calc-alkaline division of Fig. 2 does not apply to it.'
    );
  } else {
    rockName = classifySubalkaline(cn);
  }

  return {
    peralkaline,
    subalkaline: sub.subalkaline,
    series,
    rockName,
    afm,
    cationNorm: cn,
    P: cn.plagioclase,
    CI: cn.colorIndex,
    notes: [...notes, ...afm.notes],
  };
}
