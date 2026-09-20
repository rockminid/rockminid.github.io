import { OxideComposition } from '../types/geochem';
// Import the calculators directly rather than through the engine barrel, to
// keep the module graph acyclic.
import { calculateCIPWNorm } from './cipw';
import { totalIronAsFeO } from './iron';

export type TernarySystemId =
  | 'afm-igneous'
  | 'afm-metamorphic'
  | 'qapf-plutonic'
  | 'qapf-volcanic'
  | 'apf-plutonic'
  | 'apf-volcanic'
  | 'basalt-tetrahedron'
  | 'pyroxene-quad'
  | 'feldspar'
  | 'ultramafic';

export interface TernaryApex {
  id: string;
  label: string;
  sublabel?: string;
  color: string;
  oxideFormula?: string;
}

export interface TernaryPoint {
  id: string;
  name: string;
  // Normalized 0 to 100 components:
  // For standard ternary: a = apex1 (top), b = apex2 (bottom-left), c = apex3 (bottom-right)
  // For pyroxene quadrilateral: a = Wo (0-50), b = En (0-100), c = Fs (0-100)
  a: number;
  b: number;
  c: number;
  category?: string;
  isPrimary?: boolean;
  field?: string;
  notes?: string;
  color?: string;
  oxides?: Partial<OxideComposition>;
}

export interface TernaryFieldPolygon {
  id: string;
  name: string;
  code?: string;
  color: string;
  fillColor?: string;
  textColor?: string;
  // Vertices in ternary coordinates [a, b, c] summing to 100 (or for pyroxene [Wo, En, Fs])
  vertices: [number, number, number][];
  labelPosition?: [number, number, number];
  description?: string;
}

export interface TernaryCurve {
  id: string;
  name: string;
  color: string;
  strokeDasharray?: string;
  points: [number, number, number][]; // [a, b, c]
  label?: string;
  labelPosition?: [number, number, number];
}

export interface TernarySystemConfig {
  id: TernarySystemId;
  name: string;
  subtitle: string;
  description: string;
  referenceAuthor: string;
  isQuadrilateral?: boolean; // true for Pyroxene Quad (Wo 0-50%, En-Fs base)
  apices: {
    top: TernaryApex;
    bottomLeft: TernaryApex;
    bottomRight: TernaryApex;
  };
  fields: TernaryFieldPolygon[];
  curves?: TernaryCurve[];
  // Function to project an OxideComposition into [a, b, c]
  projectOxides: (oxides: OxideComposition) => { a: number; b: number; c: number; fieldName?: string };
}

// -------------------------------------------------------------
// Barycentric <-> Cartesian Geometry Functions
// Triangle:
// Top Apex (a=100, b=0, c=0) => (x, y) = (width/2, top)
// Bottom-Left Apex (a=0, b=100, c=0) => (x, y) = (left, bottom)
// Bottom-Right Apex (a=0, b=0, c=100) => (x, y) = (right, bottom)
// -------------------------------------------------------------

export interface TriangleBounds {
  topX: number;
  topY: number;
  blX: number;
  blY: number;
  brX: number;
  brY: number;
}

/**
 * Converts Barycentric coordinates (a, b, c) where a + b + c = 100
 * to Cartesian (x, y) coordinates within given triangle geometry.
 */
export function ternaryToCartesian(
  a: number,
  b: number,
  c: number,
  bounds: TriangleBounds
): { x: number; y: number } {
  const sum = a + b + c || 1;
  const fa = a / sum;
  const fb = b / sum;
  const fc = c / sum;

  const x = fa * bounds.topX + fb * bounds.blX + fc * bounds.brX;
  const y = fa * bounds.topY + fb * bounds.blY + fc * bounds.brY;
  return { x, y };
}

/**
 * Converts Cartesian screen coordinates (x, y) back into Barycentric (a, b, c) percentages.
 */
export function cartesianToTernary(
  x: number,
  y: number,
  bounds: TriangleBounds
): { a: number; b: number; c: number } {
  const { topX, topY, blX, blY, brX, brY } = bounds;

  // Determinant for 2D transformation
  const det = (blY - brY) * (topX - brX) + (brX - blX) * (topY - brY);
  if (Math.abs(det) < 1e-6) return { a: 33.3, b: 33.3, c: 33.3 };

  const fa = ((blY - brY) * (x - brX) + (brX - blX) * (y - brY)) / det;
  const fb = ((brY - topY) * (x - brX) + (topX - brX) * (y - brY)) / det;
  const fc = 1 - fa - fb;

  return {
    a: Math.max(0, Math.min(100, fa * 100)),
    b: Math.max(0, Math.min(100, fb * 100)),
    c: Math.max(0, Math.min(100, fc * 100)),
  };
}

// -------------------------------------------------------------
// Pyroxene Quadrilateral Coordinate Mapping
// Trapezoid:
// Top: Wo50, from En0 Fs100 (Hedenbergite) to En100 Fs0 (Diopside)
// Bottom: Wo0, from En0 Fs100 (Ferrosilite) to En100 Fs0 (Enstatite)
// Coordinates:
// Wo: 0 to 50 mol% Ca / (Ca + Mg + Fe)
// En: mol% Mg / (Ca + Mg + Fe)
// Fs: mol% Fe / (Ca + Mg + Fe)
// -------------------------------------------------------------

export interface QuadBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function pyroxeneToCartesian(
  wo: number, // 0 to 50
  en: number, // 0 to 100
  fs: number, // 0 to 100
  bounds: QuadBounds
): { x: number; y: number } {
  const enRatio = en + fs > 0 ? en / (en + fs) : 0.5; // 1 = 100% En (left), 0 = 100% Fs (right)
  const clampedWo = Math.max(0, Math.min(50, wo));

  const x = bounds.left + (1 - enRatio) * (bounds.right - bounds.left);
  const y = bounds.bottom - (clampedWo / 50) * (bounds.bottom - bounds.top);
  return { x, y };
}

export function cartesianToPyroxene(
  x: number,
  y: number,
  bounds: QuadBounds
): { wo: number; en: number; fs: number } {
  const xNorm = Math.max(0, Math.min(1, (x - bounds.left) / (bounds.right - bounds.left)));
  const yNorm = Math.max(0, Math.min(1, (bounds.bottom - y) / (bounds.bottom - bounds.top)));

  const wo = yNorm * 50; // 0 to 50
  const rem = 100 - wo;
  const fsFraction = xNorm;
  const enFraction = 1 - xNorm;

  return {
    wo,
    en: rem * enFraction,
    fs: rem * fsFraction,
  };
}

// =============================================================
// SYSTEM 1: Igneous AFM (A = Na2O+K2O, F = FeO*, M = MgO)
// Wager & Deer (1939), Irvine & Baragar (1971)
// =============================================================

/**
 * Control points of the Irvine & Baragar (1971) tholeiitic / calc-alkaline
 * boundary as [F, A, M], ordered by increasing A.
 *
 * Single source of truth: the drawn curve, the tholeiitic field polygon and
 * the `projectOxides` classifier all derive from this array, so they cannot
 * drift apart.
 */
export const AFM_IGNEOUS_CURVE_POINTS: Array<[number, number, number]> = [
  [64, 12, 24],
  [57, 16, 27],
  [50, 20, 30],
  [44, 25, 31],
  [37, 32, 31],
  [30, 40, 30],
  [22, 50, 28],
  [15, 62, 23],
  [10, 75, 15],
];

export const AFM_IGNEOUS_CONFIG: TernarySystemConfig = {
  id: 'afm-igneous',
  name: 'AFM Igneous Diagram',
  subtitle: 'Alkalis (A) – Total Iron (F) – Magnesium (M)',
  description:
    'The standard geochemical ternary plot for classifying subalkaline igneous rock suites. Delineates the iron-enriching Tholeiitic Series (typical of MORBs and rift flood basalts) from the iron-depleting Calc-Alkaline Series (typical of volcanic arc subduction zones).',
  referenceAuthor: 'Irvine & Baragar (1971); Wager & Deer (1939)',
  apices: {
    top: {
      id: 'F',
      label: 'F (FeO*)',
      sublabel: 'Total Iron as FeO (wt%)',
      color: '#f87171', // Red
      oxideFormula: 'FeO + 0.8998 × Fe2O3',
    },
    bottomLeft: {
      id: 'A',
      label: 'A (Na₂O + K₂O)',
      sublabel: 'Total Alkalis (wt%)',
      color: '#fbbf24', // Amber
      oxideFormula: 'Na2O + K2O',
    },
    bottomRight: {
      id: 'M',
      label: 'M (MgO)',
      sublabel: 'Magnesium Oxide (wt%)',
      color: '#34d399', // Emerald
      oxideFormula: 'MgO',
    },
  },
  curves: [
    {
      id: 'irvine-baragar-curve',
      name: 'Tholeiitic / Calc-Alkaline Boundary (Irvine & Baragar 1971)',
      color: '#38bdf8', // Sky blue
      strokeDasharray: '6 4',
      label: 'Tholeiitic / Calc-Alkaline Boundary',
      points: AFM_IGNEOUS_CURVE_POINTS,
    },
  ],
  fields: [
    {
      id: 'tholeiitic-field',
      name: 'Tholeiitic Series (Fe-enrichment)',
      code: 'TH',
      color: '#ef4444',
      fillColor: 'rgba(239, 68, 68, 0.08)',
      textColor: '#fca5a5',
      // Outer tholeiitic triangle upper region
      vertices: [[100, 0, 0], ...AFM_IGNEOUS_CURVE_POINTS, [0, 100, 0], [0, 0, 100]],
      labelPosition: [60, 15, 25],
      description:
        'Magmas showing strong iron enrichment during early crystallization before magnetite precipitation (e.g. MORBs, Skaergaard, Columbia River Basalts).',
    },
    {
      id: 'calc-alkaline-field',
      name: 'Calc-Alkaline Series',
      code: 'CA',
      color: '#3b82f6',
      fillColor: 'rgba(59, 130, 246, 0.08)',
      textColor: '#93c5fd',
      vertices: [[0, 100, 0], ...[...AFM_IGNEOUS_CURVE_POINTS].reverse(), [0, 0, 100]],
      labelPosition: [20, 35, 45],
      description:
        'Magmas with early titanomagnetite fractionation driven by higher water/oxygen fugacity in subduction zones, suppressing iron enrichment.',
    },
  ],
  projectOxides: (oxides: OxideComposition) => {
    const a = (oxides.Na2O || 0) + (oxides.K2O || 0);
    // Total iron as FeO, via the canonical resolver. Using FeO + 0.8998 x
    // Fe2O3 directly meant that FeOT-only analyses (most of GEOROC) plotted
    // with F = 0, collapsing them onto the A-M edge.
    const f = totalIronAsFeO(oxides);
    const m = oxides.MgO || 0;
    const total = a + f + m;

    if (total <= 0.001) return { a: 33.3, b: 33.3, c: 33.4, fieldName: 'Undetermined' };

    const normA = (a / total) * 100;
    const normF = (f / total) * 100;
    const normM = (m / total) * 100;

    // Classify against the SAME boundary curve that is drawn on the diagram,
    // so the label can never contradict the plotted position.
    const isTholeiitic = normF > afmBoundaryF(normA);

    return {
      a: normF, // Top apex (F)
      b: normA, // Bottom-Left (A)
      c: normM, // Bottom-Right (M)
      fieldName: isTholeiitic ? 'Tholeiitic Suite' : 'Calc-Alkaline Suite',
    };
  },
};

/**
 * Irvine & Baragar (1971) tholeiitic / calc-alkaline divide, expressed as the
 * F value of the boundary at a given A. Interpolated from the same control
 * points that `AFM_IGNEOUS_CONFIG.curves[0]` draws, so the field label and the
 * rendered curve are guaranteed to agree.
 */
export function afmBoundaryF(normA: number): number {
  const pts = AFM_IGNEOUS_CURVE_POINTS;
  // Points are ordered by increasing A.
  if (normA <= pts[0][1]) return pts[0][0];
  if (normA >= pts[pts.length - 1][1]) return pts[pts.length - 1][0];
  for (let i = 0; i < pts.length - 1; i++) {
    const [f1, a1] = pts[i];
    const [f2, a2] = pts[i + 1];
    if (normA >= a1 && normA <= a2) {
      const t = (normA - a1) / (a2 - a1 || 1);
      return f1 + t * (f2 - f1);
    }
  }
  return pts[pts.length - 1][0];
}

// =============================================================
// SYSTEM 2: Metamorphic AFM Diagram (Al2O3 - FeO - MgO)
// Thompson (1957) Pelitic Metamorphic Projections
// =============================================================
export const AFM_METAMORPHIC_CONFIG: TernarySystemConfig = {
  id: 'afm-metamorphic',
  name: 'AFM Metamorphic Diagram',
  subtitle: 'Al₂O₃ (A) – FeO (F) – MgO (M)',
  description:
    'The classic Thompson (1957) projection for pelitic schists and gneisses in quartz- and muscovite-bearing metamorphic assemblages. Maps diagnostic index minerals across Barrovian metamorphic zones.',
  referenceAuthor: 'Thompson (1957); Spear (1993)',
  apices: {
    top: {
      id: 'A',
      label: 'A (Al₂O₃)',
      sublabel: 'Alumina (molar excess)',
      color: '#818cf8', // Indigo
      oxideFormula: 'Al2O3 - 3*K2O',
    },
    bottomLeft: {
      id: 'F',
      label: 'F (FeO)',
      sublabel: 'Ferrous Iron (wt%)',
      color: '#f87171', // Red
      oxideFormula: 'FeO',
    },
    bottomRight: {
      id: 'M',
      label: 'M (MgO)',
      sublabel: 'Magnesia (wt%)',
      color: '#34d399', // Emerald
      oxideFormula: 'MgO',
    },
  },
  fields: [
    {
      id: 'aluminosilicate-field',
      name: 'Al₂SiO₅ (Ky / Sil / And)',
      color: '#6366f1',
      fillColor: 'rgba(99, 102, 241, 0.15)',
      textColor: '#a5b4fc',
      vertices: [
        [100, 0, 0],
        [90, 8, 2],
        [90, 2, 8],
      ],
      labelPosition: [92, 4, 4],
      description: 'Kyanite, Sillimanite, or Andalusite depending on P-T conditions.',
    },
    {
      id: 'staurolite-field',
      name: 'Staurolite',
      color: '#f59e0b',
      fillColor: 'rgba(245, 158, 11, 0.15)',
      textColor: '#fcd34d',
      vertices: [
        [65, 30, 5],
        [55, 38, 7],
        [55, 30, 15],
        [65, 23, 12],
      ],
      labelPosition: [60, 30, 10],
      description: 'Diagnostic middle-grade amphibolite facies index mineral.',
    },
    {
      id: 'cordierite-field',
      name: 'Cordierite',
      color: '#06b6d4',
      fillColor: 'rgba(6, 182, 212, 0.15)',
      textColor: '#67e8f9',
      vertices: [
        [55, 15, 30],
        [45, 18, 37],
        [45, 8, 47],
        [55, 6, 39],
      ],
      labelPosition: [50, 12, 38],
      description: 'Low-P, high-T contact aureoles and Buchan-type regional metamorphism.',
    },
    {
      id: 'garnet-field',
      name: 'Garnet (Almandine-Pyrope)',
      color: '#dc2626',
      fillColor: 'rgba(220, 38, 38, 0.15)',
      textColor: '#fca5a5',
      vertices: [
        [30, 65, 5],
        [20, 72, 8],
        [20, 55, 25],
        [30, 48, 22],
      ],
      labelPosition: [25, 60, 15],
      description: 'Almandine-rich porphyroblasts in Barrovian pelites.',
    },
    {
      id: 'chlorite-field',
      name: 'Chlorite',
      color: '#10b981',
      fillColor: 'rgba(16, 185, 129, 0.15)',
      textColor: '#6ee7b7',
      vertices: [
        [38, 40, 22],
        [28, 45, 27],
        [28, 15, 57],
        [38, 12, 50],
      ],
      labelPosition: [33, 28, 39],
      description: 'Greenschist facies index sheet silicate.',
    },
    {
      id: 'biotite-field',
      name: 'Biotite',
      color: '#d97706',
      fillColor: 'rgba(217, 119, 6, 0.15)',
      textColor: '#fde68a',
      vertices: [
        [5, 75, 20],
        [0, 78, 22],
        [0, 20, 80],
        [5, 20, 75],
      ],
      labelPosition: [3, 48, 49],
      description: 'Ubiquitous mica forming stable tie-lines with Garnet, Staurolite, and Cordierite.',
    },
  ],
  projectOxides: (oxides: OxideComposition) => {
    const a = oxides.Al2O3 || 0;
    const f = (oxides.FeO || 0) + 0.8998 * (oxides.Fe2O3 || 0);
    const m = oxides.MgO || 0;
    const total = a + f + m;

    if (total <= 0.001) return { a: 33.3, b: 33.3, c: 33.3, fieldName: 'Undetermined' };

    return {
      a: (a / total) * 100, // Top apex (Al2O3)
      b: (f / total) * 100, // Bottom-Left (FeO)
      c: (m / total) * 100, // Bottom-Right (MgO)
      fieldName: 'Metamorphic AFM Composition',
    };
  },
};

// =============================================================
// SYSTEM 3: QAPF Plutonic Rock Classification
// Streckeisen (1974, 1976) / IUGS Subcommission
// Upper Triangle: Q (Quartz) – A (Alkali Feldspar) – P (Plagioclase)
// =============================================================
export const QAPF_PLUTONIC_CONFIG: TernarySystemConfig = {
  id: 'qapf-plutonic',
  name: 'QAPF Plutonic Classification',
  subtitle: 'Quartz (Q) – Alkali Feldspar (A) – Plagioclase (P)',
  description:
    'The international IUGS modal/normative mineralogical classification for intrusive plutonic igneous rocks containing >10% felsic minerals.',
  referenceAuthor: 'Streckeisen (1974, 1976) / IUGS',
  apices: {
    top: {
      id: 'Q',
      label: 'Q (Quartz)',
      sublabel: 'SiO₂ modal/normative (wt%)',
      color: '#e0e7ff', // Light slate/blue
      oxideFormula: 'SiO2 excess',
    },
    bottomLeft: {
      id: 'A',
      label: 'A (Alkali Feldspar)',
      sublabel: 'Orthoclase + Microcline + Albite (An₀₋₅)',
      color: '#fbbf24', // Amber
      oxideFormula: 'KAlSi3O8 + NaAlSi3O8',
    },
    bottomRight: {
      id: 'P',
      label: 'P (Plagioclase)',
      sublabel: 'Plagioclase Feldspar (An₅₋₁₀₀)',
      color: '#38bdf8', // Cyan
      oxideFormula: 'CaAl2Si2O8 + NaAlSi3O8',
    },
  },
  fields: [
    {
      id: 'quartzolite',
      name: 'Quartzolite (Silexite)',
      code: '1',
      color: '#cbd5e1',
      fillColor: 'rgba(203, 213, 225, 0.12)',
      textColor: '#f8fafc',
      vertices: [
        [100, 0, 0],
        [90, 10, 0],
        [90, 0, 10],
      ],
      labelPosition: [94, 3, 3],
      description: 'Extremely quartz-rich plutonic rock (>90% modal quartz).',
    },
    {
      id: 'quartz-rich-granitoid',
      name: 'Quartz-rich Granitoid',
      code: '2',
      color: '#94a3b8',
      fillColor: 'rgba(148, 163, 184, 0.12)',
      textColor: '#e2e8f0',
      vertices: [
        [90, 10, 0],
        [90, 0, 10],
        [60, 0, 40],
        [60, 40, 0],
      ],
      labelPosition: [75, 12, 13],
      description: 'High-silica granitic rock with 60–90% quartz.',
    },
    {
      id: 'alkali-granite',
      name: 'Alkali-feldspar Granite',
      code: '3a',
      color: '#f59e0b',
      fillColor: 'rgba(245, 158, 11, 0.12)',
      textColor: '#fde68a',
      vertices: [
        [60, 40, 0],
        [60, 36, 4],
        [20, 72, 8],
        [20, 80, 0],
      ],
      labelPosition: [40, 56, 4],
      description: 'Plagioclase constitutes <10% of total feldspars.',
    },
    {
      id: 'syenogranite',
      name: 'Syenogranite',
      code: '3b',
      color: '#f97316',
      fillColor: 'rgba(249, 115, 22, 0.12)',
      textColor: '#fdba74',
      vertices: [
        [60, 36, 4],
        [60, 26, 14],
        [20, 52, 28],
        [20, 72, 8],
      ],
      labelPosition: [40, 43, 17],
      description: 'Classic true granite with dominant K-feldspar over plagioclase.',
    },
    {
      id: 'monzogranite',
      name: 'Monzogranite',
      code: '3c',
      color: '#ec4899',
      fillColor: 'rgba(236, 72, 153, 0.12)',
      textColor: '#fbcfe8',
      vertices: [
        [60, 26, 14],
        [60, 14, 26],
        [20, 28, 52],
        [20, 52, 28],
      ],
      labelPosition: [40, 28, 32],
      description: 'Subequal proportions of alkali feldspar and plagioclase.',
    },
    {
      id: 'granodiorite',
      name: 'Granodiorite',
      code: '4',
      color: '#8b5cf6',
      fillColor: 'rgba(139, 92, 246, 0.12)',
      textColor: '#c4b5fd',
      vertices: [
        [60, 14, 26],
        [60, 4, 36],
        [20, 8, 72],
        [20, 28, 52],
      ],
      labelPosition: [40, 14, 46],
      description: 'Plagioclase exceeds alkali feldspar (65–90% of total feldspars).',
    },
    {
      id: 'tonalite',
      name: 'Tonalite / Trondhjemite',
      code: '5',
      color: '#3b82f6',
      fillColor: 'rgba(59, 130, 246, 0.12)',
      textColor: '#93c5fd',
      vertices: [
        [60, 4, 36],
        [60, 0, 40],
        [20, 0, 80],
        [20, 8, 72],
      ],
      labelPosition: [40, 3, 57],
      description: 'Quartz-rich with >90% plagioclase; archetypal TTG continental crust suites.',
    },
    {
      id: 'quartz-syenite',
      name: 'Quartz Syenite',
      code: '7*',
      color: '#d97706',
      fillColor: 'rgba(217, 119, 6, 0.12)',
      textColor: '#fde68a',
      vertices: [
        [20, 72, 8],
        [20, 52, 28],
        [5, 62, 33],
        [5, 85, 10],
      ],
      labelPosition: [12, 65, 23],
      description: 'Intermediate rock with 5–20% quartz and dominant alkali feldspar.',
    },
    {
      id: 'quartz-monzonite',
      name: 'Quartz Monzonite',
      code: '8*',
      color: '#a855f7',
      fillColor: 'rgba(168, 85, 247, 0.12)',
      textColor: '#e9d5ff',
      vertices: [
        [20, 52, 28],
        [20, 28, 52],
        [5, 33, 62],
        [5, 62, 33],
      ],
      labelPosition: [12, 43, 45],
      description: 'Intermediate intrusive with balanced feldspars and 5–20% quartz.',
    },
    {
      id: 'quartz-monzodiorite',
      name: 'Quartz Monzodiorite / Monzogabbro',
      code: '9*',
      color: '#06b6d4',
      fillColor: 'rgba(6, 182, 212, 0.12)',
      textColor: '#a5f3fc',
      vertices: [
        [20, 28, 52],
        [20, 8, 72],
        [5, 10, 85],
        [5, 33, 62],
      ],
      labelPosition: [12, 20, 68],
      description: 'Plagioclase-dominant with subordinate alkali feldspar and minor quartz.',
    },
    {
      id: 'quartz-diorite-gabbro',
      name: 'Quartz Diorite / Gabbro / Anorthosite',
      code: '10*',
      color: '#0284c7',
      fillColor: 'rgba(2, 132, 199, 0.12)',
      textColor: '#7dd3fc',
      vertices: [
        [20, 8, 72],
        [20, 0, 80],
        [5, 0, 95],
        [5, 10, 85],
      ],
      labelPosition: [12, 4, 84],
      description: 'Mafic intrusive rock with 5–20% quartz and almost exclusively plagioclase.',
    },
    {
      id: 'diorite-gabbro-anorthosite',
      name: 'Diorite / Gabbro / Anorthosite',
      code: '10',
      color: '#0f766e',
      fillColor: 'rgba(15, 118, 110, 0.15)',
      textColor: '#99f6e4',
      vertices: [
        [5, 10, 85],
        [5, 0, 95],
        [0, 0, 100],
        [0, 10, 90],
      ],
      labelPosition: [2, 4, 94],
      description: 'Classic silica-saturated mafic plutonic rocks (<5% quartz).',
    },
    {
      id: 'syenite-monzonite-base',
      name: 'Syenite / Monzonite / Monzodiorite',
      code: '6-9',
      color: '#b45309',
      fillColor: 'rgba(180, 83, 9, 0.15)',
      textColor: '#fef3c7',
      vertices: [
        [5, 95, 0],
        [5, 10, 85],
        [0, 10, 90],
        [0, 100, 0],
      ],
      labelPosition: [2, 50, 48],
      description: 'Low-quartz intrusive rocks with alkali feldspar and plagioclase.',
    },
  ],
  projectOxides: (oxides: OxideComposition) => {
    // Q-A-P derived from the CIPW norm, using the shared engine rather than a
    // second inline implementation. The previous inline version applied
    // formula weights of 278.33 per mole K2O for orthoclase and 262.22 per
    // mole Na2O for albite; both are per-mole-of-feldspar values, and one
    // mole of K2O or Na2O yields TWO moles of feldspar. A and P were
    // therefore on inconsistent bases and every point was displaced toward P.
    const norm = calculateCIPWNorm(oxides);

    const wtQ = (norm.Q as number) || 0;
    const or = (norm.Or as number) || 0;
    const ab = (norm.Ab as number) || 0;
    const an = (norm.An as number) || 0;

    // IUGS rule: plagioclase more sodic than An05 counts as alkali feldspar.
    // Split albite by the normative anorthite content rather than by an
    // arbitrary fixed fraction.
    const anContent = an + ab > 0 ? (an / (an + ab)) * 100 : 0;
    const abToA = anContent < 5 ? ab : 0;
    const abToP = anContent < 5 ? 0 : ab;

    const wtA = or + abToA;
    const wtP = an + abToP;

    const sum = wtQ + wtA + wtP;
    if (sum <= 0.01) return { a: 33.3, b: 33.3, c: 33.4, fieldName: 'Undetermined' };

    const normQ = (wtQ / sum) * 100;
    const normA = (wtA / sum) * 100;
    const normP = (wtP / sum) * 100;

    let field = 'Granitoid';
    if (normQ > 60) field = 'Quartz-rich Granitoid';
    else if (normQ > 20) {
      const pRatio = normP / (normA + normP);
      if (pRatio < 0.1) field = 'Alkali-feldspar Granite';
      else if (pRatio < 0.35) field = 'Syenogranite';
      else if (pRatio < 0.65) field = 'Monzogranite';
      else if (pRatio < 0.9) field = 'Granodiorite';
      else field = 'Tonalite';
    } else {
      const pRatio = normP / (normA + normP);
      if (pRatio > 0.9) field = normQ > 5 ? 'Quartz Diorite / Gabbro' : 'Diorite / Gabbro';
      else if (pRatio > 0.65) field = normQ > 5 ? 'Quartz Monzodiorite' : 'Monzodiorite';
      else if (pRatio > 0.35) field = normQ > 5 ? 'Quartz Monzonite' : 'Monzonite';
      else field = normQ > 5 ? 'Quartz Syenite' : 'Syenite';
    }

    return {
      a: normQ, // Top apex (Q)
      b: normA, // Bottom-Left (A)
      c: normP, // Bottom-Right (P)
      fieldName: field,
    };
  },
};

// =============================================================
// SYSTEM 4: Pyroxene Quadrilateral (Wo - En - Fs)
// Enstatite – Ferrosilite – Diopside – Hedenbergite
// Trapezoid: Wo 0% to 50%
// =============================================================
export const PYROXENE_QUAD_CONFIG: TernarySystemConfig = {
  id: 'pyroxene-quad',
  name: 'Pyroxene Quadrilateral',
  subtitle: 'Wollastonite (Wo) – Enstatite (En) – Ferrosilite (Fs)',
  description:
    'The classical petrological trapezoid used to classify clinopyroxenes and orthopyroxenes in igneous and metamorphic rocks. Bounded by Enstatite (Mg₂Si₂O₆), Ferrosilite (Fe₂Si₂O₆), Diopside (CaMgSi₂O₆), and Hedenbergite (CaFeSi₂O₆).',
  referenceAuthor: 'Morimoto et al. (1988) / IMA Subcommittee',
  isQuadrilateral: true,
  apices: {
    top: {
      id: 'Wo',
      label: 'Wo (Wollastonite 50%)',
      sublabel: 'Diopside – Hedenbergite Join',
      color: '#38bdf8', // Cyan
      oxideFormula: 'Ca / (Ca + Mg + Fe)',
    },
    bottomLeft: {
      id: 'En',
      label: 'En (Enstatite)',
      sublabel: 'Pure Magnesium Pyroxene (Mg₂Si₂O₆)',
      color: '#34d399', // Emerald
      oxideFormula: 'Mg / (Ca + Mg + Fe)',
    },
    bottomRight: {
      id: 'Fs',
      label: 'Fs (Ferrosilite)',
      sublabel: 'Pure Iron Pyroxene (Fe₂Si₂O₆)',
      color: '#f87171', // Red
      oxideFormula: 'Fe / (Ca + Mg + Fe)',
    },
  },
  fields: [
    {
      id: 'diopside',
      name: 'Diopside',
      code: 'Di',
      color: '#10b981',
      fillColor: 'rgba(16, 185, 129, 0.14)',
      textColor: '#6ee7b7',
      // [Wo (0-50), En, Fs]
      vertices: [
        [50, 50, 0],
        [50, 25, 25],
        [45, 27.5, 27.5],
        [45, 55, 0],
      ],
      labelPosition: [48, 40, 12],
      description: 'CaMgSi₂O₆, calcic clinopyroxene typical of skarns, marbles, and mantle peridotites.',
    },
    {
      id: 'hedenbergite',
      name: 'Hedenbergite',
      code: 'Hd',
      color: '#059669',
      fillColor: 'rgba(5, 150, 105, 0.14)',
      textColor: '#a7f3d0',
      vertices: [
        [50, 25, 25],
        [50, 0, 50],
        [45, 0, 55],
        [45, 27.5, 27.5],
      ],
      labelPosition: [48, 12, 40],
      description: 'CaFeSi₂O₆, iron-rich calcic clinopyroxene formed in skarns and differentiated granites.',
    },
    {
      id: 'augite',
      name: 'Augite',
      code: 'Aug',
      color: '#d97706',
      fillColor: 'rgba(217, 119, 6, 0.14)',
      textColor: '#fde68a',
      vertices: [
        [45, 55, 0],
        [45, 0, 55],
        [20, 0, 80],
        [20, 80, 0],
      ],
      labelPosition: [33, 40, 27],
      description: 'The most common clinopyroxene in basalt, gabbro, and andesite.',
    },
    {
      id: 'subcalcic-augite',
      name: 'Subcalcic Augite',
      code: 'Sc-Aug',
      color: '#f59e0b',
      fillColor: 'rgba(245, 158, 11, 0.14)',
      textColor: '#fef3c7',
      vertices: [
        [20, 80, 0],
        [20, 0, 80],
        [15, 0, 85],
        [15, 85, 0],
      ],
      labelPosition: [17.5, 45, 37.5],
      description: 'Metastable quench pyroxene crystallizing rapidly in volcanic lavas.',
    },
    {
      id: 'pigeonite',
      name: 'Pigeonite',
      code: 'Pig',
      color: '#8b5cf6',
      fillColor: 'rgba(139, 92, 246, 0.14)',
      textColor: '#c4b5fd',
      vertices: [
        [15, 85, 0],
        [15, 0, 85],
        [5, 0, 95],
        [5, 95, 0],
      ],
      labelPosition: [10, 48, 42],
      description: 'Low-Ca monoclinic pyroxene common in tholeiitic basalts and lunar mare lavas.',
    },
    {
      id: 'orthopyroxene',
      name: 'Orthopyroxene (Enstatite – Ferrosilite)',
      code: 'Opx',
      color: '#3b82f6',
      fillColor: 'rgba(59, 130, 246, 0.14)',
      textColor: '#bfdbfe',
      vertices: [
        [5, 95, 0],
        [5, 0, 95],
        [0, 0, 100],
        [0, 100, 0],
      ],
      labelPosition: [2.5, 50, 47.5],
      description: 'Orthorhombic pyroxene series (Enstatite, Bronzite, Hypersthene, Eulite, Ferrosilite).',
    },
  ],
  projectOxides: (oxides: OxideComposition) => {
    // Atomic cations:
    // Ca = CaO / 56.08
    // Mg = MgO / 40.30
    // Fe = FeO/71.84 + Fe2O3*2/159.69 + MnO/70.94
    const ca = (oxides.CaO || 0) / 56.08;
    const mg = (oxides.MgO || 0) / 40.3;
    const fe = (oxides.FeO || 0) / 71.84 + ((oxides.Fe2O3 || 0) * 2) / 159.69 + (oxides.MnO || 0) / 70.94;

    const sum = ca + mg + fe;
    if (sum <= 0.001) return { a: 20, b: 40, c: 40, fieldName: 'Undetermined' };

    const wo = Math.min(50, (ca / sum) * 100);
    const rem = 100 - wo;
    const mgRatio = mg / (mg + fe || 1);

    const en = rem * mgRatio;
    const fs = rem * (1 - mgRatio);

    let field = 'Pyroxene';
    if (wo >= 45) {
      field = mgRatio > 0.5 ? 'Diopside' : 'Hedenbergite';
    } else if (wo >= 20) {
      field = 'Augite';
    } else if (wo >= 15) {
      field = 'Subcalcic Augite';
    } else if (wo >= 5) {
      field = 'Pigeonite';
    } else {
      if (mgRatio > 0.9) field = 'Enstatite (Opx)';
      else if (mgRatio > 0.7) field = 'Bronzite (Opx)';
      else if (mgRatio > 0.5) field = 'Hypersthene (Opx)';
      else if (mgRatio > 0.3) field = 'Ferrohypersthene (Opx)';
      else if (mgRatio > 0.1) field = 'Eulite (Opx)';
      else field = 'Ferrosilite (Opx)';
    }

    return {
      a: wo,
      b: en,
      c: fs,
      fieldName: field,
    };
  },
};

// =============================================================
// SYSTEM 5: Feldspar Ternary (Or - Ab - An)
// =============================================================
export const FELDSPAR_CONFIG: TernarySystemConfig = {
  id: 'feldspar',
  name: 'Feldspar Ternary System',
  subtitle: 'Orthoclase (Or) – Albite (Ab) – Anorthite (An)',
  description:
    'Essential mineralogical ternary classifying the alkali feldspar and plagioclase solid-solution series, including the plagioclase divisions (Albite, Oligoclase, Andesine, Labradorite, Bytownite, Anorthite).',
  referenceAuthor: 'Deer, Howie & Zussman (1992)',
  apices: {
    top: {
      id: 'Or',
      label: 'Or (Orthoclase)',
      sublabel: 'Potassium Feldspar (KAlSi₃O₈)',
      color: '#f59e0b',
      oxideFormula: 'K2O',
    },
    bottomLeft: {
      id: 'Ab',
      label: 'Ab (Albite)',
      sublabel: 'Sodium Feldspar (NaAlSi₃O₈)',
      color: '#3b82f6',
      oxideFormula: 'Na2O',
    },
    bottomRight: {
      id: 'An',
      label: 'An (Anorthite)',
      sublabel: 'Calcium Feldspar (CaAl₂Si₂O₈)',
      color: '#10b981',
      oxideFormula: 'CaO',
    },
  },
  fields: [
    {
      id: 'sanidine-orthoclase',
      name: 'Sanidine / Orthoclase',
      code: 'K-Spar',
      color: '#f59e0b',
      fillColor: 'rgba(245, 158, 11, 0.15)',
      textColor: '#fef3c7',
      vertices: [
        [100, 0, 0],
        [60, 40, 0],
        [60, 35, 5],
        [85, 0, 15],
      ],
      labelPosition: [80, 15, 5],
      description: 'Potassium-dominant monoclinic and triclinic feldspars in granites, pegmatites, and rhyolites.',
    },
    {
      id: 'plagioclase-albite',
      name: 'Albite (An₀₋₁₀)',
      code: 'Ab',
      color: '#3b82f6',
      fillColor: 'rgba(59, 130, 246, 0.15)',
      textColor: '#bfdbfe',
      vertices: [
        [10, 90, 0],
        [0, 100, 0],
        [0, 90, 10],
        [10, 80, 10],
      ],
      labelPosition: [5, 90, 5],
      description: 'Sodium endmember plagioclase.',
    },
    {
      id: 'plagioclase-oligoclase',
      name: 'Oligoclase (An₁₀₋₃₀)',
      code: 'Oli',
      color: '#06b6d4',
      fillColor: 'rgba(6, 182, 212, 0.15)',
      textColor: '#a5f3fc',
      vertices: [
        [10, 80, 10],
        [0, 90, 10],
        [0, 70, 30],
        [10, 60, 30],
      ],
      labelPosition: [5, 75, 20],
      description: 'Plagioclase in granodiorite, dacite, and intermediate gneisses.',
    },
    {
      id: 'plagioclase-andesine',
      name: 'Andesine (An₃₀₋₅₀)',
      code: 'And',
      color: '#14b8a6',
      fillColor: 'rgba(20, 184, 166, 0.15)',
      textColor: '#99f6e4',
      vertices: [
        [10, 60, 30],
        [0, 70, 30],
        [0, 50, 50],
        [10, 40, 50],
      ],
      labelPosition: [5, 55, 40],
      description: 'Typical plagioclase of andesites and diorites.',
    },
    {
      id: 'plagioclase-labradorite',
      name: 'Labradorite (An₅₀₋₇₀)',
      code: 'Lab',
      color: '#10b981',
      fillColor: 'rgba(16, 185, 129, 0.15)',
      textColor: '#a7f3d0',
      vertices: [
        [10, 40, 50],
        [0, 50, 50],
        [0, 30, 70],
        [10, 20, 70],
      ],
      labelPosition: [5, 35, 60],
      description: 'Diagnostic plagioclase of basalt, gabbro, and anorthosite exhibiting labradorescence.',
    },
    {
      id: 'plagioclase-bytownite',
      name: 'Bytownite (An₇₀₋₉₀)',
      code: 'Byt',
      color: '#22c55e',
      fillColor: 'rgba(34, 197, 94, 0.15)',
      textColor: '#bbf7d0',
      vertices: [
        [10, 20, 70],
        [0, 30, 70],
        [0, 10, 90],
        [10, 0, 90],
      ],
      labelPosition: [5, 15, 80],
      description: 'Calc-calcic plagioclase in primitive basalts and layered intrusions.',
    },
    {
      id: 'plagioclase-anorthite',
      name: 'Anorthite (An₉₀₋₁₀₀)',
      code: 'An',
      color: '#84cc16',
      fillColor: 'rgba(132, 204, 22, 0.15)',
      textColor: '#d9f99d',
      vertices: [
        [10, 0, 90],
        [0, 10, 90],
        [0, 0, 100],
      ],
      labelPosition: [3, 2, 95],
      description: 'Calcium endmember plagioclase in ultrabasic rocks and lunar anorthosites.',
    },
  ],
  projectOxides: (oxides: OxideComposition) => {
    const k = (oxides.K2O || 0) / 94.2;
    const na = (oxides.Na2O || 0) / 61.98;
    const ca = (oxides.CaO || 0) / 56.08;

    const sum = k + na + ca;
    if (sum <= 0.001) return { a: 33.3, b: 33.3, c: 33.3, fieldName: 'Undetermined' };

    const or = (k / sum) * 100;
    const ab = (na / sum) * 100;
    const an = (ca / sum) * 100;

    let field = 'Feldspar';
    if (or > 50) field = 'K-Feldspar (Sanidine/Orthoclase)';
    else {
      const anPlag = (an / (ab + an || 1)) * 100;
      if (anPlag < 10) field = 'Albite (Plagioclase)';
      else if (anPlag < 30) field = 'Oligoclase (Plagioclase)';
      else if (anPlag < 50) field = 'Andesine (Plagioclase)';
      else if (anPlag < 70) field = 'Labradorite (Plagioclase)';
      else if (anPlag < 90) field = 'Bytownite (Plagioclase)';
      else field = 'Anorthite (Plagioclase)';
    }

    return {
      a: or,
      b: ab,
      c: an,
      fieldName: field,
    };
  },
};

export const QAPF_VOLCANIC_CONFIG: TernarySystemConfig = {
  id: 'qapf-volcanic',
  name: 'QAPF Volcanic Classification',
  subtitle: 'Quartz (Q) – Alkali Feldspar (A) – Plagioclase (P)',
  description:
    'The international IUGS modal/normative mineralogical classification for extrusive volcanic igneous rocks containing >10% felsic minerals.',
  referenceAuthor: 'Streckeisen (1978, 1979) / Le Maitre et al. (2002)',
  apices: QAPF_PLUTONIC_CONFIG.apices,
  fields: [
    {
      id: 'qz-rich-rhyolite',
      name: 'Quartz-rich Rhyolite',
      code: '2',
      color: '#94a3b8',
      fillColor: 'rgba(148, 163, 184, 0.12)',
      textColor: '#e2e8f0',
      vertices: [
        [100, 0, 0],
        [60, 40, 0],
        [60, 0, 40],
      ],
      labelPosition: [75, 12, 13],
      description: 'Extremely quartz-rich rhyolite (>60% modal/normative quartz).',
    },
    {
      id: 'rhyolite',
      name: 'Rhyolite (Alkali-feldspar & True Rhyolite)',
      code: '3',
      color: '#f59e0b',
      fillColor: 'rgba(245, 158, 11, 0.14)',
      textColor: '#fde68a',
      vertices: [
        [60, 40, 0],
        [60, 14, 26],
        [20, 28, 52],
        [20, 80, 0],
      ],
      labelPosition: [38, 42, 20],
      description: 'High-silica volcanic rock with dominant alkali feldspar or quartz-phenocrysts.',
    },
    {
      id: 'dacite',
      name: 'Dacite',
      code: '4',
      color: '#0284c7',
      fillColor: 'rgba(2, 132, 199, 0.14)',
      textColor: '#bae6fd',
      vertices: [
        [60, 14, 26],
        [60, 0, 40],
        [20, 0, 80],
        [20, 28, 52],
      ],
      labelPosition: [38, 10, 52],
      description: 'Quartz-rich volcanic rock dominated by plagioclase feldspar.',
    },
    {
      id: 'trachyte-alkali',
      name: 'Alkali-feldspar Trachyte',
      code: '6',
      color: '#ea580c',
      fillColor: 'rgba(234, 88, 12, 0.12)',
      textColor: '#fed7aa',
      vertices: [
        [20, 80, 0],
        [20, 72, 8],
        [0, 90, 10],
        [0, 100, 0],
      ],
      labelPosition: [8, 88, 4],
      description: 'Alkali-rich volcanic rock with <20% quartz and >90% alkali feldspar.',
    },
    {
      id: 'trachyte-proper',
      name: 'Trachyte',
      code: '7',
      color: '#d97706',
      fillColor: 'rgba(217, 119, 6, 0.12)',
      textColor: '#fde68a',
      vertices: [
        [20, 72, 8],
        [20, 52, 28],
        [0, 65, 35],
        [0, 90, 10],
      ],
      labelPosition: [8, 68, 24],
      description: 'Intermediate felsic volcanic rock with alkali feldspar > plagioclase.',
    },
    {
      id: 'latite',
      name: 'Latite',
      code: '8',
      color: '#ec4899',
      fillColor: 'rgba(236, 72, 153, 0.12)',
      textColor: '#fbcfe8',
      vertices: [
        [20, 52, 28],
        [20, 28, 52],
        [0, 35, 65],
        [0, 65, 35],
      ],
      labelPosition: [8, 44, 48],
      description: 'Volcanic equivalent of monzonite with subequal alkali feldspar and plagioclase.',
    },
    {
      id: 'trachyandesite-volc',
      name: 'Trachyandesite / Basaltic Trachyandesite',
      code: '9',
      color: '#8b5cf6',
      fillColor: 'rgba(139, 92, 246, 0.12)',
      textColor: '#ddd6fe',
      vertices: [
        [20, 28, 52],
        [20, 8, 72],
        [0, 10, 90],
        [0, 35, 65],
      ],
      labelPosition: [8, 20, 72],
      description: 'Intermediate volcanic rock with plagioclase > alkali feldspar and moderate alkalis.',
    },
    {
      id: 'andesite-basalt-volc',
      name: 'Andesite / Basalt',
      code: '10',
      color: '#06b6d4',
      fillColor: 'rgba(6, 182, 212, 0.12)',
      textColor: '#a5f3fc',
      vertices: [
        [20, 8, 72],
        [20, 0, 80],
        [0, 0, 100],
        [0, 10, 90],
      ],
      labelPosition: [8, 4, 88],
      description: 'Sub-alkaline and calc-alkaline volcanic rocks with plagioclase forming >90% of total feldspars.',
    },
  ],
  projectOxides: (oxides: OxideComposition) => {
    const cipw = calculateCIPWNorm(oxides);
    const q = cipw.Q || 0;
    const or = cipw.Or || 0;
    const ab = cipw.Ab || 0;
    const an = cipw.An || 0;

    const wtA = or + 0.1 * ab;
    const wtP = an + 0.9 * ab;
    const wtQ = q;
    const sum = wtQ + wtA + wtP;

    if (sum <= 0.01) return { a: 33.3, b: 33.3, c: 33.3, fieldName: 'Undetermined' };

    const normQ = (wtQ / sum) * 100;
    const normA = (wtA / sum) * 100;
    const normP = (wtP / sum) * 100;

    let field = 'Volcanic Rock';
    if (normQ > 60) field = 'Quartz-rich Rhyolite';
    else if (normQ > 20) {
      const pRatio = normP / (normA + normP || 1);
      if (pRatio < 0.65) field = 'Rhyolite';
      else field = 'Dacite';
    } else {
      const pRatio = normP / (normA + normP || 1);
      if (pRatio < 0.10) field = 'Alkali-feldspar Trachyte';
      else if (pRatio < 0.35) field = 'Trachyte';
      else if (pRatio < 0.65) field = 'Latite';
      else if (pRatio < 0.90) field = 'Trachyandesite';
      else field = 'Andesite / Basalt';
    }

    return {
      a: normQ,
      b: normA,
      c: normP,
      fieldName: field,
    };
  },
};

export const APF_PLUTONIC_CONFIG: TernarySystemConfig = {
  id: 'apf-plutonic',
  name: 'APF Plutonic Classification (Foid-bearing Rocks)',
  subtitle: 'Feldspathoids (F) – Alkali Feldspar (A) – Plagioclase (P)',
  description:
    'The lower triangle of the IUGS QAPF double diagram for silica-undersaturated plutonic rocks containing feldspathoids (Nepheline, Leucite, Sodalite, Kalsilite).',
  referenceAuthor: 'Streckeisen (1974, 1976) / Le Maitre et al. (2002)',
  apices: {
    top: {
      id: 'F',
      label: 'F (Feldspathoids)',
      sublabel: 'Nepheline, Leucite, Sodalite, Kalsilite',
      color: '#f43f5e',
      oxideFormula: 'Silica-Deficient Foids',
    },
    bottomLeft: {
      id: 'A',
      label: 'A (Alkali Feldspar)',
      sublabel: 'Orthoclase + Microcline + Albite (An₀₋₅)',
      color: '#fbbf24',
      oxideFormula: 'KAlSi3O8 + NaAlSi3O8',
    },
    bottomRight: {
      id: 'P',
      label: 'P (Plagioclase)',
      sublabel: 'Plagioclase Feldspar (An₅₋₁₀₀)',
      color: '#38bdf8',
      oxideFormula: 'CaAl2Si2O8 + NaAlSi3O8',
    },
  },
  fields: [
    {
      id: 'foidolite',
      name: 'Foidolite (Ijolite / Urtite / Melteigite)',
      code: '15',
      color: '#e11d48',
      fillColor: 'rgba(225, 29, 72, 0.16)',
      textColor: '#fecdd3',
      vertices: [
        [100, 0, 0],
        [60, 40, 0],
        [60, 0, 40],
      ],
      labelPosition: [75, 12, 13],
      description: 'Plutonic rocks with >60% feldspathoids (Nepheline, Leucite).',
    },
    {
      id: 'foid-syenite',
      name: 'Foid Syenite (Nepheline Syenite)',
      code: '11',
      color: '#f59e0b',
      fillColor: 'rgba(245, 158, 11, 0.13)',
      textColor: '#fde68a',
      vertices: [
        [60, 40, 0],
        [60, 36, 4],
        [10, 81, 9],
        [10, 90, 0],
      ],
      labelPosition: [35, 60, 5],
      description: 'Feldspathoid syenite with 10–60% foids and dominant alkali feldspar.',
    },
    {
      id: 'foid-monzosyenite',
      name: 'Foid Monzosyenite',
      code: '12',
      color: '#f97316',
      fillColor: 'rgba(249, 115, 22, 0.13)',
      textColor: '#fed7aa',
      vertices: [
        [60, 36, 4],
        [60, 26, 14],
        [10, 58.5, 31.5],
        [10, 81, 9],
      ],
      labelPosition: [35, 45, 20],
      description: 'Foid-bearing plutonic rock with alkali feldspar > plagioclase.',
    },
    {
      id: 'foid-monzodiorite',
      name: 'Foid Monzodiorite / Monzogabbro (Essexite)',
      code: '13',
      color: '#a855f7',
      fillColor: 'rgba(168, 85, 247, 0.13)',
      textColor: '#e9d5ff',
      vertices: [
        [60, 26, 14],
        [60, 14, 26],
        [10, 31.5, 58.5],
        [10, 58.5, 31.5],
      ],
      labelPosition: [35, 28, 37],
      description: 'Subequal alkali feldspar and plagioclase with 10–60% foids.',
    },
    {
      id: 'foid-diorite-gabbro',
      name: 'Foid Diorite / Foid Gabbro (Theralite)',
      code: '14',
      color: '#06b6d4',
      fillColor: 'rgba(6, 182, 212, 0.13)',
      textColor: '#a5f3fc',
      vertices: [
        [60, 14, 26],
        [60, 0, 40],
        [10, 0, 90],
        [10, 31.5, 58.5],
      ],
      labelPosition: [35, 8, 57],
      description: 'Foid rock dominated by plagioclase (Anorthosite / Gabbro / Diorite affinities).',
    },
    {
      id: 'foid-bearing-alkali-syenite',
      name: 'Foid-bearing Alkali-feldspar Syenite',
      code: '6*',
      color: '#eab308',
      fillColor: 'rgba(234, 179, 8, 0.12)',
      textColor: '#fef08a',
      vertices: [
        [10, 90, 0],
        [10, 81, 9],
        [0, 90, 10],
        [0, 100, 0],
      ],
      labelPosition: [5, 92, 3],
      description: '<10% foids with >90% alkali feldspar.',
    },
    {
      id: 'foid-bearing-syenite',
      name: 'Foid-bearing Syenite',
      code: '7*',
      color: '#d97706',
      fillColor: 'rgba(217, 119, 6, 0.12)',
      textColor: '#fde68a',
      vertices: [
        [10, 81, 9],
        [10, 58.5, 31.5],
        [0, 65, 35],
        [0, 90, 10],
      ],
      labelPosition: [5, 74, 21],
      description: '<10% foids with alkali feldspar > plagioclase.',
    },
    {
      id: 'foid-bearing-monzonite',
      name: 'Foid-bearing Monzonite',
      code: '8*',
      color: '#ec4899',
      fillColor: 'rgba(236, 72, 153, 0.12)',
      textColor: '#fbcfe8',
      vertices: [
        [10, 58.5, 31.5],
        [10, 31.5, 58.5],
        [0, 35, 65],
        [0, 65, 35],
      ],
      labelPosition: [5, 48, 47],
      description: '<10% foids with subequal feldspars.',
    },
    {
      id: 'foid-bearing-monzodiorite',
      name: 'Foid-bearing Monzodiorite / Monzogabbro',
      code: '9*',
      color: '#8b5cf6',
      fillColor: 'rgba(139, 92, 246, 0.12)',
      textColor: '#ddd6fe',
      vertices: [
        [10, 31.5, 58.5],
        [10, 9, 81],
        [0, 10, 90],
        [0, 35, 65],
      ],
      labelPosition: [5, 21, 74],
      description: '<10% foids with plagioclase > alkali feldspar.',
    },
    {
      id: 'foid-bearing-diorite-gabbro',
      name: 'Foid-bearing Diorite / Gabbro',
      code: '10*',
      color: '#3b82f6',
      fillColor: 'rgba(59, 130, 246, 0.12)',
      textColor: '#bfdbfe',
      vertices: [
        [10, 9, 81],
        [10, 0, 90],
        [0, 0, 100],
        [0, 10, 90],
      ],
      labelPosition: [5, 5, 90],
      description: '<10% foids with plagioclase constituting >90% of feldspars.',
    },
  ],
  projectOxides: (oxides: OxideComposition) => {
    const cipw = calculateCIPWNorm(oxides);
    const or = cipw.Or || 0;
    const ab = cipw.Ab || 0;
    const an = cipw.An || 0;
    const ne = cipw.Ne || 0;
    const lc = cipw.Lc || 0;

    const fVal = ne + lc;
    const aVal = or + 0.1 * ab;
    const pVal = an + 0.9 * ab;
    const sum = fVal + aVal + pVal;

    if (sum <= 0.01) return { a: 33.3, b: 33.3, c: 33.3, fieldName: 'Undetermined' };

    const normF = (fVal / sum) * 100;
    const normA = (aVal / sum) * 100;
    const normP = (pVal / sum) * 100;

    let field = 'Foid-bearing Plutonic Rock';
    if (normF > 60) field = 'Foidolite (Ijolite/Urtite)';
    else if (normF > 10) {
      const pRatio = normP / (normA + normP || 1);
      if (pRatio < 0.10) field = 'Foid Syenite';
      else if (pRatio < 0.35) field = 'Foid Monzosyenite';
      else if (pRatio < 0.65) field = 'Foid Monzodiorite / Essexite';
      else field = 'Foid Diorite / Gabbro / Theralite';
    } else {
      const pRatio = normP / (normA + normP || 1);
      if (pRatio < 0.10) field = 'Foid-bearing Alkali-feldspar Syenite';
      else if (pRatio < 0.35) field = 'Foid-bearing Syenite';
      else if (pRatio < 0.65) field = 'Foid-bearing Monzonite';
      else if (pRatio < 0.90) field = 'Foid-bearing Monzodiorite';
      else field = 'Foid-bearing Diorite / Gabbro';
    }

    return {
      a: normF,
      b: normA,
      c: normP,
      fieldName: field,
    };
  },
};

export const APF_VOLCANIC_CONFIG: TernarySystemConfig = {
  id: 'apf-volcanic',
  name: 'APF Volcanic Classification (Feldspathoid Rocks)',
  subtitle: 'Feldspathoids (F) – Alkali Feldspar (A) – Plagioclase (P)',
  description:
    'The lower triangle of the IUGS QAPF double diagram for silica-undersaturated volcanic rocks containing feldspathoids (Phonolite, Tephrite, Basanite, Foidite/Nephelinite).',
  referenceAuthor: 'Le Maitre et al. (2002) / Le Bas & Streckeisen (1991)',
  apices: APF_PLUTONIC_CONFIG.apices,
  fields: [
    {
      id: 'foidite-volc',
      name: 'Foidite (Nephelinite / Leucitite / Melilitite)',
      code: "15'",
      color: '#e11d48',
      fillColor: 'rgba(225, 29, 72, 0.16)',
      textColor: '#fecdd3',
      vertices: [
        [100, 0, 0],
        [60, 40, 0],
        [60, 0, 40],
      ],
      labelPosition: [75, 12, 13],
      description: 'Extrusive rocks with >60% feldspathoids (Nephelinite, Leucitite).',
    },
    {
      id: 'phonolite',
      name: 'Phonolite',
      code: "11'",
      color: '#f59e0b',
      fillColor: 'rgba(245, 158, 11, 0.14)',
      textColor: '#fde68a',
      vertices: [
        [60, 40, 0],
        [60, 24, 16],
        [10, 54, 36],
        [10, 90, 0],
      ],
      labelPosition: [35, 52, 13],
      description: 'Silica-undersaturated felsic volcanic rock with dominant alkali feldspar and 10–60% foids.',
    },
    {
      id: 'tephritic-phonolite',
      name: 'Tephritic Phonolite',
      code: "12'",
      color: '#f97316',
      fillColor: 'rgba(249, 115, 22, 0.14)',
      textColor: '#fed7aa',
      vertices: [
        [60, 24, 16],
        [60, 14, 26],
        [10, 31.5, 58.5],
        [10, 54, 36],
      ],
      labelPosition: [35, 30, 35],
      description: 'Intermediate foid-bearing volcanic rock with alkali feldspar subequal or slightly less than plagioclase.',
    },
    {
      id: 'phonolitic-tephrite',
      name: 'Phonolitic Tephrite / Phonolitic Basanite',
      code: "13'",
      color: '#a855f7',
      fillColor: 'rgba(168, 85, 247, 0.14)',
      textColor: '#e9d5ff',
      vertices: [
        [60, 14, 26],
        [60, 4, 36],
        [10, 9, 81],
        [10, 31.5, 58.5],
      ],
      labelPosition: [35, 14, 51],
      description: 'Plagioclase-rich foid volcanic rock with 10–60% foids (basanite if Ol > 10%).',
    },
    {
      id: 'tephrite-basanite',
      name: 'Tephrite (ol < 10%) / Basanite (ol > 10%)',
      code: "14'",
      color: '#06b6d4',
      fillColor: 'rgba(6, 182, 212, 0.14)',
      textColor: '#a5f3fc',
      vertices: [
        [60, 4, 36],
        [60, 0, 40],
        [10, 0, 90],
        [10, 9, 81],
      ],
      labelPosition: [35, 3, 62],
      description: 'Mafic volcanic rocks with 10–60% foids and plagioclase constituting >90% of feldspars.',
    },
    {
      id: 'foid-bearing-trachyte',
      name: 'Foid-bearing Trachyte',
      code: "6'/7'",
      color: '#eab308',
      fillColor: 'rgba(234, 179, 8, 0.12)',
      textColor: '#fef08a',
      vertices: [
        [10, 90, 0],
        [10, 58.5, 31.5],
        [0, 65, 35],
        [0, 100, 0],
      ],
      labelPosition: [5, 78, 17],
      description: 'Trachytic rock with <10% feldspathoids.',
    },
    {
      id: 'foid-bearing-latite',
      name: 'Foid-bearing Latite',
      code: "8'",
      color: '#ec4899',
      fillColor: 'rgba(236, 72, 153, 0.12)',
      textColor: '#fbcfe8',
      vertices: [
        [10, 58.5, 31.5],
        [10, 31.5, 58.5],
        [0, 35, 65],
        [0, 65, 35],
      ],
      labelPosition: [5, 48, 47],
      description: 'Latite with <10% feldspathoids.',
    },
    {
      id: 'foid-bearing-andesite-basalt',
      name: 'Foid-bearing Andesite / Basalt',
      code: "9'/10'",
      color: '#3b82f6',
      fillColor: 'rgba(59, 130, 246, 0.12)',
      textColor: '#bfdbfe',
      vertices: [
        [10, 31.5, 58.5],
        [10, 0, 90],
        [0, 0, 100],
        [0, 35, 65],
      ],
      labelPosition: [5, 16, 79],
      description: 'Basalt or andesite containing minor (<10%) feldspathoids.',
    },
  ],
  projectOxides: (oxides: OxideComposition) => {
    const cipw = calculateCIPWNorm(oxides);
    const or = cipw.Or || 0;
    const ab = cipw.Ab || 0;
    const an = cipw.An || 0;
    const ne = cipw.Ne || 0;
    const lc = cipw.Lc || 0;
    const ol = cipw.Ol || 0;

    const fVal = ne + lc;
    const aVal = or + 0.1 * ab;
    const pVal = an + 0.9 * ab;
    const sum = fVal + aVal + pVal;

    if (sum <= 0.01) return { a: 33.3, b: 33.3, c: 33.3, fieldName: 'Undetermined' };

    const normF = (fVal / sum) * 100;
    const normA = (aVal / sum) * 100;
    const normP = (pVal / sum) * 100;

    let field = 'Foid-bearing Volcanic Rock';
    if (normF > 60) field = 'Foidite (Nephelinite/Leucitite)';
    else if (normF > 10) {
      const pRatio = normP / (normA + normP || 1);
      if (pRatio < 0.40) field = 'Phonolite';
      else if (pRatio < 0.65) field = 'Tephritic Phonolite';
      else if (pRatio < 0.90) field = ol > 10 ? 'Phonolitic Basanite' : 'Phonolitic Tephrite';
      else field = ol > 10 ? 'Basanite' : 'Tephrite';
    } else {
      const pRatio = normP / (normA + normP || 1);
      if (pRatio < 0.35) field = 'Foid-bearing Trachyte';
      else if (pRatio < 0.65) field = 'Foid-bearing Latite';
      else field = 'Foid-bearing Andesite / Basalt';
    }

    return {
      a: normF,
      b: normA,
      c: normP,
      fieldName: field,
    };
  },
};

export const BASALT_TETRAHEDRON_CONFIG: TernarySystemConfig = {
  id: 'basalt-tetrahedron',
  name: 'Basalt Tetrahedron (Yoder & Tilley)',
  subtitle: 'Diopside (Di) – Olivine (Ol) – Silica Saturation (Qz / Ne Index)',
  description:
    'The foundational petrological Basalt Tetrahedron of Yoder & Tilley (1962). Illustrates the critical thermal divide separating silica-oversaturated Tholeiitic suites from silica-undersaturated Alkaline basalts.',
  referenceAuthor: 'Yoder & Tilley (1962) / Morse (1980)',
  apices: {
    top: {
      id: 'Di',
      label: 'Di (Diopside)',
      sublabel: 'Clinopyroxene [Ca(Mg,Fe)Si₂O₆]',
      color: '#10b981',
      oxideFormula: 'CaMgSi2O6',
    },
    bottomLeft: {
      id: 'Ol',
      label: 'Ol (Olivine)',
      sublabel: 'Forsterite / Fayalite [(Mg,Fe)₂SiO₄]',
      color: '#84cc16',
      oxideFormula: '(Mg,Fe)2SiO4',
    },
    bottomRight: {
      id: 'Sat',
      label: 'Qz / Ne (Silica Index)',
      sublabel: 'Quartz (oversaturated) vs Nepheline (undersaturated)',
      color: '#f59e0b',
      oxideFormula: 'Normative Saturation',
    },
  },
  fields: [
    {
      id: 'pyroxenite-basalt',
      name: 'Pyroxenite / High-Ca Cumulate',
      code: 'Pyx',
      color: '#059669',
      fillColor: 'rgba(5, 150, 105, 0.14)',
      textColor: '#a7f3d0',
      vertices: [
        [100, 0, 0],
        [60, 40, 0],
        [60, 0, 40],
      ],
      labelPosition: [75, 12, 13],
      description: 'Diopside-rich cumulate or high-Ca basaltic fractionation product.',
    },
    {
      id: 'picrite-komatiite',
      name: 'Picritic Basalt / Komatiite',
      code: 'Pic',
      color: '#65a30d',
      fillColor: 'rgba(101, 163, 13, 0.16)',
      textColor: '#bef264',
      vertices: [
        [60, 40, 0],
        [0, 100, 0],
        [0, 50, 50],
        [30, 35, 35],
      ],
      labelPosition: [20, 65, 15],
      description: 'High-MgO picritic magma with abundant normative and modal olivine.',
    },
    {
      id: 'quartz-tholeiite',
      name: 'Quartz Tholeiite (Silica Oversaturated)',
      code: 'Qz-Thol',
      color: '#0284c7',
      fillColor: 'rgba(2, 132, 199, 0.14)',
      textColor: '#bae6fd',
      vertices: [
        [60, 0, 40],
        [30, 35, 35],
        [0, 50, 50],
        [0, 0, 100],
      ],
      labelPosition: [22, 18, 60],
      description: 'Sub-alkaline basalt with normative quartz (Qz > 0), plotting in the silica-oversaturated volume.',
    },
    {
      id: 'olivine-tholeiite',
      name: 'Olivine Tholeiite (Silica Saturated)',
      code: 'Ol-Thol',
      color: '#3b82f6',
      fillColor: 'rgba(59, 130, 246, 0.13)',
      textColor: '#bfdbfe',
      vertices: [
        [45, 25, 30],
        [20, 45, 35],
        [0, 60, 40],
        [0, 35, 65],
      ],
      labelPosition: [16, 42, 42],
      description: 'Hypersthene- and olivine-normative basalt bounded by the plane of silica saturation.',
    },
    {
      id: 'alkali-basalt',
      name: 'Alkali Olivine Basalt (Silica Undersaturated)',
      code: 'AOB',
      color: '#d97706',
      fillColor: 'rgba(217, 119, 6, 0.14)',
      textColor: '#fde68a',
      vertices: [
        [35, 30, 35],
        [15, 35, 50],
        [0, 35, 65],
        [0, 15, 85],
      ],
      labelPosition: [12, 28, 60],
      description: 'Slightly nepheline-normative basalt crossing the critical plane of silica undersaturation.',
    },
    {
      id: 'basanite-tephrite-tet',
      name: 'Basanite & Tephrite',
      code: 'Bas/Teph',
      color: '#e11d48',
      fillColor: 'rgba(225, 29, 72, 0.14)',
      textColor: '#fecdd3',
      vertices: [
        [35, 15, 50],
        [0, 15, 85],
        [0, 0, 100],
        [20, 0, 80],
      ],
      labelPosition: [14, 8, 78],
      description: 'Strongly silica-undersaturated basaltic magma with >5% normative nepheline.',
    },
  ],
  projectOxides: (oxides: OxideComposition) => {
    const cipw = calculateCIPWNorm(oxides);
    const di = cipw.Di || 0;
    const ol = cipw.Ol || 0;
    const q = cipw.Q || 0;
    const ne = cipw.Ne || 0;
    const hy = cipw.Hy || 0;
    const ab = cipw.Ab || 0;

    const satComponent = Math.max(0.5, q * 2.2 + ne * 1.8 + hy * 0.7 + ab * 0.2);
    const diVal = Math.max(0.5, di);
    const olVal = Math.max(0.5, ol);
    const sum = diVal + olVal + satComponent;

    const normDi = (diVal / sum) * 100;
    const normOl = (olVal / sum) * 100;
    const normSat = (satComponent / sum) * 100;

    let field = 'Basaltic Composition';
    if (normDi > 60) field = 'Pyroxenite / High-Ca Cumulate';
    else if (normOl > 45) field = 'Picritic Basalt / Komatiite';
    else if (q > 0.5) field = 'Quartz Tholeiite (Silica Oversaturated)';
    else if (ne > 15) field = 'Nephelinite / Foidite (Strongly Undersaturated)';
    else if (ne > 5) field = 'Basanite / Tephrite (Silica Undersaturated)';
    else if (ne > 0.1) field = 'Alkali Olivine Basalt (Sub-Alkaline divide)';
    else field = 'Olivine Tholeiite (Silica Saturated)';

    return {
      a: normDi,
      b: normOl,
      c: normSat,
      fieldName: field,
    };
  },
};

export const ULTRAMAFIC_CONFIG: TernarySystemConfig = {
  id: 'ultramafic',
  name: 'Ultramafic Rock Classification',
  subtitle: 'Olivine (Ol) – Orthopyroxene (Opx) – Clinopyroxene (Cpx)',
  description:
    'IUGS classification for mantle and cumulate ultramafic rocks (Dunite, Harzburgite, Lherzolite, Wehrlite, Pyroxenites).',
  referenceAuthor: 'IUGS Subcommission (1973)',
  apices: {
    top: {
      id: 'Ol',
      label: 'Ol (Olivine)',
      sublabel: '(Mg,Fe)₂SiO₄',
      color: '#84cc16',
    },
    bottomLeft: {
      id: 'Opx',
      label: 'Opx (Orthopyroxene)',
      sublabel: 'Enstatite (MgSiO₃)',
      color: '#3b82f6',
    },
    bottomRight: {
      id: 'Cpx',
      label: 'Cpx (Clinopyroxene)',
      sublabel: 'Diopside (CaMgSi₂O₆)',
      color: '#10b981',
    },
  },
  fields: [
    {
      id: 'dunite',
      name: 'Dunite (>90% Ol)',
      code: 'Dun',
      color: '#65a30d',
      fillColor: 'rgba(101, 163, 13, 0.18)',
      textColor: '#bef264',
      vertices: [
        [100, 0, 0],
        [90, 10, 0],
        [90, 0, 10],
      ],
      labelPosition: [94, 3, 3],
      description: 'Mantle olivine cumulate rock (>90% olivine).',
    },
    {
      id: 'harzburgite',
      name: 'Harzburgite',
      code: 'Harz',
      color: '#0284c7',
      fillColor: 'rgba(2, 132, 199, 0.12)',
      textColor: '#bae6fd',
      vertices: [
        [90, 10, 0],
        [40, 60, 0],
        [40, 54, 6],
        [90, 5, 5],
      ],
      labelPosition: [60, 35, 5],
      description: 'Depleted residue of mantle melting consisting of olivine + orthopyroxene.',
    },
    {
      id: 'lherzolite',
      name: 'Lherzolite',
      code: 'Lherz',
      color: '#10b981',
      fillColor: 'rgba(16, 185, 129, 0.12)',
      textColor: '#a7f3d0',
      vertices: [
        [90, 5, 5],
        [40, 54, 6],
        [40, 6, 54],
        [90, 0, 10],
      ],
      labelPosition: [60, 20, 20],
      description: 'Fertile upper mantle peridotite containing both orthopyroxene and clinopyroxene.',
    },
    {
      id: 'wehrlite',
      name: 'Wehrlite',
      code: 'Wehr',
      color: '#059669',
      fillColor: 'rgba(5, 150, 105, 0.12)',
      textColor: '#6ee7b7',
      vertices: [
        [90, 0, 10],
        [40, 6, 54],
        [40, 0, 60],
      ],
      labelPosition: [60, 5, 35],
      description: 'Mantle peridotite dominated by olivine and clinopyroxene.',
    },
    {
      id: 'pyroxenite-zone',
      name: 'Pyroxenites (Websterite / Opx-ite / Cpx-ite)',
      code: 'Pyx',
      color: '#6366f1',
      fillColor: 'rgba(99, 102, 241, 0.12)',
      textColor: '#c7d2fe',
      vertices: [
        [40, 60, 0],
        [40, 0, 60],
        [0, 0, 100],
        [0, 100, 0],
      ],
      labelPosition: [15, 42, 43],
      description: 'Ultramafic rocks dominated by pyroxenes with <40% olivine.',
    },
  ],
  projectOxides: (oxides: OxideComposition) => {
    const mg = (oxides.MgO || 0) / 40.3;
    const fe = (oxides.FeO || 0) / 71.84;
    const ca = (oxides.CaO || 0) / 56.08;
    const si = (oxides.SiO2 || 0) / 60.08;

    // Approximate ultramafic partitioning
    const cpx = Math.max(0, ca);
    const opx = Math.max(0, si - cpx - (mg + fe) * 0.5);
    const ol = Math.max(0, (mg + fe) * 0.5 - opx * 0.5);

    const sum = ol + opx + cpx;
    if (sum <= 0.001) return { a: 33.3, b: 33.3, c: 33.3, fieldName: 'Undetermined' };

    return {
      a: (ol / sum) * 100,
      b: (opx / sum) * 100,
      c: (cpx / sum) * 100,
      fieldName: ol > 40 ? 'Peridotite' : 'Pyroxenite',
    };
  },
};

// Map of all available ternary systems
export const TERNARY_SYSTEMS_MAP: Record<TernarySystemId, TernarySystemConfig> = {
  'afm-igneous': AFM_IGNEOUS_CONFIG,
  'afm-metamorphic': AFM_METAMORPHIC_CONFIG,
  'qapf-plutonic': QAPF_PLUTONIC_CONFIG,
  'qapf-volcanic': QAPF_VOLCANIC_CONFIG,
  'apf-plutonic': APF_PLUTONIC_CONFIG,
  'apf-volcanic': APF_VOLCANIC_CONFIG,
  'basalt-tetrahedron': BASALT_TETRAHEDRON_CONFIG,
  'pyroxene-quad': PYROXENE_QUAD_CONFIG,
  feldspar: FELDSPAR_CONFIG,
  ultramafic: ULTRAMAFIC_CONFIG,
};
