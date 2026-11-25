import { OxideComposition } from '../types/geochem';

/**
 * Trace elements and normalized multi-element ("spider") diagrams.
 *
 * Normalizing values are those of Sun & McDonough (1989), Chemical and
 * isotopic systematics of oceanic basalts, Geol. Soc. London Spec. Publ. 42,
 * 313-345, https://doi.org/10.1144/GSL.SP.1989.042.01.19: CI chondrite for
 * the REE plot and primitive mantle for the extended plot. All values ppm.
 */

/** Rare earth elements, in the order they are plotted. */
export const REE = ['La', 'Ce', 'Pr', 'Nd', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb', 'Lu'] as const;

/** Primitive-mantle diagram order (incompatible to compatible). */
export const PM_ORDER = [
  'Cs', 'Rb', 'Ba', 'Th', 'U', 'Nb', 'Ta', 'K', 'La', 'Ce', 'Pb', 'Pr', 'Sr', 'P', 'Nd', 'Zr', 'Hf',
  'Sm', 'Eu', 'Ti', 'Gd', 'Tb', 'Dy', 'Y', 'Ho', 'Er', 'Tm', 'Yb', 'Lu',
] as const;

/** Elements entered directly in ppm. K, P and Ti come from the major oxides. */
export const TRACE_INPUTS = PM_ORDER.filter((e) => e !== 'K' && e !== 'P' && e !== 'Ti');

export const CHONDRITE_SM89: Record<string, number> = {
  La: 0.237, Ce: 0.612, Pr: 0.095, Nd: 0.467, Sm: 0.153, Eu: 0.058, Gd: 0.2055,
  Tb: 0.0374, Dy: 0.254, Ho: 0.0566, Er: 0.1655, Tm: 0.0255, Yb: 0.17, Lu: 0.0254,
};

export const PRIMITIVE_MANTLE_SM89: Record<string, number> = {
  Cs: 0.032, Rb: 0.635, Ba: 6.989, Th: 0.085, U: 0.021, Nb: 0.713, Ta: 0.041, K: 250,
  La: 0.687, Ce: 1.775, Pb: 0.071, Pr: 0.276, Sr: 21.1, P: 95, Nd: 1.354, Zr: 11.2,
  Hf: 0.309, Sm: 0.444, Eu: 0.168, Ti: 1300, Gd: 0.596, Tb: 0.108, Dy: 0.737, Y: 4.55,
  Ho: 0.164, Er: 0.48, Tm: 0.074, Yb: 0.493, Lu: 0.074,
};

export type TraceElements = Partial<Record<string, number>>;

/** Mass fraction of the element in its oxide, for K, P and Ti in ppm. */
const OXIDE_TO_PPM: Record<string, [string, number]> = {
  K: ['K2O', 0.830147],
  P: ['P2O5', 0.436421],
  Ti: ['TiO2', 0.599508],
};

/** Trace values plus K, P and Ti derived from the major oxides (wt% -> ppm). */
export function withMajorElements(trace: TraceElements, oxides: OxideComposition): TraceElements {
  const out: TraceElements = { ...trace };
  for (const [el, [oxide, f]] of Object.entries(OXIDE_TO_PPM)) {
    const v = oxides[oxide];
    if (out[el] === undefined && typeof v === 'number' && v > 0) out[el] = v * f * 1e4;
  }
  return out;
}

export interface NormalizedPoint {
  element: string;
  value: number;
}

/** Normalized values in plotting order; elements without data are omitted. */
export function normalize(
  trace: TraceElements,
  reference: Record<string, number>,
  order: readonly string[]
): NormalizedPoint[] {
  const out: NormalizedPoint[] = [];
  for (const el of order) {
    const v = trace[el];
    if (typeof v === 'number' && v > 0 && reference[el]) out.push({ element: el, value: v / reference[el] });
  }
  return out;
}

export interface TraceRatios {
  /** Europium anomaly, Eu_N / sqrt(Sm_N x Gd_N), chondrite-normalized. */
  euAnomaly?: number;
  /** (La/Yb)_N, chondrite-normalized slope of the REE pattern. */
  laYbN?: number;
  /** Nb/La, raw; well below 1 is the arc (subduction) signature. */
  nbLa?: number;
  /** Zr/Y, raw. */
  zrY?: number;
}

export function traceRatios(trace: TraceElements): TraceRatios {
  const n = (el: string) => {
    const v = trace[el];
    return typeof v === 'number' && v > 0 ? v / CHONDRITE_SM89[el] : undefined;
  };
  const raw = (el: string) => {
    const v = trace[el];
    return typeof v === 'number' && v > 0 ? v : undefined;
  };
  const eu = n('Eu'), sm = n('Sm'), gd = n('Gd'), la = n('La'), yb = n('Yb');
  return {
    euAnomaly: eu && sm && gd ? eu / Math.sqrt(sm * gd) : undefined,
    laYbN: la && yb ? la / yb : undefined,
    nbLa: raw('Nb') && raw('La') ? raw('Nb')! / raw('La')! : undefined,
    zrY: raw('Zr') && raw('Y') ? raw('Zr')! / raw('Y')! : undefined,
  };
}

/** Maps a CSV header to a trace element symbol, or null. */
export function mapHeaderToTrace(rawHeader: string): string | null {
  const m = rawHeader.trim().match(/^([A-Z][a-z]?)(?:\s*[_(\[]?\s*(?:ppm|µg\/g|ug\/g)\s*[)\]]?)?$/);
  if (!m) return null;
  return (TRACE_INPUTS as readonly string[]).includes(m[1]) ? m[1] : null;
}
