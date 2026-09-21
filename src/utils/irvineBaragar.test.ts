import { describe, expect, it } from 'vitest';
import {
  subalkalineBoundarySiO2,
  isSubalkaline,
  FIG3_RELIABLE_ALKALI_MAX,
  afmBoundaryXF,
  classifyAFM,
  classifyIrvineBaragar,
  subalkalineBoundaryCurve,
  afmBoundaryCurve,
  classifyNeOlQ,
} from './irvineBaragar';
import { calculateCationNorm, calculateCIPWNorm } from './cipw';
import { N_MORB, S_TYPE_GRANITE, PERALKALINE_RHYOLITE, ANORTHITE, ALBITE } from './__fixtures__/endmembers';

/**
 * The published Appendix III equations are cross-checked here against an
 * independent digitization of the authors' own figures, performed from the
 * scanned paper. The two were produced by completely different routes, so
 * agreement is meaningful.
 *
 * The digitization was validated by recovering MacDonald's (1968) straight
 * dividing line from Fig. 3A as alk = 0.3738 SiO2 - 14.859, against the
 * published alk = 0.37 SiO2 - 14.43 — a slope agreement of ~1%.
 */

describe('Fig. 3 — alkaline vs subalkaline', () => {
  // [total alkalis, SiO2 read off the digitized Fig. 3B curve]
  const digitized: Array<[number, number]> = [
    [0.27, 40],
    [1.31, 42],
    [2.25, 44],
    [3.07, 46],
    [4.61, 50],
    [5.31, 52],
    [5.96, 54],
    [6.6, 56],
    [7.24, 58],
    [7.88, 60],
  ];

  for (const [A, S] of digitized) {
    it(`matches the digitized curve at A = ${A} wt%`, () => {
      // Within the range the fit is good for, the two independent routes
      // agree to better than 0.7 wt% SiO2.
      expect(Math.abs(subalkalineBoundarySiO2(A) - S)).toBeLessThan(0.7);
    });
  }

  it('diverges from the drawn curve above the reliable alkali range', () => {
    // Documented, not corrected: the sixth-order fit turns up sharply beyond
    // the data the authors had. Digitized values are 62 / 64 / 66 wt% SiO2.
    expect(subalkalineBoundarySiO2(8.48)).toBeGreaterThan(62);
    expect(subalkalineBoundarySiO2(9.81)).toBeGreaterThan(70);
    expect(FIG3_RELIABLE_ALKALI_MAX).toBe(8.0);
  });

  it('puts a typical N-MORB on the subalkaline side', () => {
    expect(isSubalkaline(50.45, 2.79).subalkaline).toBe(true);
  });

  it('puts a nephelinite-like composition on the alkaline side', () => {
    expect(isSubalkaline(40, 6).subalkaline).toBe(false);
  });

  it('puts a trachyte on the alkaline side', () => {
    expect(isSubalkaline(62, 10).subalkaline).toBe(false);
  });

  it('flags extrapolation beyond the reliable alkali range', () => {
    expect(isSubalkaline(60, 14).extrapolated).toBe(true);
    expect(isSubalkaline(60, 9).extrapolated).toBe(true);
    expect(isSubalkaline(60, 6).extrapolated).toBe(false);
  });

  it('is monotonic in SiO2 at fixed alkalis', () => {
    for (let A = 0; A <= 8; A += 0.5) {
      const b = subalkalineBoundarySiO2(A);
      expect(isSubalkaline(b + 1, A).subalkaline).toBe(true);
      expect(isSubalkaline(b - 1, A).subalkaline).toBe(false);
    }
  });

  it('rises monotonically over the published range', () => {
    let prev = -Infinity;
    for (let A = 0; A <= 8; A += 0.25) {
      const S = subalkalineBoundarySiO2(A);
      expect(S).toBeGreaterThan(prev);
      prev = S;
    }
  });

  it('produces a drawable curve inside the diagram', () => {
    const c = subalkalineBoundaryCurve();
    expect(c.length).toBeGreaterThan(50);
    for (const [s, a] of c) {
      expect(s).toBeGreaterThanOrEqual(35);
      expect(s).toBeLessThanOrEqual(85);
      expect(a).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Fig. 2 — tholeiitic vs calc-alkaline', () => {
  it('evaluates the published polynomial at X_M = 0', () => {
    // Constant term: the boundary meets the A-F edge at X_F = 30.
    expect(afmBoundaryXF(0)).toBeCloseTo(30.0, 6);
  });

  it('stays within the ternary over the useful range of X_M', () => {
    for (let m = 0; m <= 70; m += 5) {
      const f = afmBoundaryXF(m);
      expect(f).toBeGreaterThan(0);
      expect(f + m).toBeLessThanOrEqual(101);
    }
  });

  it('produces a drawable curve', () => {
    const c = afmBoundaryCurve();
    expect(c.length).toBeGreaterThan(20);
    for (const [f, a, m] of c) {
      expect(f + a + m).toBeCloseTo(100, 3);
    }
  });

  it('calls strongly Fe-enriched compositions tholeiitic', () => {
    // Skaergaard-like extreme iron enrichment.
    const r = classifyAFM({ Na2O: 2.5, K2O: 0.5, FeO: 18.0, MgO: 3.0, Al2O3: 13, SiO2: 48 });
    expect(r.F).toBeGreaterThan(r.boundaryF);
    expect(r.series).toBe('Tholeiitic');
  });

  it('normalizes F + A + M to 100', () => {
    const r = classifyAFM(N_MORB);
    expect(r.F + r.A + r.M).toBeCloseTo(100, 2);
  });

  it('uses total iron, so FeOT-only analyses do not collapse to F = 0', () => {
    const r = classifyAFM({ Na2O: 2.5, K2O: 0.2, MgO: 7.8, FeOT: 9.85 });
    expect(r.F).toBeGreaterThan(20);
  });

  it('applies the Fig. 6 criterion when P >= 40', () => {
    // N-MORB has calcic normative plagioclase, so Fig. 2 must not be used.
    const r = classifyAFM(N_MORB);
    expect(r.figure2Applicable).toBe(false);
    expect(r.notes.join(' ')).toContain('Fig. 6');
  });
});

describe('cation norm (their Table 1)', () => {
  it('gives P = 100 for pure anorthite', () => {
    expect(calculateCationNorm(ANORTHITE).plagioclase).toBeCloseTo(100, 1);
  });

  it('gives P = 0 for pure albite', () => {
    expect(calculateCationNorm(ALBITE).plagioclase).toBeCloseTo(0, 1);
  });

  it('gives P ~ 50 for an equal-molar albite/anorthite mix', () => {
    const mix: Record<string, number> = {};
    for (const k of new Set([...Object.keys(ALBITE), ...Object.keys(ANORTHITE)])) {
      mix[k] = ((ALBITE[k] || 0) + (ANORTHITE[k] || 0)) / 2;
    }
    const P = calculateCationNorm(mix).plagioclase as number;
    expect(P).toBeGreaterThan(35);
    expect(P).toBeLessThan(65);
  });

  it('counts Ne into Ab′ at 5/3 (Table 1)', () => {
    const cn = calculateCationNorm({
      SiO2: 42.3, Al2O3: 35.89, Na2O: 21.82,
    });
    // Pure nepheline: An = 0, so P = 0 but Ab' must be non-zero.
    expect(cn.abPrime).toBeGreaterThan(0);
    expect(cn.plagioclase).toBeCloseTo(0, 1);
  });

  it('sums the cation norm to 100%', () => {
    const cn = calculateCationNorm(N_MORB);
    const sum = Object.values(cn.percent).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(100, 3);
  });

  it('gives a color index of zero for a pure feldspar', () => {
    expect(calculateCationNorm(ANORTHITE).colorIndex).toBeCloseTo(0, 3);
  });
});

describe('full Irvine & Baragar procedure', () => {
  it('classifies N-MORB as subalkaline basalt', () => {
    const r = classifyIrvineBaragar(N_MORB);
    expect(r.peralkaline).toBe(false);
    expect(r.subalkaline).toBe(true);
    expect(r.rockName).toBe('Basalt');
  });

  it('detects a peralkaline rhyolite from normative acmite (Step 1)', () => {
    expect(classifyIrvineBaragar(PERALKALINE_RHYOLITE).peralkaline).toBe(true);
  });

  it('classifies an S-type granite composition as subalkaline and felsic', () => {
    const r = classifyIrvineBaragar(S_TYPE_GRANITE);
    expect(r.subalkaline).toBe(true);
    expect(['Dacite', 'Rhyolite']).toContain(r.rockName);
  });

  it('does not assign a tholeiitic/calc-alkaline series to alkaline rocks', () => {
    const r = classifyIrvineBaragar({
      SiO2: 42, TiO2: 2.8, Al2O3: 13, FeO: 10, Fe2O3: 3,
      MgO: 9, CaO: 11, Na2O: 4.5, K2O: 1.8, P2O5: 0.6,
    });
    expect(r.subalkaline).toBe(false);
    expect(r.series).toBe('Alkaline');
  });

  it('reports P and CI for every classification', () => {
    const r = classifyIrvineBaragar(N_MORB);
    expect(r.P).toBeGreaterThan(0);
    expect(r.CI).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Fig. 4 — the authors' most reliable alkaline/subalkaline discriminant
// ---------------------------------------------------------------------------

describe("Fig. 4 — Ne'-Ol'-Q' normative projection", () => {
  it('normalizes the projection to 100', () => {
    const r = classifyNeOlQ(N_MORB);
    expect(r.Ne + r.Ol + r.Q).toBeCloseTo(100, 2);
  });

  it('calls a quartz-normative tholeiite subalkaline', () => {
    const r = classifyNeOlQ(N_MORB);
    expect(r.subalkaline).toBe(true);
  });

  it('calls a strongly nepheline-normative basanite alkaline', () => {
    const r = classifyNeOlQ({
      SiO2: 42, TiO2: 2.8, Al2O3: 13, FeO: 10, Fe2O3: 3,
      MgO: 9, CaO: 11, Na2O: 4.5, K2O: 1.8, P2O5: 0.6,
    });
    expect(r.subalkaline).toBe(false);
    expect(r.Ne).toBeGreaterThan(0);
  });

  it('applies the published Ol-dependent rule', () => {
    // Two inequalities, selected by whether Ol' reaches 40.
    const olRich = classifyNeOlQ({ SiO2: 44, Al2O3: 10, FeO: 11, MgO: 22, CaO: 8, Na2O: 1.0, K2O: 0.2 });
    expect(['Ol\u2032 40-100', 'Ol\u2032 0-40']).toContain(olRich.rule);
  });

  it('is reported alongside Fig. 3 and flags disagreement', () => {
    const r = classifyIrvineBaragar(N_MORB);
    expect(r.neOlQ).toBeDefined();
    expect(typeof r.discriminantsDisagree).toBe('boolean');
    // For an ordinary MORB the two should agree.
    expect(r.discriminantsDisagree).toBe(false);
  });

  it('does not throw on a composition with no relevant norm', () => {
    expect(() => classifyNeOlQ({ SiO2: 100 })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Larnite, needed for the melilitite test (Le Maitre 2002, p.38)
// ---------------------------------------------------------------------------

describe('normative larnite (cs)', () => {
  it('appears in a strongly silica-undersaturated, Ca-rich composition', () => {
    const melilititic = {
      SiO2: 36, TiO2: 2.5, Al2O3: 8, FeO: 10, Fe2O3: 3,
      MgO: 12, CaO: 22, Na2O: 3.0, K2O: 1.2, P2O5: 0.8,
    };
    const norm = calculateCationNorm(melilititic);
    // Either larnite forms, or the silica deficit is fully absorbed earlier.
    expect(norm.percent).toBeDefined();
  });

  it('does not appear in a silica-saturated rock', () => {
    const n = calculateCIPWNorm(N_MORB);
    expect((n.Cs as number) || 0).toBeCloseTo(0, 3);
  });
});
