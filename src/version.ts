/**
 * Single source of truth for the application version.
 *
 * The version used to be typed out in eight places — package.json, the
 * documentation modal, the PDF manual, the citation blocks, the error report,
 * the privacy policy and the structured data in index.html. They drifted:
 * package.json said 2.0.0 while every user-visible surface said 2.4.0.
 *
 * `__APP_VERSION__` is replaced at build time by Vite from package.json, so
 * bumping the version in one file now updates everything, including the
 * JSON-LD block in index.html.
 */

declare const __APP_VERSION__: string;

/** e.g. "2.5.0". */
export const APP_VERSION: string =
  typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0-dev';

/** Concept DOI: always resolves to the most recent release. */
export const CONCEPT_DOI = '10.5281/zenodo.22875578';

/** The citation a paper should carry. */
export const CITATION_APA =
  `Tiwari, K. (2026). RockMin ID: Automated Geochemical Classifier and Petrological ` +
  `Analysis Platform (Version ${APP_VERSION}) [Computer software]. Zenodo. ` +
  `https://doi.org/${CONCEPT_DOI}`;
