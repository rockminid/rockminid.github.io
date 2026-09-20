# RockMin ID — status and roadmap

Tracks this codebase against the staged plan in `RockMin_Improvement steps/`.

---

## Done

### Stage 00 — Baseline audit ✅

Full audit completed. Findings and fixes are in the git history; the defects
found are listed under "What was fixed" below.

### Stage 01 — Scientific engine hardening (mostly done)

| Item | Status | Where |
| --- | --- | --- |
| A. Sample type | Type + labels defined | `types/geochem.ts` (`SampleType`) |
| B. Missing data never silently zero | Done for matching | `geochemEngine.ts` — missing analytes are skipped, not zeroed |
| C. One canonical iron function | **Done** | `utils/iron.ts` — every module routes through `resolveIron` |
| D. Normalization separated | **Done** | raw total, volatile-free basis and iron basis all reported |
| E. "Confidence" → "Similarity Score" | **Done** | score, distance, analyte count, separation, never a % |
| F. Explainable matching | Data ready | `MatchScore.contributions` is populated; UI panel not built yet |
| G. Data quality flags | **Done** | `assessDataQuality` → structured `DataQualityFlag[]` |
| H. Unit tests | **Done** | 86 tests, `npm test` |

### Deployment readiness ✅

Boot no longer blocks, Firebase is optional and environment-driven, the bundle
is code-split, and a GitHub Pages workflow typechecks and tests before
deploying.

---

## What was fixed

Defects found in the original AI Studio build and corrected:

**Blocking / runtime**
- Forced Firestore server read on every boot, holding the UI in a loading
  state for the SDK's full retry backoff.
- Full benchmark batch classification running synchronously before first paint.
- One 1.88 MB entry chunk with no code splitting; jsPDF preloaded on every
  page load.
- ~130 lines of AI Studio shim in `index.html` that monkey-patched
  `window.WebSocket` and swallowed all `console.error`/`warn`/`info` containing
  "WebSocket" or "failed to connect", hiding real production errors.
- `esbuild ^0.25` incompatible with Vite 8 — `npm install` could not complete.

**Scientific**
- Iron double-counted between FeO/Fe₂O₃ and FeOT, inflating analytical totals.
- FeOT-only analyses lost their iron in normalization, shifting a MORB two
  fields up the TAS diagram.
- CIPW used fixed formula weights for solid solutions (Hy 110, Ol 150,
  Di 216.5), wrong by 20–35% in Fe-rich rocks, then hid it by forcing the
  total to 100.
- CIPW had no corundum (peraluminous), no acmite or alkali metasilicates
  (peralkaline), no wollastonite, hematite, rutile, chromite or calcite —
  excess Al, Fe³⁺, Ti, Ca and Cr were silently discarded.
- No Fe³⁺/Fe²⁺ split, so FeOT-only data always produced zero magnetite.
- Albite → nepheline conversion mixed a silica deficit with an
  already-converted olivine quantity.
- TAS used axis-aligned rectangles instead of the Le Bas polygons; 69–70 wt%
  SiO₂ returned dacite instead of rhyolite.
- Irvine & Baragar boundary used an undocumented quadratic sitting ~1 wt%
  below the published curve, and contradicting its own comment.
- AFM F apex ignored FeOT, collapsing most GEOROC samples onto the A–M edge;
  the series label used a straight line that did not match the drawn curve.
- QAPF applied per-mole-of-feldspar weights to moles of K₂O/Na₂O, halving A
  relative to P, and split albite 90/10 instead of applying the IUGS An₀₅ rule.
- ASI omitted the factor of 2 on Ca and the apatite correction. A separate
  inline copy classified any ASI < 0.95 as peralkaline, mislabelling nearly
  every basalt and gabbro.
- Similarity curve so flat that five different reference rocks all scored 100.

---

## Not done

### Stage 02–04 — GEOROC reference database

**Not started, and it needs an architecture decision first.**

Stage 02 requires a server-side database with query endpoints. GitHub Pages
serves static files only. Three options:

| Option | Pages | AI | 460k GEOROC rows | Android |
| --- | --- | --- | --- | --- |
| **A. Static + prebuilt index** | ✅ | rule engine only | aggregate to ~2–5k centroids, fetched as JSON | ✅ simplest |
| **B. Pages + hosted API** *(recommended)* | ✅ frontend | ✅ | ✅ full, server-side | ✅ needs network for reference lookups |
| **C. Full-stack host** | ❌ | ✅ | ✅ | ✅ |

Option B keeps the free permanent Pages URL and offline deterministic
calculation, while allowing the full archive behind an API.

Regardless of choice: **the 210 MB of staged CSV must never be committed.**
`.gitignore` excludes `data/` and `RockMin_GEOROC_*.csv`. Publish them as a
GitHub Release asset or a Zenodo archive and have the ingestion script fetch
from there.

Note also that many staged mineral rows have every oxide blank with
`major_oxide_total_wt_pct = 0`. Ingestion must reject or flag these rather
than importing zeros.

### Stage 05 — Diagrams and mineral calculations

Diagram maths is corrected, but two items remain:

- **AFM boundary control points are unverified.** The classifier and the drawn
  curve now agree with each other, but both depend on an inherited 9-point
  array that has not been re-digitized from Irvine & Baragar (1971) fig. 2.
  Check it before relying on the TH/CA label for publication. Flagged in
  `ternaryCalculations.ts`.
- **Mineral identification still uses oxide-space distance**, not site
  occupancy / APFU normalization, which is how EPMA mineral identification is
  properly done. `calculateStoichiometry` already computes APFU and marks it
  inapplicable for whole rocks; wiring it into mineral matching is the next
  step.

### Stage 06 — Batch and plot studio

Batch processing and plotting work. Not done: saved plot templates, and
per-row data-quality flags surfaced in the batch table (the flags exist in
the engine but the batch view only shows the total-based quality status).

### Stage 07 — Mobile / offline / field mode

The PWA installs and works offline, and the Capacitor config is present. Not
done: the mobile-specific information architecture from the prompt — bottom
navigation, the step-by-step Analyze wizard, 48 dp touch targets, full-screen
pinch-zoom diagrams, and card layouts replacing wide tables.

Before publishing an APK, regenerate the SHA-256 fingerprint in
`public/.well-known/assetlinks.json` from your real release keystore. The
current value will not match and App Links will silently fail.

### Stage 08–09 — Security, testing, release

- `firestore.rules` is written but must be deployed to a Firebase project you
  control. The old AI Studio project's credentials are gitignored, not used.
- Restrict the Firebase API key to your domains in the Google Cloud console.
- Test coverage is currently the geochemical engine only. No component or
  end-to-end tests.
- No Zenodo DOI yet; the in-app **Cite** tab should point at one.

### Remaining UI work

- Build the "Why this match?" panel. `MatchScore.contributions` already carries
  the per-oxide breakdown.
- Add a sample-type selector to the analyzer and let it drive which diagrams
  are offered. The type flows through the engine already but the UI never
  sets it.
- Surface `qualityFlags` in the analyzer; only the legacy single-string
  warning is displayed.
- `vendor-firebase` (~528 kB, 155 kB gzip) still loads eagerly. It could be
  dynamically imported when `isFirebaseConfigured` is true.

---

## Verification

```bash
npm run verify    # typecheck + 86 tests + production build
```
