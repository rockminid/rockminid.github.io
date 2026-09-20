/**
 * Canonical iron handling for the whole application.
 *
 * Every module that needs iron MUST go through `resolveIron`. Previously the
 * engine, the AFM projection and the batch processor each had their own
 * conversion, which disagreed with one another and silently double-counted
 * FeOT against component FeO/Fe2O3 in GEOROC rows.
 *
 * Conventions:
 *   FeO*  (total iron expressed as FeO) = FeO + 0.8998 x Fe2O3
 *   Fe2O3 = FeO x 1.1113
 */

import { OxideComposition } from '../types/geochem';

/** Fe2O3 -> FeO mass conversion factor (2 x 71.844 / 159.688). */
export const FE2O3_TO_FEO = 0.8998;

/** FeO -> Fe2O3 mass conversion factor. */
export const FEO_TO_FE2O3 = 1 / FE2O3_TO_FEO;

export type IronBasis =
  | 'FeO+Fe2O3'
  | 'FeOT'
  | 'Fe2O3T'
  | 'FeO'
  | 'Fe2O3'
  | 'none';

export interface ResolvedIron {
  /** Total iron as FeO (FeO*). Always defined. */
  FeOT: number;
  /** Total iron as Fe2O3. */
  Fe2O3T: number;
  /** Ferrous iron to use downstream (may be an estimated split). */
  FeO: number;
  /** Ferric iron to use downstream (may be an estimated split). */
  Fe2O3: number;
  /** Which input fields the total was derived from. */
  basis: IronBasis;
  /** True when the source reported both components and a total that disagree. */
  ambiguous: boolean;
  /** True when FeO/Fe2O3 were estimated from a total rather than measured. */
  isSplitEstimated: boolean;
}

export interface IronOptions {
  /**
   * Fe2O3/FeO weight ratio used to split a reported total into ferric and
   * ferrous iron when only a total is available.
   *
   * Common choices (Middlemost 1989): 0.2 for basalt/gabbro, 0.3 for
   * andesite/diorite, 0.4 for dacite, 0.5 for rhyolite/granite.
   * Le Maitre (1976) offers a silica-dependent alternative.
   */
  fe2o3FeoRatio?: number;
  /** Relative tolerance for declaring a reported total inconsistent. */
  tolerance?: number;
}

/**
 * Middlemost (1989) recommended Fe2O3/FeO ratios by silica content.
 * Used when a caller asks for an automatic split.
 */
export function suggestedFe2O3FeORatio(sio2: number | undefined): number {
  if (sio2 === undefined || !Number.isFinite(sio2)) return 0.2;
  if (sio2 < 45) return 0.15; // ultrabasic
  if (sio2 < 52) return 0.2; // basalt / gabbro
  if (sio2 < 57) return 0.25; // basaltic andesite
  if (sio2 < 63) return 0.3; // andesite / diorite
  if (sio2 < 69) return 0.4; // dacite / granodiorite
  return 0.5; // rhyolite / granite
}

/**
 * Resolves any combination of iron fields into a single consistent set.
 *
 * Precedence: measured components (FeO + Fe2O3) win over a reported total,
 * because they carry the oxidation state. A reported total is used only when
 * no components are present. The two are never added together.
 */
export function resolveIron(
  oxides: OxideComposition,
  options: IronOptions = {}
): ResolvedIron {
  const tolerance = options.tolerance ?? 0.02;

  const feo = num(oxides.FeO);
  const fe2o3 = num(oxides.Fe2O3);
  const feot = num(oxides.FeOT);
  const fe2o3t = num(oxides.Fe2O3T);

  const hasComponents = feo !== undefined || fe2o3 !== undefined;
  const hasTotal = feot !== undefined || fe2o3t !== undefined;

  let FeOT: number;
  let basis: IronBasis;
  let ambiguous = false;
  let isSplitEstimated = false;
  let outFeO: number;
  let outFe2O3: number;

  if (hasComponents) {
    const f2 = feo ?? 0;
    const f3 = fe2o3 ?? 0;
    FeOT = f2 + FE2O3_TO_FEO * f3;
    basis = feo !== undefined && fe2o3 !== undefined ? 'FeO+Fe2O3' : feo !== undefined ? 'FeO' : 'Fe2O3';
    outFeO = f2;
    outFe2O3 = f3;

    // If a total was ALSO reported, check it rather than adding it.
    if (hasTotal) {
      const reported = feot ?? FE2O3_TO_FEO * (fe2o3t as number);
      if (FeOT > 0 && Math.abs(reported - FeOT) / Math.max(FeOT, 1e-9) > tolerance) {
        ambiguous = true;
      }
    }
  } else if (hasTotal) {
    FeOT = feot ?? FE2O3_TO_FEO * (fe2o3t as number);
    basis = feot !== undefined ? 'FeOT' : 'Fe2O3T';

    const ratio = options.fe2o3FeoRatio;
    if (ratio !== undefined && ratio > 0) {
      // Split FeO* into FeO + Fe2O3 such that Fe2O3/FeO = ratio by weight
      // and FeO + 0.8998 x Fe2O3 reproduces FeO*.
      outFeO = FeOT / (1 + FE2O3_TO_FEO * ratio);
      outFe2O3 = outFeO * ratio;
      isSplitEstimated = true;
    } else {
      outFeO = FeOT;
      outFe2O3 = 0;
    }
  } else {
    FeOT = 0;
    basis = 'none';
    outFeO = 0;
    outFe2O3 = 0;
  }

  return {
    FeOT: round(FeOT),
    Fe2O3T: round(FeOT * FEO_TO_FE2O3),
    FeO: round(outFeO),
    Fe2O3: round(outFe2O3),
    basis,
    ambiguous,
    isSplitEstimated,
  };
}

/**
 * Total iron as FeO. Thin wrapper kept for call sites that only need the number.
 */
export function totalIronAsFeO(oxides: OxideComposition): number {
  return resolveIron(oxides).FeOT;
}

/** Oxide keys that represent iron in any form. */
export const IRON_KEYS = ['FeO', 'Fe2O3', 'FeOT', 'Fe2O3T', 'FeO_equiv'] as const;

function num(v: number | undefined): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : undefined;
}

function round(v: number): number {
  return Number(v.toFixed(6));
}
