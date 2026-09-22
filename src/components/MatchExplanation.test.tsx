import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MatchExplanation } from './MatchExplanation';
import { MatchScore } from '../types/geochem';
import { identifyGeochemicalSample } from '../utils/geochemEngine';

/**
 * The panel explains a similarity score. The project convention is that the
 * score ranks candidates and is never presented as a probability, so these
 * tests guard the wording as well as the numbers.
 */

function makeMatch(overrides: Partial<MatchScore> = {}): MatchScore {
  return {
    reference: { id: 'ref-1', name: 'Test Basalt' } as MatchScore['reference'],
    type: 'rock',
    similarity: 82,
    confidence: 82,
    distance: 1.234,
    analytesUsed: 9,
    contributions: [
      { oxide: 'SiO2', delta: 2.4, contribution: 20 },
      { oxide: 'MgO', delta: -1.1, contribution: 3 },
    ],
    deltaOxides: {},
    matchedCriteria: [],
    ...overrides,
  } as MatchScore;
}

describe('MatchExplanation', () => {
  it('renders nothing when there is no breakdown to show', () => {
    const { container } = render(<MatchExplanation match={makeMatch({ contributions: [] })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows each contributing oxide with a signed difference', () => {
    render(<MatchExplanation match={makeMatch()} />);
    expect(screen.getByText('SiO₂')).toBeInTheDocument();
    expect(screen.getByText('+2.40')).toBeInTheDocument();
    expect(screen.getByText('-1.10')).toBeInTheDocument();
  });

  it('subscripts oxide formulas rather than printing raw digits', () => {
    render(<MatchExplanation match={makeMatch()} />);
    expect(screen.queryByText('SiO2')).not.toBeInTheDocument();
  });

  it('states that the score is not a probability', () => {
    render(<MatchExplanation match={makeMatch()} />);
    expect(screen.getByText(/is not a probability/i)).toBeInTheDocument();
  });

  it('never renders the similarity score with a percent sign', () => {
    const { container } = render(
      <MatchExplanation match={makeMatch()} runnerUpSimilarity={60} runnerUpName="Andesite" />
    );
    expect(container.textContent).not.toMatch(/\b82\s*%/);
  });

  it('calls a narrow lead ambiguous', () => {
    render(
      <MatchExplanation
        match={makeMatch({ similarity: 82 })}
        runnerUpSimilarity={80}
        runnerUpName="Basaltic Andesite"
      />
    );
    expect(screen.getByText(/ambiguous/i)).toBeInTheDocument();
    expect(screen.getByText(/Basaltic Andesite/)).toBeInTheDocument();
  });

  it('reports a clear lead without calling it ambiguous', () => {
    render(
      <MatchExplanation
        match={makeMatch({ similarity: 90 })}
        runnerUpSimilarity={60}
        runnerUpName="Andesite"
      />
    );
    expect(screen.queryByText(/ambiguous/i)).not.toBeInTheDocument();
    expect(screen.getByText(/30 points clear of Andesite/)).toBeInTheDocument();
  });

  it('flags the structural fit as decisive for a mineral', () => {
    render(<MatchExplanation match={makeMatch({ type: 'mineral', structuralFit: 0.92 })} />);
    expect(screen.getByText(/Structural fit 92%/)).toBeInTheDocument();
    expect(screen.getByText(/decisive test/i)).toBeInTheDocument();
  });

  it('renders the breakdown the engine really produces', () => {
    const report = identifyGeochemicalSample(
      {
        SiO2: 50.45,
        TiO2: 1.48,
        Al2O3: 15.28,
        FeO: 8.85,
        Fe2O3: 1.45,
        MgO: 7.78,
        CaO: 11.62,
        Na2O: 2.65,
        K2O: 0.14,
      },
      'MORB',
      'oxide',
      { sampleType: 'whole_rock' }
    );

    const best = report.topRocks[0];
    expect(best.contributions?.length).toBeGreaterThan(0);

    render(
      <MatchExplanation match={best} runnerUpSimilarity={report.topRocks[1]?.similarity} />
    );
    expect(screen.getByText(/why this match/i)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`d=${best.distance}`))).toBeInTheDocument();
  });
});
