/**
 * Deterministic geochemical classification engine.
 *
 * Everything in this module is a reproducible calculation. No AI is involved
 * in classification: the optional Gemini integration produces interpretation
 * text only, downstream of the numbers computed here.
 */

import {
  ClassificationReport,
  CIPWNorm,
  ElementComposition,
  InputMode,
  MatchScore,
  MineralReference,
  OxideComposition,
  RockReference,
  SampleStoichiometry,
  SampleType,
  DataQualityFlag,
} from '../types/geochem';
import { MINERALS_DATASET } from '../data/mineralsDataset';
import { ROCKS_DATASET } from '../data/rocksDataset';
import { elementsToOxides, oxidesToElements } from '../data/stoichiometry';
import { resolveIron, suggestedFe2O3FeORatio } from './iron';
import { calculateCIPWNorm, differentiationIndex, normativeAn } from './cipw';
import { classifyTAS, tasApplicability, irvineBaragarBoundary } from './tas';

export { resolveIron, suggestedFe2O3FeORatio } from './iron';
export { calculateCIPWNorm, normToPercent, CIPW_PHASE_ORDER, differentiationIndex, normativeAn } from './cipw';
export { classifyTAS, tasApplicability, irvineBaragarBoundary, TAS_VOLCANIC_FIELDS } from './tas';

export const MAJOR_OXIDES = [
  'SiO2',
  'TiO2',
  'Al2O3',
  'Fe2O3',
  'FeO',
  'MnO',
  'MgO',
  'CaO',
  'Na2O',
  'K2O',
  'P2O5',
  'Cr2O3',
  'NiO',
  'LOI',
] as const;

/** Oxides excluded from a volatile-free basis. */
const VOLATILES = ['LOI', 'H2O', 'H2O+', 'H2O-', 'CO2', 'SO3', 'F', 'Cl', 'S'];

/** Iron fields that duplicate other iron fields and must not be summed twice. */
const IRON_TOTALS = ['FeOT', 'Fe2O3T', 'FeO_equiv'];

/**
 * Analytical total of a composition, counting iron exactly once.
 *
 * GEOROC rows routinely carry FeO, Fe2O3, FeOT and FeO_equiv simultaneously.
 * Naively summing every field inflates the total by roughly the iron content
 * and produced spurious "high total" warnings.
 */
export function analyticalTotal(oxides: OxideComposition): number {
  const iron = resolveIron(oxides);
  let total = 0;

  for (const [key, v] of Object.entries(oxides)) {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) continue;
    if (key === 'FeO' || key === 'Fe2O3' || IRON_TOTALS.includes(key)) continue;
    total += v;
  }

  // Add iron once, in whichever form was actually measured.
  if (iron.basis === 'FeO+Fe2O3' || iron.basis === 'FeO' || iron.basis === 'Fe2O3') {
    total += (oxides.FeO || 0) + (oxides.Fe2O3 || 0);
  } else if (iron.basis === 'FeOT') {
    total += oxides.FeOT || 0;
  } else if (iron.basis === 'Fe2O3T') {
    total += oxides.Fe2O3T || 0;
  }

  return Number(total.toFixed(3));
}

/**
 * Normalizes oxides to 100 wt%, optionally on a volatile-free basis.
 *
 * Unlike the previous version this does not round each oxide to 2 dp before
 * summing, so the normalized composition totals exactly 100.
 */
export function normalizeOxides(
  oxides: OxideComposition,
  volatileFree: boolean = true
): { normalized: OxideComposition; rawTotal: number } {
  const rawTotal = analyticalTotal(oxides);
  const cleaned: OxideComposition = {};
  let total = 0;

  for (const [key, val] of Object.entries(oxides)) {
    if (typeof val !== 'number' || !Number.isFinite(val) || val < 0) continue;
    if (volatileFree && VOLATILES.includes(key)) continue;
    // Iron totals are carried through but excluded from the sum, so they
    // cannot be double-counted against FeO/Fe2O3.
    if (IRON_TOTALS.includes(key)) continue;
    cleaned[key] = val;
    total += val;
  }

  if (total <= 0) {
    return { normalized: { ...oxides }, rawTotal };
  }

  const factor = 100 / total;
  const normalized: OxideComposition = {};
  for (const [key, val] of Object.entries(cleaned)) {
    if (val !== undefined) normalized[key] = val * factor;
  }

  // Re-attach total iron on the normalized basis for downstream consumers.
  const iron = resolveIron(normalized);
  if (iron.basis !== 'none') normalized.FeOT = iron.FeOT;

  return { normalized, rawTotal };
}

/**
 * Data quality assessment, reported as explicit flags rather than one string.
 */
export function assessDataQuality(
  oxides: OxideComposition,
  sampleType: SampleType = 'unknown'
): DataQualityFlag[] {
  const flags: DataQualityFlag[] = [];
  const total = analyticalTotal(oxides);
  const iron = resolveIron(oxides);

  if (total < 95) {
    flags.push({
      code: 'low-total',
      severity: total < 90 ? 'error' : 'warning',
      message: `Low analytical total (${total.toFixed(2)} wt%). Unmeasured volatiles, trace phases, or incomplete analysis.`,
    });
  } else if (total > 105) {
    flags.push({
      code: 'high-total',
      severity: total > 110 ? 'error' : 'warning',
      message: `High analytical total (${total.toFixed(2)} wt%). Check calibration or duplicate reporting.`,
    });
  }

  if (iron.ambiguous) {
    flags.push({
      code: 'iron-ambiguous',
      severity: 'warning',
      message:
        'Reported total iron disagrees with FeO + 0.8998 x Fe2O3 by more than 2%. Component values were used.',
    });
  }

  if (iron.isSplitEstimated) {
    flags.push({
      code: 'iron-split-estimated',
      severity: 'info',
      message:
        'Only total iron was reported. Fe2O3/FeO was estimated from silica content (Middlemost 1989) for the norm calculation.',
    });
  }

  if (iron.basis === 'none') {
    flags.push({
      code: 'iron-missing',
      severity: 'warning',
      message: 'No iron reported. Norm, Mg# and AFM projection will be unreliable.',
    });
  }

  const measured = MAJOR_OXIDES.filter(
    (o) => typeof oxides[o] === 'number' && Number.isFinite(oxides[o] as number)
  ).length;
  if (measured < 8) {
    flags.push({
      code: 'sparse-analysis',
      severity: 'warning',
      message: `Only ${measured} of ${MAJOR_OXIDES.length} major oxides reported. Matching uses fewer discriminating analytes.`,
    });
  }

  const loi = oxides.LOI;
  if (typeof loi === 'number' && loi > 3) {
    flags.push({
      code: 'high-loi',
      severity: 'warning',
      message: `LOI is ${loi.toFixed(2)} wt%. Alteration may have mobilized alkalis, affecting TAS and normative results.`,
    });
  }

  if (sampleType === 'mineral') {
    flags.push({
      code: 'sample-type-mineral',
      severity: 'info',
      message: 'Whole-rock diagrams (TAS, AFM, QAPF) and the CIPW norm are not defined for single mineral analyses.',
    });
  }

  return flags;
}

/**
 * Similarity of a sample to a reference rock composition.
 *
 * This is a weighted Euclidean distance in oxide space, converted to a
 * bounded 0-100 similarity score. The score is NOT a probability and must
 * never be presented as one; it orders candidates, nothing more.
 */
function scoreRock(
  sample: OxideComposition,
  ref: RockReference
): {
  distance: number;
  similarity: number;
  deltas: Record<string, number>;
  criteria: string[];
  analytesUsed: number;
  contributions: Array<{ oxide: string; delta: number; contribution: number }>;
} {
  const criteria: string[] = [];
  const deltas: Record<string, number> = {};
  const contributions: Array<{ oxide: string; delta: number; contribution: number }> = [];

  const weights: Record<string, number> = {
    SiO2: 3.5,
    Na2O: 3.0,
    K2O: 3.0,
    MgO: 2.5,
    CaO: 2.5,
    FeOT: 2.5,
    Al2O3: 2.0,
    TiO2: 1.5,
    P2O5: 1.0,
    Cr2O3: 1.0,
  };

  const sampleFeOT = resolveIron(sample).FeOT;
  const refFeOT = resolveIron(ref.meanOxides).FeOT;

  let sumWeightedSq = 0;
  let totalWeight = 0;
  let analytesUsed = 0;

  for (const [oxide, refValRaw] of Object.entries(ref.meanOxides)) {
    if (VOLATILES.includes(oxide)) continue;
    // Iron is compared once, as total iron.
    if (oxide === 'FeO' || oxide === 'Fe2O3') continue;

    const refVal = oxide === 'FeOT' ? refFeOT : refValRaw || 0;
    const sampVal = oxide === 'FeOT' ? sampleFeOT : sample[oxide];

    // Missing analytes are skipped, not treated as zero.
    if (sampVal === undefined || !Number.isFinite(sampVal)) continue;
    analytesUsed++;

    const delta = sampVal - refVal;
    deltas[oxide] = Number(delta.toFixed(2));

    const w = weights[oxide] || 1.0;
    const contribution = w * delta * delta;
    sumWeightedSq += contribution;
    totalWeight += w;
    contributions.push({ oxide, delta: Number(delta.toFixed(2)), contribution });

    const minVal = ref.minOxides?.[oxide];
    const maxVal = ref.maxOxides?.[oxide];
    if (minVal !== undefined && maxVal !== undefined && sampVal >= minVal && sampVal <= maxVal) {
      criteria.push(`${oxide} within reference range (${minVal}-${maxVal} wt%)`);
    }
  }

  const distance = totalWeight > 0 ? Math.sqrt(sumWeightedSq / totalWeight) : Infinity;
  let similarity = Number.isFinite(distance)
    ? Math.max(0, Math.min(100, 100 * Math.exp(-0.025 * Math.pow(distance, 1.6))))
    : 0;

  const sampleAlk = (sample.Na2O || 0) + (sample.K2O || 0);
  const tas = classifyTAS(sample.SiO2 || 0, sampleAlk);
  if (ref.tasField && tas.field.toLowerCase().includes(ref.tasField.toLowerCase())) {
    similarity = Math.min(100, similarity + 5);
    criteria.push(`Consistent with TAS field "${tas.field}"`);
  }

  contributions.sort((a, b) => b.contribution - a.contribution);

  return {
    distance: Number(distance.toFixed(2)),
    similarity: Math.round(similarity),
    deltas,
    criteria,
    analytesUsed,
    contributions: contributions.slice(0, 8),
  };
}

/** Similarity of a sample to an ideal mineral composition. */
function scoreMineral(
  sample: OxideComposition,
  mineral: MineralReference
): {
  distance: number;
  similarity: number;
  deltas: Record<string, number>;
  criteria: string[];
  analytesUsed: number;
  contributions: Array<{ oxide: string; delta: number; contribution: number }>;
} {
  const criteria: string[] = [];
  const deltas: Record<string, number> = {};
  const contributions: Array<{ oxide: string; delta: number; contribution: number }> = [];

  let sumWeightedSq = 0;
  let totalWeight = 0;
  let analytesUsed = 0;

  for (const [oxide, idealVal] of Object.entries(mineral.idealOxides)) {
    const sampVal = sample[oxide];
    if (sampVal === undefined || !Number.isFinite(sampVal)) continue;
    analytesUsed++;

    const delta = sampVal - (idealVal || 0);
    deltas[oxide] = Number(delta.toFixed(2));

    const w = (idealVal || 0) > 10 ? 3.0 : 1.5;
    const contribution = w * delta * delta;
    sumWeightedSq += contribution;
    totalWeight += w;
    contributions.push({ oxide, delta: Number(delta.toFixed(2)), contribution });

    const rangeMin = mineral.typicalRange?.min?.[oxide];
    const rangeMax = mineral.typicalRange?.max?.[oxide];
    if (rangeMin !== undefined && rangeMax !== undefined && sampVal >= rangeMin && sampVal <= rangeMax) {
      criteria.push(`${oxide} within observed solid-solution range (${rangeMin}-${rangeMax} wt%)`);
    }
  }

  // Penalize oxides present in the sample but absent from the ideal formula.
  for (const [oxide, val] of Object.entries(sample)) {
    if (!val || val <= 3.0) continue;
    if (oxide in mineral.idealOxides) continue;
    if (VOLATILES.includes(oxide) || IRON_TOTALS.includes(oxide)) continue;
    const w = 2.0;
    const contribution = w * val * val;
    sumWeightedSq += contribution;
    totalWeight += w;
    contributions.push({ oxide, delta: val, contribution });
  }

  const distance = totalWeight > 0 ? Math.sqrt(sumWeightedSq / totalWeight) : Infinity;
  const similarity = Number.isFinite(distance)
    ? Math.max(0, Math.min(100, Math.round(100 * Math.exp(-0.035 * Math.pow(distance, 1.5)))))
    : 0;

  contributions.sort((a, b) => b.contribution - a.contribution);

  return {
    distance: Number(distance.toFixed(2)),
    similarity,
    deltas,
    criteria,
    analytesUsed,
    contributions: contributions.slice(0, 8),
  };
}

export interface IdentifyOptions {
  sampleType?: SampleType;
  /** 'volcanic' or 'plutonic' TAS nomenclature. */
  regime?: 'volcanic' | 'plutonic';
  /** Override the Fe2O3/FeO ratio used for the norm. */
  fe2o3FeoRatio?: number;
}

/**
 * Main identification entry point. Ranks rock and mineral candidates and
 * computes TAS, CIPW norm, stoichiometry and data quality flags.
 */
export function identifyGeochemicalSample(
  input: OxideComposition,
  sampleName: string = 'Sample',
  inputMode: InputMode = 'oxide',
  options: IdentifyOptions = {}
): ClassificationReport {
  const sampleType = options.sampleType ?? 'unknown';
  const { normalized, rawTotal } = normalizeOxides(input, true);
  const elements = oxidesToElements(normalized);

  const sio2 = normalized.SiO2 || 0;
  const mgo = normalized.MgO || 0;
  const na2o = normalized.Na2O || 0;
  const k2o = normalized.K2O || 0;
  const iron = resolveIron(normalized);
  const feot = iron.FeOT;
  const totalAlkalis = na2o + k2o;

  const tas = classifyTAS(sio2, totalAlkalis, { regime: options.regime });
  const isUltramafic = sio2 < 45 && (mgo > 18 || mgo + feot > 32);

  let alkaliAffinity: ClassificationReport['alkaliAffinity'] = 'Unclassified';
  if (tas.isAlkaline) {
    alkaliAffinity = k2o > na2o ? 'High-K' : 'Alkaline';
  } else {
    alkaliAffinity = 'Subalkaline';
  }

  const cipwNorm = calculateCIPWNorm(normalized, {
    fe2o3FeoRatio: options.fe2o3FeoRatio,
  });

  const rockScores: MatchScore[] = ROCKS_DATASET.map((ref) => {
    const s = scoreRock(normalized, ref);
    return {
      reference: ref,
      type: 'rock' as const,
      similarity: s.similarity,
      confidence: s.similarity,
      distance: s.distance,
      analytesUsed: s.analytesUsed,
      contributions: s.contributions,
      deltaOxides: s.deltas,
      matchedCriteria: s.criteria,
      notes: `${ref.category} - ${ref.description}`,
    };
  }).sort((a, b) => b.similarity - a.similarity);

  const mineralScores: MatchScore[] = MINERALS_DATASET.map((ref) => {
    const s = scoreMineral(normalized, ref);
    return {
      reference: ref,
      type: 'mineral' as const,
      similarity: s.similarity,
      confidence: s.similarity,
      distance: s.distance,
      analytesUsed: s.analytesUsed,
      contributions: s.contributions,
      deltaOxides: s.deltas,
      matchedCriteria: s.criteria,
      notes: `${ref.formula} (${ref.group})`,
    };
  }).sort((a, b) => b.similarity - a.similarity);

  const topRock = rockScores[0];
  const topMineral = mineralScores[0];

  // Sample type, when the user has declared it, decides which library wins.
  let bestOverall: MatchScore = topRock;
  if (sampleType === 'mineral') {
    bestOverall = topMineral;
  } else if (sampleType === 'whole_rock' || sampleType === 'glass' || sampleType === 'melt_inclusion') {
    bestOverall = topRock;
  } else if (topMineral && topMineral.similarity >= (topRock ? topRock.similarity + 5 : 50)) {
    bestOverall = topMineral;
  }

  // Score separation: how clearly the leader is ahead of the runner-up.
  const pool = bestOverall?.type === 'mineral' ? mineralScores : rockScores;
  const separation =
    pool.length > 1 ? Number((pool[0].similarity - pool[1].similarity).toFixed(1)) : undefined;

  const qualityFlags = assessDataQuality(input, sampleType);
  const applicability = tasApplicability({
    sampleType,
    loi: input.LOI,
    analyticalTotal: rawTotal,
  });

  const stoichiometry = calculateStoichiometry(normalized, isUltramafic ? 4 : 6, sampleType);

  const legacyWarning = qualityFlags.find(
    (f) => f.code === 'low-total' || f.code === 'high-total'
  )?.message;

  return {
    sampleName,
    sampleType,
    inputMode,
    rawTotal,
    normalizedOxides: normalized,
    normalizedElements: elements,
    isVolatileFree: true,
    tasField: tas.field,
    tasCode: tas.code,
    tasOutOfRange: tas.outOfRange,
    tasWarnings: applicability.warnings,
    alkaliAffinity,
    isUltramafic,
    ironBasis: iron.basis,
    topRocks: rockScores.slice(0, 5),
    topMinerals: mineralScores.slice(0, 5),
    bestOverall,
    scoreSeparation: separation,
    cipwNorm,
    differentiationIndex: differentiationIndex(cipwNorm),
    normativeAn: normativeAn(cipwNorm),
    stoichiometry,
    qualityFlags,
    dataQualityWarning: legacyWarning,
  };
}

/**
 * Petrogenetic indices and, for mineral analyses, structural formula.
 *
 * Atoms-per-formula-unit is only meaningful for a single mineral analysis.
 * For whole rocks it is computed but marked as not applicable, so the UI can
 * suppress it rather than presenting a meaningless formula.
 */
export function calculateStoichiometry(
  oxides: OxideComposition,
  targetOxygenBasis: number = 6,
  sampleType: SampleType = 'unknown'
): SampleStoichiometry {
  const factors: Record<string, { mw: number; cat: number; oxy: number; el: string }> = {
    SiO2: { mw: 60.084, cat: 1, oxy: 2, el: 'Si' },
    TiO2: { mw: 79.866, cat: 1, oxy: 2, el: 'Ti' },
    Al2O3: { mw: 101.961, cat: 2, oxy: 3, el: 'Al' },
    Fe2O3: { mw: 159.688, cat: 2, oxy: 3, el: 'Fe3+' },
    FeO: { mw: 71.844, cat: 1, oxy: 1, el: 'Fe2+' },
    MnO: { mw: 70.937, cat: 1, oxy: 1, el: 'Mn' },
    MgO: { mw: 40.304, cat: 1, oxy: 1, el: 'Mg' },
    CaO: { mw: 56.077, cat: 1, oxy: 1, el: 'Ca' },
    Na2O: { mw: 61.979, cat: 2, oxy: 1, el: 'Na' },
    K2O: { mw: 94.196, cat: 2, oxy: 1, el: 'K' },
    P2O5: { mw: 141.945, cat: 2, oxy: 5, el: 'P' },
    Cr2O3: { mw: 151.99, cat: 2, oxy: 3, el: 'Cr' },
    NiO: { mw: 74.693, cat: 1, oxy: 1, el: 'Ni' },
  };

  let totalOxygenMoles = 0;
  const cationMoles: Record<string, number> = {};

  for (const [ox, wt] of Object.entries(oxides)) {
    if (wt === undefined || !Number.isFinite(wt) || wt <= 0) continue;
    if (IRON_TOTALS.includes(ox)) continue; // counted via FeO/Fe2O3
    const factor = factors[ox];
    if (!factor) continue;
    const moles = wt / factor.mw;
    totalOxygenMoles += moles * factor.oxy;
    cationMoles[factor.el] = (cationMoles[factor.el] || 0) + moles * factor.cat;
  }

  // If only total iron was reported, carry it as Fe2+ for the formula.
  if (!cationMoles['Fe2+'] && !cationMoles['Fe3+']) {
    const iron = resolveIron(oxides);
    if (iron.FeOT > 0) {
      const moles = iron.FeOT / 71.844;
      totalOxygenMoles += moles;
      cationMoles['Fe2+'] = moles;
    }
  }

  const scale = totalOxygenMoles > 0 ? targetOxygenBasis / totalOxygenMoles : 1;
  const cations: Record<string, number> = {};
  let totalCations = 0;
  for (const [el, m] of Object.entries(cationMoles)) {
    const apfu = Math.round(m * scale * 1000) / 1000;
    cations[el] = apfu;
    totalCations += apfu;
  }

  // --- Petrogenetic indices (molar, on oxide basis) ----------------------
  const iron = resolveIron(oxides);
  const mgoMol = (oxides.MgO || 0) / 40.304;
  const feoMol = iron.FeOT / 71.844;
  const mgNumber = mgoMol + feoMol > 0 ? (mgoMol / (mgoMol + feoMol)) * 100 : undefined;

  // ASI (Shand's index, A/CNK) = molar Al2O3 / (CaO - 1.67 x P2O5 + Na2O + K2O)
  // The apatite correction removes Ca locked in apatite. The previous
  // implementation used cation ratios without doubling Ca, systematically
  // under-reporting ASI for calcic rocks.
  const alOx = (oxides.Al2O3 || 0) / 101.961;
  const caOx = (oxides.CaO || 0) / 56.077;
  const naOx = (oxides.Na2O || 0) / 61.979;
  const kOx = (oxides.K2O || 0) / 94.196;
  const pOx = (oxides.P2O5 || 0) / 141.945;

  const caCorrected = Math.max(0, caOx - 1.67 * pOx);
  const cnk = caCorrected + naOx + kOx;
  const nk = naOx + kOx;

  const asi = cnk > 0 ? alOx / cnk : undefined;
  const ank = nk > 0 ? alOx / nk : undefined;

  const feTotWt = iron.FeOT;
  const mgWt = oxides.MgO || 0;
  const feIndex = feTotWt + mgWt > 0 ? feTotWt / (feTotWt + mgWt) : undefined;
  const totalAlkalis = (oxides.Na2O || 0) + (oxides.K2O || 0);

  // Silica saturation from the norm (computed once).
  const norm = calculateCIPWNorm(oxides);
  let silicaSaturation: 'Oversaturated' | 'Saturated' | 'Undersaturated' = 'Saturated';
  if ((norm.Q || 0) > 0.2) silicaSaturation = 'Oversaturated';
  else if ((norm.Ne || 0) + (norm.Lc || 0) > 0.2) silicaSaturation = 'Undersaturated';

  let alumina: SampleStoichiometry['aluminaSaturation'];
  if (asi !== undefined) {
    if (asi > 1.0 && (norm.C || 0) > 0) alumina = 'Peraluminous';
    else if (nk > 0 && alOx < nk) alumina = 'Peralkaline';
    else alumina = 'Metaluminous';
  }

  return {
    oxygenBasis: targetOxygenBasis,
    cations,
    totalCations: Math.round(totalCations * 1000) / 1000,
    apfuApplicable: sampleType === 'mineral',
    mgNumber: mgNumber !== undefined ? Math.round(mgNumber * 10) / 10 : undefined,
    asi: asi !== undefined ? Math.round(asi * 100) / 100 : undefined,
    ank: ank !== undefined ? Math.round(ank * 100) / 100 : undefined,
    feIndex: feIndex !== undefined ? Math.round(feIndex * 1000) / 1000 : undefined,
    totalAlkalis: Math.round(totalAlkalis * 100) / 100,
    silicaSaturation,
    aluminaSaturation: alumina,
  };
}

/** Re-exported for call sites that still import it from here. */
export { elementsToOxides, oxidesToElements };
export type { CIPWNorm, ElementComposition, OxideComposition };
