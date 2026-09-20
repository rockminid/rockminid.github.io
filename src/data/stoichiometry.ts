import { ElementComposition, OxideComposition } from '../types/geochem';

/**
 * Standard IUPAC Atomic Weights and Stoichiometric conversion factors
 * for geochemical petrology (EPMA, XRF, ICP-MS).
 */

export interface ConversionFactor {
  oxide: string;
  element: string;
  cationCount: number;
  oxygenCount: number;
  oxideToElement: number; // Multiply oxide wt% by this to get element wt%
  elementToOxide: number; // Multiply element wt% by this to get oxide wt%
  molecularWeight: number;
}

export const STOICHIOMETRY_TABLE: Record<string, ConversionFactor> = {
  SiO2: {
    oxide: 'SiO2',
    element: 'Si',
    cationCount: 1,
    oxygenCount: 2,
    oxideToElement: 28.0855 / 60.0843, // 0.46743
    elementToOxide: 60.0843 / 28.0855, // 2.13933
    molecularWeight: 60.0843,
  },
  TiO2: {
    oxide: 'TiO2',
    element: 'Ti',
    cationCount: 1,
    oxygenCount: 2,
    oxideToElement: 47.867 / 79.8658, // 0.59934
    elementToOxide: 79.8658 / 47.867, // 1.66849
    molecularWeight: 79.8658,
  },
  Al2O3: {
    oxide: 'Al2O3',
    element: 'Al',
    cationCount: 2,
    oxygenCount: 3,
    oxideToElement: (2 * 26.9815385) / 101.9613, // 0.52925
    elementToOxide: 101.9613 / (2 * 26.9815385), // 1.88946
    molecularWeight: 101.9613,
  },
  Fe2O3: {
    oxide: 'Fe2O3',
    element: 'Fe',
    cationCount: 2,
    oxygenCount: 3,
    oxideToElement: (2 * 55.845) / 159.6882, // 0.69942
    elementToOxide: 159.6882 / (2 * 55.845), // 1.42974
    molecularWeight: 159.6882,
  },
  FeO: {
    oxide: 'FeO',
    element: 'Fe',
    cationCount: 1,
    oxygenCount: 1,
    oxideToElement: 55.845 / 71.8444, // 0.77731
    elementToOxide: 71.8444 / 55.845, // 1.28650
    molecularWeight: 71.8444,
  },
  MnO: {
    oxide: 'MnO',
    element: 'Mn',
    cationCount: 1,
    oxygenCount: 1,
    oxideToElement: 54.938044 / 70.9374, // 0.77446
    elementToOxide: 70.9374 / 54.938044, // 1.29123
    molecularWeight: 70.9374,
  },
  MgO: {
    oxide: 'MgO',
    element: 'Mg',
    cationCount: 1,
    oxygenCount: 1,
    oxideToElement: 24.305 / 40.3044, // 0.60304
    elementToOxide: 40.3044 / 24.305, // 1.65828
    molecularWeight: 40.3044,
  },
  CaO: {
    oxide: 'CaO',
    element: 'Ca',
    cationCount: 1,
    oxygenCount: 1,
    oxideToElement: 40.078 / 56.0774, // 0.71469
    elementToOxide: 56.0774 / 40.078, // 1.39921
    molecularWeight: 56.0774,
  },
  Na2O: {
    oxide: 'Na2O',
    element: 'Na',
    cationCount: 2,
    oxygenCount: 1,
    oxideToElement: (2 * 22.989769) / 61.9789, // 0.74186
    elementToOxide: 61.9789 / (2 * 22.989769), // 1.34797
    molecularWeight: 61.9789,
  },
  K2O: {
    oxide: 'K2O',
    element: 'K',
    cationCount: 2,
    oxygenCount: 1,
    oxideToElement: (2 * 39.0983) / 94.196, // 0.83015
    elementToOxide: 94.196 / (2 * 39.0983), // 1.20456
    molecularWeight: 94.196,
  },
  P2O5: {
    oxide: 'P2O5',
    element: 'P',
    cationCount: 2,
    oxygenCount: 5,
    oxideToElement: (2 * 30.973762) / 141.9446, // 0.43642
    elementToOxide: 141.9446 / (2 * 30.973762), // 2.29136
    molecularWeight: 141.9446,
  },
  Cr2O3: {
    oxide: 'Cr2O3',
    element: 'Cr',
    cationCount: 2,
    oxygenCount: 3,
    oxideToElement: (2 * 51.9961) / 151.9902, // 0.68420
    elementToOxide: 151.9902 / (2 * 51.9961), // 1.46156
    molecularWeight: 151.9902,
  },
  NiO: {
    oxide: 'NiO',
    element: 'Ni',
    cationCount: 1,
    oxygenCount: 1,
    oxideToElement: 58.6934 / 74.6928, // 0.78579
    elementToOxide: 74.6928 / 58.6934, // 1.27259
    molecularWeight: 74.6928,
  },
  SO3: {
    oxide: 'SO3',
    element: 'S',
    cationCount: 1,
    oxygenCount: 3,
    oxideToElement: 32.065 / 80.0632, // 0.40049
    elementToOxide: 80.0632 / 32.065, // 2.4969
    molecularWeight: 80.0632,
  },
  CO2: {
    oxide: 'CO2',
    element: 'C',
    cationCount: 1,
    oxygenCount: 2,
    oxideToElement: 12.011 / 44.0095, // 0.27292
    elementToOxide: 44.0095 / 12.011, // 3.6641
    molecularWeight: 44.0095,
  },
};

/**
 * Converts oxide wt% to element wt%
 */
export function oxidesToElements(oxides: OxideComposition): ElementComposition {
  const elements: ElementComposition = {};

  for (const [oxide, wt] of Object.entries(oxides)) {
    if (wt === undefined || wt === null || isNaN(wt) || wt <= 0) continue;

    const info = STOICHIOMETRY_TABLE[oxide];
    if (info) {
      const el = info.element;
      const elWt = wt * info.oxideToElement;
      elements[el] = (elements[el] || 0) + elWt;
    } else if (oxide === 'FeOT') {
      // Total iron as FeO converted to Fe
      elements['Fe'] = (elements['Fe'] || 0) + wt * (55.845 / 71.8444);
    }
  }

  return elements;
}

/**
 * Converts element wt% to primary oxide wt%
 */
export function elementsToOxides(elements: ElementComposition): OxideComposition {
  const oxides: OxideComposition = {};

  const map: Record<string, string> = {
    Si: 'SiO2',
    Ti: 'TiO2',
    Al: 'Al2O3',
    Fe: 'Fe2O3', // Standard convention for general conversion, or can be partitioned
    Mn: 'MnO',
    Mg: 'MgO',
    Ca: 'CaO',
    Na: 'Na2O',
    K: 'K2O',
    P: 'P2O5',
    Cr: 'Cr2O3',
    Ni: 'NiO',
    S: 'SO3',
    C: 'CO2',
  };

  for (const [el, wt] of Object.entries(elements)) {
    if (wt === undefined || wt === null || isNaN(wt) || wt <= 0) continue;

    const oxName = map[el];
    if (oxName && STOICHIOMETRY_TABLE[oxName]) {
      oxides[oxName] = wt * STOICHIOMETRY_TABLE[oxName].elementToOxide;
    }
  }

  return oxides;
}

/**
 * Compute total iron as FeOT (FeO total) or Fe2O3T
 */
export function computeTotalIronAsFeO(oxides: OxideComposition): number {
  if (oxides.FeOT !== undefined && oxides.FeOT > 0) {
    return oxides.FeOT;
  }
  const feO = oxides.FeO || 0;
  const fe2O3 = oxides.Fe2O3 || 0;
  // FeO = Fe2O3 * 0.8998 + FeO
  return feO + fe2O3 * 0.8998;
}

export function computeTotalIronAsFe2O3(oxides: OxideComposition): number {
  const feO = oxides.FeO || 0;
  const fe2O3 = oxides.Fe2O3 || 0;
  if (oxides.FeOT !== undefined && oxides.FeOT > 0) {
    return oxides.FeOT * 1.1113;
  }
  // Fe2O3 = FeO * 1.1113 + Fe2O3
  return fe2O3 + feO * 1.1113;
}
