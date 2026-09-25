import { describe, expect, it } from 'vitest';
import { mapHeaderToGeochem, parseCSV, processBatchCSV } from './csv';

/**
 * Header mapping for batch CSV import.
 *
 * Iron is where laboratory exports disagree most, and where a mis-mapped
 * header does the most damage without any visible error: total iron read as
 * measured Fe2O3 makes every sample look fully oxidized, and a dropped iron
 * column makes the norm, Mg# and AFM projection meaningless.
 */
const key = (h: string) => mapHeaderToGeochem(h)?.key ?? null;

describe('iron headers', () => {
  it.each([
    ['FeO', 'FeO'],
    ['FEO(WT%)', 'FeO'],
    ['Fe2O3', 'Fe2O3'],
    ['FE2O3(WT%)', 'Fe2O3'],
  ])('reads %s as measured %s', (h, k) => {
    expect(key(h)).toBe(k);
  });

  it.each(['FeOT', 'FeO(T)', 'FeO_tot', 'FeOt', 'FEOT(WT%)', 'FeO*', 'FeO total', 'Total Fe'])(
    'reads %s as total iron expressed as FeO',
    (h) => {
      expect(key(h)).toBe('FeOT');
    }
  );

  it.each(['Fe2O3T', 'Fe2O3(T)', 'FE2O3T(WT%)', 'Fe2O3tot', 'Fe2O3*'])(
    'reads %s as total iron expressed as Fe2O3, not as measured ferric iron',
    (h) => {
      expect(key(h)).toBe('Fe2O3T');
    }
  );
});

describe('volatile headers', () => {
  it('keeps LOI, H2O+, H2O and CO2 distinct', () => {
    expect(key('LOI')).toBe('LOI');
    expect(key('LOI(WT%)')).toBe('LOI');
    expect(key('H2O+')).toBe('H2O+');
    expect(key('H2O')).toBe('H2O');
    expect(key('CO2')).toBe('CO2');
    expect(key('CO2(WT%)')).toBe('CO2');
  });
});

describe('batch rows', () => {
  it('keeps the iron of a GEOROC-style export', () => {
    // Column names as GEOROC writes them. FEOT(WT%) previously matched no
    // mapping, so this basalt arrived with no iron at all.
    const csv = [
      'SAMPLE NAME,SIO2(WT%),TIO2(WT%),AL2O3(WT%),FEOT(WT%),MNO(WT%),MGO(WT%),CAO(WT%),NA2O(WT%),K2O(WT%),P2O5(WT%)',
      'MORB-1,50.4,1.5,15.3,10.2,0.17,7.8,11.6,2.6,0.14,0.12',
    ].join('\n');
    const [row] = processBatchCSV(parseCSV(csv).rows);
    expect(row.rawOxides.FeOT).toBeCloseTo(10.2, 6);
    expect(row.totalWt).toBeGreaterThan(99);
  });

  it('treats Fe2O3(T) as total iron, not as measured ferric iron', () => {
    const csv = [
      'Sample,SiO2,TiO2,Al2O3,Fe2O3(T),MnO,MgO,CaO,Na2O,K2O,P2O5',
      'BHVO-2,49.60,2.731,13.44,12.39,0.169,7.257,11.40,2.219,0.513,0.2685',
    ].join('\n');
    const [row] = processBatchCSV(parseCSV(csv).rows);
    expect(row.rawOxides.Fe2O3T).toBeCloseTo(12.39, 6);
    expect(row.rawOxides.Fe2O3).toBeUndefined();
  });

  it('treats unanalysed cells as missing, never as zero', () => {
    const csv = ['Sample,SiO2,Al2O3,MgO,K2O', 'X,50.1,NA,n.d.,'].join('\n');
    const [row] = processBatchCSV(parseCSV(csv).rows);
    expect(row.rawOxides.SiO2).toBeCloseTo(50.1, 6);
    expect('Al2O3' in row.rawOxides).toBe(false);
    expect('MgO' in row.rawOxides).toBe(false);
    expect('K2O' in row.rawOxides).toBe(false);
  });
});
