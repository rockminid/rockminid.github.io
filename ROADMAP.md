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

**Reference data**
- Library was 39 rocks and 52 minerals, hand-written; now 234 references
  including 143 GEOROC population distributions from 1,220,607 analyses.
- GEOROC "ROOT, MODIFIER" variant names fragmented the library so badly that
  dacite's own median composition failed to identify as dacite.

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
- TAS used axis-aligned rectangles instead of the Le Bas polygons.
- The dacite/rhyolite boundary was a vertical cut at 69 wt% SiO₂ rather than
  the published sloping line (69,8)–(77,0), misclassifying silica-rich,
  alkali-poor dacites as rhyolite.
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

### Stage 02–04 — GEOROC reference database ✅ (static route, full archive)

**Done, via the static aggregation route (Option A), which needs no server.**

`scripts/ingest-georoc-raw.mjs` streams the **full GEOROC precompiled
archives** and reduces each group to a population distribution — n plus
p10/p25/p50/p75/p90 per oxide. The result is 143 groups from **1,220,607
accepted analyses** (266,675 rock + 953,932 mineral) in ~180 kB of JSON,
fetched at runtime and precached for offline use. The library grew from 91
hand-written entries to 234 references.

Rocks are grouped by GEOROC's own precompiled file name rather than the
free-text ROCK NAME column, which adds komatiite, boninite, adakite, picrite,
lherzolite, harzburgite, dunite, nephelinite, lamprophyre, trondhjemite and
the full IUGS sub-root series.

This deliberately does *not* build the server-side query API of the original
Stage 02 plan. That plan assumed per-sample record retrieval; for a chemical
classifier, a per-group distribution is both smaller and more useful, and it
keeps the app fully static and offline-capable. If per-record provenance (a
specific sample ID, locality or DOI behind each match) is wanted later, that
does need the hosted API described below.

| Option | Pages | AI | GEOROC | Android |
| --- | --- | --- | --- | --- |
| **A. Static + prebuilt distributions** *(implemented)* | ✅ | rule engine, or a proxy | ✅ 314k analyses, aggregated | ✅ fully offline |
| **B. Pages + hosted API** | ✅ frontend | ✅ | ✅ per-record retrieval | needs network |
| **C. Full-stack host** | ❌ | ✅ | ✅ | ✅ |

**Two source defects found, both worth knowing about:**

1. *Staged CSVs* — every file declares a 45-column header but writes only 39
   columns; the six volatile columns (H2O, CO2, F, Cl, SO3, S) are named and
   never emitted, so a header-based parse reads `fe_basis` as H2O. Worth
   fixing in whatever produced those files. (Superseded now that the full
   archives are ingested, but `npm run ingest:georoc:staged` still handles it.)
2. *GEOROC's own rock archive* uses **bare CR line endings** (classic Mac)
   with no LF anywhere, while the mineral archive uses CRLF. A reader that
   treats only LF as a row terminator collapses every rock file into one row
   and produces an empty library. Python's universal-newline decoding hides
   this entirely; it only appears in a byte-level reader.

**The 210 MB of staged CSV is still excluded from git** (`/data/`,
`RockMin_GEOROC_*Staged*.csv`). The derived library in `public/data/` is
committed — it is the app's reference dataset and only a few hundred kB.

Mineral rows with every oxide blank are rejected by the ≥4-oxide filter;
44,772 of 108,852 mineral rows were dropped for that reason.

### Stage 05 — Diagrams and mineral calculations

**Diagrams verified against the source paper.** Irvine & Baragar (1971) give
their criteria as equations in Appendix III (p. 547), written specifically for
computer implementation. Those are now used verbatim:

- Fig. 3 (alkaline vs subalkaline) — the published sixth-order polynomial.
- Fig. 2 (tholeiitic vs calc-alkaline) — the published eighth-order polynomial
  in X_M, with the authors' `P < 40` precondition, falling back to their Fig. 6
  criterion (`Al2O3 >= 12 + 0.08 P`) when it is not met.
- Fig. 7 (subalkaline rock naming) from colour index and normative plagioclase.
- Table 1 cation norm, `Ab' = Ab + 5/3 Ne`, `P = 100 An/(An + Ab')`,
  `CI = Ol + Opx + Cpx + Mt + Il + Hm`.

The previously flagged unverified AFM control points are gone. They were also
being interpolated as a function of X_A rather than X_M, which is a different
curve entirely.

Known limitation, documented in `irvineBaragar.ts`: above ~8 wt% total alkalis
the published Fig. 3 fit diverges from the curve the authors drew (dS/dA rises
from ~2.8 to ~22). It is flagged at runtime rather than silently corrected.

**TAS verified against Le Bas (1986) and Le Maitre (2002).** All 14 published
intersection coordinates are reproduced exactly. One real bug was found: the
dacite/rhyolite divide is the sloping line (69,8)-(77,0), not a vertical cut
at 69 wt% SiO2, so silica-rich but alkali-poor rocks were being called
rhyolite instead of dacite.

**QAPF verified against Streckeisen (1976).** The plagioclase-ratio limits
(10/35/65/90) and quartz limits (5/20/60) already matched the source.

**IUGS sub-root names implemented** from Le Maitre (2002) §2.12.2: alkali vs
subalkali basalt, basanite vs tephrite, hawaiite/mugearite/benmoreite vs
potassic trachybasalt/shoshonite/latite, trachyte vs trachydacite,
peralkaline varieties with the comenditic/pantelleritic split, nephelinite
and melanephelinite, low-K/medium-K/high-K, and picrite.

**Mineral identification rewritten to use structural formulae** (`mineralStoichiometry.ts`).
Analyses are recast as cations per formula unit on each candidate's oxygen
basis and judged on cation total, tetrahedral occupancy and required site
occupancies. Scoring is structure-led with composition secondary. An Fo90
analysis now identifies as forsterite at 85/100 with a 98% structural fit;
a whole-rock basalt's best mineral match fell from 61 to 23. Sample type is
inferred from the structural fit when not declared.

**Fig. 4 implemented** — the Ne'-Ol'-Q' normative projection Irvine & Baragar
call their most reliable discriminant, from their Appendix III inequalities.
Reported alongside Fig. 3 with an explicit flag when the two disagree.

**Normative larnite (Cs) added** to the CIPW desilication cascade, which the
melilitite test needs.

Still open: see HANDOFF.md section 8.

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
