# RockMin ID

**Geochemical classifier and petrological analysis platform.** Identifies rocks and
minerals from major-element compositions, computes a full CIPW norm, and plots
samples on TAS, AFM, QAPF, pyroxene, feldspar and ultramafic diagrams.

Everything runs in the browser. It installs as a PWA and works offline.

---

## What it does

| Feature | Notes |
| --- | --- |
| **Single-sample analyzer** | Oxide or element input, live classification, candidate ranking, petrogenetic indices |
| **Batch processor** | CSV in, classified CSV out, for hundreds of analyses at a time |
| **TAS diagram** | Le Bas et al. (1986) volcanic fields, Middlemost (1994) plutonic equivalents |
| **Ternary diagrams** | AFM (igneous and metamorphic), QAPF and APF (plutonic and volcanic), pyroxene quadrilateral, feldspar, ultramafic, basalt tetrahedron |
| **CIPW norm** | Full normative mineralogy with mass-balance and silica-closure diagnostics |
| **Reference dataset explorer** | Rock and mineral reference compositions with external database cross-links |
| **Specimen collection** | Saved locally; synced to the cloud when signed in |
| **Google sign-in** | Optional — see [Cloud features](#cloud-features-optional) |
| **Feedback** | In-app submission, stored locally and mirrored to Firestore when configured |
| **Export** | CSV, diagram images, and a generated PDF user manual |
| **AI interpretation** | Optional narrative petrogenesis; falls back to a deterministic rule engine |

### The AI never classifies anything

All identification, TAS assignment, normative mineralogy and index calculation is
done by deterministic, unit-tested code. The optional Gemini integration only
writes prose *about* results that have already been computed. If no AI backend is
configured, a rule-based summary is generated locally instead — so the feature
works offline and on a static host.

---

## Quick start

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

Other commands:

```bash
npm test          # run the geochemical engine test suite
npm run lint      # typecheck
npm run build     # production build into dist/
npm run preview   # serve the production build locally
npm run verify    # lint + test + build, the full gate
```

---

## Deploying to GitHub Pages

The workflow in `.github/workflows/deploy.yml` builds, typechecks, tests and
deploys on every push to `main`.

1. Push this repository to GitHub.
2. In **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Push to `main`.

For a **project page** (`https://<user>.github.io/<repo>/`) the base path is
derived from the repository name automatically. For a **user page** or a custom
domain, set the repository variable `VITE_BASE_PATH` to `/`.

The workflow also writes `404.html` and `.nojekyll`, which GitHub Pages needs for
a single-page app to handle deep links correctly.

---

## Cloud features (optional)

Sign-in, cloud sync and cloud feedback need your own Firebase project. Without
one the app runs in **local-only mode**: every calculation, diagram, batch run,
export and the local specimen collection work exactly as normal.

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. Enable **Authentication → Google** and **Firestore**.
3. Deploy the rules in `firestore.rules` to that project.
4. Add the web app config as repository secrets (`VITE_FIREBASE_API_KEY` and the
   rest — see `.env.example`), or put them in `.env.local` for local development.
5. Restrict the API key to your domains in the Google Cloud console.

Firebase web API keys are public by design; they are visible in any client
bundle. Security comes from Firestore rules and key restrictions, not secrecy.

### AI interpretation backend

To enable Gemini-written interpretation, deploy `server.ts` somewhere that can
hold a secret (Cloud Run, Render, Fly.io), set `GEMINI_API_KEY` there, and point
`VITE_API_BASE_URL` at it. Never put a Gemini key in a `VITE_*` variable — those
are inlined into the browser bundle.

---

## Android app

```bash
npm run build:apk
```

This builds the web assets and syncs them into a Capacitor Android project.
See [MOBILE_BUILD_GUIDE.md](MOBILE_BUILD_GUIDE.md) for signing and Play Store
submission. Regenerate the SHA-256 fingerprint in
`public/.well-known/assetlinks.json` from your actual release keystore before
publishing, or Android App Links will silently fail.

---

## Scientific basis

| Calculation | Reference |
| --- | --- |
| TAS volcanic classification | Le Bas, Le Maitre, Streckeisen & Zanettin (1986), *J. Petrol.* 27, 745–750 |
| TAS plutonic equivalents | Middlemost (1994), *Earth-Sci. Rev.* 37, 215–224 |
| Alkaline / subalkaline divide | Irvine & Baragar (1971), *Can. J. Earth Sci.* 8, 523–548 |
| CIPW norm | Cross, Iddings, Pirsson & Washington (1902); Kelsey (1965); Le Maitre (2002) |
| Fe³⁺/Fe²⁺ estimation | Middlemost (1989), *Chem. Geol.* 77, 19–26 |
| AFM | Wager & Deer (1939); Irvine & Baragar (1971) |
| QAPF | IUGS, Streckeisen (1976); Le Maitre (2002) |
| ASI (A/CNK) | Shand (1943); Zen (1986) |

### Similarity scores are not probabilities

Candidate matches are ranked by a weighted Euclidean distance in oxide space,
mapped to a bounded 0–100 score. That score orders candidates — nothing more.
It is not a confidence level, a probability, or a statistical significance. The
interface shows the raw distance, the number of analytes used and the gap to the
runner-up alongside it, and flags a match as ambiguous when that gap is small.

### Reference dataset

The bundled reference set is deliberately small (tens of curated rock and mineral
compositions), chosen to span the common igneous, metamorphic and sedimentary
fields. It is **not** a mirror of GEOROC. Integrating the full GEOROC archive
requires a server-side reference database — see `RockMin_Improvement steps/` in
the parent directory for the staged plan.

Bulk reference CSVs must never be committed to this repository or bundled into
the client. `.gitignore` excludes them.

---

## Testing

```bash
npm test
```

The suite anchors the geochemistry on exact stoichiometric end-members: a CIPW
norm of pure albite must return ~100% normative albite, pure anorthite must give
ASI exactly 1.00, and so on. It also asserts mass balance and silica closure for
every norm, checks published TAS field boundaries, and verifies that the AFM
series label agrees with the boundary curve actually drawn on the diagram.

---

## Citing

If RockMin ID contributes to published work, please cite the software and the
underlying reference datasets (GEOROC, EarthChem/PetDB, Mindat, RRUFF) separately.
See the **Cite** tab in the in-app documentation.

---

## License

[MIT](LICENSE) for the source code. Geochemical reference data from GEOROC,
EarthChem/PetDB, Mindat.org, RRUFF and the USGS remains subject to those
providers' terms and citation requirements.

Created by [Kishan Tiwari](https://kishangeo.github.io).
