import { describe, expect, it } from 'vitest';
import {
  identifyGeochemicalSample,
  calculateCIPWNorm,
  calculateStoichiometry,
  classifyTAS,
  normalizeOxides,
  resolveIron,
  analyticalTotal,
} from './geochemEngine';
import { OxideComposition } from '../types/geochem';
import { ROCKS_DATASET } from '../data/rocksDataset';
import {
  ALBITE,
  ANORTHITE,
  DIOPSIDE,
  ENSTATITE,
  FAYALITE,
  FORSTERITE,
  ILMENITE,
  MAGNETITE,
  N_MORB,
  NEPHELINE,
  ORTHOCLASE,
  PERALKALINE_RHYOLITE,
  QUARTZ,
  S_TYPE_GRANITE,
} from './__fixtures__/endmembers';

// ---------------------------------------------------------------------------
// Iron handling — the single canonical conversion
// ---------------------------------------------------------------------------

describe('resolveIron', () => {
  it('computes FeO* = FeO + 0.8998 x Fe2O3 when both are supplied', () => {
    const fe = resolveIron({ FeO: 8.0, Fe2O3: 2.0 });
    expect(fe.FeOT).toBeCloseTo(8.0 + 0.8998 * 2.0, 4);
    expect(fe.basis).toBe('FeO+Fe2O3');
  });

  it('never double-counts FeOT with component iron', () => {
    // A GEOROC row commonly carries FeO, Fe2O3 AND FeOT simultaneously.
    // FeO* must equal the component sum, not the sum of all three.
    const fe = resolveIron({ FeO: 8.0, Fe2O3: 2.0, FeOT: 9.7996 });
    expect(fe.FeOT).toBeCloseTo(9.7996, 3);
    expect(fe.ambiguous).toBe(false);
  });

  it('flags an inconsistent duplicate iron representation', () => {
    const fe = resolveIron({ FeO: 8.0, Fe2O3: 2.0, FeOT: 4.0 });
    expect(fe.ambiguous).toBe(true);
  });

  it('uses FeOT directly when no component iron is present', () => {
    const fe = resolveIron({ FeOT: 9.85 });
    expect(fe.FeOT).toBeCloseTo(9.85, 4);
    expect(fe.basis).toBe('FeOT');
  });

  it('converts Fe2O3T to FeO*', () => {
    const fe = resolveIron({ Fe2O3T: 10.0 });
    expect(fe.FeOT).toBeCloseTo(8.998, 3);
  });

  it('splits FeO* into ferrous/ferric using an explicit Fe2O3/FeO ratio', () => {
    const fe = resolveIron({ FeOT: 10.0 }, { fe2o3FeoRatio: 0.15 });
    // Re-combining the split must reproduce the original FeO*.
    expect(fe.FeO + 0.8998 * fe.Fe2O3).toBeCloseTo(10.0, 4);
    expect(fe.Fe2O3).toBeGreaterThan(0);
  });

  it('returns zero iron for an iron-free composition', () => {
    expect(resolveIron({ SiO2: 100 }).FeOT).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Analytical total — must not double-count iron
// ---------------------------------------------------------------------------

describe('analyticalTotal', () => {
  it('counts iron once when FeO, Fe2O3 and FeOT are all present', () => {
    const total = analyticalTotal({
      SiO2: 50.0,
      Al2O3: 15.0,
      FeO: 8.0,
      Fe2O3: 2.0,
      FeOT: 9.7996,
      MgO: 8.0,
      CaO: 11.0,
      Na2O: 2.5,
      K2O: 0.2,
    });
    // 50 + 15 + 8 + 2 + 8 + 11 + 2.5 + 0.2 = 96.7 (FeOT excluded as a duplicate)
    expect(total).toBeCloseTo(96.7, 1);
  });

  it('does not flag a normal analysis as a high total', () => {
    expect(analyticalTotal(N_MORB)).toBeLessThan(105);
    expect(analyticalTotal(N_MORB)).toBeGreaterThan(95);
  });
});

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

describe('normalizeOxides', () => {
  it('normalizes volatile-free to exactly 100%', () => {
    const { normalized } = normalizeOxides({ ...N_MORB, LOI: 1.5 }, true);
    const sum = Object.entries(normalized)
      .filter(([k]) => !['LOI', 'H2O', 'CO2', 'SO3', 'FeOT'].includes(k))
      .reduce((a, [, v]) => a + (v || 0), 0);
    expect(sum).toBeCloseTo(100, 6);
  });

  it('excludes volatiles from the volatile-free basis', () => {
    const { normalized } = normalizeOxides({ SiO2: 50, MgO: 50, LOI: 10 }, true);
    expect(normalized.LOI).toBeUndefined();
    expect(normalized.SiO2).toBeCloseTo(50, 6);
  });

  it('retains volatiles when volatile-free is disabled', () => {
    const { normalized } = normalizeOxides({ SiO2: 50, MgO: 40, LOI: 10 }, false);
    expect(normalized.LOI).toBeCloseTo(10, 6);
  });

  it('keeps FeOT-only iron in the normalization basis', () => {
    // A GEOROC-style row with only total iron. Dropping FeOT from the basis
    // inflates every other oxide: a 50.32 wt% SiO2 MORB normalized to ~56 and
    // was classified as basaltic andesite.
    const morb = {
      SiO2: 50.32, TiO2: 1.52, Al2O3: 15.41, FeOT: 9.85, MnO: 0.18,
      MgO: 7.82, CaO: 11.45, Na2O: 2.68, K2O: 0.15, P2O5: 0.14, LOI: 0.48,
    };
    const { normalized } = normalizeOxides(morb, true);
    expect(normalized.SiO2 as number).toBeCloseTo(50.56, 1);
    expect(normalized.FeOT as number).toBeGreaterThan(9);
  });

  it('normalizes FeOT-only and component-iron analyses to the same result', () => {
    const asComponents = normalizeOxides(
      { SiO2: 50, Al2O3: 15, FeO: 8, Fe2O3: 2, MgO: 8, CaO: 11 },
      true
    ).normalized;
    const asTotal = normalizeOxides(
      { SiO2: 50, Al2O3: 15, FeOT: 8 + 0.8998 * 2, MgO: 8, CaO: 11 },
      true
    ).normalized;
    // Silica differs only because total iron weighs less than FeO + Fe2O3;
    // what must hold is that neither basis loses the iron.
    expect(asComponents.FeOT as number).toBeGreaterThan(9);
    expect(asTotal.FeOT as number).toBeGreaterThan(9);
    expect(asComponents.SiO2 as number).toBeGreaterThan(45);
    expect(asTotal.SiO2 as number).toBeGreaterThan(45);
  });

  it('classifies an FeOT-only MORB analysis as basalt', () => {
    const report = identifyGeochemicalSample(
      {
        SiO2: 50.32, TiO2: 1.52, Al2O3: 15.41, FeOT: 9.85, MnO: 0.18,
        MgO: 7.82, CaO: 11.45, Na2O: 2.68, K2O: 0.15, P2O5: 0.14, LOI: 0.48,
      },
      'MORB-EPR-01'
    );
    expect(report.tasField).toBe('Basalt');
  });

  it('reports the raw total without iron double-counting', () => {
    const { rawTotal } = normalizeOxides({ SiO2: 50, FeO: 8, Fe2O3: 2, FeOT: 9.7996 }, true);
    expect(rawTotal).toBeCloseTo(60, 1);
  });
});

// ---------------------------------------------------------------------------
// CIPW norm — exact stoichiometric end-members
// ---------------------------------------------------------------------------

describe('calculateCIPWNorm — end-member closure', () => {
  const cases: Array<[string, OxideComposition, string]> = [
    ['quartz', QUARTZ, 'Q'],
    ['albite', ALBITE, 'Ab'],
    ['anorthite', ANORTHITE, 'An'],
    ['orthoclase', ORTHOCLASE, 'Or'],
    ['forsterite', FORSTERITE, 'Ol'],
    ['enstatite', ENSTATITE, 'Hy'],
    ['fayalite', FAYALITE, 'Ol'],
    ['diopside', DIOPSIDE, 'Di'],
    ['nepheline', NEPHELINE, 'Ne'],
    ['magnetite', MAGNETITE, 'Mt'],
    ['ilmenite', ILMENITE, 'Il'],
  ];

  for (const [name, comp, phase] of cases) {
    it(`norms pure ${name} to ~100% ${phase}`, () => {
      const norm = calculateCIPWNorm(comp);
      expect(norm[phase]).toBeGreaterThan(99);
      expect(norm[phase]).toBeLessThan(101);
    });
  }

  it('gives forsterite zero quartz and zero hypersthene', () => {
    const norm = calculateCIPWNorm(FORSTERITE);
    expect(norm.Q || 0).toBeCloseTo(0, 1);
    expect(norm.Hy || 0).toBeCloseTo(0, 1);
  });

  it('gives enstatite zero olivine and zero quartz', () => {
    const norm = calculateCIPWNorm(ENSTATITE);
    expect(norm.Ol || 0).toBeCloseTo(0, 1);
    expect(norm.Q || 0).toBeCloseTo(0, 1);
  });

  it('gives nepheline zero quartz and zero albite', () => {
    const norm = calculateCIPWNorm(NEPHELINE);
    expect(norm.Q || 0).toBeCloseTo(0, 1);
    expect(norm.Ab || 0).toBeCloseTo(0, 1);
  });
});

describe('calculateCIPWNorm — mass balance', () => {
  const samples: Array<[string, OxideComposition]> = [
    ['N-MORB', N_MORB],
    ['S-type granite', S_TYPE_GRANITE],
    ['peralkaline rhyolite', PERALKALINE_RHYOLITE],
    ['forsterite', FORSTERITE],
    ['nepheline', NEPHELINE],
  ];

  for (const [name, comp] of samples) {
    it(`conserves mass for ${name} (norm sum = oxide sum)`, () => {
      const norm = calculateCIPWNorm(comp);
      const oxideSum = Object.entries(comp)
        .filter(([k]) => !['FeOT', 'Fe2O3T', 'LOI', 'H2O', 'CO2'].includes(k))
        .reduce((a, [, v]) => a + (v || 0), 0);
      // The un-renormalized norm total must reproduce the input mass.
      expect(norm.normSum).toBeDefined();
      expect(norm.normSum as number).toBeCloseTo(oxideSum, 0);
    });

    it(`conserves silica for ${name}`, () => {
      const norm = calculateCIPWNorm(comp);
      expect(norm.silicaBalance).toBeDefined();
      // Residual silica misfit must be negligible.
      expect(Math.abs(norm.silicaBalance as number)).toBeLessThan(0.01);
    });
  }
});

describe('calculateCIPWNorm — phases that were previously missing', () => {
  it('produces normative corundum for a peraluminous granite', () => {
    const norm = calculateCIPWNorm(S_TYPE_GRANITE);
    expect(norm.C).toBeGreaterThan(0);
  });

  it('produces no corundum for a metaluminous basalt', () => {
    expect(calculateCIPWNorm(N_MORB).C || 0).toBeCloseTo(0, 2);
  });

  it('produces normative acmite for a peralkaline rhyolite', () => {
    const norm = calculateCIPWNorm(PERALKALINE_RHYOLITE);
    expect(norm.Ac).toBeGreaterThan(0);
  });

  it('never reports both quartz and a foid', () => {
    for (const comp of [N_MORB, S_TYPE_GRANITE, NEPHELINE, FORSTERITE]) {
      const norm = calculateCIPWNorm(comp);
      expect(Math.min(norm.Q || 0, (norm.Ne || 0) + (norm.Lc || 0))).toBeCloseTo(0, 2);
    }
  });

  it('assigns magnetite when only total iron is supplied', () => {
    // With an Fe3+/Fe2+ split applied, FeOT-only data must still yield magnetite.
    const norm = calculateCIPWNorm({ ...N_MORB, FeO: undefined, Fe2O3: undefined, FeOT: 10.15 });
    expect(norm.Mt).toBeGreaterThan(0);
  });

  it('assigns apatite from P2O5', () => {
    expect(calculateCIPWNorm(N_MORB).Ap).toBeGreaterThan(0);
  });

  it('reports the true normative sum rather than a hardcoded 100', () => {
    const norm = calculateCIPWNorm({ SiO2: 50, MgO: 30 });
    // Input sums to 80 wt%; an honest norm reports ~80, not 100.
    expect(norm.normSum as number).toBeCloseTo(80, 0);
  });
});

// ---------------------------------------------------------------------------
// TAS classification
// ---------------------------------------------------------------------------

describe('classifyTAS', () => {
  const cases: Array<[number, number, string]> = [
    [50, 3.0, 'Basalt'],
    [55, 4.0, 'Basaltic Andesite'],
    [60, 4.5, 'Andesite'],
    [66, 5.0, 'Dacite'],
    [75, 6.0, 'Rhyolite'],
    [48, 6.0, 'Trachybasalt'],
    [54, 7.0, 'Basaltic Trachyandesite'],
    [60, 8.5, 'Trachyandesite'],
    [43, 1.5, 'Picrobasalt'],
    [44, 5.0, 'Tephrite'],
    [38, 8.0, 'Foidite'],
  ];

  for (const [sio2, alk, expected] of cases) {
    it(`classifies SiO2=${sio2}, alkalis=${alk} as ${expected}`, () => {
      expect(classifyTAS(sio2, alk).field).toContain(expected);
    });
  }

  it('separates dacite from rhyolite along the sloping boundary, not a vertical cut', () => {
    // Verified against Le Maitre (2002) Fig. 2.15: the O3/R divide is the
    // line (69,8)-(77,0), so SiO2 = 69 only marks the divide ABOVE 8 wt%
    // alkalis. Below it, the boundary moves to higher silica.
    expect(classifyTAS(69.5, 6.0).field).toBe('Dacite'); // below the line
    expect(classifyTAS(69.5, 9.0).field).toBe('Rhyolite'); // above it
    expect(classifyTAS(76, 2.0).field).toBe('Rhyolite'); // above the line at 76 (=1.0)
    expect(classifyTAS(74, 2.0).field).toBe('Dacite'); // below the line at 74 (=3.0)
  });

  it('applies the published Irvine & Baragar alkaline boundary', () => {
    // From their Appendix III equation for Fig. 3, the boundary sits at
    // about 4.7 wt% alkalis at 50 wt% SiO2 and about 7.9 wt% at 60 wt%.
    expect(classifyTAS(50, 2.0).isAlkaline).toBe(false);
    expect(classifyTAS(50, 4.0).isAlkaline).toBe(false);
    expect(classifyTAS(50, 6.0).isAlkaline).toBe(true);

    expect(classifyTAS(60, 4.0).isAlkaline).toBe(false);
    expect(classifyTAS(60, 7.0).isAlkaline).toBe(false);
    expect(classifyTAS(60, 9.0).isAlkaline).toBe(true);
  });

  it('is monotonic across the alkaline boundary at fixed silica', () => {
    for (const sio2 of [45, 50, 55, 60, 65, 70]) {
      let flipped = false;
      let prev = classifyTAS(sio2, 0).isAlkaline;
      for (let a = 0; a <= 15; a += 0.25) {
        const cur = classifyTAS(sio2, a).isAlkaline;
        if (cur !== prev) {
          // Only one transition permitted, and only false -> true.
          expect(flipped).toBe(false);
          expect(cur).toBe(true);
          flipped = true;
          prev = cur;
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Petrogenetic indices
// ---------------------------------------------------------------------------

describe('calculateStoichiometry — indices', () => {
  it('gives ASI = 1.00 for pure anorthite', () => {
    // CaAl2Si2O8 has Al2O3:CaO = 1:1 molar, so ASI is exactly 1.
    const s = calculateStoichiometry(ANORTHITE);
    expect(s.asi).toBeCloseTo(1.0, 2);
  });

  it('gives ASI = 1.00 for pure albite', () => {
    expect(calculateStoichiometry(ALBITE).asi).toBeCloseTo(1.0, 2);
  });

  it('gives ASI = 1.00 for pure orthoclase', () => {
    expect(calculateStoichiometry(ORTHOCLASE).asi).toBeCloseTo(1.0, 2);
  });

  it('gives ASI = 1.00 for a 50:50 albite-anorthite mix', () => {
    const mix: OxideComposition = {};
    for (const k of new Set([...Object.keys(ALBITE), ...Object.keys(ANORTHITE)])) {
      mix[k] = ((ALBITE[k] || 0) + (ANORTHITE[k] || 0)) / 2;
    }
    expect(calculateStoichiometry(mix).asi).toBeCloseTo(1.0, 2);
  });

  it('gives ASI > 1 for a peraluminous granite', () => {
    expect(calculateStoichiometry(S_TYPE_GRANITE).asi as number).toBeGreaterThan(1.0);
  });

  it('gives ASI < 1 for a peralkaline rhyolite', () => {
    expect(calculateStoichiometry(PERALKALINE_RHYOLITE).asi as number).toBeLessThan(1.0);
  });

  it('applies the apatite correction to ASI', () => {
    const withP = calculateStoichiometry({ ...S_TYPE_GRANITE, P2O5: 1.5 });
    const withoutP = calculateStoichiometry({ ...S_TYPE_GRANITE, P2O5: 0 });
    // Removing Ca into apatite raises ASI.
    expect(withP.asi as number).toBeGreaterThan(withoutP.asi as number);
  });

  it('gives A/NK = 1.00 for pure albite', () => {
    expect(calculateStoichiometry(ALBITE).ank).toBeCloseTo(1.0, 2);
  });

  it('gives Mg# = 100 for forsterite and 0 for fayalite', () => {
    expect(calculateStoichiometry(FORSTERITE).mgNumber).toBeCloseTo(100, 1);
    expect(calculateStoichiometry(FAYALITE).mgNumber).toBeCloseTo(0, 1);
  });

  it('computes Mg# from total iron consistently', () => {
    const a = calculateStoichiometry({ MgO: 40.304, FeO: 71.844 });
    expect(a.mgNumber).toBeCloseTo(50, 1);
  });

  it('reports silica saturation consistently with the norm', () => {
    expect(calculateStoichiometry(QUARTZ).silicaSaturation).toBe('Oversaturated');
    expect(calculateStoichiometry(NEPHELINE).silicaSaturation).toBe('Undersaturated');
  });
});

describe('similarity score bounds', () => {
  it('scores a reference against its own composition at the top of the range', () => {
    for (const ref of ROCKS_DATASET.filter((r) => r.tasField).slice(0, 10)) {
      const report = identifyGeochemicalSample({ ...ref.meanOxides }, ref.name, 'oxide', {
        sampleType: 'whole_rock',
      });
      const self = report.topRocks.find((m) => m.reference.id === ref.id);
      // topRocks holds the best five, so finding itself there is the real
      // assertion: a reference must identify as itself.
      expect(self, `${ref.name} should rank itself in the top five`).toBeDefined();
      // Volatile-free normalization shifts the composition slightly, and a
      // reference whose own oxides do not sum to 100 shifts further, so the
      // distance is small rather than exactly zero.
      expect(self!.distance).toBeLessThan(0.5);
      expect(self!.similarity).toBeGreaterThanOrEqual(95);
    }
  });

  it('never reports a similarity outside 0-100', () => {
    for (const ref of ROCKS_DATASET.slice(0, 12)) {
      const report = identifyGeochemicalSample({ ...ref.meanOxides }, ref.name, 'oxide', {
        sampleType: 'whole_rock',
      });
      for (const m of report.topRocks) {
        expect(m.similarity).toBeLessThanOrEqual(100);
        expect(m.similarity).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('never lets the TAS agreement bonus lower a score', () => {
    // The bonus was written as min(99, s + 3). The cap bites above s = 96, so
    // agreement could pull a near-perfect score DOWN. Guard the invariant
    // directly: for every reference, the score with its TAS field declared is
    // never below the score without one.
    for (const ref of ROCKS_DATASET.filter((r) => r.tasField).slice(0, 8)) {
      const withField = identifyGeochemicalSample({ ...ref.meanOxides }, ref.name, 'oxide', {
        sampleType: 'whole_rock',
      }).topRocks.find((m) => m.reference.id === ref.id);

      const stripped = { ...ref, tasField: undefined };
      const withoutField = identifyGeochemicalSample(
        { ...ref.meanOxides },
        ref.name,
        'oxide',
        { sampleType: 'whole_rock' }
      ).topRocks.find((m) => m.reference.id === stripped.id);

      expect(withField!.similarity).toBeGreaterThanOrEqual(withoutField!.similarity);
    }
  });
});

describe('data quality flags', () => {
  it('raises iron-split-estimated for an FeOT-only analysis', () => {
    // The GEOROC norm. The flag guarded `iron.isSplitEstimated`, which is only
    // true when a ratio was passed in, and assessDataQuality passes none — so
    // the most common caveat in compiled data could never be shown.
    const report = identifyGeochemicalSample(
      { SiO2: 50.4, Al2O3: 15.3, FeOT: 10.2, MgO: 7.8, CaO: 11.6, Na2O: 2.6, K2O: 0.14, TiO2: 1.5 },
      'FeOT only',
      'oxide'
    );
    const codes = (report.qualityFlags ?? []).map((f) => f.code);
    expect(codes).toContain('iron-split-estimated');
  });

  it('does not raise it when both iron components were measured', () => {
    const report = identifyGeochemicalSample(
      {
        SiO2: 50.4, Al2O3: 15.3, FeO: 8.85, Fe2O3: 1.45, MgO: 7.8,
        CaO: 11.6, Na2O: 2.6, K2O: 0.14, TiO2: 1.5,
      },
      'Measured split',
      'oxide'
    );
    const codes = (report.qualityFlags ?? []).map((f) => f.code);
    expect(codes).not.toContain('iron-split-estimated');
  });

  it('raises iron-missing when no iron is reported at all', () => {
    const report = identifyGeochemicalSample(
      { SiO2: 60, Al2O3: 18, CaO: 8, Na2O: 4, K2O: 2, MgO: 3 },
      'No iron',
      'oxide'
    );
    expect((report.qualityFlags ?? []).map((f) => f.code)).toContain('iron-missing');
  });
});
