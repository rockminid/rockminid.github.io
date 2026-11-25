import { describe, expect, it } from 'vitest';
import { buildCsp } from './csp.mjs';

const directive = (csp: string, name: string) =>
  csp.split('; ').find((d) => d.startsWith(`${name} `)) ?? '';

describe('Content-Security-Policy', () => {
  it('allows only the named Google endpoints, not *.googleapis.com', () => {
    const csp = buildCsp();
    const connect = directive(csp, 'connect-src');
    expect(connect).toContain('https://firestore.googleapis.com');
    expect(connect).not.toMatch(/\*\.googleapis|firebaseio|cloudfunctions|\*\.firebaseapp/);
  });

  it('pins frames and connections to the configured auth domain', () => {
    const csp = buildCsp({ firebaseAuthDomain: 'rockmin.firebaseapp.com' });
    expect(directive(csp, 'connect-src')).toContain('https://rockmin.firebaseapp.com');
    expect(directive(csp, 'frame-src')).toBe("frame-src 'self' https://rockmin.firebaseapp.com https://accounts.google.com");
  });

  it('blocks inline <style> blocks but allows style attributes', () => {
    const csp = buildCsp();
    expect(directive(csp, 'style-src')).toBe("style-src 'self'");
    expect(directive(csp, 'style-src-attr')).toBe("style-src-attr 'unsafe-inline'");
  });

  it('ignores a malformed backend URL instead of widening the policy', () => {
    expect(directive(buildCsp({ apiBaseUrl: 'http://[bad' }), 'connect-src')).not.toContain('[bad');
  });
});
