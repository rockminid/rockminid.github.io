/**
 * Exact stoichiometric end-member compositions (wt% oxides).
 *
 * These are computed directly from IUPAC formula weights, not quoted from a
 * publication, so they are exact ground truth for normative calculations:
 * a CIPW norm of pure albite MUST return ~100% normative albite, or the
 * implementation is wrong. Used as anchors throughout the test suite.
 */

import { OxideComposition } from '../../types/geochem';

// Formula weights (g/mol)
export const FW = {
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
} as const;

/** Builds a wt% composition from oxide molar proportions. */
function fromMoles(moles: Partial<Record<keyof typeof FW, number>>): OxideComposition {
  const grams: Record<string, number> = {};
  let total = 0;
  for (const [ox, n] of Object.entries(moles)) {
    const g = (n as number) * FW[ox as keyof typeof FW];
    grams[ox] = g;
    total += g;
  }
  const out: OxideComposition = {};
  for (const [ox, g] of Object.entries(grams)) {
    out[ox] = Number(((g / total) * 100).toFixed(4));
  }
  return out;
}

/** SiO2 — pure quartz. Norm: 100% Q. */
export const QUARTZ = fromMoles({ SiO2: 1 });

/** NaAlSi3O8 — pure albite. Norm: 100% Ab. */
export const ALBITE = fromMoles({ Na2O: 0.5, Al2O3: 0.5, SiO2: 3 });

/** CaAl2Si2O8 — pure anorthite. Norm: 100% An. ASI = 1.00. */
export const ANORTHITE = fromMoles({ CaO: 1, Al2O3: 1, SiO2: 2 });

/** KAlSi3O8 — pure orthoclase. Norm: 100% Or. */
export const ORTHOCLASE = fromMoles({ K2O: 0.5, Al2O3: 0.5, SiO2: 3 });

/** Mg2SiO4 — pure forsterite. Norm: 100% Ol, 0% Q, 0% Hy. */
export const FORSTERITE = fromMoles({ MgO: 2, SiO2: 1 });

/** MgSiO3 — pure enstatite. Norm: 100% Hy, 0% Q, 0% Ol. */
export const ENSTATITE = fromMoles({ MgO: 1, SiO2: 1 });

/** Fe2SiO4 — pure fayalite. Norm: 100% Ol. */
export const FAYALITE = fromMoles({ FeO: 2, SiO2: 1 });

/** CaMgSi2O6 — pure diopside. Norm: 100% Di. */
export const DIOPSIDE = fromMoles({ CaO: 1, MgO: 1, SiO2: 2 });

/** NaAlSiO4 — pure nepheline. Norm: 100% Ne, 0% Q. */
export const NEPHELINE = fromMoles({ Na2O: 0.5, Al2O3: 0.5, SiO2: 1 });

/** Fe3O4 — pure magnetite (as FeO + Fe2O3). Norm: 100% Mt. */
export const MAGNETITE = fromMoles({ FeO: 1, Fe2O3: 1 });

/** FeTiO3 — pure ilmenite. Norm: 100% Il. */
export const ILMENITE = fromMoles({ FeO: 1, TiO2: 1 });

/**
 * A realistic N-MORB whole-rock analysis (mid-ocean ridge tholeiite).
 * Used for regression/sanity checks rather than exact-value assertions.
 */
export const N_MORB: OxideComposition = {
  SiO2: 50.45,
  TiO2: 1.48,
  Al2O3: 15.28,
  FeO: 8.85,
  Fe2O3: 1.45,
  MnO: 0.17,
  MgO: 7.78,
  CaO: 11.62,
  Na2O: 2.65,
  K2O: 0.14,
  P2O5: 0.12,
};

/**
 * A strongly peraluminous S-type granite (excess Al2O3 over Ca+Na+K).
 * MUST produce normative corundum and ASI > 1.
 */
export const S_TYPE_GRANITE: OxideComposition = {
  SiO2: 71.5,
  TiO2: 0.35,
  Al2O3: 15.2,
  FeO: 2.1,
  Fe2O3: 0.4,
  MnO: 0.04,
  MgO: 0.65,
  CaO: 1.1,
  Na2O: 2.6,
  K2O: 4.9,
  P2O5: 0.15,
};

/**
 * A peralkaline rhyolite (comendite): Na+K in molar excess of Al.
 * MUST produce normative acmite and ASI < 1.
 */
export const PERALKALINE_RHYOLITE: OxideComposition = {
  SiO2: 73.2,
  TiO2: 0.28,
  Al2O3: 8.9,
  FeO: 2.4,
  Fe2O3: 1.6,
  MnO: 0.12,
  MgO: 0.1,
  CaO: 0.35,
  Na2O: 5.6,
  K2O: 4.4,
  P2O5: 0.02,
};
