import { describe, expect, it } from 'vitest';
import {
  autoColumnMap,
  exportBatchComprehensiveCSV,
  mapHeaderToGeochem,
  parseCellValue,
  parseCSV,
  processBatchCSV,
  SAMPLE_BENCHMARK_CSVS,
} from './csv';

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

describe('below-detection values and column mapping', () => {
  it('reads below-detection codes as bdl, not zero and not negative', () => {
    for (const v of ['<0.01', '< 0.05', 'bdl', 'b.d.l.', 'n.d.', 'ND', '-1', '-0.01', '<LOD', '-'])
      expect(parseCellValue(v), v).toBe('bdl');
    expect(parseCellValue('0,52')).toBe(0.52);
    expect(parseCellValue('49.8')).toBe(49.8);
    expect(parseCellValue('')).toBeUndefined();
    expect(parseCellValue('abc')).toBeUndefined();
  });

  it('leaves bdl oxides out of the analysis and says so in the notes', () => {
    const [r] = processBatchCSV([{ Sample: 'A', SiO2: '50', Al2O3: '15', FeOT: '10', MgO: '8', CaO: '11', Na2O: '2.5', K2O: '<0.01' }]);
    expect(r.rawOxides.K2O).toBeUndefined();
    expect(r.notes).toMatch(/below detection.*K2O/);
  });

  it('applies a user column map, including assigning an unrecognised header', () => {
    const rows = [{ Spec: 'X', Silica: '50', Al2O3: '15', FeOT: '10', MgO: '8', CaO: '11', Na2O: '2.5', K2O: '0.3' }];
    const auto = autoColumnMap(Object.keys(rows[0]));
    expect(auto.Silica).toBeNull();
    const [r] = processBatchCSV(rows, 10, { ...auto, Silica: 'SiO2', Spec: 'sample_id' });
    expect(r.rawOxides.SiO2).toBe(50);
    expect(r.sampleId).toBe('X');
  });
});

describe('trace element columns', () => {
  it('reads trace columns in ppm and keeps them out of the oxides', () => {
    const [r] = processBatchCSV([
      { Sample: 'T', SiO2: '50', Al2O3: '15', FeOT: '10', MgO: '8', CaO: '11', Na2O: '2.5', K2O: '0.3', La: '3.5', 'Yb (ppm)': '3.0', Nb: '<0.1' },
    ]);
    expect(r.traceElements).toEqual({ La: 3.5, Yb: 3.0 });
    expect(r.rawOxides.La).toBeUndefined();
    expect(autoColumnMap(['La', 'Zr_ppm', 'Silica'])).toEqual({ La: 'trace:La', Zr_ppm: 'trace:Zr', Silica: null });
  });
});

describe('RFC 4180 parsing', () => {
  it('keeps apostrophes, quoted commas, escaped quotes and quoted newlines', () => {
    const { headers, rows } = parseCSV(
      'Sample,Locality,SiO2\n' +
        "A,Devil's Tower,50.1\n" +
        'B,"Etna, Sicily",48.2\n' +
        'C,"the ""Big"" one",47\n' +
        'D,"line one\nline two",46\n'
    );
    expect(headers).toEqual(['Sample', 'Locality', 'SiO2']);
    expect(rows.map((r) => r.Locality)).toEqual([
      "Devil's Tower",
      'Etna, Sicily',
      'the "Big" one',
      'line one\nline two',
    ]);
    expect(rows.map((r) => r.SiO2)).toEqual(['50.1', '48.2', '47', '46']);
  });

  it('detects semicolon and tab delimiters and strips a byte-order mark', () => {
    expect(parseCSV('\uFEFFSample;SiO2\nX;50\n').rows).toEqual([{ Sample: 'X', SiO2: '50' }]);
    expect(parseCSV('Sample\tSiO2\r\nX\t50\r\n').rows).toEqual([{ Sample: 'X', SiO2: '50' }]);
  });
});

describe('comprehensive export', () => {
  it('writes every CIPW phase, one value per header, and no APFU for whole rocks', () => {
    const results = processBatchCSV(parseCSV(SAMPLE_BENCHMARK_CSVS.georocVolcanicSuite).rows);
    const csv = exportBatchComprehensiveCSV(results);
    const lines = parseCSV(csv);
    expect(lines.headers).toEqual(expect.arrayContaining(['CIPW_Ac', 'CIPW_Hm', 'CIPW_Cs', 'CIPW_Cc', 'Fe2O3T_raw', 'CIPW_Total']));
    const raw = csv.split('\n');
    const n = raw[0].split(',').length;
    for (const r of lines.rows) expect(Object.keys(r)).toHaveLength(n);
    // whole rocks: no structural formula columns
    expect(lines.rows[0].Si_apfu).toBe('');
  });
});
