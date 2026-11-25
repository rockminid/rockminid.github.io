import { describe, expect, it } from 'vitest';
import {
  CHONDRITE_SM89,
  PM_ORDER,
  PRIMITIVE_MANTLE_SM89,
  REE,
  mapHeaderToTrace,
  normalize,
  traceRatios,
  withMajorElements,
} from './traceElements';

describe('trace element normalization (Sun & McDonough 1989)', () => {
  it('normalizes the reference composition to exactly 1', () => {
    const pts = normalize(CHONDRITE_SM89, CHONDRITE_SM89, REE);
    expect(pts).toHaveLength(14);
    for (const p of pts) expect(p.value).toBeCloseTo(1, 12);
    expect(normalize(PRIMITIVE_MANTLE_SM89, PRIMITIVE_MANTLE_SM89, PM_ORDER)).toHaveLength(PM_ORDER.length);
  });

  it('omits missing elements but keeps the plotting order', () => {
    const pts = normalize({ Yb: 1.7, La: 2.37 }, CHONDRITE_SM89, REE);
    expect(pts.map((p) => p.element)).toEqual(['La', 'Yb']);
    expect(pts[0].value).toBeCloseTo(10, 10);
  });

  it('derives K, P and Ti in ppm from the oxides', () => {
    const t = withMajorElements({}, { K2O: 1, P2O5: 1, TiO2: 1 });
    expect(t.K).toBeCloseTo(8301.5, 0);
    expect(t.P).toBeCloseTo(4364.2, 0);
    expect(t.Ti).toBeCloseTo(5995.1, 0);
    // a measured value is not overwritten
    expect(withMajorElements({ Ti: 100 }, { TiO2: 1 }).Ti).toBe(100);
  });

  it('computes Eu/Eu*, (La/Yb)N and raw ratios', () => {
    const flat = Object.fromEntries(Object.entries(CHONDRITE_SM89).map(([k, v]) => [k, v * 10]));
    const r = traceRatios({ ...flat, Eu: CHONDRITE_SM89.Eu * 5, Nb: 2, Zr: 90, Y: 30 });
    expect(r.euAnomaly).toBeCloseTo(0.5, 10);
    expect(r.laYbN).toBeCloseTo(1, 10);
    expect(r.nbLa).toBeCloseTo(2 / 2.37, 10);
    expect(r.zrY).toBeCloseTo(3, 10);
  });

  it('maps trace headers, with or without a unit', () => {
    expect(mapHeaderToTrace('La')).toBe('La');
    expect(mapHeaderToTrace('Ba (ppm)')).toBe('Ba');
    expect(mapHeaderToTrace('Zr_ppm')).toBe('Zr');
    expect(mapHeaderToTrace('Si')).toBeNull();
    expect(mapHeaderToTrace('SiO2')).toBeNull();
  });
});
