/**
 * Content-Security-Policy, injected as a meta tag at build time.
 *
 * GitHub Pages serves static files and cannot set response headers, so a
 * `<meta http-equiv>` policy is the only mechanism available. It is weaker
 * than a real header — `frame-ancestors`, `report-uri` and `sandbox` are
 * ignored in meta form — but it still constrains script, connect and object
 * sources, which is where the meaningful risk sits for this application.
 *
 * The policy is generated rather than hard-coded because `connect-src` has to
 * include whatever `VITE_API_BASE_URL` points at. Hard-coding it would mean
 * that configuring an AI backend silently broke every request to it, which is
 * exactly the kind of failure a CSP is notorious for.
 */

/** Origins Firebase Auth and Firestore talk to. */
const FIREBASE_CONNECT = [
  'https://*.googleapis.com',
  'https://*.firebaseio.com',
  'wss://*.firebaseio.com',
  'https://*.firebaseapp.com',
  'https://*.cloudfunctions.net',
];

/**
 * Builds the policy string.
 *
 * @param {object} opts
 * @param {string} [opts.apiBaseUrl] Absolute origin of the interpretation API.
 * @returns {string}
 */
export function buildCsp({ apiBaseUrl } = {}) {
  const connect = new Set(["'self'", ...FIREBASE_CONNECT]);

  if (apiBaseUrl) {
    try {
      connect.add(new URL(apiBaseUrl).origin);
    } catch {
      // A malformed VITE_API_BASE_URL is the developer's problem to fix; it
      // must not silently widen the policy.
    }
  }

  return [
    "default-src 'self'",
    // No inline scripts are emitted: index.html references the entry module
    // by src, and the JSON-LD block is not executable.
    "script-src 'self'",
    // Tailwind ships a stylesheet, but React writes inline style attributes
    // for diagram geometry, which style-src-attr governs.
    "style-src 'self' 'unsafe-inline'",
    // data: and blob: cover generated diagram exports and jsPDF output;
    // googleusercontent.com covers a signed-in user's avatar.
    "img-src 'self' data: blob: https://*.googleusercontent.com",
    "font-src 'self' data:",
    `connect-src ${[...connect].join(' ')}`,
    // Firebase Auth uses an iframe on the authDomain for some flows.
    "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com",
    // Sign-in opens a popup on the authDomain.
    "child-src 'self' https://*.firebaseapp.com https://accounts.google.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "manifest-src 'self'",
    'upgrade-insecure-requests',
  ].join('; ');
}

/**
 * Vite plugin: inserts the CSP meta tag as the first element of <head>.
 *
 * A meta CSP only governs content that appears AFTER it in the document, so
 * position matters.
 *
 * @param {{ apiBaseUrl?: string }} opts
 */
export function cspPlugin(opts = {}) {
  const csp = buildCsp(opts);
  return {
    name: 'rockmin-csp',
    transformIndexHtml(html) {
      return html.replace(
        /<head>/i,
        `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`
      );
    },
  };
}
