# RockMin ID — handoff

Written 2026-09-21. Everything needed to pick this up cold.

---

## 1. What this is

A geochemical classifier and petrological analysis platform. Rocks and
minerals identified from major-element compositions, full CIPW norm, TAS,
AFM, QAPF and other ternary diagrams. Runs entirely in the browser, installs
as a PWA, works offline.

It started as a Google AI Studio export. The engine has since been rewritten
against the primary literature and the reference library rebuilt from the
full GEOROC archives.

**Repo:** `rockminid/rockminid.github.io` → deploys to <https://rockminid.github.io/>
**Working directory:** `E:\PHD\Meteorites\RockMin ID\rockmin-id_Source code`

---

## 2. Current state

| | |
| --- | --- |
| Tests | **242 passing** (`npm test`) |
| Typecheck | clean (`npm run lint`) |
| Build | clean (`npm run build`) |
| Full gate | `npm run verify` |
| Commits | 10, all on `main`, nothing pushed yet |
| Entry chunk | 470 kB (was 1.88 MB) |
| Reference library | 234 references from 1,220,127 GEOROC analyses |

### Toolchain

Node was **not installed** on this machine. Node 24.21.0 LTS was installed
user-scope (portable, no admin) at:

```
C:\Users\kisha\AppData\Local\node-portable\node-v24.21.0-win-x64
```

It is on the **user PATH** permanently. If a new shell cannot find `node`,
open a fresh terminal or re-add that directory.

---

## 3. Your immediate question: what to upload to GitHub

**Do not drag and drop the folder.** Two reasons:

1. GitHub's web uploader silently skips dotfiles and dot-directories on some
   browsers. You would lose `.github/workflows/deploy.yml` (the entire
   deployment), `.gitignore` and `.env.example`.
2. You would upload `node_modules/` (~400 MB, 678 packages) and `dist/`,
   which must never be in the repo.

**Use git instead.** The repository is already initialised and committed:

```bash
git remote add origin https://github.com/rockminid/rockminid.github.io.git
git branch -M main
git push -u origin main
```

Then **Settings → Pages → Source: GitHub Actions**. The workflow builds,
typechecks, runs all 242 tests, and deploys. First deploy takes ~2 minutes.

### If you must use drag and drop

Upload **only** these, and create `.github/workflows/` manually through
GitHub's "Add file → Create new file" (type the path with slashes, which is
the only way to make directories in the web UI):

```
src/            public/         scripts/
index.html      package.json    package-lock.json
vite.config.ts  vitest.config.ts  tsconfig.json
server.ts       capacitor.config.ts  build-apk.sh
firestore.rules  README.md  ROADMAP.md  HANDOFF.md
LICENSE  MOBILE_BUILD_GUIDE.md  security_spec.md
.gitignore  .env.example  .github/workflows/deploy.yml
```

**Never upload:** `node_modules/`, `dist/`, `dist-server/`,
`firebase-applet-config.json` (old AI Studio credentials), `.env.local`,
`bun.lock`.

### What is deliberately NOT in the repo

- **`georoc-raw/`** — 2.8 GB of extracted GEOROC CSV, one directory up. Only
  needed to re-run the ingest. Safe to delete; the two zips are the archive.
- **`RockMin_Improvement steps/data/`** — 210 MB of staged CSV, superseded.
- The derived library in `public/data/` (~180 kB) **is** committed. That is
  the app's reference dataset.

---

## 4. Architecture

```
src/
  utils/
    iron.ts                  Canonical FeO/Fe2O3/FeOT resolver. EVERYTHING
                             routes through resolveIron(). Do not add a
                             second iron conversion anywhere.
    cipw.ts                  CIPW norm + cation norm. Mass-conserving by
                             construction; reports normSum and silicaBalance
                             rather than forcing 100.
    tas.ts                   Le Bas (1986) field polygons, point-in-polygon.
    tasSubRoot.ts            IUGS sub-root names (Le Maitre 2002 s.2.12.2).
    irvineBaragar.ts         Their published Appendix III equations.
    mineralStoichiometry.ts  APFU structural-formula mineral identification.
    ternaryCalculations.ts   AFM, QAPF, APF, pyroxene, feldspar, ultramafic.
    geochemEngine.ts         Orchestrator. identifyGeochemicalSample() is
                             the single entry point.
  data/
    georocReference.ts       Lazy loader for the GEOROC library.
    rocksDataset.ts          39 curated rocks.
    mineralsDataset.ts       52 curated minerals.
scripts/
  ingest-georoc-raw.mjs      Builds the library from the full archives.
  ingest-georoc.mjs          Older staged-file ingester, kept for reference.
  lib/csv-stream.mjs         Streaming RFC 4180 parser.
public/data/                 The derived library (committed).
```

**Key invariant:** no AI touches classification. Every identification, field
assignment and index is deterministic and unit-tested. The optional Gemini
integration only narrates results already computed, and falls back to a
deterministic rule engine when no backend is configured.

---

## 5. What was wrong and is now fixed

Worth knowing so you do not re-introduce any of it.

### Runtime
- Forced Firestore read on boot held the UI in a loading state for the SDK's
  full retry backoff. **This was the main "not responding" cause.**
- Benchmark batch classification ran synchronously before first paint.
- One 1.88 MB entry chunk; jsPDF preloaded on every page load.
- ~130 lines of AI Studio shim in `index.html` monkey-patched
  `window.WebSocket` and swallowed all console errors containing "WebSocket".
- `esbuild ^0.25` was incompatible with Vite 8 — `npm install` could not run.

### Science
- Iron double-counted between FeO/Fe2O3 and FeOT.
- FeOT-only analyses lost their iron in normalization, moving a MORB two TAS
  fields.
- CIPW used fixed formula weights for solid solutions (wrong by 20–35% in
  Fe-rich rocks) and hid it by forcing the total to 100.
- CIPW had no corundum, acmite, wollastonite, hematite, rutile, chromite or
  calcite — excess Al, Fe³⁺, Ti, Ca and Cr were silently discarded.
- **Dacite/rhyolite boundary was a vertical cut at 69 wt% SiO₂.** It is the
  sloping line (69,8)–(77,0). Verified by digitizing Le Maitre Fig. 2.15.
- AFM boundary was an unsourced 9-point array interpolated as a function of
  X_A, when the published polynomial is a function of **X_M**.
- QAPF applied per-mole-of-feldspar weights to moles of K₂O/Na₂O, halving A
  against P.
- ASI omitted the factor of 2 on Ca and the apatite correction. A separate
  inline copy called any ASI < 0.95 peralkaline, mislabelling most basalts.
- Similarity curve so flat that five different rocks all scored 100.
- **Mineral ID used oxide distance.** Now structural (APFU).

### Source-data defects found (not ours — report upstream if you can)
1. **Staged CSVs** declare a 45-column header but write 39 columns. The six
   volatile columns are named and never emitted, so a header-based parse
   reads `fe_basis` as H₂O.
2. **GEOROC's own rock archive uses bare CR line endings** (classic Mac, no
   LF anywhere) while the mineral archive uses CRLF. A reader that treats
   only LF as a terminator collapses every rock file into one row and
   produces an empty library. Python's universal-newline decoding hides this
   completely — it only appears in a byte-level reader.

---

## 6. Verification against the primary literature

All four papers are in the parent directory and were read directly.

| Source | What was checked | Result |
| --- | --- | --- |
| Le Maitre (2002) Fig. 2.15 | All 14 TAS intersection coordinates | Exact match; each confirmed to land on a drawn line |
| Le Maitre (2002) §2.12.2 | Sub-root naming rules | Implemented verbatim |
| Le Bas et al. (1986) Table 1 | 17 root names, sub-root series | Confirmed |
| Irvine & Baragar (1971) App. III | Figs. 2, 3, 4, 6, 7 equations | Implemented verbatim |
| Streckeisen (1976) p.10 | QAPF limits f.r. 10/35/65/90, Q 5/20/60 | Already correct |

**Known limitation, documented in code:** above ~8 wt% total alkalis the
published Irvine & Baragar Fig. 3 polynomial diverges from the curve the
authors themselves drew (dS/dA rises from ~2.8 to ~22). Flagged at runtime
via `FIG3_RELIABLE_ALKALI_MAX` rather than silently corrected. Practical
effect is benign.

---

## 7. The reference library

```bash
npm run ingest:georoc -- --src ../georoc-raw
```

Expects `<src>/rocks/*.csv` and `<src>/minerals/*.csv` from the GEOROC
precompiled downloads.

| | groups | analyses |
| --- | ---: | ---: |
| Rocks | 69 | 266,675 |
| Minerals | 74 | 953,932 |

Each group is a **distribution**, not a single composition: n plus
p10/p25/p50/p75/p90 per oxide. Matching uses the median as the reference and
the p10–p90 band as the observed range.

Rocks are grouped by GEOROC's own precompiled **file name**, which is an
authoritative curation. Do not switch to the free-text `ROCK NAME` column —
it fragments the library so badly that dacite's own median composition failed
to identify as dacite.

**Cite GEOROC** (DIGIS, Georg-August-Universität Göttingen) and the original
publications for anything derived from it. `public/data/georoc-manifest.json`
records the exact ingestion parameters.

---

## 8. What is still open

In rough priority order.

1. **Mobile information architecture** (improvement-pack Stage 07). The PWA
   installs and works offline, but the UI is still the desktop layout. The
   prompt asks for bottom navigation, a step-by-step Analyze wizard, 48 dp
   touch targets, pinch-zoom full-screen diagrams and card layouts instead of
   wide tables. This is the largest remaining piece of work.

2. **"Why this match?" panel.** `MatchScore.contributions` already carries
   the per-oxide breakdown and `structuralFormula` the APFU. Nothing renders
   them as an explanation panel yet.

3. **Sample-type selector in the UI.** The engine accepts and infers it, but
   the user cannot declare it. Inference works well; an explicit control
   would still be better for melt inclusions and glasses.

4. **`qualityFlags` are not surfaced.** The engine produces structured flags;
   the analyzer still shows only the legacy single-string warning.

5. **`vendor-firebase` (~528 kB) loads eagerly.** Could be dynamically
   imported when `isFirebaseConfigured` is true. Non-trivial because the
   module exports are consumed synchronously.

6. **Melilitite / kalsilite rules** (Le Maitre p.38). Normative larnite is
   now computed, so the remaining rules are implementable.

7. **No component or end-to-end tests.** Coverage is the engine only.

8. **Zenodo DOI.** The in-app Cite tab should point at one.

9. **APK signing.** Regenerate the SHA-256 fingerprint in
   `public/.well-known/assetlinks.json` from your real release keystore
   before publishing, or Android App Links fail silently.

---

## 9. Before the site goes public

- [ ] Push and enable Pages (section 3).
- [ ] Create your own Firebase project if you want sign-in, cloud sync and
      feedback. Add the `VITE_FIREBASE_*` repository secrets, deploy
      `firestore.rules`, and restrict the API key to your domains. Without
      this the app runs in **Local Mode** and says so — everything except
      cloud sync works.
- [ ] Decide on the AI interpretation. It needs a server to hold the Gemini
      key. Without one the deterministic rule engine runs instead, which is
      fine. **Never put a Gemini key in a `VITE_*` variable** — those are
      inlined into the browser bundle.
- [ ] Verify the model id in `server.ts` (`GEMINI_MODEL`, default
      `gemini-3.8-flash`) against the current model list if you deploy it.

---

## 10. Conventions to keep

- **One canonical implementation per calculation.** Three separate ASI
  implementations existed and two were wrong. If you need a value, import it;
  do not recompute.
- **Similarity is not a probability.** Never label it "confidence" or render
  it with a `%`. The UI shows score, raw distance, analyte count and the gap
  to the runner-up, and flags a match as ambiguous when that gap is small.
- **Report, don't hide.** `normSum`, `silicaBalance`, `ironBasis`,
  `structuralFit` and `qualityFlags` exist so a result can be checked rather
  than trusted. The original code forced the norm to 100 and hid its errors.
- **Cite the source in the code.** Every classification boundary carries a
  comment naming the paper, figure and equation.
- **Tests anchor on exact stoichiometry**, not on whatever the code currently
  returns. Pure albite must norm to ~100% albite; pure anorthite must give
  ASI exactly 1.00.

---

## 11. Commands

```bash
npm install            # first time
npm run dev            # dev server on :3000
npm test               # 242 tests
npm run lint           # typecheck
npm run build          # production build into dist/
npm run preview        # serve the built app
npm run verify         # lint + test + build — run before every commit
npm run ingest:georoc -- --src ../georoc-raw   # rebuild the library
npm run build:apk      # Capacitor Android sync
```

Build for a subpath (only if the repo is renamed away from
`rockminid.github.io`):

```bash
VITE_BASE_PATH=/rockmin-id/ npm run build
```
