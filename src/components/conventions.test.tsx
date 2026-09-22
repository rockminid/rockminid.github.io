import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

/**
 * Project conventions that are easy to violate by accident and impossible to
 * catch by typechecking.
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

/** Lines that only explain a rule must not be caught by it. */
function isComment(line: string): boolean {
  return /^\s*(\/\/|\*|\/\*)/.test(line);
}

const SRC = join(process.cwd(), 'src');

describe('similarity is never presented as confidence', () => {
  /**
   * The similarity score ranks candidates by weighted compositional distance.
   * It is not a probability, a confidence level or a statistical significance,
   * and the manual says so explicitly. Labelling it "confidence" quietly
   * contradicts the documentation and misleads the reader about what the
   * number means — which had happened in the save-to-collection modal and in
   * the collection CSV export.
   *
   * `confidence` survives as a deprecated field on MatchScore for older call
   * sites, so this guards RENDERED text rather than the identifier.
   */
  const files = sourceFiles(SRC);

  it('finds source files to check', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('has no user-facing "Confidence" label in any component', () => {
    const offenders: string[] = [];
    for (const file of files) {
      readFileSync(file, 'utf8')
        .split(/\r?\n/)
        .forEach((line, i) => {
          if (isComment(line)) return;
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
      readFileSync(file, 'utf8')
        .split(/\r?\n/)
        .forEach((line, i) => {
          if (isComment(line)) return;
          if (/\{\s*\w*[Ss]imilarity\w*\s*\}\s*%/.test(line)) {
            offenders.push(`${file.replace(process.cwd(), '')}:${i + 1}: ${line.trim()}`);
          }
        });
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});

describe('version is single-sourced', () => {
  /**
   * The version used to be written by hand in eight files and drifted:
   * package.json said 2.0.0 while every user-visible surface said 2.4.0.
   * package.json is now the only place it is written; everything in src/
   * reads APP_VERSION, and Vite stamps it into index.html at build time.
   */
  const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
    version: string;
  };

  it('matches the version declared in CITATION.cff', () => {
    const cff = readFileSync(join(process.cwd(), 'CITATION.cff'), 'utf8');
    const declared = /^version:\s*(\S+)\s*$/m.exec(cff)?.[1];
    expect(declared).toBe(pkg.version);
  });

  it('is not typed out anywhere in src/', () => {
    // Looks for the current version string specifically, rather than for
    // anything shaped like a semver: mineral Dana codes ("71.02.01.01") and
    // literature references ("Le Maitre s.2.12.2") are not version numbers.
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      if (file.endsWith(`${sep}version.ts`)) continue; // the source of truth
      readFileSync(file, 'utf8')
        .split(/\r?\n/)
        .forEach((line, i) => {
          if (isComment(line)) return;
          if (line.includes(pkg.version)) {
            offenders.push(`${file.replace(process.cwd(), '')}:${i + 1}: ${line.trim()}`);
          }
        });
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});
