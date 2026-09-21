import { describe, expect, it } from 'vitest';
// Plain .mjs build helper; Vite/TS resolve it without declarations.
import { buildSitemap, buildRobots, normalizeSiteUrl, SITE_PAGES } from '../../scripts/lib/seo.mjs';

const SITE = 'https://rockminid.github.io';

describe('sitemap', () => {
  it('declares the sitemaps.org namespace and is well-formed XML', () => {
    const xml: string = buildSitemap({ siteUrl: SITE, lastmod: '2026-09-21' });
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    // Every opened tag is closed.
    for (const tag of ['urlset', 'url', 'loc', 'lastmod', 'changefreq', 'priority']) {
      const open = (xml.match(new RegExp(`<${tag}[ >]`, 'g')) || []).length;
      const close = (xml.match(new RegExp(`</${tag}>`, 'g')) || []).length;
      expect(open, `<${tag}>`).toBe(close);
    }
  });

  it('lists exactly the pages that have their own URL', () => {
    // The app is a single-page application: the tabs are React state, not
    // routes. Listing /tas, /batch etc. would point at paths that do not
    // exist, and the SPA fallback would serve the same document for each,
    // which reads as duplicate content. If real routing is ever added,
    // extend SITE_PAGES and this expectation with it.
    const xml: string = buildSitemap({ siteUrl: SITE, lastmod: '2026-09-21' });
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toEqual([`${SITE}/`]);
    expect(SITE_PAGES).toHaveLength(1);
  });

  it('uses absolute URLs on the configured origin', () => {
    const xml: string = buildSitemap({ siteUrl: 'https://example.org/', lastmod: '2026-01-02' });
    expect(xml).toContain('<loc>https://example.org/</loc>');
    expect(xml).not.toContain('//https');
  });

  it('stamps lastmod, defaulting to today', () => {
    expect(buildSitemap({ siteUrl: SITE, lastmod: '2026-09-21' })).toContain(
      '<lastmod>2026-09-21</lastmod>'
    );
    const today = new Date().toISOString().slice(0, 10);
    expect(buildSitemap({ siteUrl: SITE })).toContain(`<lastmod>${today}</lastmod>`);
  });

  it('rejects a malformed lastmod', () => {
    expect(() => buildSitemap({ siteUrl: SITE, lastmod: '21-09-2026' })).toThrow(/YYYY-MM-DD/);
  });

  it('escapes XML metacharacters in a URL', () => {
    const xml: string = buildSitemap({
      siteUrl: SITE,
      lastmod: '2026-09-21',
      pages: [{ path: '/a&b', changefreq: 'monthly', priority: '0.5' }],
    });
    expect(xml).toContain('&amp;');
    expect(xml).not.toMatch(/<loc>[^<]*&(?!amp;|lt;|gt;|quot;|apos;)/);
  });

  it('gives every entry a valid priority and changefreq', () => {
    const xml: string = buildSitemap({ siteUrl: SITE, lastmod: '2026-09-21' });
    for (const p of [...xml.matchAll(/<priority>([^<]+)<\/priority>/g)].map((m) => Number(m[1]))) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
    const valid = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];
    for (const c of [...xml.matchAll(/<changefreq>([^<]+)<\/changefreq>/g)].map((m) => m[1])) {
      expect(valid).toContain(c);
    }
  });
});

describe('robots.txt', () => {
  const txt: string = buildRobots({ siteUrl: SITE });

  it('allows crawling of the app', () => {
    expect(txt).toContain('User-agent: *');
    expect(txt).toContain('Allow: /');
  });

  it('points at the sitemap with an absolute URL', () => {
    expect(txt).toContain(`Sitemap: ${SITE}/sitemap.xml`);
  });

  it('keeps the runtime data directory out of the index', () => {
    // Several hundred kB of reference JSON; still public, just not content.
    expect(txt).toContain('Disallow: /data/');
  });

  it('does not disallow the site root', () => {
    expect(txt).not.toMatch(/^Disallow:\s*\/\s*$/m);
  });

  it('ends with a newline', () => {
    expect(txt.endsWith('\n')).toBe(true);
  });
});

describe('site URL handling', () => {
  it('strips trailing slashes', () => {
    expect(normalizeSiteUrl('https://example.org///')).toBe('https://example.org');
  });

  it('requires an absolute URL with a scheme', () => {
    expect(() => normalizeSiteUrl('rockminid.github.io')).toThrow(/absolute/);
    expect(() => normalizeSiteUrl('')).toThrow(/absolute/);
  });
});
