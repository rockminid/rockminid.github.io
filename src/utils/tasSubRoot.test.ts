import { describe, expect, it } from 'vitest';
import { classifyTAS, TAS_VOLCANIC_FIELDS } from './tas';
import {
  refineTASName,
  peralkalineIndex,
  isSodic,
  potassiumSeries,
  isPicrite,
} from './tasSubRoot';
import { calculateCIPWNorm, differentiationIndex } from './cipw';
import { OxideComposition } from '../types/geochem';
import { N_MORB, PERALKALINE_RHYOLITE } from './__fixtures__/endmembers';

/**
 * Verified against the IUGS sources the user supplied:
 *   Le Bas et al. (1986), J. Petrol. 27, 745-750, Fig. 1 and Table 1
 *   Le Maitre (2002), "Igneous Rocks", 2nd edn, section 2.12.2, pp.36-38
 *
 * The field polygon vertices were checked two ways: all 14 intersection
 * coordinates printed in Le Maitre Fig. 2.15 are reproduced exactly, and each
 * one was confirmed to land on a drawn line in the scanned figure.
 */

describe('TAS field geometry against Le Maitre (2002) Fig. 2.15', () => {
  const published: Array<[number, number]> = [
    [57.6, 11.7], [52.5, 14], [48.4, 11.5], [45, 9.4], [41, 7], [41, 3], [45, 5],
    [45, 3], [53, 9.3], [49.4, 7.3], [52, 5], [57, 5.9], [63, 7], [69, 8],
  ];

  it('uses every published intersection coordinate', () => {
    const used = new Set<string>();
    for (const f of TAS_VOLCANIC_FIELDS) {
      for (const [x, y] of f.vertices) used.add(`${x},${y}`);
    }
    for (const [x, y] of published) {
      expect(used.has(`${x},${y}`), `published node (${x}, ${y}) is not used by any field`).toBe(true);
    }
  });

  it('separates dacite from rhyolite along the sloping (69,8)-(77,0) line', () => {
    // Digitized from the figure: the boundary has a slope of exactly -1.
    // Just BELOW the line is dacite; just above it is rhyolite.
    for (const sio2 of [70, 71, 72, 73, 74, 75, 76]) {
      const onLine = 77 - sio2;
      expect(classifyTAS(sio2, onLine - 0.5).field, `${sio2} below line`).toBe('Dacite');
      expect(classifyTAS(sio2, onLine + 0.5).field, `${sio2} above line`).toBe('Rhyolite');
    }
  });

  it('calls a silica-rich but alkali-poor rock a dacite, not a rhyolite', () => {
    // The classic case the old vertical-cut-at-69 implementation got wrong.
    expect(classifyTAS(74, 2).field).toBe('Dacite');
    expect(classifyTAS(72, 3).field).toBe('Dacite');
  });

  it('still calls a normal high-silica rhyolite a rhyolite', () => {
    expect(classifyTAS(75, 8).field).toBe('Rhyolite');
    expect(classifyTAS(73, 7.5).field).toBe('Rhyolite');
  });

  it('puts the trachyte/rhyolite divide at 69 wt% SiO2 above the node', () => {
    expect(classifyTAS(68.5, 10).field).toContain('Trachyte');
    expect(classifyTAS(69.5, 10).field).toBe('Rhyolite');
  });

  it('assigns every field a unique, non-overlapping region', () => {
    for (let s = 36; s <= 84; s += 0.5) {
      for (let a = 0.25; a <= 15; a += 0.5) {
        const hits = TAS_VOLCANIC_FIELDS.filter((f) => {
          let inside = false;
          const poly = f.vertices;
          for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const [xi, yi] = poly[i];
            const [xj, yj] = poly[j];
            if (yi > a !== yj > a && s < ((xj - xi) * (a - yi)) / (yj - yi) + xi) inside = !inside;
          }
          return inside;
        });
        expect(hits.length, `(${s}, ${a}) matched ${hits.map((h) => h.code).join('+')}`).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('sub-root names (Le Maitre 2002, pp.36-38)', () => {
  const norm = (ox: Record<string, number>) => calculateCIPWNorm(ox);

  it('Field B: nepheline-normative basalt is an alkali basalt', () => {
    const ox = { SiO2: 45.5, TiO2: 2.5, Al2O3: 15, FeO: 9, Fe2O3: 2, MgO: 8, CaO: 11, Na2O: 4.2, K2O: 1.4, P2O5: 0.5 };
    const r = refineTASName('B', 'Basalt', ox, norm(ox));
    expect(r.name).toBe('Alkali Basalt');
  });

  it('Field B: a MORB with no normative nepheline is a subalkali basalt', () => {
    const r = refineTASName('B', 'Basalt', N_MORB, norm(N_MORB as Record<string, number>));
    expect(r.name).toBe('Subalkali Basalt');
  });

  it('Field U1: normative olivine above 10% gives basanite, below gives tephrite', () => {
    const rich = { SiO2: 43, TiO2: 2.6, Al2O3: 13, FeO: 10, Fe2O3: 3, MgO: 12, CaO: 11.5, Na2O: 3.4, K2O: 1.4 };
    expect(refineTASName('U1', 'Tephrite / Basanite', rich, norm(rich)).name).toBe('Basanite');
    const poor = { SiO2: 44.5, TiO2: 1.2, Al2O3: 19, FeO: 7, Fe2O3: 2, MgO: 2.5, CaO: 10, Na2O: 4.2, K2O: 2.0 };
    expect(refineTASName('U1', 'Tephrite / Basanite', poor, norm(poor)).name).toBe('Tephrite');
  });

  it('Fields S1/S2/S3: applies the Na2O - 2 > K2O sodic rule', () => {
    const sodic = { SiO2: 50, Al2O3: 16, Na2O: 5.0, K2O: 1.5, FeO: 8, MgO: 5, CaO: 8 };
    const potassic = { SiO2: 50, Al2O3: 16, Na2O: 3.0, K2O: 2.5, FeO: 8, MgO: 5, CaO: 8 };
    expect(refineTASName('S1', 'Trachybasalt', sodic, norm(sodic)).name).toBe('Hawaiite');
    expect(refineTASName('S1', 'Trachybasalt', potassic, norm(potassic)).name).toBe('Potassic Trachybasalt');
    expect(refineTASName('S2', 'Basaltic Trachyandesite', sodic, norm(sodic)).name).toBe('Mugearite');
    expect(refineTASName('S2', 'Basaltic Trachyandesite', potassic, norm(potassic)).name).toBe('Shoshonite');
    expect(refineTASName('S3', 'Trachyandesite', sodic, norm(sodic)).name).toBe('Benmoreite');
    expect(refineTASName('S3', 'Trachyandesite', potassic, norm(potassic)).name).toBe('Latite');
  });

  it('isSodic implements exactly Na2O - 2 > K2O', () => {
    expect(isSodic({ Na2O: 5, K2O: 2.9 })).toBe(true);
    expect(isSodic({ Na2O: 5, K2O: 3.1 })).toBe(false);
  });

  it('Field T: splits trachyte from trachydacite at 20% normative Q index', () => {
    const lowQ = { SiO2: 61, TiO2: 0.6, Al2O3: 18, FeO: 3, Fe2O3: 1.5, MgO: 1, CaO: 2, Na2O: 6.2, K2O: 5.2 };
    const r1 = refineTASName('T', 'Trachyte / Trachydacite', lowQ, norm(lowQ));
    expect(r1.name).toContain('Trachyte');
    const highQ = { SiO2: 68, TiO2: 0.5, Al2O3: 15, FeO: 3, Fe2O3: 1.5, MgO: 0.8, CaO: 1.8, Na2O: 4.6, K2O: 4.2 };
    const r2 = refineTASName('T', 'Trachyte / Trachydacite', highQ, norm(highQ));
    expect(r2.name).toContain('Trachydacite');
  });

  it('Field R: flags peralkaline rhyolite when the peralkaline index exceeds 1', () => {
    const r = refineTASName('R', 'Rhyolite', PERALKALINE_RHYOLITE, norm(PERALKALINE_RHYOLITE as Record<string, number>));
    expect(r.peralkaline).toBe(true);
    expect(r.name).toMatch(/Comenditic|Pantelleritic/);
  });

  it('Field R: a metaluminous rhyolite is not peralkaline', () => {
    const ox = { SiO2: 74, Al2O3: 13.5, FeO: 1.2, Fe2O3: 0.9, MgO: 0.3, CaO: 1.1, Na2O: 3.6, K2O: 4.4 };
    expect(refineTASName('R', 'Rhyolite', ox, norm(ox)).peralkaline).toBe(false);
  });

  it('applies Macdonald (1974) Al2O3 = 1.33 FeO* + 4.4 for comendite vs pantellerite', () => {
    // Al-rich relative to iron -> comenditic.
    const com = { SiO2: 73, Al2O3: 12.0, FeOT: 3.0, Na2O: 5.0, K2O: 4.4, CaO: 0.4, MgO: 0.1 };
    expect(refineTASName('R', 'Rhyolite', com, norm(com)).peralkalineType).toBe('comenditic');
    // Fe-rich relative to alumina -> pantelleritic.
    const pan = { SiO2: 70, Al2O3: 8.0, FeOT: 8.0, Na2O: 6.2, K2O: 4.4, CaO: 0.4, MgO: 0.1 };
    expect(refineTASName('R', 'Rhyolite', pan, norm(pan)).peralkalineType).toBe('pantelleritic');
  });

  it('Field F: nephelinite above 20% normative nepheline', () => {
    const ox = { SiO2: 40, TiO2: 2.6, Al2O3: 13, FeO: 9, Fe2O3: 3.5, MgO: 8, CaO: 12, Na2O: 6.5, K2O: 2.0 };
    expect(refineTASName('F', 'Foidite', ox, norm(ox)).name).toBe('Nephelinite');
  });
});

describe('potassium series (Le Maitre 2002, Fig. 2.17)', () => {
  it('reproduces the published dividing-line coordinates', () => {
    // Lower line (48, 0.3)-(68, 1.2); upper line (48, 1.2)-(68, 2.9).
    expect(potassiumSeries(48, 0.29)).toBe('low-K');
    expect(potassiumSeries(48, 0.31)).toBe('medium-K');
    expect(potassiumSeries(48, 1.19)).toBe('medium-K');
    expect(potassiumSeries(48, 1.21)).toBe('high-K');
    expect(potassiumSeries(68, 1.19)).toBe('low-K');
    expect(potassiumSeries(68, 1.21)).toBe('medium-K');
    expect(potassiumSeries(68, 2.89)).toBe('medium-K');
    expect(potassiumSeries(68, 2.91)).toBe('high-K');
  });

  it('labels a depleted N-MORB as low-K', () => {
    const r = refineTASName('B', 'Basalt', N_MORB, calculateCIPWNorm(N_MORB as Record<string, number>));
    expect(r.potassiumSeries).toBe('low-K');
  });
});

describe('peralkaline index and picrite', () => {
  it('computes PI as molar (Na2O + K2O) / Al2O3', () => {
    // 1 mol Na2O against 1 mol Al2O3 gives exactly 1.
    expect(peralkalineIndex({ Na2O: 61.979, Al2O3: 101.961 })).toBeCloseTo(1, 6);
  });

  it('identifies a picrite by MgO > 12 and alkalis < 3', () => {
    expect(isPicrite({ SiO2: 45, MgO: 18, Na2O: 1.2, K2O: 0.3 })).toBe(true);
    expect(isPicrite({ SiO2: 45, MgO: 10, Na2O: 1.2, K2O: 0.3 })).toBe(false);
    expect(isPicrite({ SiO2: 45, MgO: 18, Na2O: 2.5, K2O: 1.0 })).toBe(false);
  });
});

describe('melilitite and kalsilite (Le Maitre 2002 p.38)', () => {
  // A melilititic composition: very low silica, high CaO and MgO, low Al2O3.
  // Ca in large excess over the alumina available for feldspar drives Wo and
  // then larnite once the silica budget runs out.
  const MELILITITE: OxideComposition = {
    SiO2: 38.0,
    TiO2: 2.6,
    Al2O3: 7.0,
    FeO: 10.5,
    MgO: 12.0,
    CaO: 22.0,
    Na2O: 3.2,
    K2O: 1.5,
    P2O5: 1.0,
  };

  it('produces normative larnite for a strongly undersaturated calcic rock', () => {
    const norm = calculateCIPWNorm(MELILITITE);
    expect((norm.Cs as number) ?? 0).toBeGreaterThan(0);
    expect((norm.Q as number) ?? 0).toBe(0);
  });

  it('names a foidite with larnite above 10% a melilitite', () => {
    const norm = calculateCIPWNorm(MELILITITE);
    const csPct = (100 * ((norm.Cs as number) || 0)) / (norm.normSum as number);
    expect(csPct).toBeGreaterThan(10);
    expect(refineTASName('F', 'Foidite', MELILITITE, norm).name).toBe('Melilitite');
  });

  it('does not call an ordinary nephelinite a melilitite', () => {
    // Guards the threshold from the other side: plenty of normative nepheline
    // but no larnite at all must still give a nephelinite.
    const NEPHELINITE: OxideComposition = {
      SiO2: 40.0,
      TiO2: 2.6,
      Al2O3: 12.5,
      FeO: 11.0,
      MgO: 8.0,
      CaO: 12.0,
      Na2O: 5.5,
      K2O: 2.0,
    };
    const norm = calculateCIPWNorm(NEPHELINITE);
    const name = refineTASName('F', 'Foidite', NEPHELINITE, norm).name;
    expect(name).not.toContain('Melilitite');
  });

  it('flags the kamafugite association when normative kalsilite appears', () => {
    // Kalsilite only forms once leucite itself has been desilicated, which
    // needs a strongly undersaturated, strongly potassic composition.
    const KAMAFUGITE: OxideComposition = {
      SiO2: 36.0,
      TiO2: 3.0,
      Al2O3: 6.0,
      FeO: 11.0,
      MgO: 14.0,
      CaO: 13.0,
      Na2O: 1.0,
      K2O: 7.0,
      P2O5: 1.2,
    };
    const norm = calculateCIPWNorm(KAMAFUGITE);
    expect((norm.Kp as number) ?? 0).toBeGreaterThan(0);
    expect(refineTASName('F', 'Foidite', KAMAFUGITE, norm).name).toBe(
      'Kalsilite-bearing Melilitite'
    );
  });

  it('keeps the differentiation index inclusive of kalsilite', () => {
    // Thornton & Tuttle define DI as Q + Or + Ab + Ne + Lc + Kp. Kp was
    // missing from the sum only because the norm could not produce it.
    const KAMAFUGITE: OxideComposition = {
      SiO2: 36.0,
      TiO2: 3.0,
      Al2O3: 6.0,
      FeO: 11.0,
      MgO: 14.0,
      CaO: 13.0,
      Na2O: 1.0,
      K2O: 7.0,
      P2O5: 1.2,
    };
    const norm = calculateCIPWNorm(KAMAFUGITE);
    const di = differentiationIndex(norm);
    const manual =
      ((norm.Q as number) || 0) +
      ((norm.Or as number) || 0) +
      ((norm.Ab as number) || 0) +
      ((norm.Ne as number) || 0) +
      ((norm.Lc as number) || 0) +
      ((norm.Kp as number) || 0);
    expect(di).toBeCloseTo(manual, 2);
  });

  it('conserves mass when kalsilite forms', () => {
    const KAMAFUGITE: OxideComposition = {
      SiO2: 34.0,
      Al2O3: 6.0,
      FeO: 11.0,
      MgO: 14.0,
      CaO: 12.0,
      K2O: 9.0,
      Na2O: 0.5,
    };
    const norm = calculateCIPWNorm(KAMAFUGITE);
    const inputSum = Object.values(KAMAFUGITE).reduce<number>((a, v) => a + (v ?? 0), 0);
    // The norm is mass-conserving by construction: phase masses come from the
    // oxide masses consumed, so the total must track the input.
    expect(norm.normSum as number).toBeGreaterThan(inputSum * 0.97);
    expect(norm.normSum as number).toBeLessThan(inputSum * 1.03);
  });
});
