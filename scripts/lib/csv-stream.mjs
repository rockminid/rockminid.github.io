/**
 * Streaming RFC 4180 CSV reader.
 *
 * Written as a character-level state machine rather than a line splitter
 * because GEOROC's precompiled files contain quoted fields with embedded
 * newlines (long locality strings and the bibliography block appended after
 * the data). A line-based parser silently mangles those rows: a naive split
 * rejected 3,162 of 27,161 rows in the first four rock files.
 *
 * Yields string arrays. Memory use is bounded by the longest single row.
 */

import fs from 'node:fs';

export async function* readCsvRows(filePath, { encoding = 'utf8' } = {}) {
  const stream = fs.createReadStream(filePath, { encoding, highWaterMark: 1 << 20 });

  let field = '';
  let row = [];
  let inQuotes = false;
  let quoteJustClosed = false;
  let first = true;
  // Set after a CR ends a row, so a following LF (CRLF) is swallowed rather
  // than yielding a spurious empty row.
  let skipLf = false;

  for await (const chunk of stream) {
    for (let i = 0; i < chunk.length; i++) {
      const c = chunk[i];

      if (first) {
        first = false;
        if (c === '﻿') continue; // strip BOM
      }

      if (skipLf) {
        skipLf = false;
        if (c === '\n') continue;
      }

      if (inQuotes) {
        if (c === '"') {
          inQuotes = false;
          quoteJustClosed = true;
        } else {
          field += c;
        }
        continue;
      }

      if (quoteJustClosed) {
        quoteJustClosed = false;
        if (c === '"') {
          // Escaped quote inside a quoted field.
          field += '"';
          inQuotes = true;
          continue;
        }
        // fall through and handle c normally
      }

      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field);
        field = '';
      } else if (c === '\n' || c === '\r') {
        // GEOROC's rock archive uses BARE CR line endings (classic Mac) with
        // no LF anywhere, while the mineral archive uses CRLF. Treating only
        // LF as a terminator collapsed every rock file into one giant row and
        // silently produced an empty library. Python's universal-newline
        // decoding hides this, so it only shows up in a byte-level reader.
        row.push(field);
        field = '';
        yield row;
        row = [];
        if (c === '\r') skipLf = true;
      } else {
        field += c;
      }
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    yield row;
  }
}
