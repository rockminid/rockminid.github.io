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
 * include whatever `VITE_API_BASE_URL` points at, and the Firebase auth
 * domain of the project the build is configured for. Hard-coding them would
 * mean that configuring a backend silently broke every request to it.
 */

/** GoatCounter: count.js is loaded from gc.zgo.at and reports page views
 * (path, referrer, screen size; no cookies, no sample data) to this site's
 * counter. */
const GOATCOUNTER_SCRIPT = 'https://gc.zgo.at';
const GOATCOUNTER_ENDPOINT = 'https://rockminid.goatcounter.com';

/**
 * The Google endpoints Firebase Auth and Firestore actually call. Listed by
 * host rather than as *.googleapis.com, so a script cannot send data to an
 * arbitrary Google API. The app uses no Realtime Database and no Cloud
 * Functions, so neither *.firebaseio.com nor *.cloudfunctions.net is allowed.
 */
const FIREBASE_CONNECT = [
  'https://firestore.googleapis.com',
  'https://identitytoolkit.googleapis.com',
  'https://securetoken.googleapis.com',
  'https://www.googleapis.com',
];

/** "https://<host>" for a bare host or URL, or undefined if malformed. */
function origin(value) {
  if (!value) return undefined;
  try {
    return new URL(value.includes('://') ? value : `https://${value}`).origin;
  } catch {
    // A malformed value is the developer's problem to fix; it must not
    // silently widen the policy.
    return undefined;
  }
}

/**
 * Builds the policy string.
 *
 * @param {object} opts
 * @param {string} [opts.apiBaseUrl] Absolute origin of the interpretation API.
 * @param {string} [opts.firebaseAuthDomain] The project's auth domain, e.g. myapp.firebaseapp.com.
 * @returns {string}
 */
export function buildCsp({ apiBaseUrl, firebaseAuthDomain } = {}) {
  const authOrigin = origin(firebaseAuthDomain);
  const connect = new Set(["'self'", ...FIREBASE_CONNECT, GOATCOUNTER_ENDPOINT]);
  const api = origin(apiBaseUrl);
  if (api) connect.add(api);
  if (authOrigin) connect.add(authOrigin);

  // Sign-in frames and popups live on the project's own auth domain.
  const frames = ["'self'", ...(authOrigin ? [authOrigin] : []), 'https://accounts.google.com'].join(' ');

  return [
    "default-src 'self'",
    // No inline scripts are emitted: index.html references the entry module
    // and the GoatCounter script by src, and the JSON-LD block is not executable.
    `script-src 'self' ${GOATCOUNTER_SCRIPT}`,
    // Stylesheets come only from the app. React writes inline style
    // ATTRIBUTES for diagram geometry, which style-src-attr governs; no
    // inline <style> block is ever emitted, so none is allowed.
    "style-src 'self'",
    "style-src-attr 'unsafe-inline'",
    // data: and blob: cover generated diagram exports and jsPDF output;
    // googleusercontent.com covers a signed-in user's avatar. GoatCounter
    // falls back to an image request when sendBeacon is unavailable.
    `img-src 'self' data: blob: https://*.googleusercontent.com ${GOATCOUNTER_ENDPOINT}`,
    "font-src 'self' data:",
    `connect-src ${[...connect].join(' ')}`,
    `frame-src ${frames}`,
    `child-src ${frames}`,
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
 * position matters. Returning a tag with injectTo 'head-prepend' lets Vite
 * place it, rather than matching "<head>" with a regex that would miss a
 * head element carrying attributes.
 *
 * @param {{ apiBaseUrl?: string, firebaseAuthDomain?: string }} opts
 */
export function cspPlugin(opts = {}) {
  const csp = buildCsp(opts);
  return {
    name: 'rockmin-csp',
    transformIndexHtml() {
      return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: csp }, injectTo: 'head-prepend' }];
    },
  };
}
