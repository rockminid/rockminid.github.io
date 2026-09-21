# RockMin ID — handoff

Written 2026-09-21, updated after first deployment. Everything needed to pick
this up cold.

**The site is live: <https://rockminid.github.io/>** — building and deploying
from GitHub Actions on every push to `main`.

---

## 1. What this is

A geochemical classifier and petrological analysis platform. Rocks and
minerals identified from major-element compositions, full CIPW norm, TAS,
AFM, QAPF and other ternary diagrams. Runs entirely in the browser, installs
as a PWA, works offline.

It started as a Google AI Studio export. The engine has since been rewritten
against the primary literature and the reference library rebuilt from the
full GEOROC archives.

- **Repo:** `rockminid/rockminid.github.io`
- **Live:** <https://rockminid.github.io/>
- **Working directory:** `E:/PHD/Meteorites/RockMin ID/rockmin-id_Source code`
- **Remote:** configured. `git push` from that directory is all that is needed.

---

## 2. Current state

| | |
| --- | --- |
| Tests | **242 passing** (`npm test`) |
| Typecheck | clean (`npm run lint`) |
| Build | clean (`npm run build`) |
| Full gate | `npm run verify` |
| Commits | 21 on `main`, pushed |
| Deployment | Live, GitHub Actions, verified in a browser with zero console errors |
| Entry chunk | 470 kB (was 1.88 MB) |
| Reference library | 234 references from 1,220,127 GEOROC analyses |
| Cloud features | Off — running in Local Mode, see section 9 |
| SEO | `sitemap.xml`, `robots.txt`, canonical link; Search Console verified |

### Toolchain

Node was **not installed** on this machine. Node 24.21.0 LTS was installed
user-scope (portable, no admin) at:

```
C:\Users\kisha\AppData\Local\node-portable\node-v24.21.0-win-x64
```

It is on the **user PATH** permanently. If a new shell cannot find `node`,
open a fresh terminal or re-add that directory.

---

## 3. Deployment

The site deploys automatically. **Push and nothing else:**

```bash
cd "E:/PHD/Meteorites/RockMin ID/rockmin-id_Source code"
git add -A
git commit -m "your message"
git push
```

`.github/workflows/deploy.yml` then typechecks, runs all 242 tests, builds,
and publishes. **A failing test blocks the deploy**, which is the point. A run
takes about two minutes; watch it at
<https://github.com/rockminid/rockminid.github.io/actions>.

Base path is derived automatically: a repo named `<user>.github.io` is a user
site served at `/`, anything else is a project site at `/<repo>/`. Override
with the repository variable `VITE_BASE_PATH` (set it to `/` for a custom
domain).

### Never use GitHub's web uploader

This cost a broken deployment once already — see section 3.1. Drag and drop
uploads only the files at the top level, silently skips dot-directories, and
strips the leading dot from names you type. Use `git push`.

### 3.1 The first deployment failure, and what it teaches

The first attempt used drag and drop and put **19 of 98 files** on the remote.
Only the top level arrived: `src/`, `public/`, `scripts/` and `.github/` were
all missing, and `.github` became `github` because the UI stripped the dot, so
Actions never saw the workflow.

With no workflow, Pages fell back to its **built-in Jekyll pipeline**, which
publishes the repository root verbatim. Visitors were served the *source*
`index.html`, whose entry point is:

```html
<script type="module" src="/src/main.tsx"></script>
```

Browsers cannot execute TypeScript/JSX, so the page rendered blank with no
obvious error.

**Diagnosing this again, if it ever recurs.** One command tells you which
`index.html` is being served:

```bash
curl -s https://rockminid.github.io/ | grep -o 'src="[^"]*"'
```

- `/assets/index-<hash>.js` → the built site. Correct.
- `/src/main.tsx` → the raw repository. The build never deployed.

Then confirm the cause:

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  https://raw.githubusercontent.com/rockminid/rockminid.github.io/main/.github/workflows/deploy.yml

curl -s -o /dev/null -w "%{http_code}\n" https://rockminid.github.io/package.json
```

A 404 on the workflow, or a **200 on `package.json`** (the repo root is being
published), pins it down.

**The fix applied:** the remote history was *merged*, not force-overwritten,
so the web-upload commits are preserved; the stray `github/` directory was
removed; `master` was renamed to `main`; all 98 files pushed.

**One correction worth recording:** during the incident it looked as though
GitHub Pages had to be switched from "Deploy from a branch" to "GitHub
Actions" by hand. It did not. GitHub made that switch itself once a workflow
claimed the `github-pages` environment; the deploy job was only briefly
queued while the environment was provisioned. Pushing the workflow was
sufficient.

### Files that must be served at the site root

Anything that has to appear at `https://rockminid.github.io/<file>` —
search-engine verification files, `robots.txt`, `sitemap.xml`, a `CNAME` for
a custom domain — belongs in **`public/`**, not the repository root.

Vite copies `public/` into `dist/` verbatim, and `dist/` is what gets
published. A file sitting at the repository root is **not** served, because
Pages publishes the build artifact rather than the repo.

Already handled this way:

- `public/google7ec5781ae9df420f.html` — Google Search Console verification.
  It was first uploaded to the repo root, where it would never have been
  served, and was moved.
- `public/.well-known/assetlinks.json` — Android App Links.

`sitemap.xml` and `robots.txt` are the exception: they are **generated at
build time**, not committed, by the Vite plugin in `scripts/lib/seo.mjs`.
That keeps `lastmod` equal to the date of the deploy that produced it, rather
than a committed date that silently rots.

### The sitemap has exactly one URL, deliberately

RockMin ID is a single-page application. The tabs (Analyzer, Batch, TAS,
Ternary, Dataset, Collection) are React state, not routes, so the entire app
lives at `https://rockminid.github.io/`.

Listing `/tas`, `/batch` and the rest would be actively harmful: those paths
do not exist, so the SPA fallback (`404.html`) serves the same document for
every one of them, and a search engine reads that as duplicate content.

If real routing is added later, extend `SITE_PAGES` in `scripts/lib/seo.mjs`
and the sitemap grows automatically. `src/utils/seo.test.ts` asserts the
current count, so that change is a deliberate one rather than a silent drift.

The site origin comes from `VITE_SITE_URL` (default
`https://rockminid.github.io`). Change it in one place if you move to a
custom domain — the canonical link, the sitemap and robots.txt all follow.

### What is deliberately NOT in the repo

- **`georoc-raw/`** — 2.8 GB of extracted GEOROC CSV, one directory up. Only
  needed to re-run the ingest. Safe to delete; the two zips are the archive.
- **`RockMin_Improvement steps/data/`** — 210 MB of staged CSV, superseded.
- `node_modules/`, `dist/`, `firebase-applet-config.json` (old AI Studio
  credentials), `.env.local`.

The derived library in `public/data/` (~180 kB) **is** committed. That is the
app's reference dataset, and the site fetches it at runtime.

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

1. **Mobile information architecture** (improvement-pack Stage 07). Now the
   single largest remaining piece of work, and the most visible: the site is
   public, so phone visitors get the desktop layout shrunk down. The PWA
   installs and works offline already. Stage 07 asks for bottom navigation, a
   step-by-step Analyze wizard, 48 dp touch targets, pinch-zoom full-screen
   diagrams, and card layouts instead of wide tables.

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

8. ~~**Zenodo DOI.**~~ Done. Concept DOI `10.5281/zenodo.22875578`
   (always latest), version DOI `10.5281/zenodo.22875579` for v2.4.0. Wired
   into `CITATION.cff`, the README, the in-app Cite tab and the PDF manual.
   **One thing still to fix:** the Zenodo deposit records the licence as
   CC-BY-4.0, but the repository ships under MIT. Edit the deposit metadata on
   Zenodo so the archived record matches.

9. **APK signing.** Regenerate the SHA-256 fingerprint in
   `public/.well-known/assetlinks.json` from your real release keystore
   before publishing, or Android App Links fail silently.

---

## 9. Post-launch checklist

- [x] ~~Push and enable Pages~~ — done, site is live and verified.
- [x] ~~Search Console verification~~ — `public/google7ec5781ae9df420f.html`
      is live. Submit `https://rockminid.github.io/sitemap.xml` under
      **Sitemaps** in Search Console to finish indexing setup.
- [x] ~~Add a `CITATION.cff` so GitHub shows a citation widget.~~ — done,
      carrying the Zenodo DOI and the five papers the engine implements.
- [ ] **Firebase (optional).** The live site currently runs in **Local
      Mode**, shown in the top-right. Every calculation, diagram, batch run,
      export and the local specimen collection work; only Google sign-in and
      cloud sync are off. To enable them: create a Firebase project, turn on
      Authentication (Google) and Firestore, deploy `firestore.rules`, add the
      `VITE_FIREBASE_*` values as **repository secrets** (Settings → Secrets
      and variables → Actions), and restrict the API key to
      `rockminid.github.io` in the Google Cloud console. The workflow already
      passes those secrets through; a push then redeploys with cloud enabled.
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

git push               # deploy: runs the full gate, then publishes
```

### Verifying a deployment

```bash
curl -s https://rockminid.github.io/ | grep -o 'src="[^"]*"'
```

Expect `/assets/index-<hash>.js`. Seeing `/src/main.tsx` means the build did
not deploy — see section 3.1.

Build for a subpath (only if the repo is renamed away from
`rockminid.github.io`):

```bash
VITE_BASE_PATH=/rockmin-id/ npm run build
```
