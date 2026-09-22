/**
 * TAS sub-root names and series qualifiers.
 *
 * Implements the subdivisions the IUGS Subcommission defines for each TAS
 * field, exactly as set out in:
 *
 *   Le Maitre, R.W. (ed.) 2002, "Igneous Rocks: A Classification and Glossary
 *   of Terms", 2nd edn, Cambridge University Press, section 2.12.2, pp.36-38.
 *   Le Bas, Le Maitre, Streckeisen & Zanettin 1986, J. Petrol. 27, Table 1.
 *
 * Everything here is deterministic and derives from the CIPW norm and the
 * analysis itself, so a root name from the TAS polygons can be refined into
 * the name a petrologist would actually use.
 */

import { CIPWNorm, OxideComposition } from '../types/geochem';
import { totalIronAsFeO } from './iron';

export interface SubRootResult {
  /** The refined name, or the root name when no subdivision applies. */
  name: string;
  /** Qualifier such as "low-K", "medium-K", "high-K". */
  potassiumSeries?: 'low-K' | 'medium-K' | 'high-K';
  /** Peralkaline index, molar (Na2O + K2O) / Al2O3. */
  peralkalineIndex?: number;
  /** True when PI > 1. */
  peralkaline: boolean;
  /** Comenditic / pantelleritic split for peralkaline rhyolite and trachyte. */
  peralkalineType?: 'comenditic' | 'pantelleritic';
  /** The rules that fired, for display. */
  reasons: string[];
}

/** Molar peralkaline index: (Na2O + K2O) / Al2O3. */
export function peralkalineIndex(ox: OxideComposition): number | undefined {
  const al = (ox.Al2O3 || 0) / 101.961;
  if (al <= 0) return undefined;
  const na = (ox.Na2O || 0) / 61.979;
  const k = (ox.K2O || 0) / 94.196;
  return (na + k) / al;
}

/**
 * Sodic vs potassic, per Le Maitre (2002) p.38 for fields S1, S2 and S3:
 * "If Na2O - 2 is greater than K2O the rock is considered to be 'sodic'".
 */
export function isSodic(ox: OxideComposition): boolean {
  return (ox.Na2O || 0) - 2 > (ox.K2O || 0);
}

/**
 * Low-K / medium-K / high-K, per Le Maitre (2002) Fig. 2.17, which gives the
 * two dividing lines by the coordinates (48, 0.3)-(68, 1.2) and
 * (48, 1.2)-(68, 2.9). Applies to fields B, O1, O2, O3 and R.
 *
 * The book stresses that high-K is NOT synonymous with potassic: a high-K
 * rock can still have more Na2O than K2O.
 */
export function potassiumSeries(
  sio2: number,
  k2o: number
): 'low-K' | 'medium-K' | 'high-K' {
  const lower = 0.3 + ((1.2 - 0.3) * (sio2 - 48)) / (68 - 48);
  const upper = 1.2 + ((2.9 - 1.2) * (sio2 - 48)) / (68 - 48);
  if (k2o < lower) return 'low-K';
  if (k2o < upper) return 'medium-K';
  return 'high-K';
}

function pct(norm: CIPWNorm, key: string): number {
  const v = norm[key];
  const sum = (norm.normSum as number) || 0;
  if (typeof v !== 'number' || sum <= 0) return 0;
  return (v / sum) * 100;
}

/**
 * Refines a TAS root name into its sub-root name.
 *
 * @param code   Le Bas field code, e.g. "B", "S1", "T"
 * @param root   The root name from the TAS polygons
 * @param oxides Anhydrous-normalized oxides
 * @param norm   CIPW norm of the same composition
 */
export function refineTASName(
  code: string,
  root: string,
  oxides: OxideComposition,
  norm: CIPWNorm | undefined
): SubRootResult {
  const reasons: string[] = [];
  const PI = peralkalineIndex(oxides);
  const peralk = PI !== undefined && PI > 1;
  const result: SubRootResult = {
    name: root,
    peralkaline: peralk,
    peralkalineIndex: PI,
    reasons,
  };

  const sio2 = oxides.SiO2 || 0;
  const k2o = oxides.K2O || 0;

  // K-series applies to the subalkaline basalt-rhyolite series.
  if (['B', 'O1', 'O2', 'O3', 'R'].includes(code)) {
    result.potassiumSeries = potassiumSeries(sio2, k2o);
    reasons.push(
      `${result.potassiumSeries} at ${sio2.toFixed(1)} wt% SiO2 with ${k2o.toFixed(2)} wt% K2O (Le Maitre 2002, Fig. 2.17).`
    );
  }

  if (!norm) return result;

  const ne = pct(norm, 'Ne');
  const ol = pct(norm, 'Ol');
  const ab = pct(norm, 'Ab');
  const q = pct(norm, 'Q');
  const an = pct(norm, 'An');
  const or = pct(norm, 'Or');
  const cs = pct(norm, 'Cs');
  const kp = pct(norm, 'Kp');
  const lc = pct(norm, 'Lc');

  switch (code) {
    case 'B': {
      // "if the CIPW norm contains nepheline (ne) the rock is an alkali
      // basalt, if not the rock is a subalkali basalt"
      if (ne > 0) {
        result.name = 'Alkali Basalt';
        reasons.push(`Normative nepheline (${ne.toFixed(1)}%) is present, so this is an alkali basalt.`);
      } else {
        result.name = 'Subalkali Basalt';
        reasons.push('No normative nepheline, so this is a subalkali basalt (tholeiitic, MORB, high-alumina etc.).');
      }
      break;
    }

    case 'U1': {
      // "if normative ol > 10% the rock is a basanite, if ol < 10% it is a tephrite"
      if (ol > 10) {
        result.name = 'Basanite';
        reasons.push(`Normative olivine ${ol.toFixed(1)}% (> 10%), so basanite rather than tephrite.`);
      } else {
        result.name = 'Tephrite';
        reasons.push(`Normative olivine ${ol.toFixed(1)}% (< 10%), so tephrite rather than basanite.`);
      }
      break;
    }

    case 'S1':
    case 'S2':
    case 'S3': {
      const sodic = isSodic(oxides);
      const names: Record<string, [string, string]> = {
        S1: ['Hawaiite', 'Potassic Trachybasalt'],
        S2: ['Mugearite', 'Shoshonite'],
        S3: ['Benmoreite', 'Latite'],
      };
      result.name = sodic ? names[code][0] : names[code][1];
      reasons.push(
        `Na2O - 2 = ${((oxides.Na2O || 0) - 2).toFixed(2)} versus K2O = ${k2o.toFixed(2)}, so "${sodic ? 'sodic' : 'potassic'}".`
      );
      break;
    }

    case 'T': {
      // "separated by the function 100 * Q / (Q + an + ab + or) ... If the
      // value is less than 20% the rock is trachyte; if greater than 20% it
      // is trachydacite."
      const denom = q + an + ab + or;
      const qIndex = denom > 0 ? (100 * q) / denom : 0;
      result.name = qIndex < 20 ? 'Trachyte' : 'Trachydacite';
      reasons.push(
        `100 Q/(Q+an+ab+or) = ${qIndex.toFixed(1)}% (${qIndex < 20 ? '< 20' : '> 20'}), so ${result.name.toLowerCase()}.`
      );
      if (peralk) {
        result.name = `Peralkaline ${result.name}`;
        reasons.push(`Peralkaline index ${PI!.toFixed(2)} > 1.`);
      }
      break;
    }

    case 'R': {
      if (peralk) {
        result.name = 'Peralkaline Rhyolite';
        reasons.push(`Peralkaline index ${PI!.toFixed(2)} > 1.`);
      }
      break;
    }

    case 'Ph': {
      if (peralk) {
        result.name = 'Peralkaline Phonolite';
        reasons.push(`Peralkaline index ${PI!.toFixed(2)} > 1.`);
      }
      break;
    }

    case 'F': {
      // Le Maitre (2002) p.38: within the foidite field, "if normative cs
      // (larnite) is greater than 10% the rock is a melilitite". The test
      // comes first because it takes precedence over the nephelinite split
      // below — a melilitite can carry more than 20% normative nepheline.
      if (cs > 10) {
        result.name = 'Melilitite';
        reasons.push(
          `Normative larnite ${cs.toFixed(1)}% (> 10%), so melilitite rather than foidite (Le Maitre 2002, p.38).`
        );
        // Kalsilite-bearing melilitites are the kamafugite series. Normative
        // kalsilite only forms once leucite itself has been desilicated, so
        // its presence is a strong indicator of that association.
        if (kp > 0) {
          result.name = 'Kalsilite-bearing Melilitite';
          reasons.push(
            `Normative kalsilite ${kp.toFixed(1)}% is present, indicating the kamafugite association (katungite, mafurite, ugandite).`
          );
        }
        break;
      }
      // Le Bas (1989), quoted in Le Maitre (2002) p.36.
      if (ne > 20) {
        result.name = 'Nephelinite';
        reasons.push(`Normative nepheline ${ne.toFixed(1)}% (> 20%), so nephelinite.`);
      } else if (ne < 20 && ab > 0 && ab < 5) {
        result.name = 'Melanephelinite';
        reasons.push(
          `Normative nepheline ${ne.toFixed(1)}% (< 20%) with albite ${ab.toFixed(1)}% (< 5%), so melanephelinite.`
        );
      }
      // Leucitite: a potassic foidite in which leucite, not nepheline, is the
      // dominant feldspathoid.
      if (lc > ne && lc > 10) {
        result.name = kp > 0 ? 'Kalsilite-bearing Leucitite' : 'Leucitite';
        reasons.push(
          `Normative leucite ${lc.toFixed(1)}% exceeds nepheline ${ne.toFixed(1)}%, so the dominant feldspathoid is leucite.`
        );
      }
      break;
    }

    default:
      break;
  }

  // Macdonald (1974), Le Maitre (2002) Fig. 2.18: comenditic vs pantelleritic.
  if (peralk && (code === 'R' || code === 'T')) {
    const al2o3 = oxides.Al2O3 || 0;
    const feot = totalIronAsFeO(oxides);
    const threshold = 1.33 * feot + 4.4;
    result.peralkalineType = al2o3 > threshold ? 'comenditic' : 'pantelleritic';
    const base = code === 'R' ? 'Rhyolite' : 'Trachyte';
    result.name = `${result.peralkalineType === 'comenditic' ? 'Comenditic' : 'Pantelleritic'} ${base}`;
    reasons.push(
      `Al2O3 ${al2o3.toFixed(2)} versus 1.33 FeO* + 4.4 = ${threshold.toFixed(2)}, so ${result.peralkalineType} (Macdonald 1974).`
    );
  }

  return result;
}

/**
 * Picrite, per Le Maitre (2002) p.36: the Subcommission lowered the MgO
 * threshold from 18% to 12% and raised the alkali limit from 2% to 3%,
 * "which makes many rocks into picrites that previously were classified as
 * picrobasalt".
 */
export function isPicrite(oxides: OxideComposition): boolean {
  const mgo = oxides.MgO || 0;
  const alk = (oxides.Na2O || 0) + (oxides.K2O || 0);
  const sio2 = oxides.SiO2 || 0;
  return mgo > 12 && alk < 3 && sio2 >= 30 && sio2 < 52;
}
