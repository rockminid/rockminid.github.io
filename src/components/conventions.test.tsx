import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Project conventions that are easy to violate by accident and impossible to
 * catch by typechecking.
 *
 * The similarity score ranks candidates by weighted compositional distance.
 * It is not a probability, a confidence level or a statistical significance,
 * and the manual says so explicitly. Labelling it "confidence" in the
 * interface quietly contradicts the documentation and misleads the reader
 * about what the number means — which is exactly what had happened in the
 * save-to-collection modal and in the collection CSV export.
 *
 * `confidence` survives as a deprecated field name on MatchScore for older
 * call sites, so this guards the RENDERED text rather than the identifier.
 */

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe('similarity is never presented as confidence', () => {
  const files = sourceFiles(join(process.cwd(), 'src'));

  it('finds source files to check', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('has no user-facing "confidence" label in any component', () => {
    // Matches a capitalised word in rendered text, e.g. >Match Confidence< or
    // a quoted column header, while ignoring the identifier `confidence`.
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      const lines = src.split(/\r?\n/);
      lines.forEach((line, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return; // comments explain the rule
        if (/(>[^<>{]*\bConfidence\b)|(['"]Confidence['"])/.test(line)) {
          offenders.push(`${file.replace(process.cwd(), '')}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('never renders a similarity score with a percent sign', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      const lines = src.split(/\r?\n/);
      lines.forEach((line, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
        if (/\{\s*\w*[Ss]imilarity\w*\s*\}\s*%/.test(line)) {
          offenders.push(`${file.replace(process.cwd(), '')}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});
