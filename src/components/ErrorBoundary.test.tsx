import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

/**
 * The boundary is the last line of defence: if it fails, the visitor gets a
 * blank page. It is also the one component whose whole purpose is to behave
 * correctly when everything else has not.
 */

const Boom: React.FC<{ fail?: boolean }> = ({ fail = true }) => {
  if (fail) throw new Error('detonated');
  return <p>recovered content</p>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // React logs the caught error; the boundary logs its own. Neither is a
    // test failure, and both would otherwise drown the output.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders its children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>all good</p>
      </ErrorBoundary>
    );
    expect(screen.getByText('all good')).toBeInTheDocument();
  });

  it('shows a recovery screen instead of unmounting the tree', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it('reassures the user that their saved collection survives', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText(/saved specimen collection/i)).toBeInTheDocument();
    expect(screen.getByText(/has not been\s+affected|has not been affected/i)).toBeInTheDocument();
  });

  it('includes the error message and the area in the copyable report', () => {
    render(
      <ErrorBoundary area="test surface">
        <Boom />
      </ErrorBoundary>
    );
    const report = screen.getByText(/RockMin ID error report/);
    expect(report.textContent).toContain('detonated');
    expect(report.textContent).toContain('test surface');
  });

  it('offers a way to retry, reload and report', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /report it/i })).toBeInTheDocument();
  });

  it('recovers when Try again is pressed and the cause has gone', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <Boom fail />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();

    rerender(
      <ErrorBoundary>
        <Boom fail={false} />
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('recovered content')).toBeInTheDocument();
  });

  it('sends no telemetry anywhere', () => {
    // The app collects no analytics and a stack can contain the user's own
    // sample data, so the boundary must not phone home.
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
