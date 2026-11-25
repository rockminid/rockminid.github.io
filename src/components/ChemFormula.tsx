import React from 'react';

/**
 * Renders an oxide or element key as a chemical formula: digits after an
 * element symbol become subscripts (SiO2 -> SiO₂ with a real <sub>), and the
 * total-iron suffix T is set as a subscript too (FeOT -> FeO_T).
 * Keys that are not formulas (LOI) pass through unchanged.
 */
export const ChemFormula: React.FC<{ formula: string }> = ({ formula }) => {
  const total = /^(FeO|Fe2O3)T$/.exec(formula);
  const body = total ? total[1] : formula;
  const parts = body.split(/(\d+)/).filter(Boolean);
  return (
    <span aria-label={formula}>
      {parts.map((p, i) => (/^\d+$/.test(p) && i > 0 ? <sub key={i}>{p}</sub> : <React.Fragment key={i}>{p}</React.Fragment>))}
      {total && <sub>T</sub>}
    </span>
  );
};
