import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { seoPlugin } from './scripts/lib/seo.mjs';
import { cspPlugin } from './scripts/lib/csp.mjs';
import pkg from './package.json' with { type: 'json' };

/**
 * BASE_PATH controls where the app is served from.
 *
 *   GitHub Pages project site : '/rockmin-id/'   (set via VITE_BASE_PATH)
 *   User/org site or a custom domain : '/'
 *   Capacitor Android build   : './'             (relative, required)
 *
 * The manifest, service worker scope and asset URLs are all derived from it,
 * so a project-page deployment no longer 404s on its own icons.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_BASE_PATH || '/';
  const isCapacitor = env.VITE_BUILD_TARGET === 'capacitor';
  // Absolute origin, used for the canonical link, sitemap and robots.txt.
  const siteUrl = (env.VITE_SITE_URL || 'https://rockminid.github.io').replace(/\/+$/, '');
  const resolvedBase = isCapacitor ? './' : base;

  return {
    base: resolvedBase,
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    plugins: [
      react(),
      tailwindcss(),
      // Emits sitemap.xml and robots.txt into the build, with lastmod
      // stamped at build time so it cannot go stale.
      ...(isCapacitor ? [] : [seoPlugin({ siteUrl })]),
      // Content-Security-Policy as a meta tag: GitHub Pages cannot set
      // response headers. connect-src is widened to the interpretation API
      // when one is configured, so enabling a backend does not silently
      // break every request to it.
      cspPlugin({ apiBaseUrl: env.VITE_API_BASE_URL }),
      // The version lives in package.json and nowhere else. This stamps it
      // into the JSON-LD block in index.html; `define` below stamps it into
      // the bundle. Previously it was typed out in eight files and drifted.
      {
        name: 'rockmin-version-html',
        transformIndexHtml(html: string) {
          return html.replace(/"softwareVersion":\s*"[^"]*"/, `"softwareVersion": "${pkg.version}"`);
        },
      },
      VitePWA({
        registerType: 'autoUpdate',
        // A relative manifest/scope keeps the PWA valid under a subpath.
        includeAssets: [
          'favicon.ico',
          'apple-touch-icon.png',
          'icon.svg',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
          'og-image.png',
          'logo-wordmark.png',
        ],
        manifest: {
          id: resolvedBase,
          name: 'RockMin ID - Geochemical & Mineral Classifier',
          short_name: 'RockMin ID',
          description:
            'Geochemical classifier and petrological analysis platform: TAS, AFM, QAPF, ternary projections, CIPW norm and mineral identification.',
          theme_color: '#1c1917',
          background_color: '#0c0a09',
          display: 'standalone',
          orientation: 'any',
          start_url: resolvedBase,
          scope: resolvedBase,
          categories: ['education', 'utilities', 'productivity'],
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            {
              src: 'pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
            { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          // json included so the GEOROC reference library is available offline.
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,json}'],
          // Offline field use: every deterministic calculation is bundled, so
          // a cached shell is a fully working application.
          navigateFallback: `${resolvedBase}index.html`,
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        devOptions: { enabled: false },
      }),
    ],
    build: {
      // Kept modest: the manual chunking below should keep every chunk well
      // under this, so a warning now means a real regression.
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          // Split the heavy, independently-cacheable libraries out of the
          // main bundle. Previously everything shipped as one ~1.9 MB chunk.
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return undefined;
            // Only libraries that are genuinely needed on first paint are
            // named here. jsPDF/html2canvas and d3 are deliberately NOT
            // listed: naming them forced them into the entry's preload graph
            // even though they are reachable only through dynamic imports.
            // Left alone, the bundler splits them at the dynamic boundary.
            if (id.includes('firebase') || id.includes('@firebase')) return 'vendor-firebase';
            if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler'))
              return 'vendor-react';
            return undefined;
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || '.', './src'),
      },
    },
    server: {
      port: 3000,
      host: true,
    },
    preview: {
      port: 4173,
    },
  };
});
