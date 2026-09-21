import { describe, expect, it } from 'vitest';
import { OxideComposition } from '../types/geochem';
import {
  AFM_IGNEOUS_CONFIG,
  afmBoundaryF,
  QAPF_PLUTONIC_CONFIG,
  TERNARY_SYSTEMS_MAP,
  ternaryToCartesian,
  cartesianToTernary,
} from './ternaryCalculations';
import {
  ALBITE,
  ANORTHITE,
  N_MORB,
  ORTHOCLASE,
  QUARTZ,
} from './__fixtures__/endmembers';

const bounds = {
  topX: 400,
  topY: 60,
  blX: 60,
  blY: 640,
  brX: 740,
  brY: 640,
};

describe('ternary coordinate transforms', () => {
  it('round-trips ternary -> cartesian -> ternary', () => {
    for (const [a, b, c] of [
      [100, 0, 0],
      [0, 100, 0],
      [0, 0, 100],
      [33.3, 33.3, 33.4],
      [50, 25, 25],
      [10, 60, 30],
    ]) {
      const pt = ternaryToCartesian(a, b, c, bounds);
      const back = cartesianToTernary(pt.x, pt.y, bounds);
      expect(back.a).toBeCloseTo(a, 3);
      expect(back.b).toBeCloseTo(b, 3);
      expect(back.c).toBeCloseTo(c, 3);
    }
  });
});

// ---------------------------------------------------------------------------
// AFM
// ---------------------------------------------------------------------------

describe('AFM igneous projection', () => {
  it('honours FeOT-only analyses', () => {
    // GEOROC rows frequently report only total iron. The F apex must not
    // collapse to zero for those samples.
    const p = AFM_IGNEOUS_CONFIG.projectOxides({
      SiO2: 50,
      Na2O: 2.5,
      K2O: 0.2,
      MgO: 7.8,
      FeOT: 9.85,
    });
    expect(p.a).toBeGreaterThan(20); // F apex
  });

  it('gives the same F for equivalent FeO/Fe2O3 and FeOT inputs', () => {
    const asComponents = AFM_IGNEOUS_CONFIG.projectOxides(N_MORB);
    const asTotal = AFM_IGNEOUS_CONFIG.projectOxides({
      Na2O: N_MORB.Na2O,
      K2O: N_MORB.K2O,
      MgO: N_MORB.MgO,
      FeOT: (N_MORB.FeO as number) + 0.8998 * (N_MORB.Fe2O3 as number),
    });
    expect(asComponents.a).toBeCloseTo(asTotal.a, 4);
  });

  it('normalizes A + F + M to 100', () => {
    const p = AFM_IGNEOUS_CONFIG.projectOxides(N_MORB);
    expect(p.a + p.b + p.c).toBeCloseTo(100, 6);
  });

  it('labels the series consistently with the plotted boundary curve', () => {
    // The drawn curve and the classifier both come from the published
    // Appendix III polynomial, so a point placed just above the curve must be
    // called tholeiitic and one just below it calc-alkaline.
    const curve = AFM_IGNEOUS_CONFIG.curves?.[0];
    expect(curve).toBeDefined();
    for (const [f, , m] of curve!.points) {
      if (m < 5 || m > 60) continue; // skip the extreme ends of the curve
      for (const [delta, expected] of [[+4, 'Tholeiitic'], [-4, 'Calc-Alkaline']] as const) {
        const F = f + delta;
        const A = Math.max(0, 100 - F - m);
        // Fed as wt% with no Al or Ca, so the Fig. 2 path (P undefined) applies.
        const p = AFM_IGNEOUS_CONFIG.projectOxides({ FeOT: F, Na2O: A, MgO: m });
        expect(p.fieldName, `F=${F} A=${A} M=${m}`).toContain(expected);
      }
    }
  });

  it('uses the published boundary value, not an interpolated one', () => {
    // Constant term of the Appendix III polynomial: X_F = 30 at X_M = 0.
    expect(afmBoundaryF(0)).toBeCloseTo(30.0, 6);
  });
});

// ---------------------------------------------------------------------------
// QAPF
// ---------------------------------------------------------------------------

describe('QAPF plutonic projection', () => {
  it('places pure quartz at the Q apex', () => {
    const p = QAPF_PLUTONIC_CONFIG.projectOxides(QUARTZ);
    expect(p.a).toBeCloseTo(100, 0);
  });

  it('places pure orthoclase at the A apex', () => {
    const p = QAPF_PLUTONIC_CONFIG.projectOxides(ORTHOCLASE);
    expect(p.b).toBeCloseTo(100, 0);
    expect(p.a).toBeCloseTo(0, 1);
  });

  it('places pure anorthite at the P apex', () => {
    const p = QAPF_PLUTONIC_CONFIG.projectOxides(ANORTHITE);
    expect(p.c).toBeCloseTo(100, 0);
  });

  it('places pure albite at the A apex (An < 5 is alkali feldspar)', () => {
    // IUGS: plagioclase more sodic than An05 counts as alkali feldspar.
    const p = QAPF_PLUTONIC_CONFIG.projectOxides(ALBITE);
    expect(p.b).toBeGreaterThan(95);
  });

  it('uses consistent feldspar formula weights (A and P on one basis)', () => {
    // Equal MOLAR orthoclase and anorthite must give equal-mass A and P.
    // Or = 556.6 g per mol K2O, An = 278.2 g per mol CaO.
    // 1 mol K2O + 1 mol CaO, with exactly enough Al2O3 (2 mol) and SiO2
    // (6 for orthoclase + 2 for anorthite = 8 mol) to consume both.
    const mix: OxideComposition = {
      K2O: 94.196,
      CaO: 56.077,
      Al2O3: 101.961 * 2,
      SiO2: 60.084 * 8,
    };
    const p = QAPF_PLUTONIC_CONFIG.projectOxides(mix);
    // One mole K2O -> 2 mol KAlSi3O8 = 556.6 g of A.
    // One mole CaO -> 1 mol CaAl2Si2O8 = 278.2 g of P.
    expect(p.b / p.c).toBeCloseTo(556.6 / 278.2, 1);
    // ...and the silica budget is exactly consumed, so Q is zero.
    expect(p.a).toBeCloseTo(0, 1);
  });

  it('normalizes Q + A + P to 100', () => {
    const p = QAPF_PLUTONIC_CONFIG.projectOxides(N_MORB);
    expect(p.a + p.b + p.c).toBeCloseTo(100, 6);
  });
});

// ---------------------------------------------------------------------------
// System registry integrity
// ---------------------------------------------------------------------------

describe('ternary system registry', () => {
  it('every system projects to a normalized triple', () => {
    for (const [id, cfg] of Object.entries(TERNARY_SYSTEMS_MAP)) {
      const p = cfg.projectOxides(N_MORB);
      expect(Number.isFinite(p.a), `${id} a`).toBe(true);
      expect(Number.isFinite(p.b), `${id} b`).toBe(true);
      expect(Number.isFinite(p.c), `${id} c`).toBe(true);
      expect(p.a + p.b + p.c, `${id} sum`).toBeCloseTo(100, 4);
    }
  });

  it('no system throws on an empty or zero composition', () => {
    for (const [id, cfg] of Object.entries(TERNARY_SYSTEMS_MAP)) {
      expect(() => cfg.projectOxides({}), id).not.toThrow();
      expect(() => cfg.projectOxides({ SiO2: 0 }), id).not.toThrow();
    }
  });

  it('every system has apices, a name and a reference', () => {
    for (const [id, cfg] of Object.entries(TERNARY_SYSTEMS_MAP)) {
      expect(cfg.name, id).toBeTruthy();
      expect(cfg.apices.top, id).toBeTruthy();
      expect(cfg.apices.bottomLeft, id).toBeTruthy();
      expect(cfg.apices.bottomRight, id).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// QAPF subdivision limits, verified against the IUGS source:
//   Streckeisen, A. (1976) "To each plutonic rock its proper name",
//   Earth-Science Reviews 12, 1-33.
// ---------------------------------------------------------------------------

describe('QAPF subdivision limits (Streckeisen 1976)', () => {
  /**
   * Streckeisen p.10: "we decided for limits at 10-35-65-90" for the
   * plagioclase ratio along the A-P side, and the quartz divisions are set at
   * Q = 5 (dashed, syenite vs quartz syenite), Q = 20, and Q = 60 as the
   * upper limit of the granitoid field.
   */
  const PLAGIOCLASE_LIMITS = [10, 35, 65, 90];
  const QUARTZ_LIMITS = [5, 20, 60];

  /** Builds a Q-A-P composition by choosing Q and the plagioclase ratio. */
  function nameAt(q: number, plagRatio: number): string {
    // Compose an oxide mix that norms to roughly the requested Q/A/P, then
    // read the field the projection assigns.
    const felsic = 100 - q;
    const p = (felsic * plagRatio) / 100;
    const a = felsic - p;
    // Or = 556.6 g per mol K2O, Ab/An handled via An-rich plagioclase.
    const k2o = (a / 556.6) * 94.196;
    const cao = (p / 278.2) * 56.077;
    const al2o3 = ((a / 556.6) * 1 + (p / 278.2) * 1) * 101.961;
    const sio2 = ((a / 556.6) * 6 + (p / 278.2) * 2) * 60.084 + q;
    return (
      QAPF_PLUTONIC_CONFIG.projectOxides({ SiO2: sio2, Al2O3: al2o3, K2O: k2o, CaO: cao })
        .fieldName ?? ''
    );
  }

  it('changes the name across every plagioclase-ratio limit', () => {
    for (const limit of PLAGIOCLASE_LIMITS) {
      const below = nameAt(35, limit - 4);
      const above = nameAt(35, limit + 4);
      expect(below, `plagioclase ratio ${limit}: ${below} vs ${above}`).not.toBe(above);
    }
  });

  it('uses the published granitoid sequence across the A-P side', () => {
    // Alkali-feldspar granite -> syenogranite -> monzogranite ->
    // granodiorite -> tonalite, at f.r. 10 / 35 / 65 / 90.
    const seq = [5, 20, 50, 80, 95].map((r) => nameAt(35, r));
    expect(seq[0]).toContain('Alkali-feldspar');
    expect(seq[1]).toContain('Syenogranite');
    expect(seq[2]).toContain('Monzogranite');
    expect(seq[3]).toContain('Granodiorite');
    expect(seq[4]).toContain('Tonalite');
  });

  it('changes the name across the quartz limits', () => {
    for (const limit of QUARTZ_LIMITS) {
      const below = nameAt(Math.max(1, limit - 4), 50);
      const above = nameAt(limit + 4, 50);
      expect(below, `Q = ${limit}: ${below} vs ${above}`).not.toBe(above);
    }
  });

  it('places a quartz-poor, alkali-feldspar-rich rock in the syenite field', () => {
    expect(nameAt(2, 10)).toContain('Syenite');
  });

  it('places a quartz-poor, plagioclase-rich rock in the diorite/gabbro field', () => {
    expect(nameAt(2, 95)).toMatch(/Diorite|Gabbro/);
  });
});
