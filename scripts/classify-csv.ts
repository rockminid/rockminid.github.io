/**
 * Classifies a CSV file of any size with the same engine as the web app.
 *
 *   npx vite-node scripts/classify-csv.ts -- input.csv output.csv
 *
 * The browser's Batch Processor stops at BATCH_LIMIT rows to keep the page
 * responsive; this script has no limit. Headers are matched exactly as in
 * the app, and the output has the columns of the app's comprehensive export.
 */

import fs from 'node:fs';
import path from 'node:path';
import { exportBatchComprehensiveCSV, parseCSV, processBatchCSV } from '../src/utils/csv';
import { __setGeorocLibraryForTests, toMineralReference, toRockReference } from '../src/data/georocReference';

const [input, output] = process.argv.slice(2).filter((a) => a !== '--');
if (!input || !output) {
  console.error('Usage: npx vite-node scripts/classify-csv.ts -- input.csv output.csv');
  process.exit(1);
}

// The app fetches the GEOROC library over HTTP; here it is read from disk.
const lib = (f: string) =>
  JSON.parse(fs.readFileSync(path.resolve(__dirname, '../public/data', f), 'utf8')).entries;
__setGeorocLibraryForTests(lib('georoc-rocks.json').map(toRockReference), lib('georoc-minerals.json').map(toMineralReference));

const { rows } = parseCSV(fs.readFileSync(input, 'utf8'));
const t0 = performance.now();
const results = processBatchCSV(rows, Infinity);
const s = (performance.now() - t0) / 1000;
fs.writeFileSync(output, exportBatchComprehensiveCSV(results));
console.log(`${results.length} analyses classified in ${s.toFixed(1)} s -> ${output}`);
