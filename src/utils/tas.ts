import {
  subalkalineBoundarySiO2,
  isSubalkaline,
  FIG3_RELIABLE_ALKALI_MAX,
} from './irvineBaragar';

/**
 * Total Alkali-Silica (TAS) classification.
 *
 * Volcanic fields follow Le Bas, Le Maitre, Streckeisen & Zanettin (1986),
 * "A chemical classification of volcanic rocks based on the total alkali-silica
 * diagram", J. Petrol. 27, 745-750, as reproduced in Le Maitre (2002).
 * Plutonic fields follow Middlemost (1994), Earth-Sci. Rev. 37, 215-224.
 *
 * Fields are genuine polygons tested by point-in-polygon, replacing the
 * axis-aligned rectangles used previously, which misplaced every sample in a
 * field with a sloping boundary (trachybasalt, basaltic trachyandesite,
 * tephrite, the dacite/rhyolite divide).
 *
 * The classification is only defined for SiO2 and Na2O+K2O recalculated to
 * 100% on an anhydrous (volatile-free) basis.
 */

export interface TASField {
  code: string;
  name: string;
  /** [SiO2 wt%, Na2O+K2O wt%] vertices, anticlockwise. */
  vertices: Array<[number, number]>;
  /** Approximate plutonic equivalent (Middlemost 1994). */
  plutonic?: string;
}

/**
 * Le Bas et al. (1986) volcanic TAS fields.
 * Field boundary vertices are the published values.
 */
export const TAS_VOLCANIC_FIELDS: TASField[] = [
  {
    code: 'F',
    name: 'Foidite',
    vertices: [
      [35, 9], [35, 20], [52.5, 20], [48.4, 11.5], [45, 9.4], [41, 7], [41, 3], [37, 3], [35, 9],
    ],
    plutonic: 'Foidolite',
  },
  {
    code: 'Pc',
    name: 'Picrobasalt',
    vertices: [[41, 0], [45, 0], [45, 3], [41, 3]],
    plutonic: 'Peridotgabbro',
  },
  {
    code: 'B',
    name: 'Basalt',
    vertices: [[45, 0], [52, 0], [52, 5], [45, 5]],
    plutonic: 'Gabbro',
  },
  {
    code: 'O1',
    name: 'Basaltic Andesite',
    vertices: [[52, 0], [57, 0], [57, 5.9], [52, 5]],
    plutonic: 'Gabbroic Diorite',
  },
  {
    code: 'O2',
    name: 'Andesite',
    vertices: [[57, 0], [63, 0], [63, 7], [57, 5.9]],
    plutonic: 'Diorite',
  },
  {
    code: 'O3',
    name: 'Dacite',
    vertices: [[63, 0], [69, 0], [69, 8], [63, 7]],
    plutonic: 'Granodiorite',
  },
  {
    code: 'R',
    name: 'Rhyolite',
    vertices: [[69, 0], [85, 0], [85, 12], [69, 8]],
    plutonic: 'Granite',
  },
  {
    code: 'S1',
    name: 'Trachybasalt',
    vertices: [[45, 5], [52, 5], [49.4, 7.3], [45, 5]],
    plutonic: 'Monzogabbro',
  },
  {
    code: 'S2',
    name: 'Basaltic Trachyandesite',
    vertices: [[52, 5], [57, 5.9], [53, 9.3], [49.4, 7.3]],
    plutonic: 'Monzodiorite',
  },
  {
    code: 'S3',
    name: 'Trachyandesite',
    vertices: [[57, 5.9], [63, 7], [57.6, 11.7], [53, 9.3]],
    plutonic: 'Monzonite',
  },
  {
    code: 'T',
    name: 'Trachyte / Trachydacite',
    vertices: [[63, 7], [69, 8], [69, 12], [63, 16.2], [57.6, 11.7]],
    plutonic: 'Syenite / Quartz Monzonite',
  },
  {
    code: 'U1',
    name: 'Tephrite / Basanite',
    vertices: [[41, 3], [45, 3], [45, 5], [49.4, 7.3], [45, 9.4], [41, 7]],
    plutonic: 'Foid Gabbro',
  },
  {
    code: 'U2',
    name: 'Phonotephrite',
    vertices: [[49.4, 7.3], [53, 9.3], [48.4, 11.5], [45, 9.4]],
    plutonic: 'Foid Monzodiorite',
  },
  {
    code: 'U3',
    name: 'Tephriphonolite',
    vertices: [[53, 9.3], [57.6, 11.7], [52.5, 14], [48.4, 11.5]],
    plutonic: 'Foid Monzosyenite',
  },
  {
    code: 'Ph',
    name: 'Phonolite',
    vertices: [[57.6, 11.7], [63, 16.2], [57.6, 20], [52.5, 20], [52.5, 14]],
    plutonic: 'Foid Syenite',
  },
];

export interface TASResult {
  /** Field name, e.g. "Basalt". */
  field: string;
  /** Le Bas field code, e.g. "B". */
  code: string;
  /** Plutonic equivalent per Middlemost (1994), when requested. */
  plutonicEquivalent?: string;
  /** Alkaline vs subalkaline per Irvine & Baragar (1971). */
  isAlkaline: boolean;
  /** True when the point falls outside every defined TAS field. */
  outOfRange: boolean;
}

/**
 * Irvine & Baragar (1971) alkaline / subalkaline dividing line.
 *
 * Delegates to the authors' own published equation (their Appendix III,
 * Fig. 3), rather than the interpolated control points used previously.
 * See `irvineBaragar.ts`.
 *
 * Returned as the Na2O+K2O value of the boundary at a given SiO2, which is
 * the inverse of the published form, so it is solved numerically by bisection
 * on the monotonic part of the curve.
 */
export function irvineBaragarBoundary(sio2: number): number {
  if (!Number.isFinite(sio2)) return 0;
  // S(A) is increasing over the reliable range, so bisect on A.
  let lo = 0;
  let hi = FIG3_RELIABLE_ALKALI_MAX;
  if (subalkalineBoundarySiO2(lo) >= sio2) return 0;
  if (subalkalineBoundarySiO2(hi) <= sio2) {
    // Above the reliable range the polynomial still rises steeply; continue
    // bisecting further out so the drawn line does not simply stop.
    hi = 12;
    if (subalkalineBoundarySiO2(hi) <= sio2) return hi;
  }
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (subalkalineBoundarySiO2(mid) < sio2) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Standard ray-casting point-in-polygon, inclusive of the boundary. */
export function pointInPolygon(
  x: number,
  y: number,
  poly: Array<[number, number]>,
  epsilon = 1e-9
): boolean {
  // Boundary points count as inside so that samples sitting exactly on a
  // field divide are still classified.
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const dx = xj - xi;
    const dy = yj - yi;
    const len2 = dx * dx + dy * dy;
    if (len2 > 0) {
      let t = ((x - xi) * dx + (y - yi) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      const px = xi + t * dx;
      const py = yi + t * dy;
      if (Math.hypot(x - px, y - py) < 1e-7) return true;
    }
  }

  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersects =
      yi > y + epsilon !== yj > y + epsilon &&
      x < ((xj - xi) * (y - yi)) / (yj - yi || epsilon) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export interface TASOptions {
  /** 'volcanic' (Le Bas 1986) or 'plutonic' (Middlemost 1994). */
  regime?: 'volcanic' | 'plutonic';
}

/**
 * Classifies a sample on the TAS diagram.
 *
 * @param sio2         SiO2 wt%, anhydrous basis
 * @param totalAlkalis Na2O + K2O wt%, anhydrous basis
 */
export function classifyTAS(
  sio2: number,
  totalAlkalis: number,
  options: TASOptions = {}
): TASResult {
  // Exact published criterion: subalkaline iff S >= S_boundary(A).
  const isAlkaline = !isSubalkaline(sio2, totalAlkalis).subalkaline;
  const regime = options.regime ?? 'volcanic';

  if (!Number.isFinite(sio2) || !Number.isFinite(totalAlkalis)) {
    return { field: 'Undetermined', code: '', isAlkaline: false, outOfRange: true };
  }

  for (const f of TAS_VOLCANIC_FIELDS) {
    if (pointInPolygon(sio2, totalAlkalis, f.vertices)) {
      return {
        field: regime === 'plutonic' && f.plutonic ? f.plutonic : f.name,
        code: f.code,
        plutonicEquivalent: f.plutonic,
        isAlkaline,
        outOfRange: false,
      };
    }
  }

  // Outside every field: report honestly rather than guessing.
  let label = 'Outside TAS range';
  if (sio2 < 35) label = 'Outside TAS range (SiO2 < 35 wt%)';
  else if (sio2 > 85) label = 'Outside TAS range (SiO2 > 85 wt%)';
  else if (totalAlkalis > 20) label = 'Outside TAS range (alkalis > 20 wt%)';

  return { field: label, code: '', isAlkaline, outOfRange: true };
}

/**
 * TAS is defined for volcanic whole-rock analyses only. This reports whether
 * applying it to a given sample is defensible.
 */
export function tasApplicability(opts: {
  sampleType?: string;
  loi?: number;
  analyticalTotal?: number;
}): { applicable: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const t = (opts.sampleType || '').toLowerCase();

  if (t.includes('mineral') || t.includes('grain')) {
    warnings.push(
      'TAS is defined for whole-rock analyses. A single mineral analysis has no TAS field.'
    );
  }
  if (opts.loi !== undefined && opts.loi > 2) {
    warnings.push(
      `LOI is ${opts.loi.toFixed(2)} wt%. Alteration or hydration shifts alkalis; TAS assignment is unreliable above about 2 wt%.`
    );
  }
  if (opts.analyticalTotal !== undefined && (opts.analyticalTotal < 97 || opts.analyticalTotal > 103)) {
    warnings.push(
      `Analytical total is ${opts.analyticalTotal.toFixed(2)} wt%, outside the 97-103 wt% window normally accepted for classification.`
    );
  }

  return { applicable: warnings.length === 0, warnings };
}
