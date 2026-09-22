/**
 * Geochemical types for minerals and rocks identification
 */

export type InputMode = 'oxide' | 'element';

/**
 * What the analysis represents. Controls which calculations and diagrams are
 * scientifically defensible for the sample.
 */
export type SampleType =
  | 'whole_rock'
  | 'mineral'
  | 'glass'
  | 'melt_inclusion'
  | 'unknown';

export const SAMPLE_TYPE_LABELS: Record<SampleType, string> = {
  whole_rock: 'Whole Rock',
  mineral: 'Mineral Grain',
  glass: 'Volcanic Glass / Melt',
  melt_inclusion: 'Melt Inclusion',
  unknown: 'Unknown',
};

/** A single data-quality observation about an analysis. */
export interface DataQualityFlag {
  code: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
}

export interface OxideComposition {
  SiO2?: number;
  TiO2?: number;
  Al2O3?: number;
  Fe2O3?: number;
  FeO?: number;
  FeOT?: number; // Total iron as FeO or Fe2O3
  MnO?: number;
  MgO?: number;
  CaO?: number;
  Na2O?: number;
  K2O?: number;
  P2O5?: number;
  Cr2O3?: number;
  NiO?: number;
  LOI?: number; // Loss on ignition / H2O+
  SO3?: number;
  CO2?: number;
  [key: string]: number | undefined;
}

export interface ElementComposition {
  Si?: number;
  Ti?: number;
  Al?: number;
  Fe?: number;
  Mn?: number;
  Mg?: number;
  Ca?: number;
  Na?: number;
  K?: number;
  P?: number;
  Cr?: number;
  Ni?: number;
  S?: number;
  C?: number;
  [key: string]: number | undefined;
}

export interface SampleInput {
  id?: string;
  name?: string;
  inputMode: InputMode;
  oxides: OxideComposition;
  elements: ElementComposition;
  normalized: boolean;
  totalWt: number;
}

export interface DatabaseReferences {
  mindatId?: string;
  mindatUrl?: string;
  webmineralUrl?: string;
  danaClassification?: string;
  strunzClassification?: string;
  rruffId?: string;
  rruffUrl?: string;
  rruffSpaceGroup?: string;
  rruffCellParameters?: string;
  earthChemId?: string;
  earthChemUrl?: string;
  earthchemSetting?: string;
  georocUrl?: string;
  imaSymbol?: string;
  typeLocality?: string;
}

export type RockClass =
  | 'Igneous Volcanic'
  | 'Igneous Plutonic'
  | 'Sedimentary'
  | 'Metamorphic'
  | 'Ultramafic / Mantle';

export interface RockReference {
  id: string;
  name: string;
  /** Where the reference composition came from. */
  source?: 'curated' | 'GEOROC' | string;
  /** Population statistics when the reference is a GEOROC distribution. */
  georoc?: {
    analyses: number;
    variants?: Array<{ value: string; n: number }>;
    stats: Record<string, { n: number; p10?: number; p25?: number; p50?: number; p75?: number; p90?: number }>;
    tectonicSettings: Array<{ value: string; n: number }>;
  };
  category: RockClass;
  subCategory?: string;
  meanOxides: OxideComposition;
  minOxides?: Partial<OxideComposition>;
  maxOxides?: Partial<OxideComposition>;
  tasField?: string;
  silicaSaturation?: 'Oversaturated' | 'Saturated' | 'Undersaturated';
  magmaticSeries?: 'Tholeiitic' | 'Calc-Alkaline' | 'Alkaline' | 'Peralkaline' | 'Potassic / Ultrapotassic' | 'N/A';
  description: string;
  keyMinerals: string[];
  georocCode?: string;
  typicalTectonicSetting?: string;
  formula?: string;
  typicalOccurrence?: string;
  imageUrl?: string;
  imageCaption?: string;
  geologicalFacts?: string[];
  databaseRefs?: DatabaseReferences;
}

export type MineralGroup =
  | 'Nesosilicate'
  | 'Sorosilicate'
  | 'Cyclosilicate'
  | 'Inosilicate'
  | 'Phyllosilicate'
  | 'Tectosilicate'
  | 'Oxide'
  | 'Hydroxide'
  | 'Carbonate'
  | 'Sulfate'
  | 'Sulfide'
  | 'Halide'
  | 'Phosphate';

export interface MineralReference {
  id: string;
  name: string;
  /** Where the reference composition came from. */
  source?: 'curated' | 'GEOROC' | string;
  /** Population statistics when the reference is a GEOROC distribution. */
  georoc?: {
    analyses: number;
    variants?: Array<{ value: string; n: number }>;
    stats: Record<string, { n: number; p10?: number; p25?: number; p50?: number; p75?: number; p90?: number }>;
    tectonicSettings: Array<{ value: string; n: number }>;
  };
  formula: string;
  group: MineralGroup;
  crystalSystem: string;
  idealOxides: OxideComposition;
  typicalRange?: {
    min: Partial<OxideComposition>;
    max: Partial<OxideComposition>;
  };
  solidSolution?: string;
  description: string;
  mohsHardness?: number | string;
  density?: number;
  opticalCharacteristics?: string;
  typicalOccurrence?: string;
  imageUrl?: string;
  imageCaption?: string;
  geologicalFacts?: string[];
  databaseRefs?: DatabaseReferences;
}

export interface MatchScore {
  reference: RockReference | MineralReference;
  type: 'rock' | 'mineral';
  /**
   * Bounded 0-100 similarity score derived from weighted compositional
   * distance. This is NOT a probability and must not be labelled
   * "confidence" or shown with a % sign implying statistical meaning.
   */
  similarity: number;
  /** @deprecated Alias of `similarity`, kept for older call sites. */
  confidence: number;
  distance: number;
  /** How many oxides were actually available to discriminate this match. */
  analytesUsed?: number;
  /** Per-oxide contribution to the distance, for "Why this match?". */
  contributions?: Array<{ oxide: string; delta: number; contribution: number }>;
  /** Structural formula of the sample recast on this mineral's oxygen basis. */
  structuralFormula?: {
    oxygenBasis: number;
    apfu: Record<string, number>;
    cationSum: number;
    tetrahedral: number;
    deviation: number;
    fit: number;
    text: string;
  };
  /** 0-1 quality of the structural fit; gates the similarity score. */
  structuralFit?: number;
  deltaOxides: { [oxide: string]: number }; // sample - reference
  matchedCriteria: string[];
  notes?: string;
}

export interface CIPWNorm {
  Q?: number; // Quartz
  C?: number; // Corundum (peraluminous indicator)
  Or?: number; // Orthoclase
  Ab?: number; // Albite
  An?: number; // Anorthite
  Lc?: number; // Leucite
  Ne?: number; // Nepheline
  Kp?: number; // Kalsilite (kamafugite indicator)
  Ac?: number; // Acmite (peralkaline indicator)
  Ns?: number; // Sodium metasilicate
  Ks?: number; // Potassium metasilicate
  Di?: number; // Diopside
  Wo?: number; // Wollastonite
  Cs?: number; // Larnite / dicalcium silicate (melilitite indicator)
  Hy?: number; // Hypersthene
  Ol?: number; // Olivine
  Mt?: number; // Magnetite
  Hm?: number; // Hematite
  Il?: number; // Ilmenite
  Ru?: number; // Rutile
  Cm?: number; // Chromite
  Ap?: number; // Apatite
  Cc?: number; // Calcite

  /** True normative total in wt%, NOT forced to 100. A value far from the
   *  analytical total indicates an allocation problem. */
  normSum?: number;
  /** Residual silica that could not be balanced, in moles. Should be ~0. */
  silicaBalance?: number;
  /** Which iron fields the norm was computed from. */
  ironBasis?: string;
  /** True when FeO/Fe2O3 were estimated from a total rather than measured. */
  ironSplitEstimated?: boolean;

  /** @deprecated Use `normSum`. Retained for existing call sites. */
  totalNorm?: number;

  [mineral: string]: number | string | boolean | undefined;
}

/** CIPW norm with each phase renormalized to 100 wt%. */
export type CIPWNormPercent = Record<string, number>;

export interface ClassificationReport {
  sampleName: string;
  sampleType?: SampleType;
  /** True when the sample type was inferred from the structural fit rather
   *  than declared by the user. */
  sampleTypeWasInferred?: boolean;
  inputMode: InputMode;
  rawTotal: number;
  normalizedOxides: OxideComposition;
  normalizedElements: ElementComposition;
  isVolatileFree: boolean;
  tasField: string;
  /**
   * IUGS sub-root name for the TAS field, e.g. "Alkali Basalt" rather than
   * just "Basalt" (Le Maitre 2002, section 2.12.2).
   */
  tasSubRootName?: string;
  tasSubRoot?: {
    name: string;
    potassiumSeries?: 'low-K' | 'medium-K' | 'high-K';
    peralkalineIndex?: number;
    peralkaline: boolean;
    peralkalineType?: 'comenditic' | 'pantelleritic';
    reasons: string[];
  };
  /** MgO > 12 wt% with alkalis < 3 wt% (Le Maitre 2002, p.36). */
  isPicrite?: boolean;
  tasCode?: string;
  tasOutOfRange?: boolean;
  /** Reasons TAS may not be applicable to this sample. */
  tasWarnings?: string[];
  alkaliAffinity: 'Alkaline' | 'Subalkaline' | 'High-K' | 'Calc-Alkaline' | 'Tholeiitic' | 'Unclassified';
  isUltramafic: boolean;
  /** Which iron fields the calculation used. */
  ironBasis?: string;
  topRocks: MatchScore[];
  topMinerals: MatchScore[];
  bestOverall: MatchScore;
  /** Similarity gap between the best and second-best candidate. */
  scoreSeparation?: number;
  cipwNorm?: CIPWNorm;
  differentiationIndex?: number;
  normativeAn?: number;
  qualityFlags?: DataQualityFlag[];
  /** How many references the match was made against. */
  referenceLibrarySize?: { rocks: number; minerals: number };
  dataQualityWarning?: string;
  stoichiometry?: SampleStoichiometry;
}

export interface SampleStoichiometry {
  oxygenBasis: number;
  cations: Record<string, number>; // apfu (atoms per formula unit)
  totalCations: number;
  /**
   * False for whole-rock analyses: atoms-per-formula-unit is only meaningful
   * for a single mineral. The UI should suppress the formula when false.
   */
  apfuApplicable?: boolean;
  mgNumber?: number; // Mg# = Mg / (Mg + Fe_total) x 100, molar
  asi?: number; // ASI / A-CNK = molar Al2O3 / (CaO - 1.67 P2O5 + Na2O + K2O)
  ank?: number; // A/NK = molar Al2O3 / (Na2O + K2O)
  feIndex?: number; // FeO* / (FeO* + MgO) wt%
  totalAlkalis?: number; // Na2O + K2O wt%
  silicaSaturation?: 'Oversaturated' | 'Saturated' | 'Undersaturated';
  aluminaSaturation?: 'Peraluminous' | 'Metaluminous' | 'Peralkaline';
}

export interface BatchRowResult {
  rowNumber: number;
  sampleId: string;
  rawOxides: OxideComposition;
  normalizedOxides: OxideComposition;
  totalWt: number;
  identifiedCategory: 'Rock' | 'Mineral';
  primaryName: string;
  primaryConfidence: number;
  secondaryName: string;
  secondaryConfidence: number;
  tasField: string;
  rockClass?: string;
  mineralGroup?: string;
  qualityStatus: 'Good (98-102%)' | 'Acceptable (95-105%)' | 'High Total (>105%)' | 'Low Total (<95%)';
  notes: string;
  cipwNorm?: CIPWNorm;
  stoichiometry?: SampleStoichiometry;
  alkaliAffinity?: string;
}

export interface SavedSample {
  id: string;
  userId?: string;
  name: string;
  sampleType?: 'rock' | 'mineral' | 'custom';
  type?: 'rock' | 'mineral' | 'custom';
  oxides: OxideComposition;
  elements?: ElementComposition;
  identifiedName?: string;
  identifiedAs?: string;
  confidence?: number;
  tasField?: string;
  alkaliAffinity?: string;
  notes?: string;
  tags?: string[];
  databaseRefs?: DatabaseReferences;
  isSynced?: boolean;
  syncedToCloud?: boolean;
  createdAt?: string;
  savedAt?: string;
  updatedAt?: string;
}
