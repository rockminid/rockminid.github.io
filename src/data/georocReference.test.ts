import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Guards the ingested GEOROC reference library.
 *
 * These run against the committed JSON, so a bad re-ingest is caught before
 * it reaches the app. They assert geological sanity, not exact numbers, so
 * they survive a legitimate refresh of the source data.
 */

const DATA_DIR = path.resolve(__dirname, '../../public/data');

interface OxideStats {
  n: number;
  p10?: number;
  p25?: number;
  p50?: number;
  p75?: number;
  p90?: number;
}
interface Entry {
  name: string;
  n: number;
  oxides: Record<string, OxideStats>;
  tectonicSettings: Array<{ value: string; n: number }>;
  groupTags: Array<{ value: string; n: number }>;
  variants?: Array<{ value: string; n: number }>;
}

function load(kind: 'rocks' | 'minerals'): Entry[] {
  const file = path.join(DATA_DIR, `georoc-${kind}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8')).entries as Entry[];
}

const rocks = load('rocks');
const minerals = load('minerals');
const byName = (es: Entry[]) => new Map(es.map((e) => [e.name, e]));
const R = byName(rocks);
const M = byName(minerals);

describe('GEOROC library — structural integrity', () => {
  it('has a substantial number of well-populated groups', () => {
    // Deliberately far fewer groups than GEOROC has distinct name strings:
    // mineralogical variants ("GRANODIORITE, BIOTITE") are folded into their
    // root, because those distinctions are petrographic and a chemical
    // classifier cannot act on them.
    expect(rocks.length).toBeGreaterThan(50);
    expect(minerals.length).toBeGreaterThan(20);
    // Every group must be big enough for its percentiles to mean something.
    const median = [...rocks].map((e) => e.n).sort((a, b) => a - b)[Math.floor(rocks.length / 2)];
    expect(median).toBeGreaterThan(50);
  });

  it('records the mineralogical variants folded into each root', () => {
    const basalt = R.get('BASALT')!;
    expect(basalt.variants?.length).toBeGreaterThan(0);
    expect(basalt.variants!.map((v) => v.value)).toContain('OLIVINE');
  });

  it('leaves no comma-separated modifier in a group name', () => {
    for (const e of [...rocks, ...minerals]) expect(e.name).not.toContain(',');
  });

  it('is built from a large number of analyses', () => {
    const total = rocks.reduce((a, e) => a + e.n, 0) + minerals.reduce((a, e) => a + e.n, 0);
    expect(total).toBeGreaterThan(200_000);
  });

  it('respects the minimum group size', () => {
    for (const e of [...rocks, ...minerals]) expect(e.n).toBeGreaterThanOrEqual(25);
  });

  it('has monotonically ordered percentiles for every oxide', () => {
    for (const e of [...rocks, ...minerals]) {
      for (const [ox, s] of Object.entries(e.oxides)) {
        const q = [s.p10, s.p25, s.p50, s.p75, s.p90].filter((v) => v !== undefined) as number[];
        for (let i = 1; i < q.length; i++) {
          expect(q[i], `${e.name}.${ox} p${i}`).toBeGreaterThanOrEqual(q[i - 1]);
        }
      }
    }
  });

  it('has physically possible oxide values', () => {
    for (const e of [...rocks, ...minerals]) {
      for (const [ox, s] of Object.entries(e.oxides)) {
        expect(s.p50, `${e.name}.${ox}`).toBeGreaterThanOrEqual(0);
        expect(s.p90, `${e.name}.${ox}`).toBeLessThanOrEqual(100);
      }
    }
  });

  it('carries no bibliographic citation brackets in names', () => {
    for (const e of [...rocks, ...minerals]) {
      expect(e.name).not.toMatch(/[[\]]/);
      expect(e.name).not.toMatch(/NOT GIVEN/);
    }
  });

  it('stays small enough to fetch comfortably', () => {
    for (const kind of ['rocks', 'minerals'] as const) {
      const bytes = fs.statSync(path.join(DATA_DIR, `georoc-${kind}.json`)).size;
      expect(bytes).toBeLessThan(2_000_000);
    }
  });
});

describe('GEOROC library — geological sanity', () => {
  // Median SiO2 must land in the accepted range for each named rock type.
  const expectedSiO2: Array<[string, number, number]> = [
    ['BASALT', 45, 53],
    ['BASALTIC-ANDESITE', 52, 57],
    ['ANDESITE', 56, 64],
    ['DACITE', 62, 70],
    ['RHYOLITE', 69, 79],
    ['GRANITE', 66, 78],
    ['GRANODIORITE', 62, 72],
    ['GABBRO', 44, 54],
    ['ALKALI BASALT', 42, 50],
    ['BASANITE', 40, 48],
    ['TRACHYTE', 57, 70],
  ];

  for (const [name, lo, hi] of expectedSiO2) {
    it(`${name} has a median SiO2 between ${lo} and ${hi} wt%`, () => {
      const e = R.get(name);
      expect(e, `${name} missing from the library`).toBeDefined();
      const p50 = e!.oxides.SiO2?.p50 as number;
      expect(p50).toBeGreaterThanOrEqual(lo);
      expect(p50).toBeLessThanOrEqual(hi);
    });
  }

  it('orders the volcanic series by silica', () => {
    const si = (n: string) => R.get(n)!.oxides.SiO2!.p50 as number;
    expect(si('BASALT')).toBeLessThan(si('BASALTIC-ANDESITE'));
    expect(si('BASALTIC-ANDESITE')).toBeLessThan(si('ANDESITE'));
    expect(si('ANDESITE')).toBeLessThan(si('DACITE'));
    expect(si('DACITE')).toBeLessThan(si('RHYOLITE'));
  });

  it('gives basalt more MgO and CaO than rhyolite', () => {
    const b = R.get('BASALT')!.oxides;
    const r = R.get('RHYOLITE')!.oxides;
    expect(b.MgO!.p50!).toBeGreaterThan(r.MgO!.p50!);
    expect(b.CaO!.p50!).toBeGreaterThan(r.CaO!.p50!);
    expect(b.FeOT!.p50!).toBeGreaterThan(r.FeOT!.p50!);
  });

  it('gives alkali basalt more total alkalis than tholeiitic basalt', () => {
    const alk = (n: string) => {
      const o = R.get(n)!.oxides;
      return (o.Na2O!.p50 as number) + (o.K2O!.p50 as number);
    };
    expect(alk('ALKALI BASALT')).toBeGreaterThan(alk('THOLEIITIC BASALT'));
  });

  // Minerals: medians must sit in the right stoichiometric neighbourhood.
  const expectedMineral: Array<[string, string, number, number]> = [
    ['OLIVINE', 'SiO2', 35, 43],
    ['OLIVINE', 'MgO', 25, 55],
    ['ORTHOPYROXENE', 'SiO2', 48, 58],
    ['CLINOPYROXENE', 'SiO2', 45, 56],
    ['CLINOPYROXENE', 'CaO', 12, 25],
    ['PLAGIOCLASE', 'Al2O3', 22, 36],
    ['GARNET', 'SiO2', 34, 44],
    ['AMPHIBOLE', 'SiO2', 36, 55],
    ['NEPHELINE', 'Al2O3', 28, 38],
  ];

  for (const [name, ox, lo, hi] of expectedMineral) {
    it(`${name} has a median ${ox} between ${lo} and ${hi} wt%`, () => {
      const e = M.get(name);
      expect(e, `${name} missing from the library`).toBeDefined();
      const p50 = e!.oxides[ox]?.p50 as number;
      expect(p50).toBeGreaterThanOrEqual(lo);
      expect(p50).toBeLessThanOrEqual(hi);
    });
  }

  it('gives ilmenite and spinel almost no silica', () => {
    expect(M.get('ILMENITE')!.oxides.SiO2!.p50!).toBeLessThan(2);
    expect(M.get('SPINEL')!.oxides.SiO2!.p50!).toBeLessThan(2);
  });

  it('gives orthopyroxene less CaO than clinopyroxene', () => {
    expect(M.get('ORTHOPYROXENE')!.oxides.CaO!.p50!).toBeLessThan(
      M.get('CLINOPYROXENE')!.oxides.CaO!.p50!
    );
  });
});

describe('GEOROC library — provenance', () => {
  it('ships a manifest recording method, licence and the source defect', () => {
    const m = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'georoc-manifest.json'), 'utf8'));
    expect(m.source).toContain('GEOROC');
    expect(m.license).toMatch(/cite/i);
    expect(m.method).toMatch(/percentile|p10|p50/i);
    expect(m.knownSourceDefect).toMatch(/45-column/);
    expect(m.datasets.rocks.accepted).toBeGreaterThan(100_000);
  });
});

// ---------------------------------------------------------------------------
// Round trip: feeding a group's own median composition back into the engine
// should return that group (or a close relative) at the top.
// ---------------------------------------------------------------------------

describe('GEOROC library — round trip through the engine', () => {
  it('identifies each major rock group from its own median composition', async () => {
    const { identifyGeochemicalSample } = await import('../utils/geochemEngine');
    const { __setGeorocLibraryForTests } = await import('./georocReference');
    const mod = await import('./georocReference');

    // Load the committed library through the real conversion path.
    const converted = (mod as unknown as {
      __convertForTests?: unknown;
    });
    void converted;

    // Build references the same way the loader does, via a tiny local copy of
    // the median extraction, so the test exercises the engine rather than the
    // fetch layer.
    const toRef = (e: Entry) => {
      const pick = (k: 'p10' | 'p50' | 'p90') => {
        const o: Record<string, number> = {};
        for (const [ox, s] of Object.entries(e.oxides)) {
          const v = s[k];
          if (typeof v === 'number') o[ox] = v;
        }
        delete o.FeO;
        delete o.Fe2O3;
        return o;
      };
      return {
        id: `t-${e.name}`,
        name: e.name,
        category: 'Igneous Volcanic' as const,
        meanOxides: pick('p50'),
        minOxides: pick('p10'),
        maxOxides: pick('p90'),
        description: '',
        keyMinerals: [],
        source: 'GEOROC',
      };
    };

    const refs = rocks.map(toRef);
    __setGeorocLibraryForTests(refs as never, []);

    try {
      const checks = ['BASALT', 'ANDESITE', 'DACITE', 'RHYOLITE', 'GRANITE', 'BASANITE'];
      for (const name of checks) {
        const e = R.get(name)!;
        const sample: Record<string, number> = {};
        for (const [ox, s] of Object.entries(e.oxides)) {
          if (typeof s.p50 === 'number' && ox !== 'FeO' && ox !== 'Fe2O3') sample[ox] = s.p50;
        }
        const report = identifyGeochemicalSample(sample, name);
        const top5 = report.topRocks.slice(0, 5).map((m) => m.reference.name);
        expect(top5, `${name} -> ${top5.join(', ')}`).toContain(name);
      }
    } finally {
      __setGeorocLibraryForTests([], []);
    }
  });
});
