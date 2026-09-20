import { BatchRowResult, OxideComposition } from '../types/geochem';
import { elementsToOxides } from '../data/stoichiometry';
import { identifyGeochemicalSample } from './geochemEngine';

/**
 * Robust CSV parser that handles quotes, commas, semicolons, tabs, and multiline cells
 */
export function parseCSV(content: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines: string[] = [];
  let currentLine = '';
  let insideQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"' || char === "'") {
      if (insideQuotes && nextChar === char) {
        currentLine += char;
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = '';
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
    } else {
      currentLine += char;
    }
  }

  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // Detect delimiter (comma, semicolon, tab)
  const headerLine = lines[0];
  let delimiter = ',';
  if (headerLine.includes('\t') && !headerLine.includes(',')) {
    delimiter = '\t';
  } else if (headerLine.includes(';') && !headerLine.includes(',')) {
    delimiter = ';';
  }

  const splitRow = (rowStr: string): string[] => {
    const values: string[] = [];
    let currentVal = '';
    let inQuote = false;

    for (let i = 0; i < rowStr.length; i++) {
      const c = rowStr[i];
      if (c === '"') {
        inQuote = !inQuote;
      } else if (c === delimiter && !inQuote) {
        values.push(currentVal.trim().replace(/^"|"$/g, ''));
        currentVal = '';
      } else {
        currentVal += c;
      }
    }
    values.push(currentVal.trim().replace(/^"|"$/g, ''));
    return values;
  };

  const rawHeaders = splitRow(lines[0]);
  const headers = rawHeaders.map((h) => h.trim());

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = splitRow(lines[i]);
    if (vals.length === 0 || vals.every((v) => !v)) continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((hdr, idx) => {
      rowObj[hdr] = vals[idx] !== undefined ? vals[idx] : '';
    });
    rows.push(rowObj);
  }

  return { headers, rows };
}

/**
 * Standardizes messy CSV column headers into recognized oxide or element keys
 */
export function mapHeaderToGeochem(rawHeader: string): { key: string; isElement: boolean } | null {
  const clean = rawHeader
    .trim()
    .toLowerCase()
    .replace(/[\s_\-%()\[\]\/\\]/g, '');

  // Sample ID
  if (
    clean === 'sample' ||
    clean === 'sampleid' ||
    clean === 'id' ||
    clean === 'name' ||
    clean === 'samplename' ||
    clean === 'specimen'
  ) {
    return { key: 'sample_id', isElement: false };
  }

  // Oxides
  if (clean.startsWith('sio2')) return { key: 'SiO2', isElement: false };
  if (clean.startsWith('tio2')) return { key: 'TiO2', isElement: false };
  if (clean.startsWith('al2o3')) return { key: 'Al2O3', isElement: false };
  if (clean.startsWith('fe2o3')) return { key: 'Fe2O3', isElement: false };
  if (clean === 'feo' || clean.startsWith('feowt')) return { key: 'FeO', isElement: false };
  if (clean === 'feot' || clean === 'feotot' || clean === 'totalfe' || clean === 'fetotal') {
    return { key: 'FeOT', isElement: false };
  }
  if (clean.startsWith('mno')) return { key: 'MnO', isElement: false };
  if (clean.startsWith('mgo')) return { key: 'MgO', isElement: false };
  if (clean.startsWith('cao')) return { key: 'CaO', isElement: false };
  if (clean.startsWith('na2o')) return { key: 'Na2O', isElement: false };
  if (clean.startsWith('k2o')) return { key: 'K2O', isElement: false };
  if (clean.startsWith('p2o5')) return { key: 'P2O5', isElement: false };
  if (clean.startsWith('cr2o3')) return { key: 'Cr2O3', isElement: false };
  if (clean.startsWith('nio')) return { key: 'NiO', isElement: false };
  if (clean.startsWith('loi') || clean === 'h2o' || clean === 'h2oplus' || clean === 'lossonignition') {
    return { key: 'LOI', isElement: false };
  }

  // Elements (pure wt%)
  if (clean === 'si' || clean === 'silicon') return { key: 'Si', isElement: true };
  if (clean === 'ti' || clean === 'titanium') return { key: 'Ti', isElement: true };
  if (clean === 'al' || clean === 'aluminum') return { key: 'Al', isElement: true };
  if (clean === 'fe' || clean === 'iron') return { key: 'Fe', isElement: true };
  if (clean === 'mn' || clean === 'manganese') return { key: 'Mn', isElement: true };
  if (clean === 'mg' || clean === 'magnesium') return { key: 'Mg', isElement: true };
  if (clean === 'ca' || clean === 'calcium') return { key: 'Ca', isElement: true };
  if (clean === 'na' || clean === 'sodium') return { key: 'Na', isElement: true };
  if (clean === 'k' || clean === 'potassium') return { key: 'K', isElement: true };
  if (clean === 'p' || clean === 'phosphorus') return { key: 'P', isElement: true };
  if (clean === 'cr' || clean === 'chromium') return { key: 'Cr', isElement: true };
  if (clean === 'ni' || clean === 'nickel') return { key: 'Ni', isElement: true };

  return null;
}

/**
 * Processes parsed CSV rows in batch through the geochemical identification engine
 */
export function processBatchCSV(
  rows: Record<string, string>[]
): BatchRowResult[] {
  // Support up to 100 samples per batch import
  const targetRows = rows.slice(0, 100);

  return targetRows.map((row, index) => {
    const rawOxides: OxideComposition = {};
    const rawElements: Record<string, number> = {};
    let sampleId = `Sample_${index + 1}`;
    let hasElements = false;

    for (const [rawHdr, valStr] of Object.entries(row)) {
      if (!valStr || valStr.trim() === '') continue;
      const num = parseFloat(valStr.replace(/,/g, '.'));
      if (isNaN(num)) {
        if (rawHdr.toLowerCase().includes('sample') || rawHdr.toLowerCase().includes('id') || rawHdr.toLowerCase().includes('name')) {
          sampleId = valStr.trim();
        }
        continue;
      }

      const mapping = mapHeaderToGeochem(rawHdr);
      if (!mapping) continue;

      if (mapping.key === 'sample_id') {
        sampleId = valStr.trim();
      } else if (mapping.isElement) {
        rawElements[mapping.key] = num;
        hasElements = true;
      } else {
        rawOxides[mapping.key] = num;
      }
    }

    // If elements are present and oxides are scarce, convert elements to oxides
    let finalOxides = { ...rawOxides };
    if (hasElements && Object.keys(rawOxides).length <= 2) {
      finalOxides = { ...elementsToOxides(rawElements), ...rawOxides };
    }

    const report = identifyGeochemicalSample(finalOxides, sampleId, hasElements ? 'element' : 'oxide');

    // Quality check on total wt%
    let qualityStatus: BatchRowResult['qualityStatus'] = 'Acceptable (95-105%)';
    if (report.rawTotal >= 98.0 && report.rawTotal <= 102.0) {
      qualityStatus = 'Good (98-102%)';
    } else if (report.rawTotal < 95.0) {
      qualityStatus = 'Low Total (<95%)';
    } else if (report.rawTotal > 105.0) {
      qualityStatus = 'High Total (>105%)';
    }

    const primary = report.bestOverall;
    const isRock = primary?.type === 'rock';
    const primaryName = primary?.reference?.name || 'Unknown Specimen';
    const primaryConfidence = primary?.confidence ?? 0;

    // Secondary candidate
    let secondaryName = 'None';
    let secondaryConfidence = 0;
    if (isRock) {
      if (report.topRocks[1]?.reference?.name) {
        secondaryName = report.topRocks[1].reference.name;
        secondaryConfidence = report.topRocks[1].confidence;
      }
    } else {
      if (report.topMinerals[1]?.reference?.name) {
        secondaryName = report.topMinerals[1].reference.name;
        secondaryConfidence = report.topMinerals[1].confidence;
      }
    }

    return {
      rowNumber: index + 1,
      sampleId,
      rawOxides,
      normalizedOxides: report.normalizedOxides,
      totalWt: report.rawTotal,
      identifiedCategory: isRock ? 'Rock' : 'Mineral',
      primaryName,
      primaryConfidence,
      secondaryName,
      secondaryConfidence,
      tasField: report.tasField,
      rockClass: isRock ? (primary.reference as any).category : undefined,
      mineralGroup: !isRock ? (primary.reference as any).group : undefined,
      qualityStatus,
      notes: `${report.alkaliAffinity}; ${report.dataQualityWarning || 'Good analytical fit'}`,
      cipwNorm: report.cipwNorm,
      stoichiometry: report.stoichiometry,
      alkaliAffinity: report.alkaliAffinity,
    };
  });
}

const escapeCSV = (val: any) => {
  if (val === undefined || val === null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Generates an exportable CSV string with classified outcomes
 */
export function exportBatchToCSV(results: BatchRowResult[]): string {
  const headers = [
    'Sample_ID',
    'Identified_Type',
    'Primary_Classification',
    'Confidence_Percent',
    'Secondary_Match',
    'Secondary_Confidence',
    'TAS_Field',
    'Quality_Status',
    'Total_wt%',
    'SiO2_norm',
    'TiO2_norm',
    'Al2O3_norm',
    'FeOT_norm',
    'MnO_norm',
    'MgO_norm',
    'CaO_norm',
    'Na2O_norm',
    'K2O_norm',
    'P2O5_norm',
    'Notes',
  ];

  const rows = results.map((r) => [
    escapeCSV(r.sampleId),
    escapeCSV(r.identifiedCategory),
    escapeCSV(r.primaryName),
    r.primaryConfidence,
    escapeCSV(r.secondaryName),
    r.secondaryConfidence,
    escapeCSV(r.tasField),
    escapeCSV(r.qualityStatus),
    r.totalWt,
    r.normalizedOxides.SiO2 ?? '',
    r.normalizedOxides.TiO2 ?? '',
    r.normalizedOxides.Al2O3 ?? '',
    r.normalizedOxides.FeOT ?? r.normalizedOxides.FeO ?? '',
    r.normalizedOxides.MnO ?? '',
    r.normalizedOxides.MgO ?? '',
    r.normalizedOxides.CaO ?? '',
    r.normalizedOxides.Na2O ?? '',
    r.normalizedOxides.K2O ?? '',
    r.normalizedOxides.P2O5 ?? '',
    escapeCSV(r.notes),
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

/**
 * Generates a comprehensive CSV export containing full geochemical analysis,
 * including classification results, calculated stoichiometry (APFU), petrological indices,
 * and CIPW normative mineralogy.
 */
export function exportBatchComprehensiveCSV(results: BatchRowResult[]): string {
  const headers = [
    'Sample_ID',
    'Classification_Primary',
    'Type',
    'Confidence_%',
    'Classification_Secondary',
    'Secondary_Confidence_%',
    'TAS_Field',
    'Alkali_Affinity',
    'Quality_Status',
    'Raw_Total_wt%',
    // Raw Input Oxides
    'SiO2_raw',
    'TiO2_raw',
    'Al2O3_raw',
    'Fe2O3_raw',
    'FeO_raw',
    'FeOT_raw',
    'MnO_raw',
    'MgO_raw',
    'CaO_raw',
    'Na2O_raw',
    'K2O_raw',
    'P2O5_raw',
    'LOI_raw',
    // Normalized Anhydrous Oxides (100% Volatile-Free)
    'SiO2_norm',
    'TiO2_norm',
    'Al2O3_norm',
    'FeOT_norm',
    'MnO_norm',
    'MgO_norm',
    'CaO_norm',
    'Na2O_norm',
    'K2O_norm',
    'P2O5_norm',
    // Calculated Stoichiometry (APFU)
    'Oxygen_Basis',
    'Si_apfu',
    'Ti_apfu',
    'Al_apfu',
    'Fe_apfu',
    'Mn_apfu',
    'Mg_apfu',
    'Ca_apfu',
    'Na_apfu',
    'K_apfu',
    'P_apfu',
    'Total_Cations',
    // Petrological & Geochemical Indices
    'Mg_Number_Mg#',
    'ASI_A_CNK_mol',
    'A_NK_mol',
    'Fe_Index',
    'Total_Alkalis_wt%',
    'Silica_Saturation',
    // CIPW Normative Minerals (wt%)
    'CIPW_Q',
    'CIPW_Or',
    'CIPW_Ab',
    'CIPW_An',
    'CIPW_Di',
    'CIPW_Hy',
    'CIPW_Ol',
    'CIPW_Ne',
    'CIPW_Mt',
    'CIPW_Il',
    'CIPW_Ap',
    'Notes',
  ];

  const rows = results.map((r) => {
    const raw = r.rawOxides || {};
    const norm = r.normalizedOxides || {};
    const stoich = r.stoichiometry || { cations: {}, oxygenBasis: 6, totalCations: 0 };
    const cipw = r.cipwNorm || {};
    const cats = stoich.cations || {};

    return [
      escapeCSV(r.sampleId),
      escapeCSV(r.primaryName),
      escapeCSV(r.identifiedCategory),
      r.primaryConfidence,
      escapeCSV(r.secondaryName),
      r.secondaryConfidence,
      escapeCSV(r.tasField),
      escapeCSV(r.alkaliAffinity || ''),
      escapeCSV(r.qualityStatus),
      r.totalWt,
      // Raw Oxides
      raw.SiO2 ?? '',
      raw.TiO2 ?? '',
      raw.Al2O3 ?? '',
      raw.Fe2O3 ?? '',
      raw.FeO ?? '',
      raw.FeOT ?? '',
      raw.MnO ?? '',
      raw.MgO ?? '',
      raw.CaO ?? '',
      raw.Na2O ?? '',
      raw.K2O ?? '',
      raw.P2O5 ?? '',
      raw.LOI ?? '',
      // Norm Oxides
      norm.SiO2 ?? '',
      norm.TiO2 ?? '',
      norm.Al2O3 ?? '',
      norm.FeOT ?? norm.FeO ?? '',
      norm.MnO ?? '',
      norm.MgO ?? '',
      norm.CaO ?? '',
      norm.Na2O ?? '',
      norm.K2O ?? '',
      norm.P2O5 ?? '',
      // Stoichiometry APFU
      stoich.oxygenBasis,
      cats.Si ?? '',
      cats.Ti ?? '',
      cats.Al ?? '',
      cats.Fe ?? cats['Fe2+'] ?? '',
      cats.Mn ?? '',
      cats.Mg ?? '',
      cats.Ca ?? '',
      cats.Na ?? '',
      cats.K ?? '',
      cats.P ?? '',
      stoich.totalCations ?? '',
      // Petrogenetic Indices
      stoich.mgNumber ?? '',
      stoich.asi ?? '',
      stoich.ank ?? '',
      stoich.feIndex ?? '',
      stoich.totalAlkalis ?? '',
      escapeCSV(stoich.silicaSaturation || ''),
      // CIPW Norm
      cipw.Q ?? '',
      cipw.Or ?? '',
      cipw.Ab ?? '',
      cipw.An ?? '',
      cipw.Di ?? '',
      cipw.Hy ?? '',
      cipw.Ol ?? '',
      cipw.Ne ?? '',
      cipw.Mt ?? '',
      cipw.Il ?? '',
      cipw.Ap ?? '',
      escapeCSV(r.notes),
    ];
  });

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

/**
 * Pre-compiled benchmark datasets for 1-click loading and testing
 */
export const SAMPLE_BENCHMARK_CSVS = {
  georocVolcanicSuite: `Sample_ID,SiO2,TiO2,Al2O3,FeOT,MnO,MgO,CaO,Na2O,K2O,P2O5,LOI
MORB-EPR-01,50.32,1.52,15.41,9.85,0.18,7.82,11.45,2.68,0.15,0.14,0.48
OIB-KILAUEA-83,51.12,2.71,13.82,11.55,0.17,7.15,10.42,2.35,0.52,0.28,0.35
ANDESITE-FUJI-09,58.85,0.92,16.92,6.85,0.14,3.48,6.45,3.62,1.88,0.22,0.85
RHYOLITE-YELLOWSTONE,74.15,0.24,13.48,2.15,0.06,0.38,1.25,3.72,4.42,0.05,0.65
PICRITE-REUNION,44.82,1.48,9.45,12.50,0.19,21.20,8.15,1.38,0.32,0.18,1.20
TRACHYTE-CAMPANIA,62.15,0.68,17.42,4.55,0.13,0.98,1.98,5.75,5.65,0.24,0.92
PHONOLITE-DEVILS,56.70,0.52,19.92,4.12,0.15,0.68,1.82,8.55,5.78,0.15,1.85
KOMATIITE-BARBERTON,46.15,0.45,6.85,11.40,0.19,28.20,5.55,0.42,0.09,0.04,2.85`,

  epmaMineralsSuite: `Sample_ID,SiO2,TiO2,Al2O3,FeO,MnO,MgO,CaO,Na2O,K2O,Cr2O3
OLIVINE_FO90,41.25,0.02,0.05,9.85,0.15,48.60,0.25,0.01,0.00,0.15
AUGITE_CPX,51.20,1.15,4.60,8.20,0.18,15.40,18.90,0.68,0.02,0.45
LABRADORITE_AN60,54.80,0.08,28.40,0.45,0.01,0.12,12.10,3.90,0.35,0.00
K_FELDSPAR_OR90,64.60,0.02,18.45,0.10,0.00,0.02,0.15,1.20,15.60,0.00
GARNET_PYROPE,44.20,0.35,24.80,8.50,0.45,21.50,4.80,0.02,0.01,1.85
DIOPSIDE_SKARN,54.80,0.12,0.85,1.40,0.08,18.20,25.40,0.15,0.01,0.02
QUARTZ_VEIN,99.85,0.02,0.08,0.02,0.00,0.01,0.01,0.01,0.01,0.00`,

  crustalAndSedimentarySuite: `Sample_ID,SiO2,TiO2,Al2O3,Fe2O3,MnO,MgO,CaO,Na2O,K2O,P2O5,LOI
PAAS_SHALE_STANDARD,62.80,1.00,18.90,7.20,0.11,2.20,1.30,1.20,3.70,0.16,5.50
QUARTZ_ARENITE_STPETER,96.40,0.15,1.75,0.60,0.02,0.12,0.22,0.08,0.32,0.02,0.55
ARKOSE_FOUNTAIN,76.20,0.38,12.10,2.65,0.04,0.82,1.35,2.10,3.95,0.08,1.20
LIMESTONE_MICRITE,3.50,0.08,0.92,0.45,0.03,1.25,51.80,0.05,0.15,0.04,41.80
DOLOSTONE_LOCKPORT,4.10,0.09,1.05,0.62,0.04,19.60,30.40,0.06,0.18,0.03,43.70
GRANITE_S_VARISCAN,73.40,0.24,14.65,2.10,0.04,0.52,0.92,3.10,4.90,0.20,0.75
DUNITE_MANTLE_XENO,40.60,0.04,0.85,9.15,0.14,48.20,0.60,0.04,0.01,0.01,0.85`,
};
