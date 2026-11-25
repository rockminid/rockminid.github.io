import { describe, expect, it } from 'vitest';
import { analyticalTotal, num, stoichiometryProblem, totalIronAsFeO, totalWindow } from './georoc-filters.mjs';

describe('GEOROC ingestion filters', () => {
  it('accepts a pure phase at 100 wt% and slightly above', () => {
    expect(num('100')).toBe(100);
    expect(num('100.6')).toBe(100.6);
    expect(num('103')).toBeUndefined();
    expect(num('-1')).toBeUndefined();
  });

  it('uses FeO + Fe2O3 only when both are reported, otherwise FeOT', () => {
    expect(totalIronAsFeO({ FeO: '8', Fe2O3: '2' })).toBeCloseTo(8 + 0.8998 * 2, 6);
    // FeO alone next to FeOT: the total wins, ferric iron is not lost
    expect(totalIronAsFeO({ FeO: '8', FeOT: '10' })).toBe(10);
    expect(totalIronAsFeO({ Fe2O3T: '10' })).toBeCloseTo(8.998, 6);
    expect(totalIronAsFeO({ FeO: '8' })).toBe(8);
  });

  it('counts reported volatiles in the total (a kimberlite with LOI)', () => {
    const kimb = { SiO2: '32', MgO: '30', CaO: '9', Al2O3: '3', FeOT: '9', LOI: '16' };
    expect(analyticalTotal(kimb)).toBeCloseTo(99, 6);
  });

  it('accepts a microprobe calcite totalling about 56 wt%', () => {
    const [lo, hi] = totalWindow('minerals', 'CALCITE', { CaO: '55.6', MgO: '0.3' }) as [number, number];
    expect(55.9).toBeGreaterThanOrEqual(lo);
    expect(55.9).toBeLessThanOrEqual(hi);
    // ...but a CaO-rich analysis near 95 wt% is no calcite
    expect(95).toBeGreaterThan(hi);
    // with CO2 reported the normal window applies
    expect(totalWindow('minerals', 'CALCITE', { CaO: '56', CO2: '44' })).toEqual([97, 103]);
    expect(totalWindow('rocks', 'BASALT', {})).toEqual([97, 103]);
  });

  it('rejects an orthopyroxene with clinopyroxene calcium', () => {
    // GEOROC "FERROSILITE" rows with ~18.6 wt% CaO
    const hd = { SiO2: '47.1', FeOT: '28', CaO: '18.6', MgO: '4.5', MnO: '0.6', Al2O3: '0.6' };
    expect(stoichiometryProblem('FERROSILITE', hd)).toMatch(/too high for orthopyroxene/);
    const opx = { SiO2: '54.8', FeOT: '11', MgO: '31', CaO: '1.7', Al2O3: '1.0' };
    expect(stoichiometryProblem('ORTHOPYROXENE', opx)).toBeNull();
  });

  it('rejects a whole-rock analysis filed as a pyroxene', () => {
    const wr = { SiO2: '47', TiO2: '2.5', Al2O3: '15', FeOT: '11', MgO: '7', CaO: '10', Na2O: '3', K2O: '1.0', P2O5: '0.6' };
    expect(stoichiometryProblem('TITAN-AUGITE', wr)).not.toBeNull();
    const aug = { SiO2: '48.5', TiO2: '2.2', Al2O3: '6.5', FeOT: '8', MgO: '13', CaO: '21.5', Na2O: '0.5' };
    expect(stoichiometryProblem('TITAN-AUGITE', aug)).toBeNull();
  });

  it('rejects a plagioclase outside the An range of its name', () => {
    const olig = { SiO2: '62', Al2O3: '23.5', CaO: '5', Na2O: '8.5', K2O: '0.4' };
    expect(stoichiometryProblem('ANORTHITE', olig)).toMatch(/An\d+ outside/);
    const an = { SiO2: '44', Al2O3: '35.5', CaO: '19.4', Na2O: '0.5' };
    expect(stoichiometryProblem('ANORTHITE', an)).toBeNull();
  });

  it('passes good olivine and garnet, and leaves aegirine to its own rules', () => {
    expect(stoichiometryProblem('OLIVINE', { SiO2: '40.8', MgO: '49.4', FeOT: '9.2' })).toBeNull();
    expect(stoichiometryProblem('GARNET', { SiO2: '41.5', Al2O3: '23', MgO: '20', FeOT: '9', CaO: '5' })).toBeNull();
    expect(stoichiometryProblem('AEGIRINE', { SiO2: '52', Fe2O3: '34.6', Na2O: '13.4' })).toBeNull();
  });
});

describe('volatiles and hedenbergite', () => {
  it('counts LOI once and does not add H2O or CO2 on top of it', () => {
    expect(analyticalTotal({ SiO2: '50', LOI: '5', H2O: '3', CO2: '1' })).toBeCloseTo(55, 6);
    expect(analyticalTotal({ SiO2: '50', H2O: '3', CO2: '1' })).toBeCloseTo(54, 6);
  });

  it('rejects aluminous augite filed as hedenbergite', () => {
    const augite = { SiO2: '46', Al2O3: '6.2', TiO2: '1.3', FeOT: '12', MgO: '10', CaO: '22', Na2O: '0.6' };
    expect(stoichiometryProblem('HEDENBERGITE', augite)).toMatch(/hedenbergite/);
    const hd = { SiO2: '48.5', Al2O3: '0.5', FeOT: '28.5', MgO: '1', MnO: '0.8', CaO: '22.4' };
    expect(stoichiometryProblem('HEDENBERGITE', hd)).toBeNull();
  });
});
