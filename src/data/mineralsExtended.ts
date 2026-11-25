import { MineralGroup, MineralReference, OxideComposition } from '../types/geochem';

/**
 * Additional curated minerals: common rock-forming, metamorphic, accessory
 * and meteoritic phases missing from the original set.
 *
 * Ideal compositions are not typed in. Each is computed here from its
 * end-member formula, written as moles of oxide per formula unit, so the
 * numbers can be checked against the formula by reading one line. Water is
 * carried as LOI and carbonate as CO2 (also counted in LOI), following the
 * existing entries; the engine excludes both from the volatile-free basis.
 */

const MW: Record<string, number> = {
  SiO2: 60.084, TiO2: 79.866, Al2O3: 101.961, Cr2O3: 151.99, Fe2O3: 159.688, FeO: 71.844,
  MnO: 70.937, MgO: 40.304, CaO: 56.077, BaO: 153.326, Na2O: 61.979, K2O: 94.196,
  P2O5: 141.945, SO3: 80.063, CO2: 44.009, H2O: 18.015,
};

/** wt% oxides from moles of oxide per formula unit, summing to 100. */
export function oxidesFromMoles(moles: Record<string, number>): OxideComposition {
  const mass = Object.entries(moles).map(([ox, n]) => [ox, n * MW[ox]] as const);
  const total = mass.reduce((s, [, m]) => s + m, 0);
  const out: OxideComposition = {};
  for (const [ox, m] of mass) {
    const pct = Math.round((1e4 * m) / total) / 100;
    if (ox === 'H2O') out.LOI = (out.LOI ?? 0) + pct;
    else {
      out[ox] = pct;
      if (ox === 'CO2') out.LOI = (out.LOI ?? 0) + pct;
    }
  }
  return out;
}

interface Def {
  id: string;
  name: string;
  formula: string;
  group: MineralGroup;
  crystalSystem: string;
  moles: Record<string, number>;
  description: string;
}

const DEFS: Def[] = [
  // --- Nesosilicates -----------------------------------------------------
  { id: 'min-monticellite', name: 'Monticellite (Ca-Mg Olivine)', formula: 'CaMgSiO4', group: 'Nesosilicate', crystalSystem: 'Orthorhombic',
    moles: { CaO: 1, MgO: 1, SiO2: 1 }, description: 'Ca-olivine of contact-metamorphosed siliceous dolomites, kimberlites and melilitites.' },
  { id: 'min-tephroite', name: 'Tephroite (Mn-Olivine)', formula: 'Mn2SiO4', group: 'Nesosilicate', crystalSystem: 'Orthorhombic',
    moles: { MnO: 2, SiO2: 1 }, description: 'Manganese end-member of the olivine group, in Mn-rich metamorphic and skarn deposits.' },
  { id: 'min-uvarovite', name: 'Uvarovite (Ca-Cr Garnet)', formula: 'Ca3Cr2Si3O12', group: 'Nesosilicate', crystalSystem: 'Cubic',
    moles: { CaO: 3, Cr2O3: 1, SiO2: 3 }, description: 'Chromium garnet of serpentinites, chromitites and metamorphosed chromite-bearing rocks.' },
  { id: 'min-chloritoid', name: 'Chloritoid', formula: 'FeAl2SiO5(OH)2', group: 'Nesosilicate', crystalSystem: 'Monoclinic',
    moles: { FeO: 1, Al2O3: 1, SiO2: 1, H2O: 1 }, description: 'Index mineral of Fe-Al-rich metapelites at greenschist to lower amphibolite facies.' },
  // --- Sorosilicates -----------------------------------------------------
  { id: 'min-zoisite', name: 'Zoisite / Clinozoisite (Epidote group)', formula: 'Ca2Al3Si3O12(OH)', group: 'Sorosilicate', crystalSystem: 'Orthorhombic / Monoclinic',
    moles: { CaO: 2, Al2O3: 1.5, SiO2: 3, H2O: 0.5 }, description: 'Fe-poor epidote-group phase of metabasites, calc-silicates and saussuritized plagioclase.' },
  { id: 'min-lawsonite', name: 'Lawsonite', formula: 'CaAl2Si2O7(OH)2·H2O', group: 'Sorosilicate', crystalSystem: 'Orthorhombic',
    moles: { CaO: 1, Al2O3: 1, SiO2: 2, H2O: 2 }, description: 'High-pressure, low-temperature mineral of blueschists and subducted oceanic crust.' },
  { id: 'min-gehlenite', name: 'Gehlenite (Melilite)', formula: 'Ca2Al2SiO7', group: 'Sorosilicate', crystalSystem: 'Tetragonal',
    moles: { CaO: 2, Al2O3: 1, SiO2: 1 }, description: 'Al end-member of melilite; in melilitites, high-temperature skarns and Ca-Al-rich inclusions of chondrites.' },
  { id: 'min-akermanite', name: 'Åkermanite (Melilite)', formula: 'Ca2MgSi2O7', group: 'Sorosilicate', crystalSystem: 'Tetragonal',
    moles: { CaO: 2, MgO: 1, SiO2: 2 }, description: 'Mg end-member of melilite; in melilitites, kimberlites and Ca-Al-rich inclusions.' },
  // --- Cyclosilicates ----------------------------------------------------
  { id: 'min-cordierite', name: 'Cordierite', formula: 'Mg2Al4Si5O18', group: 'Cyclosilicate', crystalSystem: 'Orthorhombic',
    moles: { MgO: 2, Al2O3: 2, SiO2: 5 }, description: 'Low-pressure, high-temperature mineral of hornfelses, migmatites and peraluminous granites.' },
  // --- Inosilicates ------------------------------------------------------
  { id: 'min-wollastonite', name: 'Wollastonite (Pyroxenoid)', formula: 'CaSiO3', group: 'Inosilicate', crystalSystem: 'Triclinic',
    moles: { CaO: 1, SiO2: 1 }, description: 'Product of limestone-silica reaction in skarns and contact aureoles; also in some alkaline rocks.' },
  { id: 'min-rhodonite', name: 'Rhodonite (Pyroxenoid)', formula: 'CaMn4Si5O15', group: 'Inosilicate', crystalSystem: 'Triclinic',
    moles: { CaO: 1, MnO: 4, SiO2: 5 }, description: 'Manganese pyroxenoid of metamorphosed Mn-rich sediments and hydrothermal deposits.' },
  { id: 'min-pargasite', name: 'Pargasite', formula: 'NaCa2(Mg4Al)(Si6Al2)O22(OH)2', group: 'Inosilicate', crystalSystem: 'Monoclinic',
    moles: { Na2O: 0.5, CaO: 2, MgO: 4, Al2O3: 1.5, SiO2: 6, H2O: 1 }, description: 'Aluminous calcic amphibole of mantle peridotites, amphibolites and hydrous basalts.' },
  { id: 'min-riebeckite', name: 'Riebeckite (Na-Amphibole)', formula: 'Na2Fe2+3Fe3+2Si8O22(OH)2', group: 'Inosilicate', crystalSystem: 'Monoclinic',
    moles: { Na2O: 1, FeO: 3, Fe2O3: 1, SiO2: 8, H2O: 1 }, description: 'Sodic amphibole of peralkaline granites and syenites, and of banded iron formations.' },
  { id: 'min-cummingtonite', name: 'Cummingtonite (Mg-Fe Amphibole)', formula: '(Mg3.5Fe3.5)Si8O22(OH)2', group: 'Inosilicate', crystalSystem: 'Monoclinic',
    moles: { MgO: 3.5, FeO: 3.5, SiO2: 8, H2O: 1 }, description: 'Ca-poor monoclinic amphibole of amphibolite-facies metabasites and Fe-rich metasediments; mid-series composition.' },
  { id: 'min-anthophyllite', name: 'Anthophyllite (Mg-Amphibole)', formula: 'Mg7Si8O22(OH)2', group: 'Inosilicate', crystalSystem: 'Orthorhombic',
    moles: { MgO: 7, SiO2: 8, H2O: 1 }, description: 'Orthorhombic Ca-poor amphibole of metamorphosed ultramafic rocks; Mg end-member.' },
  // --- Tectosilicates ----------------------------------------------------
  { id: 'min-anorthoclase', name: 'Anorthoclase (Alkali Feldspar)', formula: '(Na0.75K0.25)AlSi3O8', group: 'Tectosilicate', crystalSystem: 'Triclinic',
    moles: { Na2O: 0.375, K2O: 0.125, Al2O3: 0.5, SiO2: 3 }, description: 'Na-rich high-temperature alkali feldspar of trachytes, phonolites and alkali basalts.' },
  { id: 'min-celsian', name: 'Celsian (Ba-Feldspar)', formula: 'BaAl2Si2O8', group: 'Tectosilicate', crystalSystem: 'Monoclinic',
    moles: { BaO: 1, Al2O3: 1, SiO2: 2 }, description: 'Barium feldspar of Mn-Ba metasediments and some alkaline rocks.' },
  { id: 'min-kalsilite', name: 'Kalsilite (Feldspathoid)', formula: 'KAlSiO4', group: 'Tectosilicate', crystalSystem: 'Hexagonal',
    moles: { K2O: 0.5, Al2O3: 0.5, SiO2: 1 }, description: 'Potassic feldspathoid of ultrapotassic lavas such as kamafugites.' },
  { id: 'min-analcime', name: 'Analcime', formula: 'NaAlSi2O6·H2O', group: 'Tectosilicate', crystalSystem: 'Cubic',
    moles: { Na2O: 0.5, Al2O3: 0.5, SiO2: 2, H2O: 1 }, description: 'Sodium zeolite of altered alkaline rocks, analcimites and low-grade metamorphic rocks.' },
  // --- Phyllosilicates ---------------------------------------------------
  { id: 'min-paragonite', name: 'Paragonite (Na White Mica)', formula: 'NaAl2(AlSi3O10)(OH)2', group: 'Phyllosilicate', crystalSystem: 'Monoclinic',
    moles: { Na2O: 0.5, Al2O3: 1.5, SiO2: 3, H2O: 1 }, description: 'Sodium white mica of metapelites and blueschist- to eclogite-facies rocks.' },
  { id: 'min-pyrophyllite', name: 'Pyrophyllite', formula: 'Al2Si4O10(OH)2', group: 'Phyllosilicate', crystalSystem: 'Monoclinic',
    moles: { Al2O3: 1, SiO2: 4, H2O: 1 }, description: 'Aluminous sheet silicate of low-grade metapelites and hydrothermally altered (advanced argillic) rocks.' },
  { id: 'min-prehnite', name: 'Prehnite', formula: 'Ca2Al2Si3O10(OH)2', group: 'Phyllosilicate', crystalSystem: 'Orthorhombic',
    moles: { CaO: 2, Al2O3: 1, SiO2: 3, H2O: 1 }, description: 'Low-grade metamorphic mineral (prehnite-pumpellyite facies) and vesicle filling in basalts.' },
  // --- Oxides ------------------------------------------------------------
  { id: 'min-spinel', name: 'Spinel (Mg-Al Spinel)', formula: 'MgAl2O4', group: 'Oxide', crystalSystem: 'Cubic',
    moles: { MgO: 1, Al2O3: 1 }, description: 'Aluminous spinel of mantle peridotites, marbles and high-temperature metamorphic rocks.' },
  { id: 'min-hercynite', name: 'Hercynite (Fe-Spinel)', formula: 'FeAl2O4', group: 'Oxide', crystalSystem: 'Cubic',
    moles: { FeO: 1, Al2O3: 1 }, description: 'Iron-aluminium spinel of high-grade aluminous metapelites and emery.' },
  { id: 'min-ulvospinel', name: 'Ulvöspinel (Ti-Spinel)', formula: 'Fe2TiO4', group: 'Oxide', crystalSystem: 'Cubic',
    moles: { FeO: 2, TiO2: 1 }, description: 'Titanium end-member of the magnetite series; in basalts, gabbros and lunar rocks.' },
  { id: 'min-corundum', name: 'Corundum', formula: 'Al2O3', group: 'Oxide', crystalSystem: 'Trigonal',
    moles: { Al2O3: 1 }, description: 'Aluminium oxide of silica-undersaturated, Al-rich metamorphic rocks, syenite pegmatites and emery.' },
  { id: 'min-perovskite', name: 'Perovskite', formula: 'CaTiO3', group: 'Oxide', crystalSystem: 'Orthorhombic',
    moles: { CaO: 1, TiO2: 1 }, description: 'Ca-titanate of kimberlites, melilitites, carbonatites and Ca-Al-rich inclusions of chondrites.' },
  { id: 'min-geikielite', name: 'Geikielite (Mg-Ilmenite)', formula: 'MgTiO3', group: 'Oxide', crystalSystem: 'Trigonal',
    moles: { MgO: 1, TiO2: 1 }, description: 'Magnesium end-member of the ilmenite group; in kimberlites and marbles.' },
  { id: 'min-pyrophanite', name: 'Pyrophanite (Mn-Ilmenite)', formula: 'MnTiO3', group: 'Oxide', crystalSystem: 'Trigonal',
    moles: { MnO: 1, TiO2: 1 }, description: 'Manganese end-member of the ilmenite group; in Mn-rich metamorphic rocks and granites.' },
  { id: 'min-periclase', name: 'Periclase', formula: 'MgO', group: 'Oxide', crystalSystem: 'Cubic',
    moles: { MgO: 1 }, description: 'Magnesium oxide of high-temperature contact-metamorphosed dolomites.' },
  // --- Carbonates --------------------------------------------------------
  { id: 'min-magnesite', name: 'Magnesite', formula: 'MgCO3', group: 'Carbonate', crystalSystem: 'Trigonal',
    moles: { MgO: 1, CO2: 1 }, description: 'Magnesium carbonate of altered ultramafic rocks and evaporites.' },
  { id: 'min-siderite', name: 'Siderite', formula: 'FeCO3', group: 'Carbonate', crystalSystem: 'Trigonal',
    moles: { FeO: 1, CO2: 1 }, description: 'Iron carbonate of sedimentary ironstones, hydrothermal veins and carbonatites.' },
  { id: 'min-rhodochrosite', name: 'Rhodochrosite', formula: 'MnCO3', group: 'Carbonate', crystalSystem: 'Trigonal',
    moles: { MnO: 1, CO2: 1 }, description: 'Manganese carbonate of hydrothermal veins and Mn-rich sediments.' },
  { id: 'min-ankerite', name: 'Ankerite (Dolomite group)', formula: 'CaFe(CO3)2', group: 'Carbonate', crystalSystem: 'Trigonal',
    moles: { CaO: 1, FeO: 1, CO2: 2 }, description: 'Fe-rich dolomite-group carbonate of hydrothermal and low-grade metamorphic rocks; Fe end-member.' },
  // --- Phosphates and sulfates -------------------------------------------
  { id: 'min-merrillite', name: 'Merrillite (Phosphate)', formula: 'Ca9NaMg(PO4)7', group: 'Phosphate', crystalSystem: 'Trigonal',
    moles: { CaO: 9, Na2O: 0.5, MgO: 1, P2O5: 3.5 }, description: 'Anhydrous Ca phosphate of ordinary chondrites, martian and lunar rocks; the main phosphate in many meteorites.' },
  { id: 'min-anhydrite', name: 'Anhydrite', formula: 'CaSO4', group: 'Sulfate', crystalSystem: 'Orthorhombic',
    moles: { CaO: 1, SO3: 1 }, description: 'Anhydrous calcium sulfate of evaporites and porphyry-copper alteration zones.' },
  { id: 'min-barite', name: 'Barite', formula: 'BaSO4', group: 'Sulfate', crystalSystem: 'Orthorhombic',
    moles: { BaO: 1, SO3: 1 }, description: 'Barium sulfate of hydrothermal veins, sedimentary exhalative deposits and cold seeps.' },
];

export const MINERALS_EXTENDED: MineralReference[] = DEFS.map((d) => ({
  id: d.id,
  name: d.name,
  formula: d.formula,
  group: d.group,
  crystalSystem: d.crystalSystem,
  idealOxides: oxidesFromMoles(d.moles),
  description: d.description,
  source: 'curated',
}));
