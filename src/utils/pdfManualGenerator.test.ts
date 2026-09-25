import { describe, expect, it } from 'vitest';
import { pdfSafe, generateRockMinManualPDF } from './pdfManualGenerator';

/**
 * The PDF manual is drawn with jsPDF's built-in Helvetica, which can only
 * encode WinAnsi characters. Text outside that set used to print as garbage
 * and be measured wrongly, so wrapped lines ran past the margin and, in the
 * glossary, off the page entirely.
 */
describe('pdfSafe', () => {
  it('turns Unicode subscripts into plain digits', () => {
    expect(pdfSafe('Al₂O₃ and P₂O₅')).toBe('Al2O3 and P2O5');
  });

  it('spells out symbols Helvetica cannot encode', () => {
    // The middle dot is itself WinAnsi, so it is kept.
    expect(pdfSafe('CaO − 1.67·P2O5, A ≥ 8, Ne′')).toBe("CaO - 1.67·P2O5, A >= 8, Ne'");
  });

  it('keeps characters that WinAnsi does encode', () => {
    const s = 'Göttingen – 10–90% • “quoted” × ±2 °C µm';
    expect(pdfSafe(s)).toBe(s);
  });

  it('strips accents that fall outside WinAnsi rather than corrupting the line', () => {
    expect(pdfSafe('Kīlauea')).toBe('Kilauea');
  });

  it('never emits a character outside WinAnsi', () => {
    const out = pdfSafe('Σ ∑ α β γ → ← ≈ ≠ ⁺ ⁻ ₀₁₂₃₄₅₆₇₈₉ 漢');
    for (const ch of out) {
      const c = ch.codePointAt(0)!;
      expect(c < 0x100 || '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ'.includes(ch)).toBe(true);
    }
  });
});

describe('manual layout', () => {
  it('never breaks a line in the middle of a word', async () => {
    // Hook jsPDF's line wrapping and record any break that falls inside a
    // word: a column too narrow for its content splits "10" into "1 / 0".
    const mod = await import('jspdf');
    const api = (mod.jsPDF as unknown as { API: Record<string, unknown> }).API;
    const origSplit = api.splitTextToSize as (this: unknown, t: string, w: number, o?: unknown) => string[];
    const origSave = api.save;
    const breaks: string[] = [];
    api.splitTextToSize = function (this: unknown, text: string, width: number, opts?: unknown) {
      const lines = origSplit.call(this, text, width, opts);
      const flat = String(text).replace(/\s+/g, ' ');
      for (let i = 0; i + 1 < lines.length; i++) {
        const a = lines[i].trimEnd();
        const b = lines[i + 1].trimStart();
        if (a && b && /\w$/.test(a) && /^\w/.test(b) && flat.includes(a + b) && !flat.includes(`${a} ${b}`)) {
          breaks.push(`${a.slice(-20)} / ${b.slice(0, 20)}`);
        }
      }
      return lines;
    };
    // In Node, jsPDF's save() writes the file to disk; keep the repo clean.
    api.save = function (this: unknown) {
      return this;
    };
    try {
      await generateRockMinManualPDF();
    } finally {
      api.splitTextToSize = origSplit;
      api.save = origSave;
    }
    expect(breaks, breaks.join('\n')).toEqual([]);
  }, 60_000);
});
