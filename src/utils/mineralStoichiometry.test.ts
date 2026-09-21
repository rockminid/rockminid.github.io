import { describe, expect, it } from 'vitest';
import {
  structuralFormula,
  structureSpecFor,
  endMembers,
  STRUCTURE_SPECS,
} from './mineralStoichiometry';
import { identifyGeochemicalSample } from './geochemEngine';
import { OxideComposition } from '../types/geochem';
import {
  ALBITE, ANORTHITE, DIOPSIDE, ENSTATITE, FAYALITE, FORSTERITE,
  ILMENITE, N_MORB, ORTHOCLASE, QUARTZ,
} from './__fixtures__/endmembers';

/**
 * Structural formulae are exact by stoichiometry, so these are hard checks:
 * pure forsterite MUST give 3.00 cations on 4 oxygens, pure diopside 4.00 on
 * 6, pure anorthite 5.00 on 8.
 */

describe('structural formula on the correct oxygen basis', () => {
  const cases: Array<[string, OxideComposition, string, number, number]> = [
    ['forsterite', FORSTERITE, 'olivine', 4, 3],
    ['fayalite', FAYALITE, 'olivine', 4, 3],
    ['enstatite', ENSTATITE, 'orthopyroxene', 6, 4],
    ['diopside', DIOPSIDE, 'clinopyroxene', 6, 4],
    ['albite', ALBITE, 'plagioclase', 8, 5],
    ['anorthite', ANORTHITE, 'plagioclase', 8, 5],
    ['orthoclase', ORTHOCLASE, 'sanidine', 8, 5],
    ['quartz', QUARTZ, 'quartz', 2, 1],
    ['ilmenite', ILMENITE, 'ilmenite', 3, 2],
  ];

  for (const [label, comp, mineral, oxy, cations] of cases) {
    it(`gives pure ${label} ${cations}.00 cations on ${oxy} oxygens`, () => {
      const spec = structureSpecFor(mineral)!;
      expect(spec.oxygenBasis).toBe(oxy);
      const f = structuralFormula(comp, spec);
      expect(f.cationSum).toBeCloseTo(cations, 2);
      expect(f.fit).toBeGreaterThan(0.95);
    });
  }

  it('rejects an olivine analysis tested against a pyroxene structure', () => {
    const f = structuralFormula(FORSTERITE, structureSpecFor('clinopyroxene')!);
    // Mg2SiO4 recast on 6 oxygens gives 4.5 cations, not 4.
    expect(f.fit).toBeLessThan(0.2);
  });

  it('rejects a pyroxene analysis tested against an olivine structure', () => {
    const f = structuralFormula(DIOPSIDE, structureSpecFor('olivine')!);
    expect(f.fit).toBeLessThan(0.2);
  });

  it('accepts both ends of the olivine solid solution', () => {
    const spec = structureSpecFor('olivine')!;
    // Fo100 and Fa100 are far apart in oxide space but structurally identical.
    expect(structuralFormula(FORSTERITE, spec).fit).toBeGreaterThan(0.95);
    expect(structuralFormula(FAYALITE, spec).fit).toBeGreaterThan(0.95);
  });

  it('checks tetrahedral occupancy where it is diagnostic', () => {
    const f = structuralFormula(ANORTHITE, structureSpecFor('plagioclase')!);
    expect(f.tetrahedral).toBeCloseTo(4, 1); // Si2Al2
  });

  it('handles FeOT-only analyses', () => {
    const f = structuralFormula({ SiO2: 38.5, MgO: 43.0, FeOT: 18.5 }, structureSpecFor('olivine')!);
    expect(f.cationSum).toBeCloseTo(3, 1);
  });

  it('returns a readable formula string', () => {
    const f = structuralFormula(FORSTERITE, structureSpecFor('olivine')!);
    expect(f.text).toMatch(/Si1\.00/);
    expect(f.text).toMatch(/O4$/);
  });
});

describe('end-member proportions', () => {
  it('reports Fo100 for forsterite and Fo0 for fayalite', () => {
    const spec = structureSpecFor('olivine')!;
    expect(endMembers('olivine', structuralFormula(FORSTERITE, spec))?.value).toBe('Fo100');
    expect(endMembers('olivine', structuralFormula(FAYALITE, spec))?.value).toBe('Fo0');
  });

  it('reports An100 for anorthite and Ab100 for albite', () => {
    const spec = structureSpecFor('plagioclase')!;
    expect(endMembers('plagioclase', structuralFormula(ANORTHITE, spec))?.value).toContain('An100');
    expect(endMembers('plagioclase', structuralFormula(ALBITE, spec))?.value).toContain('Ab100');
  });

  it('reports Wo50 En50 for diopside', () => {
    const v = endMembers('diopside', structuralFormula(DIOPSIDE, structureSpecFor('diopside')!))?.value;
    expect(v).toContain('Wo50');
    expect(v).toContain('En50');
  });
});

describe('spec lookup', () => {
  it('prefers the most specific match in a compound name', () => {
    expect(structureSpecFor('Augite (Clinopyroxene)')!.oxygenBasis).toBe(6);
    expect(structureSpecFor('Omphacite (HP Clinopyroxene)')!.oxygenBasis).toBe(6);
  });

  it('falls back to the mineral group', () => {
    expect(structureSpecFor('Some Unlisted Silicate', 'Tectosilicate')!.oxygenBasis).toBe(8);
  });

  it('every spec has a plausible oxygen basis and cation total', () => {
    for (const [name, s] of Object.entries(STRUCTURE_SPECS)) {
      expect(s.oxygenBasis, name).toBeGreaterThan(0);
      expect(s.idealCations, name).toBeGreaterThan(0);
      expect(s.idealCations, name).toBeLessThanOrEqual(s.oxygenBasis);
    }
  });
});

describe('end-to-end mineral identification', () => {
  it('identifies a forsteritic olivine as olivine', () => {
    const r = identifyGeochemicalSample(
      { SiO2: 40.8, MgO: 49.4, FeO: 9.2, MnO: 0.14, NiO: 0.36 },
      'Olivine',
      'oxide',
      { sampleType: 'mineral' }
    );
    expect(r.bestOverall.reference.name.toLowerCase()).toContain('olivine');
  });

  it('identifies a diopsidic augite as a pyroxene, not an amphibole', () => {
    const r = identifyGeochemicalSample(
      { SiO2: 51.8, TiO2: 0.7, Al2O3: 3.2, FeO: 6.1, MgO: 16.4, CaO: 21.0, Na2O: 0.4 },
      'Cpx',
      'oxide',
      { sampleType: 'mineral' }
    );
    expect(r.bestOverall.reference.name.toLowerCase()).toMatch(/pyroxene|augite|diopside/);
  });

  it('identifies a labradorite as a feldspar', () => {
    const r = identifyGeochemicalSample(
      { SiO2: 52.5, Al2O3: 29.5, CaO: 12.5, Na2O: 4.1, K2O: 0.25, FeO: 0.4 },
      'Plag',
      'oxide',
      { sampleType: 'mineral' }
    );
    expect(r.bestOverall.reference.name.toLowerCase()).toMatch(/feldspar|plagioclase|labradorite|anorthite|bytownite/);
  });

  it('no longer proposes a mineral as a good match for a whole-rock basalt', () => {
    // Oxide distance alone ranked hornblende and omphacite highly for N-MORB.
    // The structural test rejects them: a whole rock does not normalize to
    // any single mineral formula.
    const r = identifyGeochemicalSample(N_MORB, 'MORB');
    expect(r.topMinerals[0].similarity).toBeLessThan(45);
    expect(r.bestOverall.type).toBe('rock');
  });

  it('attaches the structural formula to mineral matches', () => {
    const r = identifyGeochemicalSample(
      { SiO2: 40.8, MgO: 49.4, FeO: 9.2 },
      'Olivine',
      'oxide',
      { sampleType: 'mineral' }
    );
    const top = r.topMinerals[0];
    expect(top.structuralFormula).toBeDefined();
    expect(top.structuralFormula!.cationSum).toBeGreaterThan(0);
    expect(top.structuralFit).toBeGreaterThan(0.5);
  });
});

describe('sample-type inference from the structural fit', () => {
  it('treats a clean olivine analysis as a mineral, not a dunite', () => {
    // Compositionally a pure olivine and a dunite are nearly identical; only
    // the structural test separates them.
    const r = identifyGeochemicalSample({ SiO2: 41.5, MgO: 49.5, FeO: 8.8, MnO: 0.15, NiO: 0.35 }, 'Fo90');
    expect(r.bestOverall.type).toBe('mineral');
    expect(r.sampleType).toBe('mineral');
    expect(r.sampleTypeWasInferred).toBe(true);
  });

  it('treats a basalt as a whole rock', () => {
    const r = identifyGeochemicalSample(N_MORB, 'MORB');
    expect(r.bestOverall.type).toBe('rock');
    expect(r.sampleType).not.toBe('mineral');
  });

  it('honours an explicit declaration over the inference', () => {
    const r = identifyGeochemicalSample(
      { SiO2: 41.5, MgO: 49.5, FeO: 8.8 },
      'Fo90',
      'oxide',
      { sampleType: 'whole_rock' }
    );
    expect(r.bestOverall.type).toBe('rock');
    expect(r.sampleTypeWasInferred).toBe(false);
  });
});
