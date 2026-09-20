/**
 * Petrological interpretation.
 *
 * Two sources, in priority order:
 *   1. A configured backend (VITE_API_BASE_URL) that holds the Gemini key
 *      server-side. This is the right setup for a public deployment.
 *   2. A deterministic rule-based summary computed entirely in the browser.
 *
 * The rule-based path means a purely static deployment (GitHub Pages, or the
 * offline Android build) still produces an interpretation rather than a
 * connection error. No API key is ever read from or stored in the browser.
 *
 * Nothing here participates in classification. All identification, TAS
 * assignment, normative mineralogy and index calculation happens in the
 * deterministic engine; this only narrates results already computed.
 */

import { ClassificationReport } from '../types/geochem';
import { apiBaseUrl, isAiBackendConfigured } from '../lib/firebaseConfig';

export interface InterpretationResult {
  interpretation: string;
  /** Which engine produced the text. */
  source: 'gemini' | 'rule-engine';
  /** True when the deterministic fallback was used. */
  isFallback: boolean;
}

export async function generateInterpretation(
  report: ClassificationReport,
  inputMode: string
): Promise<InterpretationResult> {
  if (isAiBackendConfigured) {
    try {
      const res = await fetch(`${apiBaseUrl}/api/georoc/interpret`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sampleName: report.sampleName,
          composition: report.normalizedOxides,
          inputType: inputMode,
          identifiedRock: report.topRocks[0]
            ? {
                name: report.topRocks[0].reference.name,
                similarity: report.topRocks[0].similarity,
              }
            : null,
          identifiedMineral: report.topMinerals[0]
            ? {
                name: report.topMinerals[0].reference.name,
                similarity: report.topMinerals[0].similarity,
              }
            : null,
          tasCategory: report.tasField,
          cipwNorm: report.cipwNorm,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.success && data.interpretation) {
          return {
            interpretation: data.interpretation,
            source: 'gemini',
            isFallback: false,
          };
        }
      }
    } catch {
      // Fall through to the deterministic summary.
    }
  }

  return {
    interpretation: buildRuleBasedInterpretation(report),
    source: 'rule-engine',
    isFallback: true,
  };
}

/**
 * Deterministic petrological summary assembled from values the engine has
 * already computed. Every statement traces to a number in the report.
 */
export function buildRuleBasedInterpretation(report: ClassificationReport): string {
  const ox = report.normalizedOxides;
  const st = report.stoichiometry;
  const norm = report.cipwNorm;

  const sio2 = ox.SiO2 || 0;
  const alk = (ox.Na2O || 0) + (ox.K2O || 0);
  const lines: string[] = [];

  lines.push(`### 1. Classification summary`);
  lines.push(
    `**${report.sampleName}** contains ${sio2.toFixed(2)} wt% SiO₂ with ${alk.toFixed(2)} wt% total alkalis (anhydrous basis), placing it in the **${report.tasField}** field of the TAS diagram${report.tasCode ? ` (Le Bas field ${report.tasCode})` : ''}.`
  );
  lines.push(
    `The closest reference composition is **${report.bestOverall?.reference.name ?? 'none'}** (similarity ${report.bestOverall?.similarity ?? 0}/100 over ${report.bestOverall?.analytesUsed ?? 0} analytes${report.scoreSeparation !== undefined ? `, ${report.scoreSeparation.toFixed(0)} points clear of the runner-up` : ''}). Similarity ranks candidates; it is not a probability.`
  );
  if (report.tasWarnings?.length) {
    lines.push(`\n> ⚠ ${report.tasWarnings.join(' ')}`);
  }

  lines.push(`\n### 2. Silica and alumina saturation`);
  lines.push(
    `The norm is **${st?.silicaSaturation ?? 'undetermined'}**${
      (norm?.Q || 0) > 0
        ? ` with ${(norm?.Q as number).toFixed(1)} wt% normative quartz`
        : (norm?.Ne || 0) > 0
        ? ` with ${(norm?.Ne as number).toFixed(1)} wt% normative nepheline`
        : ''
    }, and **${st?.aluminaSaturation ?? 'undetermined'}** (ASI ${st?.asi?.toFixed(2) ?? 'n/a'}, A/NK ${st?.ank?.toFixed(2) ?? 'n/a'}).`
  );
  if ((norm?.C || 0) > 0) {
    lines.push(
      `Normative corundum (${(norm?.C as number).toFixed(1)} wt%) indicates aluminium in excess of the feldspar components, typical of S-type granites and of aluminous metasedimentary protoliths.`
    );
  }
  if ((norm?.Ac || 0) > 0) {
    lines.push(
      `Normative acmite (${(norm?.Ac as number).toFixed(1)} wt%) indicates alkalis in excess of aluminium, characteristic of peralkaline magmas (comendite / pantellerite).`
    );
  }

  lines.push(`\n### 3. Mafic character and differentiation`);
  lines.push(
    `Mg# is ${st?.mgNumber?.toFixed(1) ?? 'n/a'} and the Fe-index (FeO*/(FeO*+MgO)) is ${st?.feIndex?.toFixed(3) ?? 'n/a'}. The Thornton-Tuttle differentiation index is ${report.differentiationIndex?.toFixed(1) ?? 'n/a'}, indicating ${
      (report.differentiationIndex ?? 0) > 70
        ? 'a highly evolved, felsic composition'
        : (report.differentiationIndex ?? 0) > 35
        ? 'a moderately fractionated composition'
        : 'a primitive, weakly fractionated composition'
    }.`
  );
  if (report.normativeAn !== undefined) {
    lines.push(
      `Normative plagioclase is An${report.normativeAn.toFixed(0)}, i.e. ${plagName(report.normativeAn)}.`
    );
  }
  if ((st?.mgNumber ?? 0) > 68) {
    lines.push(
      `An Mg# above about 68 is consistent with a near-primary melt in equilibrium with mantle olivine; consider whether accumulation of olivine or pyroxene could also produce this value.`
    );
  }

  lines.push(`\n### 4. Data quality`);
  lines.push(
    `Analytical total: ${report.rawTotal.toFixed(2)} wt%. Iron basis: ${report.ironBasis ?? 'unknown'}. Normative total: ${(norm?.normSum as number)?.toFixed(2) ?? 'n/a'} wt%.`
  );
  if (report.qualityFlags?.length) {
    for (const f of report.qualityFlags) {
      lines.push(`- **${f.severity}**: ${f.message}`);
    }
  } else {
    lines.push(`- No data quality flags were raised.`);
  }

  lines.push(
    `\n*Generated by the deterministic rule engine. Configure an AI backend (VITE_API_BASE_URL) for narrative petrogenetic and tectonic modelling. Treat any AI output as a hypothesis to verify, never as a result.*`
  );

  return lines.join('\n');
}

function plagName(an: number): string {
  if (an < 10) return 'albite';
  if (an < 30) return 'oligoclase';
  if (an < 50) return 'andesine';
  if (an < 70) return 'labradorite';
  if (an < 90) return 'bytownite';
  return 'anorthite';
}
