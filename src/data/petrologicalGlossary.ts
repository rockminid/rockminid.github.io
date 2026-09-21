export interface GlossaryTerm {
  id: string;
  term: string;
  acronym?: string;
  category:
    | 'Classification Schemes'
    | 'Geochemical Indices'
    | 'Petrogenetic Processes'
    | 'Mineral Stoichiometry & CIPW'
    | 'Analytical Instrumentation'
    | 'Tectonic Discriminants';
  definition: string;
  formula?: string;
  significance: string;
  reference?: string;
  tags: string[];
}

export const PETROLOGICAL_GLOSSARY: GlossaryTerm[] = [
  // --- 1. CLASSIFICATION SCHEMES ---
  {
    id: 'tas-diagram',
    term: 'Total Alkali-Silica (TAS) Diagram',
    acronym: 'TAS',
    category: 'Classification Schemes',
    definition:
      'A chemical classification scheme for volcanic and fine-grained igneous rocks based on total alkalis (Na₂O + K₂O wt%) plotted against silica (SiO₂ wt%). Recommended by the IUGS Subcommission on the Systematics of Igneous Rocks.',
    formula: 'X = SiO₂ (wt%), Y = (Na₂O + K₂O) (wt%)',
    significance:
      'Indispensable for classifying volcanic rocks where fine-grained, glassy, or microcrystalline matrices preclude accurate optical modal mineralogy under a petrographic microscope.',
    reference: 'Le Bas et al. (1986); Le Maitre (2002) IUGS Classification',
    tags: ['IUGS', 'Volcanic', 'SiO2', 'Alkalis', 'Basalt', 'Rhyolite'],
  },
  {
    id: 'qapf-diagram',
    term: 'QAPF Double-Ternary System',
    acronym: 'QAPF',
    category: 'Classification Schemes',
    definition:
      'A modal (or normative) mineralogical classification diagram defined by Quartz (Q), Alkali Feldspar (A), Plagioclase (P), and Feldspathoids/Foids (F) for phaneritic igneous rocks with <90% mafic minerals.',
    formula: 'Q + A + P = 100% (Silica-oversaturated) OR F + A + P = 100% (Silica-undersaturated)',
    significance:
      'The definitive international standard for plutonic rock classification (Streckeisen, 1976). Because Quartz and Feldspathoids cannot stably coexist in equilibrium, the system is split into two mutually exclusive triangles.',
    reference: 'Streckeisen (1976); Le Maitre (2002)',
    tags: ['Streckeisen', 'Plutonic', 'Granite', 'Gabbro', 'Syenite', 'Feldspar'],
  },
  {
    id: 'afm-diagram',
    term: 'AFM Ternary Diagram',
    acronym: 'AFM',
    category: 'Classification Schemes',
    definition:
      'A triangular discrimination plot separating subalkaline magmatic suites into Tholeiitic and Calc-Alkaline evolutionary series based on alkalis, total iron, and magnesia.',
    formula: 'A = Na₂O + K₂O (wt%), F = FeO + 0.8998·Fe₂O₃ (wt%), M = MgO (wt%)',
    significance:
      'Tholeiitic magmas exhibit early iron enrichment relative to magnesium (Skaergaard trend), whereas Calc-Alkaline magmas (subduction arcs) exhibit monotonic silica/alkali enrichment without iron enrichment due to early magnetite crystallization.',
    reference: 'Irvine & Baragar (1971)',
    tags: ['Tholeiitic', 'Calc-Alkaline', 'Fractionation', 'Subduction', 'Mid-Ocean Ridge'],
  },
  {
    id: 'pearce-tectonic',
    term: 'Pearce Tectonic Discrimination Diagrams',
    acronym: 'Pearce Diagrams',
    category: 'Tectonic Discriminants',
    definition:
      'Geochemical discrimination plots using immobile trace elements (e.g., Nb, Y, Ta, Yb, Zr) and major element ratios to infer the paleo-tectonic setting of granitic and basaltic suites.',
    formula: 'E.g., Nb vs. Y or Rb vs. (Y + Nb)',
    significance:
      'Distinguishes Volcanic Arc Granites (VAG), Syn-Collisional Granites (syn-COLG), Within-Plate Granites (WPG), and Ocean Ridge Granites (ORG), assisting in paleogeodynamic reconstruction of ancient orogens.',
    reference: 'Pearce, Harris, & Tindle (1984); Pearce & Cann (1973)',
    tags: ['Tectonics', 'VAG', 'WPG', 'ORG', 'Granite', 'Orogeny'],
  },
  {
    id: 'ultramafic-ternary',
    term: 'Ultramafic Ol-Opx-Cpx Classification',
    acronym: 'Ol-Opx-Cpx',
    category: 'Classification Schemes',
    definition:
      'A triangular classification diagram for ultramafic rocks (Color Index M > 90) based on normalized modal or normative proportions of Olivine (Ol), Orthopyroxene (Opx), and Clinopyroxene (Cpx).',
    formula: 'Ol + Opx + Cpx = 100%',
    significance:
      'Subdivides upper mantle peridotites (dunite, harzburgite, lherzolite, wehrlite) and pyroxenites (websterite, orthopyroxenite, clinopyroxenite), revealing degrees of mantle depletion and melt extraction.',
    reference: 'IUGS Subcommission (1973); Streckeisen (1976)',
    tags: ['Mantle', 'Peridotite', 'Dunite', 'Lherzolite', 'Harzburgite', 'Pyroxenite'],
  },

  // --- 2. GEOCHEMICAL INDICES ---
  {
    id: 'differentiation-index',
    term: 'Thornton-Tuttle Differentiation Index',
    acronym: 'DI',
    category: 'Geochemical Indices',
    definition:
      'A scalar geochemical index measuring the degree of magmatic evolution, defined as the sum of weight percentages of normative felsic salic minerals (petrogeny’s residua system).',
    formula: 'DI = Q + Or + Ab + Ne + Lc + Kp (normative wt%)',
    significance:
      'Ranges from <20 in primitive, mantle-derived basalts/picrites to >85–95 in highly fractionated rhyolites, granites, and phonolites. Tracks progress toward Bowen’s low-temperature thermal minima.',
    reference: 'Thornton & Tuttle (1960)',
    tags: ['Evolution', 'Fractionation', 'Bowen', 'Quartz', 'Feldspar'],
  },
  {
    id: 'color-index',
    term: 'Color Index (Normative)',
    acronym: "M' / CI",
    category: 'Geochemical Indices',
    definition:
      'The sum of all mafic (dark-colored) normative minerals: pyroxenes, olivines, and iron-titanium accessory oxides.',
    formula: "M' = Di + Hy + Ol + Mt + Il + Hm (normative wt%)",
    significance:
      'Classifies rocks into Leucocratic (<30% mafic), Mesocratic (30–60%), Melanocratic (60–90%), and Ultramafic (>90%). Dictates physical properties such as rock density and magnetic susceptibility.',
    reference: 'IUGS Systematics; Streckeisen (1976)',
    tags: ['Leucocratic', 'Melanocratic', 'Pyroxene', 'Olivine', 'Density'],
  },
  {
    id: 'anorthite-number',
    term: 'Anorthite Number (Plagioclase An#)',
    acronym: 'An#',
    category: 'Geochemical Indices',
    definition:
      'The molar percentage of the calcic anorthite endmember relative to total plagioclase feldspar (Albite + Anorthite).',
    formula: 'An# = [Ca / (Ca + Na)]_plag × 100 = [An / (Ab + An)] × 100',
    significance:
      'Defines the plagioclase mineral species (Albite An₀₋₁₀, Oligoclase An₁₀₋₃₀, Andesine An₃₀₋₅₀, Labradorite An₅₀₋₇₀, Bytownite An₇₀₋₉₀, Anorthite An₉₀₋₁₀₀). Reflects magmatic crystallization temperature and water content.',
    reference: 'Tuttle & Bowen (1958)',
    tags: ['Plagioclase', 'Albite', 'Anorthite', 'Feldspar', 'Solid Solution'],
  },
  {
    id: 'magnesium-number',
    term: 'Magnesium Number',
    acronym: 'Mg#',
    category: 'Geochemical Indices',
    definition:
      'The molar ratio of magnesium to magnesium plus divalent iron in a rock or mafic mineral.',
    formula: 'Mg# = 100 × [Mg²⁺ / (Mg²⁺ + Fe²⁺)]',
    significance:
      'Primary mantle melts in equilibrium with peridotite have Mg# of 68–75. Lower values (<65) diagnose prior olivine ± pyroxene fractional crystallization or crustal assimilation.',
    reference: 'Roeder & Emslie (1970)',
    tags: ['Mantle', 'Primitive Melt', 'Olivine', 'Fractionation', 'Iron'],
  },
  {
    id: 'aluminium-saturation-index',
    term: 'Aluminium Saturation Index',
    acronym: 'ASI / A/CNK',
    category: 'Geochemical Indices',
    definition:
      'The molar ratio of alumina to the sum of calcium and alkali oxides in granitic and felsic rocks. RockMin ID applies the apatite correction, subtracting 1.67 × P₂O₅ to remove the calcium locked in Ca₅(PO₄)₃; omitting it systematically under-reports ASI for apatite-bearing calcic rocks. A rock is reported as peraluminous only when ASI > 1 AND the CIPW norm actually yields corundum.',
    formula: 'A/CNK = Al₂O₃ / (CaO − 1.67·P₂O₅ + Na₂O + K₂O) (molar oxide ratio)',
    significance:
      'Distinguishes Peraluminous (ASI > 1.0, typical of S-type granites from pelitic crustal sources; contains corundum/biotite/garnet) from Metaluminous (ASI < 1.0 and A/NK > 1.0; I-type hornblende-bearing) and Peralkaline (A/NK < 1.0; aegirine/riebeckite).',
    reference: 'Shand (1927); Chappell & White (1974)',
    tags: ['Granite', 'Peraluminous', 'Metaluminous', 'Peralkaline', 'S-type', 'I-type'],
  },
  {
    id: 'alkalinity-index',
    term: 'Total Alkalinity & Miyashiro Curve',
    acronym: 'TA / Subalkaline Line',
    category: 'Geochemical Indices',
    definition:
      'The boundary separating alkaline magmatic series (nepheline/foid-bearing, high Na₂O+K₂O) from subalkaline series (tholeiitic and calc-alkaline) on the TAS diagram.',
    formula: 'Na₂O + K₂O relative to SiO₂ threshold curve',
    significance:
      'Alkaline magmas typically originate from low degrees of mantle partial melting or enriched mantle domains (mantle plumes/rifts), whereas subalkaline suites characterize oceanic spreading ridges and subduction volcanic arcs.',
    reference: 'Macdonald & Katsura (1964); Irvine & Baragar (1971)',
    tags: ['Alkaline', 'Subalkaline', 'TAS', 'Rift', 'Plume'],
  },

  // --- 3. PETROGENETIC PROCESSES ---
  {
    id: 'fractional-crystallization',
    term: 'Fractional Crystallization',
    acronym: 'FC',
    category: 'Petrogenetic Processes',
    definition:
      'The thermodynamic process whereby early-formed crystals are physically removed or isolated from remaining liquid melt, preventing back-reaction and causing the residual magma to evolve along a differentiation path.',
    formula: 'C_L = C_0 · F^(D - 1) (Rayleigh fractionation law)',
    significance:
      'The primary mechanism governing the diversification of igneous suites, e.g., generating andesite, dacite, and rhyolite from parental basaltic magma.',
    reference: 'Bowen (1928); Rayleigh (1896)',
    tags: ['Bowen', 'Differentiation', 'Liquid Line of Descent', 'Rayleigh'],
  },
  {
    id: 'liquid-line-of-descent',
    term: 'Liquid Line of Descent',
    acronym: 'LLD',
    category: 'Petrogenetic Processes',
    definition:
      'The evolutionary path traced by the chemical composition of remaining residual melt during progressive cooling and fractional crystallization.',
    significance:
      'Visualized on Harker bivariate variation diagrams (oxide vs. SiO₂) as inflections corresponding to the onset of specific liquidus phases (e.g., olivine, plagioclase, magnetite).',
    reference: 'Bowen (1928); Wager & Brown (1967)',
    tags: ['Harker', 'Phase Equilibria', 'Liquidus', 'Eutectic'],
  },
  {
    id: 'silica-saturation',
    term: 'Silica Saturation State',
    acronym: 'SiO₂ Saturation',
    category: 'Petrogenetic Processes',
    definition:
      'The chemical activity of silica relative to feldspars and pyroxenes, classified into Silica-Oversaturated, Silica-Saturated, and Silica-Undersaturated.',
    formula: 'Evaluated via presence of normative Quartz (Q > 0) vs. Nepheline (Ne > 0)',
    significance:
      'Acts as a fundamental thermal divide in petrology (thermal divide at low pressures across the Albite-Orthoclase plane). Normal fractional crystallization cannot cross from subalkaline (quartz normative) to silica-undersaturated (nepheline normative).',
    reference: 'Yoder & Tilley (1962)',
    tags: ['Quartz', 'Nepheline', 'Equilibrium', 'Thermal Divide'],
  },
  {
    id: 'partial-melting',
    term: 'Batch Partial Melting',
    category: 'Petrogenetic Processes',
    definition:
      'The generation of magma where liquid melt remains in chemical equilibrium with solid residue until melt extraction occurs in a single batch.',
    formula: 'C_L = C_0 / [D + F(1 - D)]',
    significance:
      'Controls primary magma compositions in the mantle and lower crust. Incompatible trace elements are strongly enriched at small melt fractions (F < 5%).',
    reference: 'Shaw (1970)',
    tags: ['Mantle', 'Basalt', 'Incompatible Elements', 'Melt Extraction'],
  },
  {
    id: 'crustal-assimilation',
    term: 'Assimilation & Fractional Crystallization',
    acronym: 'AFC',
    category: 'Petrogenetic Processes',
    definition:
      'A coupled petrogenetic process where the thermal energy released by the latent heat of crystallization of a magma drives the melting and wall-rock assimilation of country rock.',
    significance:
      'Explains isotopic shifts (Sr-Nd-Pb-Hf) and incompatible element enrichments in arc and continental flood basalt magmas ascending through thick continental crust.',
    reference: 'DePaolo (1981)',
    tags: ['Contamination', 'Isotopes', 'Continental Arc', 'Heat Budget'],
  },

  // --- 4. MINERAL STOICHIOMETRY & CIPW NORM ---
  {
    id: 'cipw-norm',
    term: 'CIPW Norm Calculation',
    acronym: 'CIPW',
    category: 'Mineral Stoichiometry & CIPW',
    definition:
      'A standardized quantitative algorithmic calculation that converts whole-rock oxide analyses into an idealized anhydrous mineral assemblage based on fixed thermodynamic crystallization affinity rules.',
    formula: '1-atm anhydrous stoichiometric budget allocation',
    significance:
      'Allows rigorous petrological comparison between glassy, microcrystalline, and coarse-grained rocks on an identical 100% anhydrous mineral basis without hydrous phases like biotite or amphibole.',
    reference: 'Cross, Iddings, Pirsson, & Washington (1902)',
    tags: ['Normative', 'Stoichiometry', 'Mineralogy', 'Anhydrous'],
  },
  {
    id: 'normative-quartz',
    term: 'Normative Quartz (Q)',
    acronym: 'Q',
    category: 'Mineral Stoichiometry & CIPW',
    definition:
      'Excess SiO₂ remaining in the CIPW norm calculation after all bases (K₂O, Na₂O, CaO, MgO, FeO, Al₂O₃) have been fully saturated to form feldspars and pyroxenes.',
    formula: 'SiO₂',
    significance:
      'Indicates silica-oversaturation. Prominent in granites, granodiorites, dacites, and rhyolites.',
    tags: ['Felsic', 'CIPW', 'Silica', 'Granite'],
  },
  {
    id: 'normative-nepheline',
    term: 'Normative Nepheline (Ne)',
    acronym: 'Ne',
    category: 'Mineral Stoichiometry & CIPW',
    definition:
      'Feldspathoid mineral calculated in the CIPW norm when insufficient SiO₂ is available to allocate all Na₂O into albite.',
    formula: 'NaAlSiO₄',
    significance:
      'Diagnostic of silica-undersaturated rocks (phonolites, basanites, nephelinites, foid syenites). Normative Quartz and Normative Nepheline are mutually exclusive.',
    tags: ['Alkaline', 'Undersaturated', 'Phonolite', 'Basanite'],
  },
  {
    id: 'normative-hypersthene',
    term: 'Normative Hypersthene (Hy)',
    acronym: 'Hy',
    category: 'Mineral Stoichiometry & CIPW',
    definition:
      'Orthopyroxene calculated in the CIPW norm from remaining MgO and FeO when SiO₂ is sufficient to form metasilicate instead of orthosilicate (olivine).',
    formula: '(Mg,Fe)SiO₃',
    significance:
      'Abundant in tholeiitic and calc-alkaline basalts, andesites, and gabbros. Signifies silica-saturated or mildly oversaturated conditions.',
    tags: ['Pyroxene', 'Tholeiite', 'Orthopyroxene', 'Mafic'],
  },
  {
    id: 'normative-diopside',
    term: 'Normative Diopside (Di)',
    acronym: 'Di',
    category: 'Mineral Stoichiometry & CIPW',
    definition:
      'Clinopyroxene calculated from stoichiometric allocation of CaO with equivalent (Mg,Fe)O and 2 SiO₂.',
    formula: 'Ca(Mg,Fe)Si₂O₆',
    significance:
      'Major calcium-magnesium-iron pyroxene in normative mineralogy. Present across basaltic, andesitic, and alkaline suites.',
    tags: ['Clinopyroxene', 'Augite', 'Pyroxene', 'Basalt'],
  },
  {
    id: 'solid-solution',
    term: 'Mineral Solid Solution',
    category: 'Mineral Stoichiometry & CIPW',
    definition:
      'A homogeneous crystalline phase having a variable composition within fixed endmember limits, achieved via ionic substitution (e.g., Mg²⁺ ↔ Fe²⁺ in olivine; Na⁺Si⁴⁺ ↔ Ca²⁺Al³⁺ in plagioclase).',
    significance:
      'Governs continuous reaction series in Bowen’s reaction series. Compositions vary systematically with melt composition, temperature, and pressure.',
    tags: ['Crystallography', 'Bowen', 'Substitution', 'Olivine', 'Plagioclase'],
  },

  // --- 5. ANALYTICAL INSTRUMENTATION ---
  {
    id: 'epma',
    term: 'Electron Probe Microanalysis',
    acronym: 'EPMA',
    category: 'Analytical Instrumentation',
    definition:
      'A non-destructive quantitative micro-analytical technique that bombards a polished carbon-coated specimen with a focused electron beam (1–2 µm spot) and measures characteristic X-rays via Wavelength-Dispersive Spectrometers (WDS).',
    significance:
      'The gold standard for determining major and minor elemental concentrations in individual mineral phases, phenocryst zoning, and micro-inclusions with high precision (±0.01 wt%).',
    reference: 'Castaing (1951); Reed (2005)',
    tags: ['Microbeam', 'WDS', 'Spot Analysis', 'In Situ', 'Thin Section'],
  },
  {
    id: 'xrf',
    term: 'X-Ray Fluorescence Spectrometry',
    acronym: 'XRF',
    category: 'Analytical Instrumentation',
    definition:
      'An analytical method for bulk whole-rock elemental analysis based on secondary X-ray emission excited by primary X-ray bombardment, typically prepared as lithium borate fused glass beads for major oxides.',
    significance:
      'The benchmark method for whole-rock major oxide geochemistry (SiO₂, TiO₂, Al₂O₃, Fe₂O₃_total, MnO, MgO, CaO, Na₂O, K₂O, P₂O₅).',
    reference: 'Potts (1987)',
    tags: ['Whole-Rock', 'Fused Bead', 'Bulk Chemistry', 'Spectrometry'],
  },
  {
    id: 'anhydrous-normalization',
    term: '100% Anhydrous Normalization',
    category: 'Analytical Instrumentation',
    definition:
      'The mathematical recalculation of major oxide concentrations so their sum equals exactly 100.00 wt%, excluding volatiles such as H₂O⁺, H₂O⁻, CO₂, and Loss on Ignition (LOI).',
    formula: 'Oxide_normalized = (Oxide_measured / Sum_anhydrous) × 100',
    significance:
      'Mandated by the IUGS Subcommission prior to plotting on classification diagrams (TAS, AFM, QAPF) to eliminate distortion from post-magmatic weathering, hydration, and secondary alteration.',
    reference: 'Le Bas et al. (1986); Le Maitre (2002)',
    tags: ['Normalization', 'IUGS', 'Volatiles', 'LOI', 'QA/QC'],
  },
  {
    id: 'loss-on-ignition',
    term: 'Loss on Ignition',
    acronym: 'LOI',
    category: 'Analytical Instrumentation',
    definition:
      'The percentage weight loss measured after heating an oven-dried powdered rock sample to high temperature (typically 950–1050 °C) for several hours.',
    significance:
      'Approximates total volatile contents (H₂O trapped in hydrous minerals like clays, micas, amphiboles; CO₂ in carbonates; sulfur; organic matter). Fresh basalt typically has LOI < 1.0–1.5 wt%; higher LOI indicates alteration or weathering.',
    tags: ['Volatiles', 'Weathering', 'H2O', 'CO2', 'Alteration'],
  },
  {
    id: 'analytical-total',
    term: 'Analytical Sum / Verification Total',
    category: 'Analytical Instrumentation',
    definition:
      'The arithmetic sum of all major oxide weight percentages determined from an EPMA spot or XRF bulk analysis.',
    formula: 'Total = ∑(Oxide_wt%) + LOI',
    significance:
      'Key geochemical QA/QC metric. High-quality EPMA and XRF analyses should yield totals between 98.50% and 101.50%. Totals outside this range suggest unmeasured elements (F, Cl, B, Li), variable oxidation states, poor beam focus, or surface roughness.',
    tags: ['QA/QC', 'Data Verification', 'EPMA', 'Accuracy'],
  },
  {
    id: 'fe-oxidation-state',
    term: 'Ferrous vs. Ferric Iron Ratio',
    acronym: 'FeO vs. Fe₂O₃',
    category: 'Analytical Instrumentation',
    definition:
      'The partition of total iron into divalent (Fe²⁺, ferrous, FeO) and trivalent (Fe³⁺, ferric, Fe₂O₃) states. Most routine XRF and EPMA analyses measure total iron as either FeO* or Fe₂O₃*.',
    formula: 'Fe₂O₃ = 1.1113 × FeO ; FeO = 0.8998 × Fe₂O₃',
    significance:
      'Oxygen fugacity (fO₂) governs whether iron incorporates into silicates (olivine, pyroxene) or oxides (magnetite, hematite). Standard IUGS recalculation partitions FeO/Fe₂O₃ based on rock alkalinity or silica content (e.g., Middlemost, 1989).',
    reference: 'Middlemost (1989); Le Maitre (1976)',
    tags: ['fO2', 'Oxygen Fugacity', 'Magnetite', 'Redox', 'Iron'],
  },

  // --- 6. TECTONIC DISCRIMINANTS ---
  {
    id: 'morb',
    term: 'Mid-Ocean Ridge Basalt',
    acronym: 'MORB',
    category: 'Tectonic Discriminants',
    definition:
      'Tholeiitic basalt erupted at divergent oceanic plate boundaries (mid-ocean ridges), derived from partial melting of the depleted upper mantle (DMM).',
    significance:
      'Characterized by low K₂O (<0.2 wt%), low TiO₂ (~1.2–1.8 wt%), flat to LREE-depleted rare earth patterns, and lack of negative Nb-Ta anomalies. Serves as the geochemical reference baseline for oceanic crust.',
    tags: ['Ocean Ridge', 'Spreading Center', 'Tholeiite', 'Upper Mantle'],
  },
  {
    id: 'oib',
    term: 'Ocean Island Basalt',
    acronym: 'OIB',
    category: 'Tectonic Discriminants',
    definition:
      'Volcanic rocks associated with intraplate mantle plumes (hotspots, e.g., Hawaii, Iceland, Réunion), encompassing both tholeiitic and alkaline suites.',
    significance:
      'Enriched in incompatible trace elements (LILE, LREE, HFSE) and distinct radiogenic isotopic signatures, sampling deep, enriched mantle reservoirs (EM-1, EM-2, HIMU, FOZO).',
    tags: ['Plume', 'Hotspot', 'Hawaii', 'Alkaline', 'Intraplate'],
  },
  {
    id: 'iat-cab',
    term: 'Island Arc Tholeiite & Calc-Alkaline Basalt',
    acronym: 'IAT / CAB',
    category: 'Tectonic Discriminants',
    definition:
      'Basaltic rocks erupted at convergent plate margins (subduction zones) above subducting oceanic lithosphere.',
    significance:
      'Characterized by diagnostic subduction-zone geochemical signatures: pronounced enrichment in mobile Large Ion Lithophile Elements (LILE: Cs, Rb, Ba, Sr) and depletion in High Field Strength Elements (HFSE: Nb, Ta, Ti), creating the "arc fingerprint".',
    tags: ['Subduction', 'Arc', 'Volcanism', 'LILE', 'HFSE'],
  },
];
