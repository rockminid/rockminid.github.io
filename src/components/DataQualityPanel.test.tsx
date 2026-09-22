import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataQualityPanel } from './DataQualityPanel';
import { DataQualityFlag } from '../types/geochem';
import { identifyGeochemicalSample } from '../utils/geochemEngine';

/**
 * The panel's job is to make sure nothing the engine flagged is dropped on the
 * way to the screen. The previous UI showed one legacy string and only for
 * totals, so an estimated iron split or a sparse analysis was computed and
 * then discarded. These tests exist to stop that happening again.
 */

const flag = (
  code: string,
  severity: DataQualityFlag['severity'],
  message = `message for ${code}`
): DataQualityFlag => ({ code, severity, message });

describe('DataQualityPanel', () => {
  it('says so explicitly when there are no flags', () => {
    render(<DataQualityPanel flags={[]} />);
    expect(screen.getByText(/no data-quality flags were raised/i)).toBeInTheDocument();
  });

  it('renders every flag it is given', () => {
    const flags = [
      flag('low-total', 'error'),
      flag('iron-split-estimated', 'info'),
      flag('high-loi', 'warning'),
    ];
    render(<DataQualityPanel flags={flags} />);

    for (const f of flags) {
      expect(screen.getByText(f.message)).toBeInTheDocument();
      expect(screen.getByText(f.code)).toBeInTheDocument();
    }
  });

  it('orders errors before warnings before notes', () => {
    render(
      <DataQualityPanel
        flags={[flag('a-note', 'info'), flag('a-warning', 'warning'), flag('an-error', 'error')]}
      />
    );

    const codes = screen
      .getAllByText(/^(a-note|a-warning|an-error)$/)
      .map((el) => el.textContent);
    expect(codes).toEqual(['an-error', 'a-warning', 'a-note']);
  });

  it('summarises the counts by severity', () => {
    render(
      <DataQualityPanel
        flags={[flag('e1', 'error'), flag('w1', 'warning'), flag('w2', 'warning')]}
      />
    );
    expect(screen.getByText('1 error · 2 warning')).toBeInTheDocument();
  });

  it('surfaces every flag the engine actually produces for a bad analysis', () => {
    // An empty analysis is the worst realistic case: no iron, nothing
    // measured, zero total. All three must reach the screen.
    const report = identifyGeochemicalSample({}, 'Empty', 'oxide');
    render(<DataQualityPanel flags={report.qualityFlags ?? []} />);

    expect(report.qualityFlags?.length).toBeGreaterThan(0);
    for (const f of report.qualityFlags ?? []) {
      expect(screen.getByText(f.code)).toBeInTheDocument();
    }
  });

  it('surfaces the estimated-iron note for an FeOT-only analysis', () => {
    // This is the GEOROC norm and the flag most easily lost: the norm silently
    // estimates a ferric/ferrous split, and the reader needs to know.
    const report = identifyGeochemicalSample(
      {
        SiO2: 50.4,
        TiO2: 1.5,
        Al2O3: 15.3,
        FeOT: 10.2,
        MnO: 0.17,
        MgO: 7.8,
        CaO: 11.6,
        Na2O: 2.6,
        K2O: 0.14,
        P2O5: 0.12,
      },
      'FeOT only',
      'oxide'
    );

    const codes = (report.qualityFlags ?? []).map((f) => f.code);
    expect(codes).toContain('iron-split-estimated');

    render(<DataQualityPanel flags={report.qualityFlags ?? []} />);
    expect(screen.getByText('iron-split-estimated')).toBeInTheDocument();
  });
});
