# RockMin ID

**Classify igneous rocks and identify minerals from major-element data, in your browser.**

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.22875578.svg)](https://doi.org/10.5281/zenodo.22875578)

**Open the app: <https://rockminid.github.io>**

RockMin ID names igneous rocks with the IUGS total alkali-silica (TAS) scheme,
computes the CIPW norm, separates magma series with the Irvine-Baragar criteria,
plots samples on eleven ternary diagrams and identifies minerals from their
structural formula. Nothing needs to be installed, and once the page has loaded
it also works offline.

---

## Features

| | |
| --- | --- |
| **Single-sample analyzer** | Enter oxides or elements (wt%), or load a benchmark sample; results update as you type |
| **IUGS rock names** | TAS root name refined to the sub-root name (alkali/subalkali basalt, basanite/tephrite, hawaiite, trachyte/trachydacite, comendite/pantellerite), plus the low-, medium- and high-K series |
| **CIPW and cation norms** | 23 normative phases, mass-conserving, with the unrescaled normative total and differentiation index |
| **Mineral identification** | Structural formula on the correct oxygen basis, end-member proportions (Fo, An-Ab-Or, Wo-En-Fs, Cr#) |
| **Diagrams** | TAS; AFM (igneous and metamorphic), ACF, QAPF and APF (plutonic and volcanic), pyroxene quadrilateral, feldspar, ultramafic and basalt tetrahedron. Plot your own data alone and export figures (PNG, JPEG, SVG) |
| **Batch processing** | Upload a CSV of up to 1,000 analyses and download the classified results |
| **Data-quality checks** | Flags for low or high totals, iron reporting, sparse analyses, loss on ignition and ambiguous matches |
| **Reference library** | 91 curated rock and mineral compositions and 143 GEOROC distributions built from 1,220,607 analyses |
| **Saved samples** | Kept in your browser; synced across devices if you sign in with Google (optional) |
| **User manual** | Full documentation of every formula and reference, downloadable as PDF from the app |

Every classification is made by deterministic, tested code. Match scores rank
candidates and are **not probabilities**; each is shown with its distance, the
number of oxides used and its lead over the next candidate.

---

## Install as an app

RockMin ID is a Progressive Web App, installed straight from the browser:

- **Android** (Chrome, Edge, Samsung Internet): menu (⋮) → *Install app*
- **iPhone / iPad** (Safari): Share → *Add to Home Screen*
- **Desktop** (Chrome, Edge): the install icon in the address bar

---

## Privacy

All calculations run on your own device; compositions are not sent to a server.
Data leaves your device only if you sign in to sync saved samples or send
feedback. Page visits are counted with GoatCounter, which sets no cookies and
never receives sample data. See the Privacy Policy in the app for details.

---

## Scientific basis

| Calculation | Reference |
| --- | --- |
| TAS classification | Le Bas et al. (1986), *J. Petrol.* 27, 745–750; Le Maitre (2002) |
| TAS sub-root names, K-series | Le Maitre (2002), *Igneous Rocks*, 2nd edn |
| Plutonic TAS equivalents | Middlemost (1994), *Earth-Sci. Rev.* 37, 215–224 |
| Alkaline/subalkaline, tholeiitic/calc-alkaline | Irvine & Baragar (1971), *Can. J. Earth Sci.* 8, 523–548 |
| CIPW norm | Cross et al. (1902); Kelsey (1965); Le Maitre (2002) |
| Fe₂O₃/FeO estimation | Middlemost (1989), *Chem. Geol.* 77, 19–26 |
| QAPF | Streckeisen (1976), *Earth-Sci. Rev.* 12, 1–33 |
| ACF | Eskola (1915); Winter (2010) |
| Fe³⁺ in oxides by charge balance | Droop (1987), *Mineral. Mag.* 51, 431–435 |
| Reference distributions | GEOROC (DIGIS, University of Göttingen) |

The engine is covered by 345 automated tests anchored on exact stoichiometry
and the published classification boundaries. Its mineral identification and
whole-rock results have been checked against withheld natural GEOROC analyses
and against the independent package pyrolite.

---

## Running locally and reproducing results

Requires Node.js 20 or newer.

```bash
npm install
npm run dev        # start the app at http://localhost:3000
npm test           # run the test suite
```

Larger CSV files can be classified without the 1,000-row limit:

```bash
npx vite-node scripts/classify-csv.ts -- input.csv output.csv
```

The scripts used to validate the software on natural analyses are in
[`scripts/`](scripts): `benchmark-georoc.ts` (mineral identification on
withheld GEOROC analyses) and `compare-pyrolite.py` (comparison with pyrolite).

---

## Citing

> Tiwari, K. (2026). *RockMin ID: Automated Geochemical Classifier and
> Petrological Analysis Platform* (Version 2.5.2) [Computer software]. Zenodo.
> <https://doi.org/10.5281/zenodo.22875578>

This concept DOI always points to the latest release. To cite the exact version
you used, take its version DOI from the
[Zenodo record](https://zenodo.org/doi/10.5281/zenodo.22875578). GitHub's
"Cite this repository" button reads [`CITATION.cff`](CITATION.cff).

Please also cite GEOROC and the original publications of any analyses you use.

---

## License

[MIT](LICENSE). Reference data from GEOROC, EarthChem/PetDB, Mindat, RRUFF and
the USGS remain subject to their providers' terms.

Created by Kishan Tiwari, Indian Institute of Technology Kharagpur.
