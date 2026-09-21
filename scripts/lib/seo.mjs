/**
 * Sitemap and robots.txt generation.
 *
 * RockMin ID is a single-page application: the tabs (Analyzer, Batch, TAS,
 * Ternary, Dataset, Collection) are React state, not routes, so the whole app
 * lives at exactly one URL. The sitemap therefore has ONE entry.
 *
 * That is deliberate. Listing `/tas`, `/batch` and so on would be worse than
 * useless: those paths do not exist, so the SPA fallback would serve the same
 * document for each, which search engines read as duplicate content. If real
 * routing is added later, extend `SITE_PAGES` and the sitemap grows with it.
 *
 * `lastmod` is stamped at build time rather than hand-written, so it cannot
 * go stale the way a committed date does.
 */

/** Pages that have their own URL. One, until the app gains real routing. */
export const SITE_PAGES = [
  {
    path: '/',
    changefreq: 'monthly',
    priority: '1.0',
    // Not emitted; kept so the list documents itself.
    title: 'RockMin ID — geochemical classifier and petrological analysis',
  },
];

/** Normalizes a site URL to an origin with no trailing slash. */
export function normalizeSiteUrl(url) {
  const trimmed = String(url || '').trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error(`Site URL must be absolute and include a scheme: ${url}`);
  }
  return trimmed;
}

function xmlEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Builds a sitemap.
 *
 * @param {object}  opts
 * @param {string}  opts.siteUrl  Absolute origin, e.g. https://rockminid.github.io
 * @param {string} [opts.lastmod] ISO date (YYYY-MM-DD). Defaults to today, UTC.
 * @param {Array}  [opts.pages]   Defaults to SITE_PAGES.
 */
export function buildSitemap({ siteUrl, lastmod, pages = SITE_PAGES } = {}) {
  const origin = normalizeSiteUrl(siteUrl);
  const date = lastmod || new Date().toISOString().slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`lastmod must be a YYYY-MM-DD date, got: ${date}`);
  }

  const entries = pages
    .map((p) => {
      const loc = `${origin}${p.path.startsWith('/') ? p.path : `/${p.path}`}`;
      return [
        '  <url>',
        `    <loc>${xmlEscape(loc)}</loc>`,
        `    <lastmod>${date}</lastmod>`,
        `    <changefreq>${p.changefreq}</changefreq>`,
        `    <priority>${p.priority}</priority>`,
        '  </url>',
      ].join('\n');
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}

/**
 * Builds robots.txt.
 *
 * Everything is crawlable. The one exclusion is `/data/`, the GEOROC
 * reference library: it is several hundred kB of JSON that the app fetches at
 * runtime, has no value as a search result, and would otherwise be indexed as
 * a wall of numbers. It is still fully public and fetchable — `Disallow` is a
 * crawling hint, not access control.
 */
export function buildRobots({ siteUrl } = {}) {
  const origin = normalizeSiteUrl(siteUrl);
  return [
    '# RockMin ID — https://github.com/rockminid/rockminid.github.io',
    '',
    'User-agent: *',
    'Allow: /',
    '',
    '# Runtime data, not content. Fetched by the app, useless as a search result.',
    'Disallow: /data/',
    '',
    '# Build output that carries no independent content.',
    'Disallow: /sw.js',
    'Disallow: /registerSW.js',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
}

/**
 * Vite plugin: emits sitemap.xml and robots.txt into the build output.
 *
 * Generated at build time rather than committed so `lastmod` is always the
 * date of the deploy that produced it.
 */
export function seoPlugin({ siteUrl }) {
  return {
    name: 'rockmin-seo',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: buildSitemap({ siteUrl }),
      });
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: buildRobots({ siteUrl }),
      });
    },
  };
}
