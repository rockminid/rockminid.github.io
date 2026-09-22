import React from 'react';

/**
 * Top-level error boundary.
 *
 * Without one, an exception anywhere in the tree unmounts the whole
 * application and the visitor is left looking at a blank page with no
 * indication that anything went wrong, let alone what to do about it.
 *
 * The recovery offered here is deliberately specific to this application:
 * a user's specimen collection lives in local storage, so the boundary tells
 * them their saved work is intact and gives them a way to copy the technical
 * detail into a bug report rather than asking them to open a console.
 */

interface Props {
  children: React.ReactNode;
  /** Shown in the report so we can tell which surface failed. */
  area?: string;
}

interface State {
  error: Error | null;
  componentStack: string | null;
  copied: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, componentStack: null, copied: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // No telemetry is sent anywhere: this application collects no analytics,
    // and an unhandled exception can contain the user's own sample data.
    console.error('RockMin ID encountered an unrecoverable error:', error, info);
    this.setState({ componentStack: info.componentStack ?? null });
  }

  private reset = (): void => {
    this.setState({ error: null, componentStack: null, copied: false });
  };

  private report = (): string => {
    const { error, componentStack } = this.state;
    return [
      `RockMin ID error report`,
      `Version: 2.4.0`,
      `Area: ${this.props.area ?? 'application'}`,
      `Time: ${new Date().toISOString()}`,
      `User agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'}`,
      ``,
      `${error?.name ?? 'Error'}: ${error?.message ?? 'unknown'}`,
      ``,
      error?.stack ?? '(no stack)',
      ``,
      `Component stack:${componentStack ?? ' (none)'}`,
    ].join('\n');
  };

  private copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(this.report());
      this.setState({ copied: true });
      window.setTimeout(() => this.setState({ copied: false }), 2000);
    } catch {
      // Clipboard access can be denied; the detail is on screen regardless.
      this.setState({ copied: false });
    }
  };

  render(): React.ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        role="alert"
        className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center p-4"
      >
        <div className="w-full max-w-xl bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-5">
          <div className="space-y-2">
            <h1 className="text-lg font-bold text-amber-400">Something went wrong</h1>
            <p className="text-sm text-stone-300 leading-relaxed">
              RockMin ID hit an error it could not recover from. This is a bug in the
              application, not a problem with your data.
            </p>
            <p className="text-sm text-stone-400 leading-relaxed">
              Your saved specimen collection is stored in this browser and has not been
              affected. Reloading the page will not lose it.
            </p>
          </div>

          <details className="rounded-xl bg-stone-950 border border-stone-800 overflow-hidden">
            <summary className="px-4 py-2.5 text-xs font-semibold text-stone-300 cursor-pointer select-none hover:bg-stone-900 transition-colors">
              Technical detail
            </summary>
            <pre className="px-4 py-3 text-[11px] font-mono text-stone-400 whitespace-pre-wrap break-words max-h-64 overflow-y-auto border-t border-stone-800">
              {this.report()}
            </pre>
          </details>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={this.reset}
              className="px-4 py-2.5 min-h-11 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-sm transition-colors"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2.5 min-h-11 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-sm transition-colors"
            >
              Reload page
            </button>
            <button
              onClick={this.copy}
              className="px-4 py-2.5 min-h-11 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-sm transition-colors"
            >
              {this.state.copied ? 'Copied' : 'Copy error detail'}
            </button>
            <a
              href="https://github.com/rockminid/rockminid.github.io/issues/new"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 min-h-11 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-sm transition-colors inline-flex items-center"
            >
              Report it
            </a>
          </div>
        </div>
      </div>
    );
  }
}
