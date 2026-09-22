import type { jsPDF as JsPdfType } from 'jspdf';
import { PETROLOGICAL_GLOSSARY } from '../data/petrologicalGlossary';

/**
 * High-quality, publication-grade PDF manual generator for RockMin ID.
 * Features:
 * - Mathematical coordinate positioning with strict margin bounds.
 * - Dynamic word wrapping (splitTextToSize) for all headers, cells, and body texts.
 * - Multi-page tables with auto-wrapping columns and row boundary handling.
 * - Flowcharts and diagram schematics built with vector primitives within bounds.
 * - Clean section cards, callouts, and running headers/footers with "Page X of Y".
 */
/**
 * Builds and downloads the PDF user manual.
 *
 * jsPDF (and its html2canvas/dompurify dependencies, ~635 kB) is imported
 * dynamically so the library is fetched only when a manual is actually
 * requested. A static import put it in the entry chunk's modulepreload list,
 * downloading it on every page load for every visitor.
 */
export async function generateRockMinManualPDF(): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc: JsPdfType = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 18;
  const contentWidth = pageWidth - margin * 2; // 174mm
  const footerReservedHeight = 16;
  const maxContentY = pageHeight - margin - footerReservedHeight; // 297 - 18 - 16 = 263mm
  let cursorY = margin;

  // Helper to trigger a clean page break and advance cursor
  const checkPageBreak = (neededHeight: number): void => {
    if (cursorY + neededHeight > maxContentY) {
      doc.addPage();
      cursorY = margin + 10;
    }
  };

  // Render a major section header block with accent bar
  const renderSectionHeader = (secNum: string, title: string, subtitle?: string): void => {
    checkPageBreak(subtitle ? 24 : 18);

    // Section number badge + title
    doc.setFillColor(41, 37, 36); // stone-800
    doc.roundedRect(margin, cursorY, 11, 7, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(251, 191, 36); // amber-400
    doc.text(secNum, margin + 5.5, cursorY + 4.8, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(28, 25, 23); // stone-900
    doc.text(title, margin + 14, cursorY + 5.2);
    cursorY += 8.5;

    if (subtitle) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(115, 115, 115);
      const subLines = doc.splitTextToSize(subtitle, contentWidth - 14);
      doc.text(subLines, margin + 14, cursorY);
      cursorY += subLines.length * 3.8 + 2;
    }

    doc.setDrawColor(217, 119, 6); // amber-600
    doc.setLineWidth(0.6);
    doc.line(margin, cursorY, margin + contentWidth, cursorY);
    cursorY += 5;
  };

  // Render subsection header (H3)
  const renderSubheader = (title: string): void => {
    checkPageBreak(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(67, 56, 202); // indigo-700 / slate
    doc.setTextColor(41, 37, 36);
    doc.text(title, margin, cursorY);
    cursorY += 5;
  };

  // Render regular wrapped paragraph
  const renderParagraph = (text: string, spaceAfter = 3.5): void => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(55, 65, 81);
    const lines = doc.splitTextToSize(text, contentWidth);
    checkPageBreak(lines.length * 3.9 + spaceAfter);
    doc.text(lines, margin, cursorY);
    cursorY += lines.length * 3.9 + spaceAfter;
  };

  // Render a bulleted item with bold label and wrapped body
  const renderBullet = (label: string, body: string, spaceAfter = 2.5): void => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const indent = 5;
    const bodyWidth = contentWidth - indent;

    const fullText = `${label}: ${body}`;
    const lines = doc.splitTextToSize(fullText, bodyWidth);
    checkPageBreak(lines.length * 3.9 + spaceAfter);

    // Bullet point symbol
    doc.setFillColor(217, 119, 6);
    doc.circle(margin + 2, cursorY + 1.8, 0.9, 'F');

    // Split text rendering: highlight label in bold
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(28, 25, 23);
    const labelWidth = doc.getTextWidth(`${label}: `);

    if (labelWidth < bodyWidth - 10 && lines.length > 0) {
      doc.text(`${label}: `, margin + indent, cursorY + 2.8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      const remainingBodyLines = doc.splitTextToSize(body, bodyWidth - labelWidth);
      doc.text(remainingBodyLines[0], margin + indent + labelWidth, cursorY + 2.8);

      if (remainingBodyLines.length > 1) {
        const restLines = doc.splitTextToSize(body.substring(remainingBodyLines[0].length).trim(), bodyWidth);
        doc.text(restLines, margin + indent, cursorY + 2.8 + 3.8);
        cursorY += (restLines.length + 1) * 3.8 + spaceAfter;
        return;
      }
      cursorY += 3.8 + spaceAfter;
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      doc.text(lines, margin + indent, cursorY + 2.8);
      cursorY += lines.length * 3.8 + spaceAfter;
    }
  };

  // Render highlighted callout note box
  const renderCallout = (title: string, message: string, variant: 'amber' | 'blue' | 'emerald' = 'amber'): void => {
    const lines = doc.splitTextToSize(message, contentWidth - 10);
    const boxHeight = lines.length * 3.8 + (title ? 11 : 7);
    checkPageBreak(boxHeight + 4);

    if (variant === 'amber') {
      doc.setFillColor(254, 252, 232); // amber-50
      doc.setDrawColor(245, 158, 11); // amber-500
    } else if (variant === 'blue') {
      doc.setFillColor(239, 246, 255); // blue-50
      doc.setDrawColor(59, 130, 246); // blue-500
    } else {
      doc.setFillColor(236, 253, 245); // emerald-50
      doc.setDrawColor(16, 185, 129); // emerald-500
    }

    doc.setLineWidth(0.4);
    doc.roundedRect(margin, cursorY, contentWidth, boxHeight, 1.5, 1.5, 'FD');

    let textY = cursorY + 5;
    if (title) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(variant === 'amber' ? 146 : variant === 'blue' ? 29 : 6, variant === 'amber' ? 64 : variant === 'blue' ? 78 : 95, variant === 'amber' ? 14 : variant === 'blue' ? 216 : 70);
      doc.text(title, margin + 5, textY);
      textY += 4.5;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(55, 65, 81);
    doc.text(lines, margin + 5, textY);

    cursorY += boxHeight + 4;
  };

  // Render clean, wrapped data table
  const renderTable = (
    headers: string[],
    rows: string[][],
    colWidths: number[],
    colAligns?: ('left' | 'center' | 'right')[]
  ): void => {
    const headerHeight = 7;
    checkPageBreak(headerHeight + 15);

    // Header row
    doc.setFillColor(41, 37, 36); // stone-800
    doc.rect(margin, cursorY, contentWidth, headerHeight, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);

    let currentX = margin;
    headers.forEach((h, idx) => {
      const w = colWidths[idx];
      const align = colAligns ? colAligns[idx] : 'left';
      const textX = align === 'center' ? currentX + w / 2 : align === 'right' ? currentX + w - 2 : currentX + 3;
      doc.text(h, textX, cursorY + 4.8, { align });
      currentX += w;
    });

    cursorY += headerHeight;

    // Body rows with multi-line wrap
    rows.forEach((row, rIdx) => {
      // Calculate max height needed for this row
      let maxLines = 1;
      const wrappedCells: string[][] = [];

      row.forEach((cell, cIdx) => {
        const w = colWidths[cIdx] - 4; // 2mm padding each side
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.8);
        const split = doc.splitTextToSize(cell, w);
        wrappedCells.push(split);
        if (split.length > maxLines) {
          maxLines = split.length;
        }
      });

      const rowHeight = Math.max(6, maxLines * 3.6 + 2.5);
      checkPageBreak(rowHeight);

      // Background zebra
      if (rIdx % 2 === 1) {
        doc.setFillColor(249, 250, 251); // stone-50
        doc.rect(margin, cursorY, contentWidth, rowHeight, 'F');
      }

      // Border lines
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.2);
      doc.line(margin, cursorY + rowHeight, margin + contentWidth, cursorY + rowHeight);

      // Render cells
      currentX = margin;
      row.forEach((_, cIdx) => {
        const w = colWidths[cIdx];
        const align = colAligns ? colAligns[cIdx] : 'left';
        const lines = wrappedCells[cIdx];
        const textX = align === 'center' ? currentX + w / 2 : align === 'right' ? currentX + w - 2 : currentX + 3;

        doc.setFont('helvetica', cIdx === 0 ? 'bold' : 'normal');
        doc.setFontSize(7.8);
        doc.setTextColor(31, 41, 55);
        doc.text(lines, textX, cursorY + 3.8, { align });

        currentX += w;
      });

      cursorY += rowHeight;
    });

    cursorY += 4;
  };

  // Render interactive process workflow diagram with connected boxes
  const renderWorkflowBoxes = (steps: string[]): void => {
    const numSteps = steps.length;
    const boxSpacing = 2.5;
    const totalSpacing = (numSteps - 1) * boxSpacing;
    const boxWidth = (contentWidth - totalSpacing) / numSteps;
    const boxHeight = 14;

    checkPageBreak(boxHeight + 5);

    steps.forEach((step, i) => {
      const bx = margin + i * (boxWidth + boxSpacing);

      // Box shape
      doc.setFillColor(254, 243, 199); // amber-100
      doc.setDrawColor(217, 119, 6); // amber-600
      doc.setLineWidth(0.35);
      doc.roundedRect(bx, cursorY, boxWidth, boxHeight, 1.5, 1.5, 'FD');

      // Step text wrapped inside box
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(146, 64, 14);

      const lines = doc.splitTextToSize(step, boxWidth - 3);
      const textStartY = cursorY + 4 + (boxHeight - 4 - lines.length * 3) / 2;
      doc.text(lines, bx + boxWidth / 2, textStartY, { align: 'center' });

      // Arrow indicator to next step
      if (i < numSteps - 1) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(180, 83, 9);
        doc.text('>', bx + boxWidth + 0.8, cursorY + boxHeight / 2 + 1, { align: 'center' });
      }
    });

    cursorY += boxHeight + 5;
  };

  // ==================== COVER PAGE ====================
  // Header Banner
  doc.setFillColor(28, 25, 23); // stone-900
  doc.rect(margin, cursorY, contentWidth, 34, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(251, 191, 36); // amber-400
  doc.text('RockMin ID', margin + 6, cursorY + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(245, 245, 244);
  doc.text('Professional User Manual, Analytical Guide & Technical Reference', margin + 6, cursorY + 21);

  doc.setFontSize(8);
  doc.setTextColor(214, 211, 209);
  doc.text('Calibrated with IUGS Le Maitre (2002) • GEOROC / PetDB Database • CIPW Norm • v2.4.0', margin + 6, cursorY + 28);

  cursorY += 40;

  // Metadata Table
  renderTable(
    ['Application Field', 'Specification & Metadata Details'],
    [
      ['Application', 'RockMin ID — Mineral & Rock Geochemical Identification Engine'],
      ['Creator & Author', 'Kishan Tiwari, Indian Institute of Technology Kharagpur (https://kishangeo.github.io)'],
      ['DOI', 'https://doi.org/10.5281/zenodo.22875578 — concept DOI, always the latest version. Version DOI for v2.4.0: 10.5281/zenodo.22875579'],
      ['Live application', 'https://rockminid.github.io/ — source at https://github.com/rockminid/rockminid.github.io'],
      ['Licence', 'MIT'],
      ['Purpose', 'Major-element geochemical screening, rock/mineral matching, classification diagrams, normative calculations, batch processing and specimen archiving.'],
      ['Target Audience', 'Petrologists, mineralogists, geochemists, planetary scientists, geology students, laboratory technicians, and researchers.'],
      ['Manual Scope', 'Comprehensive documentation of Single Analyzer, Batch CSV Processor, TAS and ternary classification, CIPW normative calculations, reference datasets, and figure export.']
    ],
    [38, 136]
  );

  renderCallout(
    'Scientific-Use Note & Disclaimer',
    'RockMin ID is a computational screening and visualization platform. Its classification boundaries, normative allocations and discriminant equations are implemented from the primary literature and unit-tested, and each carries a source citation in the code; the exceptions are stated explicitly in Section 22. For publication-grade work, verify final classifications against the authoritative published scheme, the analytical convention in use, petrography, and the primary literature.',
    'amber'
  );

  renderWorkflowBoxes([
    '1. Composition\nInput',
    '2. Cleaning &\nNormalization',
    '3. Classification\n& Matching',
    '4. Diagrams\n& Norms',
    '5. Export &\nArchive'
  ]);

  renderParagraph(
    'This manual is intentionally more detailed than the in-app quick documentation. It explains both how to operate the software and how to interpret its outputs scientifically, complete with mathematical formulas, quality assurance thresholds, and diagram conventions.'
  );

  // ==================== SECTION 00: TABLE OF CONTENTS ====================
  renderSectionHeader('00', 'Contents Index & Quick Start', 'Quick-reference guide to manual chapters');

  const tocRows = [
    ['01', 'Application Overview and Architecture', 'Deterministic pipeline, module map, and the no-AI-in-classification invariant'],
    ['02', 'Interface and Navigation', 'Module layout, navigation bar, and primary interaction patterns'],
    ['03', 'Single Sample Analyzer', 'Input modes, oxide roles, benchmark presets, and the result report'],
    ['04', 'Iron Resolution, Normalization & Similarity', 'resolveIron precedence, volatile-free basis, and the similarity curve'],
    ['05', 'Stoichiometry, Indices & Data-Quality Flags', 'Mg#, ASI (A/CNK), A/NK, Fe-index, APFU, and the structured flag codes'],
    ['06', 'Total Alkali-Silica (TAS) Diagram', 'Le Bas (1986) field polygons, published vertices, and applicability limits'],
    ['07', 'TAS Sub-Root Names & Series Qualifiers', 'Le Maitre (2002) s.2.12.2 rules: basanite, hawaiite, K-series, peralkaline'],
    ['08', 'CIPW Normative Mineralogy', 'Full 22-phase allocation order, desilication cascade, and mass balance'],
    ['09', 'The Cation Norm', 'Cations per formula unit, normative plagioclase P, and colour index CI'],
    ['10', 'Irvine & Baragar (1971) Classification', 'Appendix III equations for Figs. 2, 3, 4, 6 and 7, implemented verbatim'],
    ['11', 'Ternary Systems & Projections', 'Ten projections: AFM, QAPF, APF, pyroxene, feldspar, basalt, ultramafic'],
    ['12', 'Mineral Identification by Structural Formula', 'APFU recasting, oxygen bases, site requirements, and end-members'],
    ['13', 'The GEOROC Reference Library', 'Provenance, percentile distributions, grouping rules, and citation duty'],
    ['14', 'Batch Geochemical Processor', 'CSV ingestion, header aliases, 100-row limit, and range filters'],
    ['15', 'Dataset Explorer & External Databases', 'Curated benchmark specimens and authoritative cross-references'],
    ['16', 'Saved Collection & Cloud Sync', 'Local-first storage, optional Firestore sync, and Local Mode'],
    ['17', 'Custom Plotting & Figure Export', 'Vector SVG and high-resolution raster export for publication'],
    ['18', 'AI Petrogenesis & Interpretation', 'Optional narrative layer, what is transmitted, and its strict limits'],
    ['19', 'Quality Control & Troubleshooting', 'Common analytical pitfalls and their diagnosis'],
    ['20', 'Recommended Research Workflow', '7-step protocol for reproducible, publication-grade petrology'],
    ['21', 'Technical Reference & Data Schema', 'Input schema, output dictionary, and formula weights used'],
    ['22', 'Known Limitations & Deliberate Behaviours', 'Where the software reports uncertainty instead of hiding it'],
    ['23', 'Petrological Glossary & Literature', 'Definitions of key indices and the authoritative bibliography'],
    ['24', 'Final Research Checklist', 'Pre-publication checklist and suggested methods section wording']
  ];

  renderTable(
    ['Sec', 'Topic', 'Description'],
    tocRows,
    [12, 68, 94]
  );

  renderCallout(
    'How to read this manual',
    'Sections 01-03 are operational: what the modules are and how to drive them. Sections 04-13 are the scientific core: every formula, boundary and threshold the engine applies, each attributed to the paper, figure or equation it comes from. Sections 14-18 cover the remaining modules, and 19-24 cover practice, limitations and citation. If you are checking a single number the software produced, the fastest route is the section that owns that calculation.',
    'blue'
  );

  // ==================== SECTION 01: APPLICATION OVERVIEW ====================
  renderSectionHeader('01', 'Application Overview and Architecture', 'Core computational pipeline and system design');
  renderParagraph(
    'RockMin ID converts major-element chemical compositions into a structured petrological report. The pipeline resolves iron to a single consistent basis, normalizes the composition to a volatile-free 100 wt% sum, computes the full CIPW weight norm and cation norm, assigns TAS and ternary coordinates, derives stoichiometric indices, ranks rock and mineral candidates against a reference library, and emits structured data-quality flags.'
  );
  renderParagraph(
    'The software is organized around six principal analytical surfaces: Single Analyzer, Batch Processor, TAS Classifier, Ternary Systems, Dataset Explorer and Saved Collection. The Single Analyzer is the primary workbench; the others extend visualization, comparison, bulk processing and specimen archiving. Everything runs in the browser, installs as a Progressive Web App, and works offline once the reference library has been cached.'
  );

  renderWorkflowBoxes([
    'Input\nChemistry',
    'Iron\nResolution',
    'Volatile-Free\nNormalization',
    'CIPW &\nCation Norm',
    'Diagrams &\nMatching',
    'Report &\nExport'
  ]);

  renderCallout(
    'Key invariant: no AI touches classification',
    'Every identification, field assignment, normative allocation and index in RockMin ID is a deterministic, unit-tested calculation. The optional Gemini integration (Section 18) only narrates results that have already been computed, and falls back to a deterministic rule engine when no backend is configured. Running the same composition twice always gives the same answer, and that answer can be reproduced by hand from the formulas in this manual.',
    'emerald'
  );

  renderSubheader('1.1 Computational Module Map');
  renderTable(
    ['Module', 'Responsibility', 'Primary Literature Basis'],
    [
      ['iron', 'Canonical FeO / Fe2O3 / FeOT resolver. Every iron value in the application routes through resolveIron(); there is deliberately no second iron conversion anywhere.', 'Middlemost (1989) for the Fe2O3/FeO split'],
      ['cipw', 'CIPW weight norm and cation norm. Mass-conserving by construction.', 'Cross, Iddings, Pirsson & Washington (1902); Kelsey (1965); Le Maitre (2002)'],
      ['tas', 'TAS field polygons and point-in-polygon assignment.', 'Le Bas et al. (1986); Le Maitre (2002) Fig. 2.15; Middlemost (1994) for plutonic equivalents'],
      ['tasSubRoot', 'IUGS sub-root names, K-series, peralkaline and picrite rules.', 'Le Maitre (2002) s.2.12.2, pp.36-38; Macdonald (1974)'],
      ['irvineBaragar', 'Their published Appendix III equations for Figs. 2, 3, 4, 6 and 7.', 'Irvine & Baragar (1971), Appendix III, p.547'],
      ['mineralStoichiometry', 'APFU structural-formula mineral identification on species-specific oxygen bases.', 'Deer, Howie & Zussman (1992)'],
      ['ternaryCalculations', 'AFM, QAPF, APF, pyroxene, feldspar, basalt tetrahedron and ultramafic projections.', 'Streckeisen (1976); Thompson (1957); Morimoto et al. (1988); Yoder & Tilley (1962)'],
      ['geochemEngine', 'Orchestrator. identifyGeochemicalSample() is the single entry point for the whole pipeline.', '-'],
      ['georocReference', 'Lazy runtime loader for the GEOROC-derived reference library.', 'GEOROC / DIGIS, Georg-August-Universitaet Goettingen']
    ],
    [30, 78, 66]
  );

  renderCallout(
    'Scope & Analytical Boundaries',
    'What RockMin ID does not replace: petrographic thin-section observation, quantitative optical modal analysis, phase identification by X-ray diffraction or Raman spectroscopy, analytical uncertainty propagation, or thermodynamic equilibrium modelling (e.g. MELTS, Perple_X, THERMOCALC). A high similarity score is a screening hypothesis, not proof of identity.',
    'blue'
  );

  // ==================== SECTION 02: INTERFACE AND NAVIGATION ====================
  renderSectionHeader('02', 'Interface and Navigation', 'Module layout and common interaction patterns');

  renderTable(
    ['Module', 'Purpose', 'Typical Laboratory Use Case'],
    [
      ['Single', 'Single Sample Analyzer', 'Detailed geochemical evaluation of one unknown spot or whole-rock analysis'],
      ['Batch', 'Bulk CSV Processor', 'Process up to 100 EPMA spots or XRF analyses with global range filters'],
      ['TAS', 'Total Alkali-Silica Projection', 'Volcanic classification, rock suite comparison, and alkaline discrimination'],
      ['Ternary', 'Ten Compositional Projections', 'AFM (igneous and metamorphic), QAPF, APF, feldspar, pyroxene, basalt tetrahedron, Ol-Opx-Cpx'],
      ['Dataset', 'Reference Specimen Database', 'Explore benchmark records, view occurrence facts, and load chemistry'],
      ['Collection', 'Saved Specimen Archive', 'Search, tag, export, and synchronize user analyses across devices'],
      ['Documentation', 'Manual / Glossary / Citation', 'Searchable glossary, academic citations, BibTeX, and this PDF export']
    ],
    [26, 58, 90]
  );

  renderSubheader('2.1 Common Interaction Patterns');
  renderBullet('Inspect', 'Opens detailed specimen information and provides a one-click route back to the Single Analyzer.');
  renderBullet('Plot Custom Data', 'Allows users to plot arbitrary ternary or TAS coordinates directly, or recalculate them from raw oxides.');
  renderBullet('Export Figure', 'Opens high-resolution export controls for PNG, JPEG, and vector SVG formats.');
  renderBullet('Export CSV', 'Writes clean tabular results formatted for Excel, MATLAB, Python (pandas), or R.');
  renderBullet('Save to Collection', 'Stores the sample in local browser storage; if cloud features are configured and you are signed in, it also syncs to Firestore.');
  renderBullet('Reference Library Badge', 'Shows how many rock and mineral references are currently loaded, including the GEOROC-derived library once it has been fetched.');

  // ==================== SECTION 03: SINGLE SAMPLE ANALYZER ====================
  renderSectionHeader('03', 'Single Sample Analyzer', 'Primary workbench for specimen evaluation');
  renderParagraph(
    'The Single Analyzer provides comprehensive evaluation of an individual rock or mineral composition, recalculating the whole report on every edit.'
  );

  renderSubheader('3.1 Input Modes');
  renderBullet('Oxide wt%', 'Default mode for whole-rock XRF, wet chemistry, or EPMA oxide analyses: SiO2, TiO2, Al2O3, FeO, Fe2O3, FeOT, MnO, MgO, CaO, Na2O, K2O, P2O5, Cr2O3, NiO, LOI.');
  renderBullet('Element wt%', 'For elemental measurements such as SEM-EDS or EPMA elemental output. Converted to oxide stoichiometry using the formula weights listed in Section 21.');

  renderSubheader('3.2 Oxide Groups & Roles');
  renderTable(
    ['Group', 'Typical Oxides', 'Analytical Purpose & Function'],
    [
      ['Core Majors', 'SiO2, Al2O3, FeO, Fe2O3, FeOT, MgO, CaO, Na2O, K2O', 'Primary classification chemistry, TAS coordinates, feldspar and mafic allocation in the norm'],
      ['Additional Oxides', 'TiO2, MnO, P2O5, Cr2O3, NiO', 'Ilmenite, rutile, apatite and chromite allocation; MnO and NiO join the divalent mafic pool'],
      ['Volatiles / Loss', 'LOI, H2O+, H2O-, CO2, SO3, F, Cl, S', 'Excluded from the volatile-free denominator; CO2 additionally drives normative calcite']
    ],
    [32, 60, 82]
  );

  renderSubheader('3.3 Benchmark Presets & Controls');
  renderBullet('Sample ID', 'A unique specimen identifier that propagates across plots, tables, and every exported file.');
  renderBullet('Benchmark Presets', 'Pre-loaded reference standards (MORB basalt, S-type granite, peridotite, andesite and others) for rapid demonstration and sanity-checking.');
  renderBullet('Normalize Button', 'Rescales the entered non-volatile oxides so their sum equals exactly 100.00 wt%.');
  renderBullet('Reset Button', 'Clears all oxide fields, resets the sample identifier, and unloads active classification results.');

  renderSubheader('3.4 What the Report Contains');
  renderTable(
    ['Output', 'Meaning'],
    [
      ['Raw analytical total', 'The sum as entered, with iron counted exactly once. The primary QA/QC metric.'],
      ['Normalized oxides', 'Volatile-free composition summing to exactly 100 wt%. This is the basis for every diagram.'],
      ['Iron basis', 'Which fields the iron total was actually derived from: FeO+Fe2O3, FeOT, Fe2O3T, FeO, Fe2O3 or none.'],
      ['TAS field and code', 'Le Bas root name plus its field code (B, O1, S2, U1, ...).'],
      ['TAS sub-root name', 'The refined IUGS name, e.g. Alkali Basalt, Basanite, Hawaiite, Trachydacite, Comenditic Rhyolite.'],
      ['Alkali affinity', 'Subalkaline, Alkaline or High-K, from the Irvine & Baragar Fig. 3 criterion.'],
      ['CIPW norm', 'All 22 normative phases in wt%, plus normSum and silicaBalance.'],
      ['Differentiation index', 'Thornton & Tuttle (1960): Q + Or + Ab + Ne + Lc.'],
      ['Stoichiometry', 'Mg#, ASI (A/CNK), A/NK, Fe-index, total alkalis, silica saturation, alumina saturation.'],
      ['Top rocks / top minerals', 'Five ranked candidates each, with distance, analyte count and per-oxide contributions.'],
      ['Score separation', 'The similarity gap between the leader and the runner-up. A small gap means the match is ambiguous.'],
      ['Quality flags', 'Structured, coded diagnostics (Section 5.2) rather than a single opaque warning string.']
    ],
    [46, 128]
  );

  // ==================== SECTION 04: IRON, NORMALIZATION & SIMILARITY ====================
  renderSectionHeader('04', 'Iron Resolution, Normalization & Similarity', 'The three transformations every sample passes through');

  renderSubheader('4.1 Canonical Iron Resolution');
  renderParagraph(
    'Iron is the single most common source of error in compiled geochemical data, because laboratories report it in at least four mutually redundant ways. RockMin ID resolves every combination through one canonical function, resolveIron(), before anything else happens. There is deliberately no second iron conversion anywhere in the codebase.'
  );
  renderCallout(
    'Mass conversion factors',
    'FeO* (total iron as FeO) = FeO + 0.8998 x Fe2O3\nFe2O3 (total iron as ferric) = FeO x 1.1113\n\n0.8998 = 2 x 71.844 / 159.688, the ratio of two FeO formula weights to one Fe2O3 formula weight.',
    'blue'
  );
  renderParagraph(
    'Precedence rule: measured components win over a reported total, because the components carry the oxidation state. A reported total is used only when no components are present. The two are NEVER added together.'
  );
  renderTable(
    ['Fields present', 'Basis reported', 'Behaviour'],
    [
      ['FeO and Fe2O3', 'FeO+Fe2O3', 'FeO* = FeO + 0.8998 x Fe2O3. Both values pass through unchanged to the norm.'],
      ['FeO only', 'FeO', 'All iron treated as ferrous. No normative magnetite unless a split is requested.'],
      ['Fe2O3 only', 'Fe2O3', 'All iron treated as ferric.'],
      ['FeOT only', 'FeOT', 'Split into FeO and Fe2O3 using the Middlemost (1989) silica-dependent ratio, flagged as estimated.'],
      ['Fe2O3T only', 'Fe2O3T', 'Converted to FeO* by x 0.8998, then split as above.'],
      ['Components AND a total', 'component basis', 'The total is used to CHECK the components, not to add to them. A disagreement over 2% raises the iron-ambiguous flag.'],
      ['No iron at all', 'none', 'FeO* = 0 and the iron-missing flag is raised; norm, Mg# and AFM will be unreliable.']
    ],
    [32, 30, 112]
  );

  renderSubheader('4.2 The Middlemost (1989) Fe2O3/FeO Split');
  renderParagraph(
    'When only total iron is available, the norm still needs a ferric/ferrous split to produce magnetite. RockMin ID applies the silica-dependent ratios recommended by Middlemost (1989), and flags the result as an estimate rather than a measurement.'
  );
  renderTable(
    ['SiO2 (wt%)', 'Rock type', 'Fe2O3 / FeO (weight ratio)'],
    [
      ['< 45', 'Ultrabasic', '0.15'],
      ['45 - 52', 'Basalt / gabbro', '0.20'],
      ['52 - 57', 'Basaltic andesite', '0.25'],
      ['57 - 63', 'Andesite / diorite', '0.30'],
      ['63 - 69', 'Dacite / granodiorite', '0.40'],
      ['>= 69', 'Rhyolite / granite', '0.50']
    ],
    [38, 66, 70]
  );
  renderParagraph(
    'The split is constructed so that FeO + 0.8998 x Fe2O3 reproduces the reported FeO* exactly: FeO = FeO* / (1 + 0.8998 x r) and Fe2O3 = FeO x r. The ratio can be overridden per analysis, and setting it to 0 treats all iron as ferrous.'
  );

  renderSubheader('4.3 Volatile-Free Normalization');
  renderParagraph(
    'Classification diagrams are defined on an anhydrous basis. Volatile components (LOI, H2O, H2O+, H2O-, CO2, SO3, F, Cl, S) are excluded from the denominator and the remaining oxides are rescaled to 100 wt%:'
  );
  renderCallout('Normalization Formula', 'X_i(normalized) = X_i(raw) x 100 / Sum(X_non-volatile)', 'blue');
  renderParagraph(
    'Iron is removed from the sum and added back exactly once, in whichever form was actually measured. This matters: dropping the iron fields outright would lose the iron entirely for FeOT-only analyses (the GEOROC norm) and inflate every other oxide, moving a 50.3 wt% SiO2 MORB to 56 wt% and classifying it as a basaltic andesite. No oxide is rounded before summing, so the normalized composition totals exactly 100.'
  );
  renderCallout(
    'Raw total and normalized total are not interchangeable',
    'The raw analytical total is a QA/QC metric of analytical accuracy and must be preserved and reported. The normalized total is a computational requirement of the standard diagrams. Quote both in a methods section.',
    'amber'
  );

  renderSubheader('4.4 Similarity Scoring for Rocks');
  renderParagraph(
    'A sample is compared to each rock reference by a weighted Euclidean distance in oxide space. Iron is compared once, as total iron. Missing analytes are skipped rather than treated as zero, and the number actually used is reported alongside the score.'
  );
  renderCallout(
    'Distance and similarity',
    'd = sqrt( Sum_i w_i (x_i - r_i)^2 / Sum_i w_i )\n\nsimilarity = 100 x exp( -(d / d0)^1.3 ),  capped at 99,  with d0 = 3.0 for rocks and d0 = 6.0 for the compositional part of a mineral score.',
    'blue'
  );
  renderTable(
    ['Oxide', 'Weight', 'Rationale'],
    [
      ['SiO2', '3.5', 'The single most diagnostic major element for igneous classification'],
      ['Na2O, K2O', '3.0 each', 'Alkalinity is the second classification axis'],
      ['MgO, CaO, FeOT', '2.5 each', 'Mafic budget and differentiation state'],
      ['Al2O3', '2.0', 'Feldspar budget and alumina saturation'],
      ['TiO2', '1.5', 'Discriminates intraplate from arc affinities'],
      ['P2O5, Cr2O3', '1.0 each', 'Accessory and compatible-element signals'],
      ['All others', '1.0', 'Default weight']
    ],
    [36, 24, 114]
  );
  renderParagraph(
    'A small agreement bonus of 3 points is added when the sample TAS field matches the reference field, applied before the cap so that it can never manufacture a perfect score. Only an exact compositional match reaches 100; everything else is capped at 99.'
  );

  renderCallout(
    'Similarity is not a probability',
    'The score orders candidates and does nothing else. It must never be labelled "confidence", never be rendered with a percent sign, and never be read as "85% likely to be a basalt". The interface therefore reports the score together with the raw distance, the number of analytes used, and the gap to the runner-up, and flags a match as ambiguous when that gap is small. The earlier scoring curve was so flat that five different reference rocks all reported 100; the present curve exists specifically so that the ranking carries information.',
    'amber'
  );

  // ==================== SECTION 05: STOICHIOMETRY & QUALITY ====================
  renderSectionHeader('05', 'Stoichiometry, Indices & Data-Quality Flags', 'Derived parameters and structured analytical screening');

  renderSubheader('5.1 Petrogenetic Indices');
  renderTable(
    ['Parameter', 'Formula as implemented', 'Geological Interpretation'],
    [
      ['Mg# (Magnesium Number)', '100 x n(MgO) / [n(MgO) + n(FeO*)], molar on the oxide basis', 'Primitive mantle derivation (> 70) versus evolved or crustally contaminated melts (< 50)'],
      ['ASI / A/CNK (Shand)', 'n(Al2O3) / [n(CaO) - 1.67 x n(P2O5) + n(Na2O) + n(K2O)], molar oxide ratio', 'The 1.67 term is the apatite correction, removing Ca locked in Ca5(PO4)3. Omitting it systematically under-reports ASI for apatite-bearing calcic rocks.'],
      ['A/NK', 'n(Al2O3) / [n(Na2O) + n(K2O)], molar oxide ratio', 'Alumina against alkalis alone; used with A/CNK on the Shand diagram'],
      ['Fe-index', 'FeO* / (FeO* + MgO), weight ratio', 'Ferroan versus magnesian differentiation suites (Frost et al. 2001)'],
      ['Total alkalis', 'Na2O + K2O, wt%', 'The TAS y-axis coordinate'],
      ['Peralkaline index (PI)', '[n(Na2O) + n(K2O)] / n(Al2O3), molar', 'PI > 1 is peralkaline; drives the comenditic / pantelleritic split in Section 07'],
      ['Silica saturation', 'From the norm: Q > 0.2 oversaturated; Ne + Lc > 0.2 undersaturated; otherwise saturated', 'Whether free silica or feldspathoids appear in the idealized assemblage'],
      ['Alumina saturation', 'Peraluminous if ASI > 1 AND normative corundum > 0; peralkaline if n(Al2O3) < n(Na2O) + n(K2O); otherwise metaluminous', 'Requiring normative corundum prevents the classic error of calling a basalt peralkaline on an ASI value alone'],
      ['APFU / cations', 'Oxide molar proportions rescaled to a target oxygen basis (4 O for ultramafic, 6 O otherwise, or the species basis in Section 12)', 'Structural formula. Meaningful only for a single mineral analysis, and marked not-applicable for whole rocks.']
    ],
    [34, 66, 74]
  );

  renderCallout(
    'One canonical implementation per calculation',
    'Three separate ASI implementations once existed in this codebase and two of them were wrong; one inline copy labelled any ASI below 0.95 as peralkaline, mislabelling most basalts. If you extend the software and need a value, import it. Do not recompute it.',
    'amber'
  );

  renderSubheader('5.2 Structured Data-Quality Flags');
  renderParagraph(
    'The engine emits coded flags with an explicit severity rather than a single warning string, so that a result can be audited rather than trusted.'
  );
  renderTable(
    ['Flag code', 'Severity', 'Trigger condition and meaning'],
    [
      ['low-total', 'warning (error < 90)', 'Analytical total below 95 wt%. Unmeasured volatiles, light elements (F, Cl, B, Li), hydrous alteration, trace phases, or a defocused beam.'],
      ['high-total', 'warning (error > 110)', 'Analytical total above 105 wt%. Calibration drift, transcription error, or duplicate reporting of iron.'],
      ['iron-ambiguous', 'warning', 'A reported total iron value disagrees with FeO + 0.8998 x Fe2O3 by more than 2%. The measured components were used.'],
      ['iron-split-estimated', 'info', 'Only total iron was reported; Fe2O3/FeO was estimated from silica content (Middlemost 1989) for the norm.'],
      ['iron-missing', 'warning', 'No iron reported in any field. The norm, Mg# and the AFM projection will be unreliable.'],
      ['sparse-analysis', 'warning', 'Fewer than 8 of the 14 tracked major oxides were reported, so matching rests on fewer discriminating analytes.'],
      ['high-loi', 'warning', 'LOI above 3 wt%. Alteration may have mobilized alkalis, affecting TAS and the norm.'],
      ['sample-type-mineral', 'info', 'The sample is a single mineral analysis, so whole-rock diagrams and the CIPW norm are not defined for it.']
    ],
    [38, 26, 110]
  );

  renderSubheader('5.3 Analytical Total Screening Thresholds');
  renderTable(
    ['Raw Total Range', 'Status', 'Recommended Interpretation & Action'],
    [
      ['98.50 - 101.50 wt%', 'Good', 'Within standard laboratory acceptance limits for anhydrous rock and mineral analyses'],
      ['97.00 - 103.00 wt%', 'Acceptable for TAS', 'The window used by the GEOROC ingest and by the TAS applicability test'],
      ['95.00 - 105.00 wt%', 'Acceptable for screening', 'Usable for preliminary work; investigate minor volatiles or light elements'],
      ['< 95.00 wt%', 'Low total', 'Missing elements, unmeasured volatiles, hydrous alteration, or beam defocus'],
      ['> 105.00 wt%', 'High total', 'Transcription error, duplicate iron entry, or calibration drift']
    ],
    [38, 34, 102]
  );

  // ==================== SECTION 06: TAS DIAGRAM ====================
  renderSectionHeader('06', 'Total Alkali-Silica (TAS) Diagram', 'Volcanic classification after Le Bas et al. (1986)');
  renderParagraph(
    'The TAS diagram plots total alkalis (Na2O + K2O, wt%) against silica (SiO2, wt%) on a 100% volatile-free basis. It is the IUGS standard for classifying volcanic and fine-grained igneous rocks. RockMin ID implements the fields as genuine polygons tested by point-in-polygon, not as axis-aligned rectangles: rectangles misplace every sample in a field with a sloping boundary, which is most of the diagram.'
  );

  renderCallout(
    'The dacite / rhyolite divide is a sloping line, not a vertical cut',
    'The boundary is the line from (69, 8) to (77, 0) in (SiO2, alkalis), with a slope of exactly -1. Digitizing Le Maitre (2002) Fig. 2.15 confirms it passes through (70, 7.0), (72, 5.0), (74, 3.0), (75, 2.0) and (76, 1.0). A silica-rich but alkali-poor rock — say 74 wt% SiO2 with 2 wt% alkalis — is therefore a DACITE, not a rhyolite. Implementing this divide as a vertical cut at 69 wt% SiO2, as many tools do, misclassifies a large part of the low-alkali felsic field.',
    'amber'
  );

  renderSubheader('6.1 Published Field Vertices as Implemented');
  renderParagraph(
    'All 14 intersection coordinates below were checked against Le Maitre (2002) Fig. 2.15 and each was confirmed to land on a drawn line. Vertices are (SiO2 wt%, Na2O + K2O wt%).'
  );
  renderTable(
    ['Code', 'Field', 'Polygon vertices (SiO2, alkalis)', 'Plutonic equivalent'],
    [
      ['F', 'Foidite', '(35,0) (41,0) (41,7) (45,9.4) (48.4,11.5) (52.5,14) (48.1,16) (35,16)', 'Foidolite'],
      ['Pc', 'Picrobasalt', '(41,0) (45,0) (45,3) (41,3)', 'Peridotgabbro'],
      ['B', 'Basalt', '(45,0) (52,0) (52,5) (45,5)', 'Gabbro'],
      ['O1', 'Basaltic Andesite', '(52,0) (57,0) (57,5.9) (52,5)', 'Gabbroic Diorite'],
      ['O2', 'Andesite', '(57,0) (63,0) (63,7) (57,5.9)', 'Diorite'],
      ['O3', 'Dacite', '(63,0) (77,0) (69,8) (63,7)', 'Granodiorite'],
      ['R', 'Rhyolite', '(69,8) (77,0) (85,0) (85,16) (69,16)', 'Granite'],
      ['S1', 'Trachybasalt', '(45,5) (52,5) (49.4,7.3)', 'Monzogabbro'],
      ['S2', 'Basaltic Trachyandesite', '(52,5) (57,5.9) (53,9.3) (49.4,7.3)', 'Monzodiorite'],
      ['S3', 'Trachyandesite', '(57,5.9) (63,7) (57.6,11.7) (53,9.3)', 'Monzonite'],
      ['T', 'Trachyte / Trachydacite', '(57.6,11.7) (63,7) (69,8) (69,16) (65.8,16)', 'Syenite / Quartz Monzonite'],
      ['U1', 'Tephrite / Basanite', '(41,3) (45,3) (45,5) (49.4,7.3) (45,9.4) (41,7)', 'Foid Gabbro'],
      ['U2', 'Phonotephrite', '(49.4,7.3) (53,9.3) (48.4,11.5) (45,9.4)', 'Foid Monzodiorite'],
      ['U3', 'Tephriphonolite', '(53,9.3) (57.6,11.7) (52.5,14) (48.4,11.5)', 'Foid Monzosyenite'],
      ['Ph', 'Phonolite', '(52.5,14) (57.6,11.7) (65.8,16) (48.1,16)', 'Foid Syenite']
    ],
    [12, 34, 92, 36]
  );

  renderParagraph(
    'Plutonic equivalents follow Middlemost (1994), Earth-Science Reviews 37, 215-224, and are available by switching the regime to plutonic. Field edges above the published axes (the 16 wt% alkali ceiling, the 85 wt% silica limit) are extrapolations drawn so the polygons close; a sample landing outside every polygon is reported honestly as "Outside TAS range" with the reason, rather than being forced into the nearest field.'
  );

  renderSubheader('6.2 Alkaline versus Subalkaline');
  renderParagraph(
    'The divider is the Irvine & Baragar (1971) Fig. 3 curve, evaluated from their own published Appendix III polynomial rather than from a digitized or interpolated approximation. The full equation is given in Section 10.1. Because the published relation gives SiO2 as a function of alkalis, the curve is inverted numerically by bisection when it needs to be drawn as alkalis against silica.'
  );

  renderSubheader('6.3 Applicability Warnings');
  renderParagraph(
    'TAS is defined for volcanic whole-rock analyses only. The engine reports, rather than suppresses, the cases where applying it is not defensible:'
  );
  renderBullet('Mineral analyses', 'A single mineral analysis has no TAS field. The diagram is not defined for it.');
  renderBullet('LOI above 2 wt%', 'Alteration or hydration mobilizes alkalis, and the alkali axis is half the diagram. TAS assignment becomes unreliable.');
  renderBullet('Analytical total outside 97-103 wt%', 'Outside the window normally accepted for classification work.');

  // ==================== SECTION 07: TAS SUB-ROOT NAMES ====================
  renderSectionHeader('07', 'TAS Sub-Root Names & Series Qualifiers', 'IUGS subdivisions per Le Maitre (2002) s.2.12.2, pp.36-38');
  renderParagraph(
    'A TAS polygon gives a root name. The IUGS Subcommission defines further subdivisions for most fields, and those are the names a petrologist actually uses. Every rule below is deterministic and derives from the CIPW norm and the analysis itself.'
  );

  renderTable(
    ['Field', 'Rule as implemented', 'Resulting names'],
    [
      ['B (Basalt)', 'Normative nepheline present or absent', 'Alkali Basalt (ne > 0) / Subalkali Basalt (ne = 0, covering tholeiitic, MORB and high-alumina basalts)'],
      ['U1 (Tephrite / Basanite)', 'Normative olivine above or below 10%', 'Basanite (ol > 10%) / Tephrite (ol < 10%)'],
      ['S1 (Trachybasalt)', 'Sodic if Na2O - 2 > K2O', 'Hawaiite (sodic) / Potassic Trachybasalt'],
      ['S2 (Basaltic Trachyandesite)', 'Same sodic test', 'Mugearite (sodic) / Shoshonite'],
      ['S3 (Trachyandesite)', 'Same sodic test', 'Benmoreite (sodic) / Latite'],
      ['T (Trachyte field)', '100 x Q / (Q + an + ab + or), normative', 'Trachyte (< 20%) / Trachydacite (> 20%)'],
      ['F (Foidite)', 'Normative larnite above 10% (Le Maitre 2002, p.38), tested first', 'Melilitite; Kalsilite-bearing Melilitite when normative Kp is present (the kamafugite association)'],
      ['F (Foidite)', 'Le Bas (1989), quoted in Le Maitre (2002) p.36', 'Nephelinite (ne > 20%); Melanephelinite (ne < 20% with ab < 5%); Leucitite where normative Lc exceeds Ne'],
      ['R, T, Ph', 'Peralkaline index PI = molar (Na2O + K2O) / Al2O3 > 1', 'Peralkaline Rhyolite / Trachyte / Phonolite'],
      ['R and T, peralkaline', 'Macdonald (1974), Le Maitre (2002) Fig. 2.18: Al2O3 versus 1.33 x FeO* + 4.4', 'Comenditic (Al2O3 above the line) / Pantelleritic (below)']
    ],
    [34, 70, 70]
  );

  renderSubheader('7.1 Potassium Series');
  renderParagraph(
    'For the subalkaline basalt-to-rhyolite series (fields B, O1, O2, O3, R), Le Maitre (2002) Fig. 2.17 gives two dividing lines in K2O against SiO2, through the coordinates (48, 0.3)-(68, 1.2) and (48, 1.2)-(68, 2.9). Linear interpolation of those lines yields:'
  );
  renderCallout(
    'K-series boundaries',
    'lower(SiO2) = 0.3 + 0.9 x (SiO2 - 48) / 20\nupper(SiO2) = 1.2 + 1.7 x (SiO2 - 48) / 20\n\nlow-K if K2O < lower;  medium-K if lower <= K2O < upper;  high-K if K2O >= upper.',
    'blue'
  );
  renderCallout(
    'high-K is not the same as potassic',
    'Le Maitre stresses this explicitly: a high-K rock can still contain more Na2O than K2O. The "sodic versus potassic" test used for fields S1-S3 (Na2O - 2 > K2O) is a different criterion answering a different question.',
    'amber'
  );

  renderSubheader('7.2 Picrite');
  renderParagraph(
    'Le Maitre (2002) p.36 records that the Subcommission lowered the MgO threshold for picrite from 18% to 12% and raised the alkali limit from 2% to 3%, which, in their words, makes many rocks into picrites that were previously classified as picrobasalt. RockMin ID applies: MgO > 12 wt%, Na2O + K2O < 3 wt%, and 30 <= SiO2 < 52 wt%.'
  );

  // ==================== SECTION 08: CIPW NORM ====================
  renderSectionHeader('08', 'CIPW Normative Mineralogy', 'Idealized anhydrous crystallization allocation, mass-conserving by construction');
  renderParagraph(
    'The CIPW norm (Cross, Iddings, Pirsson & Washington 1902) converts a bulk chemical analysis into an idealized 1-atm anhydrous mineral assemblage, in the modern form described by Kelsey (1965) and Le Maitre (2002). RockMin ID implements 23 normative phases in a strict allocation order.'
  );

  renderCallout(
    'Design note: masses, not fixed formula weights',
    'Phase masses are accumulated from the actual oxide masses each phase consumes, rather than from a fixed formula weight per phase. That makes mass balance exact by construction and handles solid solution (Mg-Fe in olivine, hypersthene and diopside) correctly, which a fixed formula weight cannot. An earlier implementation used constants (Hy = 110, Ol = 150, Di = 216.5) and then force-renormalized the result to 100, hiding errors of 20-35% in Fe-rich compositions. The present norm reports its true total (normSum) and the residual silica misfit (silicaBalance) so the calculation can be checked rather than trusted.',
    'emerald'
  );

  renderSubheader('8.1 The Divalent Mafic Pool');
  renderParagraph(
    'MgO, FeO, MnO and NiO are held in one pool and drawn on proportionally, because CIPW treats them as a single (Mg,Fe) component. Every draw returns both the mass removed and the Mg fraction at the time of the draw, so a phase crystallizing early records a more magnesian composition than one crystallizing late.'
  );

  renderSubheader('8.2 Allocation Order');
  renderWorkflowBoxes([
    'Cc, Ap,\nCm, Il, Ru',
    'Or, Ab,\nAc, Ns, Ks',
    'Mt, Hm',
    'An, C',
    'Di, Wo,\nHy',
    'Desilication\nQ / Ne / Lc / Ol'
  ]);

  renderTable(
    ['#', 'Phase', 'Sym', 'Allocation rule as implemented'],
    [
      ['1', 'Calcite', 'Cc', 'CO2 + equimolar CaO, taken first so carbonate Ca never enters a silicate'],
      ['2', 'Apatite', 'Ap', 'All P2O5 with 3.3333 molar CaO, i.e. Ca5(PO4)3(OH); limited by available Ca'],
      ['3', 'Chromite', 'Cm', 'Cr2O3 with equimolar divalent mafic, FeCr2O4'],
      ['4', 'Ilmenite', 'Il', 'TiO2 with equimolar divalent mafic, FeTiO3'],
      ['5', 'Rutile', 'Ru', 'Any TiO2 left after ilmenite'],
      ['6', 'Orthoclase', 'Or', '1 K2O + 1 Al2O3 + 6 SiO2 (= 2 KAlSi3O8)'],
      ['7', 'Albite', 'Ab', '1 Na2O + 1 Al2O3 + 6 SiO2 (= 2 NaAlSi3O8)'],
      ['8', 'Acmite', 'Ac', 'Excess Na2O beyond available Al2O3, taken with Fe2O3: NaFe3+Si2O6, 4 SiO2 per unit'],
      ['9', 'Na metasilicate', 'Ns', 'Na2O still in excess after acmite, Na2SiO3'],
      ['10', 'K metasilicate', 'Ks', 'K2O in excess of Al2O3 (very rare), K2SiO3'],
      ['11', 'Magnetite', 'Mt', 'Remaining Fe2O3 with equimolar divalent mafic, Fe3O4'],
      ['12', 'Hematite', 'Hm', 'Any Fe2O3 left after magnetite'],
      ['13', 'Anorthite', 'An', 'Remaining Al2O3 with equimolar CaO and 2 SiO2, CaAl2Si2O8'],
      ['14', 'Corundum', 'C', 'Al2O3 still in excess after all feldspar, the peraluminous indicator'],
      ['15', 'Diopside', 'Di', 'Remaining CaO with equimolar divalent mafic and 2 SiO2'],
      ['16', 'Wollastonite', 'Wo', 'CaO in excess of the available mafic pool, CaSiO3'],
      ['17', 'Hypersthene', 'Hy', 'All remaining divalent mafic with equimolar SiO2, (Mg,Fe)SiO3'],
      ['18', 'Olivine', 'Ol', 'From hypersthene during desilication, (Mg,Fe)2SiO4, 0.5 SiO2 per mafic mole'],
      ['19', 'Nepheline', 'Ne', 'From albite during desilication, NaAlSiO4, 2 SiO2 per Na2O unit'],
      ['20', 'Leucite', 'Lc', 'From orthoclase during desilication, KAlSi2O6, 4 SiO2 per K2O unit'],
      ['21', 'Larnite', 'Cs', 'From wollastonite in strongly undersaturated rocks, Ca2SiO4'],
      ['22', 'Kalsilite', 'Kp', 'From leucite at the extreme undersaturated end, KAlSiO4. Reached only by kamafugite-like compositions.'],
      ['23', 'Quartz', 'Q', 'Free silica remaining after every silicate demand has been satisfied']
    ],
    [8, 32, 12, 122]
  );

  renderCallout(
    'Phases an incomplete norm silently discards',
    'Corundum, acmite, wollastonite, hematite, rutile, chromite, larnite and calcite are all present here. Without them, excess Al, Fe3+, Ti, Ca, Cr and CO2 are silently thrown away and the norm still appears to total 100 because it has been renormalized. A norm that cannot produce corundum cannot identify a peraluminous granite.',
    'amber'
  );

  renderSubheader('8.3 The Silica Budget and the Desilication Cascade');
  renderParagraph(
    'Silica demand is computed per unit of each provisional phase: Or 6, Ab 6, An 2, Ac 4, Ns 1, Ks 1, Di 2, Wo 1, Hy 1, Ne 2, Lc 4, and Ol 0.5 per mafic mole. If demand exceeds the available SiO2, phases are desilicated in the published order until the budget balances. Any surplus becomes quartz.'
  );
  renderTable(
    ['Step', 'Conversion', 'Silica released'],
    [
      ['a', 'Hypersthene -> olivine, 2 (Mg,Fe)SiO3 -> (Mg,Fe)2SiO4 + SiO2', '0.5 SiO2 per mafic mole'],
      ['b', 'Albite -> nepheline, NaAlSi3O8 -> NaAlSiO4 + 2 SiO2', '4 SiO2 per Na2O unit'],
      ['c', 'Orthoclase -> leucite, KAlSi3O8 -> KAlSi2O6 + SiO2', '2 SiO2 per K2O unit'],
      ['d', 'Diopside -> wollastonite + olivine', '0.5 SiO2 per unit'],
      ['e', 'Wollastonite -> larnite, 2 CaSiO3 -> Ca2SiO4 + SiO2', '1 SiO2 per 2 Wo units'],
      ['f', 'Leucite -> kalsilite, 2 KAlSi2O6 -> 2 KAlSiO4 + 2 SiO2', '2 SiO2 per K2O unit']
    ],
    [14, 106, 54]
  );
  renderParagraph(
    'Step (e) exists because Le Maitre (2002) p.38 uses normative larnite above 10% to separate melilitites from foidites. If a deficit still remains after step (e), it is reported as silicaBalance rather than being absorbed silently.'
  );

  renderSubheader('8.4 Normative Indices');
  renderBullet('Differentiation Index (DI)', 'Thornton & Tuttle (1960): DI = Q + Or + Ab + Ne + Lc + Kp, in normative wt%. Measures differentiation from primitive basalt (DI around 20) to evolved rhyolite (DI above 85).');
  renderBullet('Normative plagioclase An#', '100 x An / (Ab + An) in the weight norm. Bytownite-anorthite in basalts (> 70), andesine-labradorite in andesites (30-70), oligoclase-albite in granites (< 30).');
  renderBullet('normSum', 'The true sum of all normative phase masses. It is reported, not forced to 100. A normSum far from the analytical total means something was not allocated.');
  renderBullet('silicaBalance', 'The residual silica deficit after the full desilication cascade. Non-zero values indicate a composition the norm cannot fully accommodate.');
  renderBullet('ironBasis / ironSplitEstimated', 'Carried onto the norm so a reader can see whether the ferric/ferrous split behind the magnetite was measured or estimated.');

  // ==================== SECTION 09: CATION NORM ====================
  renderSectionHeader('09', 'The Cation Norm', 'Why a second norm exists, and what it is for');
  renderParagraph(
    'Irvine & Baragar (1971) express every one of their classification criteria in the CATION norm, not the weight norm. Their equations therefore cannot be evaluated from weight percentages at all. RockMin ID tracks formula-moles of each phase in parallel with mass during the single allocation pass, so the cation norm is derived without a second, potentially divergent, allocation.'
  );

  renderTable(
    ['Phase', 'Formula', 'Cations per formula unit'],
    [
      ['Q', 'SiO2', '1'],
      ['C', 'Al2O3', '2'],
      ['Or / Ab / An', 'KAlSi3O8 / NaAlSi3O8 / CaAl2Si2O8', '5 each'],
      ['Lc', 'KAlSi2O6', '4'],
      ['Ne', 'NaAlSiO4', '3'],
      ['Ac', 'NaFe3+Si2O6', '4'],
      ['Ns / Ks', 'Na2SiO3 / K2SiO3', '3 each'],
      ['Di', 'Ca(Mg,Fe)Si2O6', '4'],
      ['Wo', 'CaSiO3', '2'],
      ['Hy', '(Mg,Fe)SiO3', '2'],
      ['Ol', '(Mg,Fe)2SiO4', '3'],
      ['Mt / Hm', 'Fe3O4 / Fe2O3', '3 / 2'],
      ['Il / Ru', 'FeTiO3 / TiO2', '2 / 1'],
      ['Cm', 'FeCr2O4', '3'],
      ['Ap', 'Ca5(PO4)3', '8'],
      ['Cc', 'CaCO3', '2']
    ],
    [30, 84, 60]
  );

  renderSubheader('9.1 Derived Cation-Norm Quantities');
  renderCallout(
    'Irvine & Baragar Table 1 definitions',
    "Ab' = Ab + (5/3) Ne\nP  = 100 x An / (An + Ab')        normative plagioclase composition\nCI = Ol + Opx + Cpx + Mt + Il + Hm   normative colour index\n\nAll four quantities are cation percentages, not weight percentages.",
    'blue'
  );
  renderParagraph(
    'P and CI drive the Fig. 6 and Fig. 7 criteria in Section 10. P also gates whether the AFM discriminant of Fig. 2 applies at all.'
  );

  // ==================== SECTION 10: IRVINE & BARAGAR ====================
  renderSectionHeader('10', 'Irvine & Baragar (1971) Classification', 'Appendix III equations, implemented verbatim');
  renderParagraph(
    'Irvine, T.N. & Baragar, W.R.A. (1971), "A Guide to the Chemical Classification of the Common Volcanic Rocks", Canadian Journal of Earth Sciences 8, 523-548. Appendix III (p.547) is titled "Equations or Inequalities that will Enable Classification of a Volcanic Rock in a Computer Program", and RockMin ID uses those equations directly rather than digitizing the figures.'
  );
  renderTable(
    ['Symbol', 'Definition (their p.547 and Table 1, p.527)'],
    [
      ['S', 'SiO2, wt%'],
      ['A', 'Na2O + K2O, wt%'],
      ['F', 'FeO + 0.8998 x Fe2O3, wt%'],
      ['M', 'MgO, wt%'],
      ['X_i', 'Percentage of component i in a ternary plot'],
      ['CI', 'Colour index, CATION norm = Ol + Opx + Cpx + Mt + Il + Hm'],
      ["P", "100 An / (An + Ab'), CATION norm, where Ab' = Ab + 5/3 Ne"],
      ['Ol', 'Olivine, cation norm']
    ],
    [24, 150]
  );

  renderSubheader('10.1 Fig. 3 — Alkaline versus Subalkaline (alkalies-silica)');
  renderCallout(
    'Published polynomial',
    'The rock is SUBALKALINE if S >= f(A), where\n\nf(A) = -3.3539e-4 A^6 + 1.2030e-2 A^5 - 1.5188e-1 A^4 + 8.6096e-1 A^3 - 2.1111 A^2 + 3.9492 A + 39.0',
    'blue'
  );
  renderParagraph(
    'Note the direction: the published relation gives SiO2 as a function of alkalis, not the reverse. An earlier version of this application used an undocumented quadratic in SiO2 that sat about 1 wt% below the published curve at basaltic compositions and more than 2 wt% below it at dacitic ones.'
  );
  renderCallout(
    'Documented limitation above 8 wt% alkalis',
    'Digitizing the curve the authors drew in Fig. 3B and comparing it with the Appendix III polynomial shows agreement within 0.65 wt% SiO2 for A <= 8. Above that the sixth-order fit diverges sharply upward — dS/dA rises from about 2.8 to about 22 by A = 12 — while the drawn curve continues at a near-constant slope and simply ends near A = 9.8. That divergence is a fitting artifact outside the range the authors had data for. RockMin ID flags it at runtime rather than silently correcting it, because the polynomial is what the authors published. The practical effect is benign: a rock with more than about 8 wt% alkalis is pushed further toward "alkaline", which is almost always the right answer.',
    'amber'
  );

  renderSubheader('10.2 Fig. 2 — Tholeiitic versus Calc-Alkaline (AFM)');
  renderCallout(
    'Published polynomial',
    'The rock is THOLEIITIC if X_F >= g(X_M), where\n\ng(X_M) = 1.5559e-12 X_M^8 - 7.7142e-10 X_M^7 + 1.5664e-7 X_M^6 - 1.6738e-5 X_M^5 + 1.0017e-3 X_M^4 - 3.2552e-2 X_M^3 + 4.7776e-1 X_M^2 - 1.1085 X_M + 30.0\n\ngiven X_A + X_F + X_M = 100, and subject to the precondition P < 40.',
    'blue'
  );
  renderParagraph(
    'The boundary is a function of X_M (magnesium), not X_A. A previous implementation interpolated an inherited nine-point control array as a function of X_A, which is a different curve entirely; the drawn curve and the classifier had therefore drifted apart. Both now derive from this single published equation, so they cannot disagree.'
  );

  renderSubheader('10.3 Fig. 6 — When Fig. 2 Does Not Apply');
  renderParagraph(
    'The authors gate Fig. 2 on P < 40. For rocks whose normative plagioclase is An40 or more calcic, they direct the reader to Fig. 6 instead: the rock is calc-alkaline if Al2O3 >= 12 + 0.08 P, for P in the range 40-100. RockMin ID applies that fallback automatically and says in its notes which of the two criteria was used.'
  );

  renderSubheader("10.4 Fig. 4 — The Ne'-Ol'-Q' Normative Projection");
  renderParagraph(
    'The authors\' Summary (p.541) ranks their three alkaline/subalkaline diagrams: Fig. 3 is simplest, Fig. 4 is considered most reliable for general purposes, and Fig. 5 may be best for basalts. Fig. 4 projects the cation norm onto the base of the basalt tetrahedron.'
  );
  renderCallout(
    'Projection and criterion',
    "Ne' = Ne + 3/5 Ab      Ol' = Ol + 3/4 Opx      Q' = Q + 2/5 Ab + 1/4 Opx\n\nThe rock is SUBALKALINE if\n  X_Ne' <= 1.5 X_Q'            where X_Ol' = 40-100\n  X_Ne' <  15 + 0.8889 X_Q'    where X_Ol' = 0-40\n\ngiven X_Ol' + X_Ne' + X_Q' = 100.",
    'blue'
  );
  renderParagraph(
    'RockMin ID evaluates both Fig. 3 and Fig. 4 and reports explicitly when they disagree, noting that the authors regard Fig. 4 as the more reliable of the two.'
  );

  renderSubheader('10.5 Fig. 7 — Naming a Subalkaline Rock');
  renderParagraph(
    'Examined in sequence, using cation-norm Ol, CI and P:'
  );
  renderTable(
    ['Test order', 'Criterion', 'Name'],
    [
      ['a', 'Ol >= 25', 'Picrite Basalt'],
      ['b', 'CI >= 70 - P', 'Basalt'],
      ['c', 'CI >= 30 - (3/5) P', 'Andesite'],
      ['d', 'CI >= 20 - P', 'Dacite'],
      ['e', 'CI < 20 - P', 'Rhyolite']
    ],
    [26, 76, 72]
  );

  renderSubheader('10.6 The Combined Procedure (their Summary, p.541)');
  renderBullet('Step 1', 'Peralkaline if normative acmite appears. The authors refer such rocks to Noble (1968) for detailed classification.');
  renderBullet('Step 2', 'Subalkaline or alkaline by Fig. 3, cross-checked against Fig. 4.');
  renderBullet('Step 3a', 'If subalkaline, the magmatic series by Fig. 2, or by Fig. 6 when P >= 40.');
  renderBullet('Step 3b', 'If subalkaline, the rock name by Fig. 7.');
  renderCallout(
    'A caution the authors themselves give',
    'The tholeiitic / calc-alkaline division applies AFTER alkaline compositions have been eliminated, and it describes the fractionation trend of a SUITE. A single primitive sample near the M apex can fall on the calc-alkaline side while belonging to a tholeiitic suite. Interpret a lone point with care.',
    'amber'
  );

  // ==================== SECTION 11: TERNARY SYSTEMS ====================
  renderSectionHeader('11', 'Ternary Systems & Projections', 'Ten compositional projections and the formula each applies');

  renderTable(
    ['System', 'Apices', 'Reference'],
    [
      ['AFM Igneous', 'F = FeO*, A = Na2O + K2O, M = MgO', 'Irvine & Baragar (1971) Fig. 2; Wager & Deer (1939)'],
      ['AFM Metamorphic', 'A = Al2O3, F = FeO*, M = MgO', 'Thompson (1957); Spear (1993)'],
      ['QAPF Plutonic', 'Q = quartz, A = alkali feldspar, P = plagioclase', 'Streckeisen (1974, 1976) / IUGS'],
      ['QAPF Volcanic', 'Q, A, P from the CIPW norm', 'Streckeisen (1978, 1979); Le Maitre (2002)'],
      ['APF Plutonic', 'F = feldspathoids, A = alkali feldspar, P = plagioclase', 'Streckeisen (1974, 1976); Le Maitre (2002)'],
      ['APF Volcanic', 'F, A, P from the CIPW norm', 'Le Maitre (2002); Le Bas & Streckeisen (1991)'],
      ['Basalt Tetrahedron', 'Di, Ol, silica-saturation index', 'Yoder & Tilley (1962); Morse (1980)'],
      ['Pyroxene Quadrilateral', 'Wo, En, Fs cations', 'Morimoto et al. (1988) / IMA'],
      ['Feldspar Ternary', 'Or, Ab, An', 'Deer, Howie & Zussman (1992)'],
      ['Ultramafic', 'Ol, Opx, Cpx', 'IUGS Subcommission (1973)']
    ],
    [34, 76, 64]
  );

  renderSubheader('11.1 Projection Formulas as Implemented');
  renderTable(
    ['Projection', 'Computation'],
    [
      ['AFM Igneous', 'Delegates to the published Irvine & Baragar procedure, which also applies their P < 40 precondition and the Fig. 6 fallback. F = FeO + 0.8998 Fe2O3, A = Na2O + K2O, M = MgO, rescaled so F + A + M = 100.'],
      ['AFM Metamorphic', 'A = Al2O3, F = FeO + 0.8998 Fe2O3, M = MgO, rescaled to 100. A projection for pelitic assemblages, not a classifier.'],
      ['QAPF Plutonic', 'Q, Or, Ab and An are taken from the shared CIPW norm. The IUGS rule that plagioclase more sodic than An05 counts as alkali feldspar is applied by splitting albite on the normative anorthite content: if 100 An/(An+Ab) < 5 the albite goes to A, otherwise to P.'],
      ['QAPF Volcanic', 'Same normative source, with a fixed split of A = Or + 0.1 Ab and P = An + 0.9 Ab.'],
      ['APF Plutonic / Volcanic', 'F = Ne + Lc, A = Or + 0.1 Ab, P = An + 0.9 Ab, from the norm. In the volcanic variant normative olivine above 10% distinguishes basanitic from tephritic names.'],
      ['Pyroxene Quadrilateral', 'Ca = CaO/56.08, Mg = MgO/40.30, Fe = FeO/71.84 + 2 Fe2O3/159.69 + MnO/70.94. Wo = min(50, 100 Ca/(Ca+Mg+Fe)); the remainder is split between En and Fs by Mg/(Mg+Fe).'],
      ['Feldspar Ternary', 'Or, Ab and An from CATION moles: Or = 2 K2O/94.196, Ab = 2 Na2O/61.979, An = CaO/56.077, rescaled to 100. The factor of two on the alkalis is required because one mole of K2O or Na2O yields two moles of KAlSi3O8 or NaAlSi3O8 while one mole of CaO yields one mole of CaAl2Si2O8; an equimolar Ab-An plagioclase therefore plots at An50. The plagioclase name is taken from An/(Ab+An).'],
      ['Basalt Tetrahedron', 'Di and Ol from the norm against a composite silica-saturation index built from Q, Ne, Hy and Ab. This is a visualization proxy for the Yoder & Tilley tetrahedron, not a strict projection of it.'],
      ['Ultramafic', 'An approximate Ol-Opx-Cpx partition derived from molar CaO, MgO, FeO and SiO2. Suitable for orientation on the peridotite triangle; modal or normative pyroxene data should be preferred where available.']
    ],
    [36, 138]
  );

  renderCallout(
    'A QAPF error worth not repeating',
    'An earlier inline QAPF implementation applied formula weights of 278.33 per mole K2O for orthoclase and 262.22 per mole Na2O for albite. Both are per-mole-of-FELDSPAR values, and one mole of K2O or Na2O yields TWO moles of feldspar. A and P were therefore on inconsistent bases and every plotted point was displaced toward P. Both QAPF variants now read the shared norm instead of recomputing feldspar from oxides.',
    'amber'
  );

  renderSubheader('11.2 Field Divisions Used');
  renderBullet('QAPF plutonic', 'Streckeisen (1976) p.10 limits: felsic ratio P/(A+P) at 10, 35, 65 and 90; quartz at 5, 20 and 60.');
  renderBullet('Pyroxene quadrilateral', 'Wo >= 45 diopside or hedenbergite by Mg/(Mg+Fe); Wo 20-45 augite; Wo 15-20 subcalcic augite; Wo 5-15 pigeonite; Wo < 5 orthopyroxene, named enstatite through ferrosilite by Mg ratio.');
  renderBullet('Feldspar', 'Or > 50 alkali feldspar; otherwise the plagioclase series by An content: albite An0-10, oligoclase An10-30, andesine An30-50, labradorite An50-70, bytownite An70-90, anorthite An90-100.');
  renderBullet('Ultramafic', 'Dunite above 90% olivine, then harzburgite, lherzolite and wehrlite, passing into the pyroxenites.');

  // ==================== SECTION 12: MINERAL IDENTIFICATION ====================
  renderSectionHeader('12', 'Mineral Identification by Structural Formula', 'Why oxide distance is the wrong test, and what replaces it');
  renderParagraph(
    'Comparing an EPMA analysis to an ideal oxide composition by Euclidean distance is a poor way to identify a mineral. Solid solution moves the oxide weights a long way while the STRUCTURE stays fixed. The diagnostic test a petrologist actually applies is stoichiometric: recast the analysis as cations per formula unit on the candidate\'s oxygen basis, and check that the cation total and the site occupancies come out right.'
  );
  renderCallout(
    'The discriminating example',
    'A forsteritic and a fayalitic olivine sit far apart in oxide space, yet both give 3.00 cations on 4 oxygens, so both identify as olivine. A pyroxene with similar SiO2 gives 4.00 on 6 oxygens and is excluded. Oxide distance alone cannot see that difference, which is why the previous engine ranked hornblende and omphacite as the best mineral matches for a whole-rock basalt.',
    'emerald'
  );

  renderSubheader('12.1 The Structural Test');
  renderParagraph(
    'Total oxygen is computed from the analysis, the composition is rescaled so that oxygen equals the species basis, and the resulting cation sum is compared to the ideal. Iron is split into Fe2+ and Fe3+ only if the analysis reports both; otherwise all iron is carried as Fe2+, which is the usual EPMA convention.'
  );
  renderCallout(
    'Fit function',
    'deviation = |cation sum - ideal cations|\nfit = exp( -(deviation / tolerance)^2 )\n\nmultiplied by a comparable Gaussian penalty when tetrahedral (Si + Al) occupancy falls outside its permitted window, and by (have/min)^2 for any required site occupancy that is not met.',
    'blue'
  );
  renderParagraph(
    'Required occupancies matter. A mica without interlayer K is not a mica however well its cation total adds up, and an apatite without P is not an apatite. Without those requirements, loose-tolerance groups such as amphibole and mica act as catch-alls and a whole-rock analysis "fits" them.'
  );

  renderSubheader('12.2 Oxygen Bases and Ideal Cation Totals');
  renderTable(
    ['Group', 'Oxygens', 'Ideal cations', 'Tolerance', 'Required occupancy'],
    [
      ['Olivine', '4', '3', '0.06', 'Mg + Fe2+ + Mn >= 1.5'],
      ['Garnet', '12', '8', '0.15', 'Si + Al tetrahedral 2.85-3.15'],
      ['Zircon', '4', '2', '0.08', '-'],
      ['Titanite', '5', '3', '0.12', '-'],
      ['Pyroxene (cpx / opx)', '6', '4', '0.08', 'Si + Al tetrahedral 1.90-2.10'],
      ['Amphibole', '23', '15.5', '0.70', 'Ca + Na + K >= 1.2; tetrahedral 7.4-8.4'],
      ['Hornblende', '23', '15.5', '0.70', 'Ca >= 1.2'],
      ['Kaersutite', '23', '15.5', '0.70', 'Ca >= 1.2 and Ti >= 0.2'],
      ['Feldspar', '8', '5', '0.07', 'Na + K + Ca + Ba >= 0.7; tetrahedral 3.9-4.1'],
      ['Plagioclase', '8', '5', '0.07', 'Na + Ca >= 0.7'],
      ['Quartz', '2', '1', '0.04', '-'],
      ['Nepheline', '4', '3', '0.10', '-'],
      ['Leucite', '6', '4', '0.10', '-'],
      ['Mica (generic)', '22', '14', '0.80', 'K + Na >= 1.0'],
      ['Biotite / phlogopite', '22', '15.5', '0.90', 'K >= 1.0 and Mg (+Fe2+) >= 3.0'],
      ['Muscovite', '22', '14', '0.80', 'K >= 1.0 and Al >= 3.0'],
      ['Spinel / chromite / magnetite', '4', '3', '0.10-0.12', '-'],
      ['Ilmenite', '3', '2', '0.07', '-'],
      ['Rutile', '2', '1', '0.05', '-'],
      ['Hematite', '3', '2', '0.07', '-'],
      ['Perovskite', '3', '2', '0.10', '-'],
      ['Apatite', '12', '8', '0.30', 'P >= 2.0 and Ca >= 3.5'],
      ['Calcite / dolomite', '3 / 6', '2 / 4', '0.15 / 0.20', '-']
    ],
    [46, 20, 24, 24, 60]
  );

  renderSubheader('12.3 Combining Structure with Composition');
  renderCallout(
    'Mineral similarity',
    'similarity = 100 x (structural fit)^0.7 x (compositional similarity)^0.3\n\nStructure is weighted far above composition because that is the way round these two pieces of evidence actually work. Fo90 against an Fo80 reference is 4.95 units of oxide distance while the structure is untouched, so a composition-led score buries correct identifications; structure, by contrast, excludes wrong candidates cleanly. Where no structural expectation is on file, the score falls back to composition alone and is discounted by 20%, because the identification rests on weaker evidence.',
    'blue'
  );

  renderSubheader('12.4 End-Member Reporting');
  renderBullet('Olivine', 'Forsterite content, Fo = 100 Mg / (Mg + Fe).');
  renderBullet('Feldspar', 'An - Ab - Or proportions from Ca, Na and K apfu.');
  renderBullet('Pyroxene', 'Wo - En - Fs quadrilateral position from Ca, Mg and Fe apfu.');
  renderBullet('Spinel / chromite', 'Cr# = 100 Cr / (Cr + Al).');

  renderSubheader('12.5 Rock or Mineral? How the Engine Decides');
  renderParagraph(
    'When the user declares the sample type, that decides. Otherwise the STRUCTURAL test decides, which is exactly what it is good for: a single mineral normalizes cleanly to its formula while a whole rock normalizes to no mineral formula at all. Compositional similarity cannot make this call, because a pure olivine analysis is compositionally almost identical to a dunite. The engine treats a sample as a mineral grain when the best mineral candidate has a structural fit of at least 0.75 and is within 12 similarity points of the best rock candidate, and it reports that the type was inferred rather than declared.'
  );

  // ==================== SECTION 13: GEOROC LIBRARY ====================
  renderSectionHeader('13', 'The GEOROC Reference Library', 'Provenance, construction and citation duty');
  renderParagraph(
    'Beyond the curated benchmark specimens, RockMin ID ships a reference library derived from the full GEOROC precompiled archives. It is fetched at runtime from the application\'s data directory rather than bundled into the main JavaScript, and it is precached by the service worker so that offline field use keeps the whole library.'
  );

  renderTable(
    ['Property', 'Rocks', 'Minerals'],
    [
      ['Source files', '90', '19'],
      ['Rows read', '463,716', '1,930,973'],
      ['Accepted analyses', '266,675', '953,932'],
      ['Reference groups produced', '69', '74'],
      ['Rejected: sparse analysis', '57,314', '816,108'],
      ['Rejected: total outside 97-103 wt%', '82,348', '124,942'],
      ['Rejected: material type', '2,576', '0']
    ],
    [62, 56, 56]
  );

  renderSubheader('13.1 How a Group Becomes a Reference');
  renderParagraph(
    'Each group is a DISTRIBUTION, not a single composition: n analyses plus the 10th, 25th, 50th, 75th and 90th percentile of every oxide. Matching uses the median as the reference composition and the p10-p90 band as the observed range, which is why a match can report "within the observed range of N analyses" rather than "close to one hand-picked number". Groups with fewer than 30 accepted analyses are discarded.'
  );
  renderBullet('Acceptance filter', 'Whole-rock or glass material for rocks; a 97-103 wt% major-oxide total with iron counted once; at least 6 reported oxides for rocks or 4 for minerals.');
  renderBullet('Rock grouping', "By GEOROC's own precompiled FILE NAME, which is an authoritative curation. The free-text ROCK NAME column fragments the library so badly that dacite's own median composition failed to identify as dacite.");
  renderBullet('Mineral grouping', 'By the MINERAL column.');
  renderBullet('Iron handling', 'FeO and Fe2O3 are deliberately omitted from the stored medians so that a partial median of each cannot be double-counted against FeOT.');

  renderCallout(
    'Citation duty',
    'GEOROC data are provided under the DIGIS/GEOROC data policy. Users must cite GEOROC (DIGIS, Georg-August-Universitaet Goettingen) AND the original publications for any analysis derived from it. The manifest shipped with the library records the exact ingestion parameters, so a result can be traced back to the population it was matched against.',
    'amber'
  );

  renderSubheader('13.2 A Source-Data Defect Worth Knowing About');
  renderParagraph(
    "GEOROC's own rock archive uses bare CR line endings (classic Mac, with no LF anywhere) while the mineral archive uses CRLF. A reader that treats only LF as a terminator collapses every rock file into a single row and produces an empty library. Python's universal-newline decoding hides this completely; it only appears in a byte-level reader. RockMin ID's ingest uses a streaming RFC 4180 parser, because GEOROC files also contain quoted fields with embedded newlines and a trailing bibliography block, both of which defeat line-based parsing."
  );

  // ==================== SECTION 14: BATCH CSV PROCESSOR ====================
  renderSectionHeader('14', 'Batch Geochemical Processor', 'High-throughput laboratory screening');
  renderParagraph(
    'The Batch Processor runs up to 100 analyses at once through the same engine as the Single Analyzer: header alias matching, iron resolution, anhydrous normalization, quality screening, TAS assignment and CIPW allocation. Rows beyond the hundredth are ignored rather than silently truncated mid-file.'
  );

  renderSubheader('14.1 Recommended CSV Header Convention');
  renderCallout(
    'Standard CSV header format',
    'Sample_ID, SiO2, TiO2, Al2O3, FeO, Fe2O3, FeOT, MnO, MgO, CaO, Na2O, K2O, P2O5, Cr2O3, NiO, LOI',
    'emerald'
  );
  renderParagraph(
    'Delimiters are detected automatically: comma, semicolon or tab. Header matching is case-insensitive and ignores spaces, underscores, hyphens, percent signs, brackets and slashes.'
  );
  renderTable(
    ['Target field', 'Accepted header forms'],
    [
      ['sample_id', 'Sample, SampleID, ID, Name, SampleName, Specimen'],
      ['Oxides', 'Any header beginning with the oxide formula, e.g. SiO2, SiO2 (wt%), Al2O3_pct, MgO wt%'],
      ['FeOT', 'FeOT, FeOtot, TotalFe, FeTotal'],
      ['FeO', 'FeO, FeO wt%'],
      ['LOI', 'LOI, H2O, H2O+, LossOnIgnition'],
      ['Elements', 'Si, Ti, Al, Fe, Mn, Mg, Ca, Na, K, P, Cr, Ni, or their full element names']
    ],
    [30, 144]
  );

  renderSubheader('14.2 Global Range Filters & Quick Presets');
  renderParagraph(
    'The batch table can be filtered with live minimum/maximum sliders on SiO2, MgO, Al2O3, CaO, total alkalis and total iron, or with one of the quick geochemical presets:'
  );
  renderBullet('Basaltic Suite', 'SiO2 between 45.0 and 52.0 wt%, MgO above 4.0 wt%.');
  renderBullet('Intermediate Suite', 'SiO2 between 52.0 and 63.0 wt%.');
  renderBullet('Felsic Suite', 'SiO2 above 63.0 wt%, total alkalis above 4.0 wt%.');
  renderBullet('Ultramafic Suite', 'SiO2 below 45.0 wt%, MgO above 18.0 wt%.');
  renderBullet('Alkaline Suite', 'Total alkalis (Na2O + K2O) above 7.0 wt%.');

  // ==================== SECTION 15: DATASET EXPLORER ====================
  renderSectionHeader('15', 'Dataset Explorer & External Databases', 'Curated benchmark specimens and authoritative cross-references');
  renderParagraph(
    'The Dataset Explorer holds the curated reference specimens: hand-written rock and mineral compositions representing the major rock types and rock-forming minerals, each with standardized chemistry, physical properties, occurrence notes and cross-references to external databases. These sit alongside, not inside, the GEOROC-derived library of Section 13.'
  );

  renderTable(
    ['External Database', 'Content Represented', 'URL'],
    [
      ['Mindat.org', 'Mineral IDs, IMA official symbols, crystal system, type-locality data', 'https://www.mindat.org'],
      ['Webmineral.com', 'Dana and Strunz classification hierarchy and physical properties', 'https://www.webmineral.com'],
      ['RRUFF Project', 'Raman spectra, EPMA reference analyses, unit-cell parameters', 'https://rruff.info'],
      ['EarthChem / PetDB', 'Oceanic basalt benchmark compositions and tectonic metadata', 'https://www.earthchem.org/petdb'],
      ['GEOROC', 'Global whole-rock volcanic and plutonic geochemical compilations', 'https://georoc.eu']
    ],
    [32, 82, 60]
  );

  // ==================== SECTION 16: SAVED COLLECTION ====================
  renderSectionHeader('16', 'Saved Collection & Cloud Sync', 'Local-first storage with optional cloud synchronization');
  renderParagraph(
    'RockMin ID is local-first. Local browser storage gives instant access with no network, and every calculation, diagram, batch run, export and the specimen collection itself work without an account. If cloud features have been configured for the deployment, signing in additionally synchronizes the collection to Cloud Firestore across devices.'
  );

  renderWorkflowBoxes([
    'Analyze\nSpecimen',
    'Save to\nCollection',
    'Local Storage',
    'Sign In\n(optional)',
    'Firestore\nSync',
    'Cross-Device\nRetrieval'
  ]);

  renderCallout(
    'Local Mode',
    'When no cloud backend is configured the application runs in Local Mode, shown in the interface. This is a fully functional state, not a degraded one: only sign-in and cross-device sync are unavailable.',
    'blue'
  );
  renderCallout(
    'Data management recommendation',
    'Always keep external backups of your raw laboratory data. RockMin ID is an analytical workbench, not a permanent primary laboratory archive.',
    'amber'
  );

  // ==================== SECTION 17: FIGURE EXPORT ====================
  renderSectionHeader('17', 'Custom Plotting & Figure Export', 'Publication-quality vector and raster output');
  renderParagraph(
    'Every diagram — TAS, both AFM variants, both QAPF variants, both APF variants, the pyroxene quadrilateral, the feldspar ternary, the basalt tetrahedron and the ultramafic triangle — can be exported directly for presentations, theses and peer-reviewed journals.'
  );

  renderTable(
    ['Export Format', 'Characteristics', 'Recommended Use'],
    [
      ['SVG (vector)', 'Resolution-independent, editable paths in Illustrator or Inkscape', 'Peer-reviewed journal submission and LaTeX documents'],
      ['PNG (lossless raster)', 'Configurable scale: 1x web, 2x retina, 3x for 300 dpi print', 'Presentations, Word documents, digital laboratory reports'],
      ['JPEG (compressed)', 'Fast compressed output with a selectable background colour', 'Quick previews, email summaries, web archiving']
    ],
    [34, 66, 74]
  );

  // ==================== SECTION 18: AI INTERPRETATION ====================
  renderSectionHeader('18', 'AI Petrogenesis & Interpretation', 'An optional narrative layer, strictly downstream of the numbers');
  renderParagraph(
    'RockMin ID includes an optional integration with Google Gemini through a server endpoint. The model receives the structured geochemical parameters that the deterministic engine has ALREADY computed, and returns a petrological narrative. When no backend is configured, a deterministic rule engine produces the narrative instead, and the application remains fully functional.'
  );

  renderCallout(
    'What the AI does not do',
    'It does not classify. It does not assign a TAS field, compute a norm, rank a candidate, or change any number. Every value it discusses was produced by the routines documented in Sections 04-13 and is reproducible without it.',
    'emerald'
  );

  renderSubheader('18.1 Information Transmitted');
  renderBullet('Sample identifier and mode', 'Sample name, analytical total, and measurement mode (oxide wt% or element wt%).');
  renderBullet('Major oxide chemistry', 'Normalized weight percentages of the core and minor oxides.');
  renderBullet('Leading candidates', 'Top rock and mineral candidates ranked by weighted compositional distance. The similarity score orders candidates and is not a probability.');
  renderBullet('TAS field and indices', 'Assigned field and sub-root name, alkali affinity, Mg#, ASI, and silica saturation.');
  renderBullet('CIPW assemblage', 'Normative phase percentages and the differentiation index.');

  renderCallout(
    'Scientific governance',
    'AI-generated interpretations are hypothesis-generating tools. They must never be accepted uncritically or substituted for thin-section petrography, microprobe phase analysis, or peer-reviewed literature. If you use one in a manuscript, say so, and verify every geological claim independently.',
    'blue'
  );

  // ==================== SECTION 19: QUALITY CONTROL ====================
  renderSectionHeader('19', 'Quality Control & Troubleshooting', 'Diagnostic guide for common analytical anomalies');

  renderTable(
    ['Symptom', 'Probable cause', 'Corrective action'],
    [
      ['Analytical total < 95%', 'Unmeasured volatiles (H2O, CO2, F, Cl), altered groundmass, or beam defocus', 'Check LOI; inspect in thin section for clay or sericite alteration'],
      ['Analytical total > 105%', 'Iron entered twice — a total AND its components — or calibration drift', 'Check the laboratory Fe reporting convention. Enter FeOT alone, or FeO and Fe2O3 alone, never both.'],
      ['iron-ambiguous flag raised', 'A reported FeOT disagrees with FeO + 0.8998 Fe2O3 by more than 2%', 'Confirm which value the laboratory actually measured. The components were used.'],
      ['Unexpected mineral match', 'A whole-rock composition coincidentally near an end-member chemistry', 'Check the structural fit, not the similarity. A whole rock should not normalize cleanly to any mineral formula.'],
      ['TAS field differs from a published value', 'Unnormalized data, or a different iron or alkali convention', 'Confirm volatile-free normalization; confirm LOI was excluded from the denominator.'],
      ['Sample reported outside TAS range', 'Composition genuinely outside the published diagram', 'This is deliberate. The engine reports the reason rather than forcing a field.'],
      ['silicaBalance is non-zero', 'The composition cannot be accommodated even after full desilication', 'Check for a transcription error in SiO2 or in the alkalis; check the iron basis.'],
      ['normSum far from 100', 'Large unallocated component or an incomplete analysis', 'This is diagnostic information, not an error to be hidden. Inspect which oxides are missing.'],
      ['Missing ternary node', 'A required component is zero, e.g. MgO in AFM or normative foids in APF', 'Verify the oxide inputs and the analytical detection limits.'],
      ['Batch rows rejected', 'Header mismatch or non-numeric cells', 'Use the standard headers in Section 14.1; strip "<dl", "n.d." and similar strings.']
    ],
    [38, 58, 78]
  );

  // ==================== SECTION 20: RESEARCH WORKFLOW ====================
  renderSectionHeader('20', 'Recommended Research Workflow', '7-step protocol for reproducible, publication-grade petrology');

  renderWorkflowBoxes([
    '1. Preserve\nRaw Data',
    '2. Validate\nTotals & Fe',
    '3. Screening\nID',
    '4. Cross-Plot',
    '5. Thin\nSection',
    '6. Verify\nLiterature',
    '7. Archive\nAll'
  ]);

  renderBullet('Step 1: Preserve raw laboratory data', 'Retain pristine XRF, ICP-MS or EPMA export files with instrument metadata and detection limits.');
  renderBullet('Step 2: Validate totals and the iron convention', 'Screen totals against the 98.5-101.5 wt% window. Establish whether the laboratory reported FeO, Fe2O3, FeOT or Fe2O3T, and enter only what was measured.');
  renderBullet('Step 3: Geochemical screening', 'Run the Single Analyzer or Batch Processor. Record candidate rankings WITH their distances, analyte counts and score separation — not the score alone.');
  renderBullet('Step 4: Multi-diagram cross-validation', 'Examine the sample on TAS, AFM, and the relevant ternary projections. Check that Fig. 3 and Fig. 4 agree; the engine says so explicitly when they do not.');
  renderBullet('Step 5: Petrographic ground-truthing', 'Compare the CIPW normative assemblage against observed modal mineralogy from thin section or XRD. They are not the same thing and are not expected to match exactly.');
  renderBullet('Step 6: Literature and tectonic verification', 'Cross-reference against regional literature, the GEOROC compilation, and tectonic discrimination schemes.');
  renderBullet('Step 7: Archive derived products', 'Export classified CSVs, vector figures and this PDF for long-term project provenance.');

  // ==================== SECTION 21: TECHNICAL REFERENCE ====================
  renderSectionHeader('21', 'Technical Reference & Data Schema', 'Input specification and computational dictionary');

  renderSubheader('21.1 Input Schema');
  renderTable(
    ['Field', 'Type', 'Role in the computation'],
    [
      ['Sample_ID', 'String', 'Unique specimen or spot identifier, propagated to every export'],
      ['SiO2', 'wt%', 'TAS x-axis; the silica budget of the norm; silicate stoichiometry'],
      ['TiO2', 'wt%', 'Ilmenite then rutile in the norm; high in intraplate and OIB magmas'],
      ['Al2O3', 'wt%', 'ASI and A/NK; orthoclase, albite, anorthite and corundum allocation'],
      ['FeO', 'wt%', 'Ferrous iron as measured; magnetite, ilmenite, chromite, diopside, hypersthene, olivine'],
      ['Fe2O3', 'wt%', 'Ferric iron as measured; magnetite, acmite, then hematite'],
      ['FeOT / Fe2O3T', 'wt%', 'Total iron. Used only when components are absent; never added to them.'],
      ['MnO', 'wt%', 'Joins the divalent mafic pool with MgO, FeO and NiO'],
      ['MgO', 'wt%', 'Mg#, the AFM M apex, and the mafic silicate budget'],
      ['CaO', 'wt%', 'Calcite, apatite, anorthite, diopside, wollastonite, larnite'],
      ['Na2O', 'wt%', 'TAS y-axis; albite, then acmite and sodium metasilicate; nepheline on desilication'],
      ['K2O', 'wt%', 'TAS y-axis; orthoclase; the K-series qualifier; leucite on desilication'],
      ['P2O5', 'wt%', 'Apatite, and the 1.67 apatite correction in ASI'],
      ['Cr2O3', 'wt%', 'Chromite; Cr# for spinel-group minerals'],
      ['NiO', 'wt%', 'Joins the divalent mafic pool'],
      ['CO2', 'wt%', 'Volatile, excluded from the normalization denominator, but drives normative calcite'],
      ['LOI', 'wt%', 'Volatile; excluded from the denominator; above 3 wt% raises the high-loi flag']
    ],
    [28, 20, 126]
  );

  renderSubheader('21.2 Oxide Formula Weights Used (g/mol)');
  renderTable(
    ['Oxide', 'FW', 'Oxide', 'FW', 'Oxide', 'FW'],
    [
      ['SiO2', '60.084', 'TiO2', '79.866', 'Al2O3', '101.961'],
      ['Fe2O3', '159.688', 'FeO', '71.844', 'MnO', '70.937'],
      ['MgO', '40.304', 'CaO', '56.077', 'Na2O', '61.979'],
      ['K2O', '94.196', 'P2O5', '141.945', 'Cr2O3', '151.990'],
      ['NiO', '74.693', 'BaO', '153.326', 'SrO', '103.619'],
      ['CO2', '44.009', 'SO3', '80.063', '-', '-']
    ],
    [29, 29, 29, 29, 29, 29]
  );

  renderSubheader('21.3 Output Dictionary');
  renderTable(
    ['Output field', 'Meaning'],
    [
      ['rawTotal', 'Analytical total as entered, with iron counted exactly once'],
      ['normalizedOxides', 'Volatile-free composition summing to exactly 100 wt%'],
      ['ironBasis', 'FeO+Fe2O3 | FeOT | Fe2O3T | FeO | Fe2O3 | none'],
      ['tasField / tasCode', 'Le Bas root name and field code'],
      ['tasSubRootName', 'The refined IUGS name from Section 07'],
      ['tasOutOfRange', 'True when the point falls outside every published polygon'],
      ['alkaliAffinity', 'Subalkaline | Alkaline | High-K'],
      ['cipwNorm', 'All normative phases in wt%, plus normSum, silicaBalance, ironBasis, ironSplitEstimated'],
      ['differentiationIndex', 'Q + Or + Ab + Ne + Lc'],
      ['normativeAn', '100 An / (An + Ab), weight norm'],
      ['stoichiometry', 'Mg#, asi, ank, feIndex, totalAlkalis, silicaSaturation, aluminaSaturation, cations, apfuApplicable'],
      ['topRocks / topMinerals', 'Five ranked candidates with similarity, distance, analytesUsed and per-oxide contributions'],
      ['scoreSeparation', 'Similarity gap between the leader and the runner-up'],
      ['structuralFormula / structuralFit', 'APFU recast and 0-1 fit, on mineral candidates'],
      ['qualityFlags', 'Array of coded flags with severity, per Section 5.2'],
      ['sampleTypeWasInferred', 'True when the engine decided rock-versus-mineral itself'],
      ['referenceLibrarySize', 'Count of rock and mineral references the ranking was drawn from']
    ],
    [46, 128]
  );

  // ==================== SECTION 22: KNOWN LIMITATIONS ====================
  renderSectionHeader('22', 'Known Limitations & Deliberate Behaviours', 'Where the software reports uncertainty instead of hiding it');

  renderCallout(
    'Report, do not hide',
    'normSum, silicaBalance, ironBasis, structuralFit, scoreSeparation and qualityFlags all exist so that a result can be CHECKED rather than trusted. An earlier version of this engine forced the norm to total 100 and hid its own errors. Anything in the list below is a deliberate disclosure, not a defect.',
    'emerald'
  );

  renderTable(
    ['Behaviour', 'Why it is this way'],
    [
      ['Irvine & Baragar Fig. 3 above 8 wt% alkalis', 'The published sixth-order polynomial diverges from the curve the authors drew. It is flagged at runtime rather than silently corrected, because the polynomial is what they published. The practical effect is benign.'],
      ['Samples outside the TAS polygons are not forced into a field', 'Reporting "Outside TAS range" with a reason is more useful than a wrong name. TAS is only defined over the published diagram.'],
      ['The similarity score is capped at 99', 'Only an exact compositional match reaches 100, so the display never implies certainty.'],
      ['The basalt tetrahedron is a visualization proxy', 'The silica-saturation apex is a composite index built from normative Q, Ne, Hy and Ab, not a strict projection of the Yoder & Tilley tetrahedron. Use the Ne\'-Ol\'-Q\' projection of Section 10.4 for a rigorous normative discriminant.'],
      ['The ultramafic Ol-Opx-Cpx partition is approximate', 'It is derived from molar CaO, MgO, FeO and SiO2 for orientation on the peridotite triangle. Prefer modal or measured pyroxene data where available.'],
      ['APFU is computed for whole rocks but marked not applicable', 'A structural formula is only meaningful for a single mineral analysis. The number is available but the interface suppresses it.'],
      ['Coverage is engine-level', 'The deterministic calculation layer is unit-tested; there are no component or end-to-end interface tests.']
    ],
    [50, 124]
  );

  // ==================== SECTION 23: GLOSSARY & LITERATURE ====================
  renderSectionHeader('23', 'Petrological Glossary & Literature', 'Definitions and authoritative bibliography');

  renderSubheader('Selected Core Petrological Definitions');
  PETROLOGICAL_GLOSSARY.forEach((item) => {
    checkPageBreak(15);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(28, 25, 23);

    const acronymStr = item.acronym ? ` (${item.acronym})` : '';
    doc.text(`${item.term}${acronymStr} [${item.category}]`, margin, cursorY);
    cursorY += 3.8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(75, 85, 99);
    const defLines = doc.splitTextToSize(item.definition, contentWidth);
    doc.text(defLines, margin, cursorY);
    cursorY += defLines.length * 3.4 + 1.8;

    if (item.formula) {
      doc.setFont('courier', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(180, 83, 9);
      const formLines = doc.splitTextToSize(`Formula: ${item.formula}`, contentWidth);
      doc.text(formLines, margin, cursorY);
      cursorY += formLines.length * 3.2 + 2;
    }
  });

  renderSubheader('Authoritative Literature Framework');
  renderParagraph(
    'Every classification boundary in RockMin ID carries a comment in the source code naming the paper, figure and equation it comes from. The references below are those the engine implements directly.'
  );
  const bibliography = [
    'Cross, C. W., Iddings, J. P., Pirsson, L. V., & Washington, H. S. (1902). A quantitative chemico-mineralogical classification and nomenclature of igneous rocks. The Journal of Geology, 10(6), 555-690. [The CIPW norm]',
    'Deer, W. A., Howie, R. A., & Zussman, J. (1992). An Introduction to the Rock-Forming Minerals (2nd ed.). Longman Scientific & Technical. [Oxygen bases and structural formulae]',
    'Frost, B. R., Barnes, C. G., Collins, W. J., Arculus, R. J., Ellis, D. J., & Frost, C. D. (2001). A geochemical classification for granitic rocks. Journal of Petrology, 42(11), 2033-2048. [Fe-index]',
    'Irvine, T. N., & Baragar, W. R. A. (1971). A guide to the chemical classification of the common volcanic rocks. Canadian Journal of Earth Sciences, 8(5), 523-548. [Appendix III equations for Figs. 2, 3, 4, 6 and 7]',
    'Kelsey, C. H. (1965). Calculation of the CIPW norm. Mineralogical Magazine, 34(268), 276-282. [Modern algorithmic form of the norm]',
    'Le Bas, M. J., Le Maitre, R. W., Streckeisen, A., & Zanettin, B. (1986). A chemical classification of volcanic rocks based on the total alkali-silica diagram. Journal of Petrology, 27(3), 745-750. [TAS fields and Table 1 root names]',
    'Le Bas, M. J., & Streckeisen, A. L. (1991). The IUGS systematics of igneous rocks. Journal of the Geological Society, 148(5), 825-833.',
    'Le Maitre, R. W. (Ed.). (2002). Igneous Rocks: A Classification and Glossary of Terms (2nd ed.). Cambridge University Press. [Fig. 2.15 TAS vertices; s.2.12.2 sub-root rules; Fig. 2.17 K-series; Fig. 2.18 comendite/pantellerite]',
    'Macdonald, R. (1974). Nomenclature and petrochemistry of the peralkaline oversaturated extrusive rocks. Bulletin Volcanologique, 38(2), 498-516. [Comenditic vs pantelleritic]',
    'Middlemost, E. A. K. (1989). Iron oxidation ratios, norms and the classification of volcanic rocks. Chemical Geology, 77(1), 19-26. [Silica-dependent Fe2O3/FeO ratios]',
    'Middlemost, E. A. K. (1994). Naming materials in the magma/igneous rock system. Earth-Science Reviews, 37(3-4), 215-224. [Plutonic TAS equivalents]',
    'Miyashiro, A. (1978). Nature of alkalic rock series. Contributions to Mineralogy and Petrology, 66(1), 91-104.',
    'Morimoto, N., et al. (1988). Nomenclature of pyroxenes. American Mineralogist, 73(9-10), 1123-1133. [Pyroxene quadrilateral]',
    'Morse, S. A. (1980). Basalts and Phase Diagrams. Springer-Verlag.',
    'Noble, D. C. (1968). Systematic variation of major elements in comendite and pantellerite glasses. Earth and Planetary Science Letters, 4(2), 167-172.',
    'Shand, S. J. (1943). Eruptive Rocks: Their Genesis, Composition and Classification (2nd ed.). John Wiley & Sons. [The alumina saturation index]',
    'Spear, F. S. (1993). Metamorphic Phase Equilibria and Pressure-Temperature-Time Paths. Mineralogical Society of America.',
    'Streckeisen, A. (1974). Classification and nomenclature of plutonic rocks. Geologische Rundschau, 63(2), 773-786.',
    'Streckeisen, A. (1976). To each plutonic rock its proper name. Earth-Science Reviews, 12(1), 1-33. [QAPF field limits, p.10]',
    'Streckeisen, A. (1978). IUGS Subcommission: Classification and nomenclature of volcanic rocks. Neues Jahrbuch fur Mineralogie, 134, 1-14.',
    'Thompson, J. B. (1957). The graphical analysis of mineral assemblages in pelitic schists. American Mineralogist, 42(11-12), 842-858. [Metamorphic AFM]',
    'Thornton, C. P., & Tuttle, O. F. (1960). Chemistry of the igneous rocks; I, Differentiation index. American Journal of Science, 258(9), 664-684.',
    'Wager, L. R., & Deer, W. A. (1939). Geological investigations in East Greenland, Part III: The petrology of the Skaergaard intrusion. Meddelelser om Gronland, 105(4), 1-352. [Origin of the AFM diagram]',
    'Yoder, H. S., & Tilley, C. E. (1962). Origin of basalt magmas: an experimental study of natural and synthetic rock systems. Journal of Petrology, 3(3), 342-532. [Basalt tetrahedron]',
    'GEOROC (DIGIS, Georg-August-Universitaet Goettingen). Geochemistry of Rocks of the Oceans and Continents. https://georoc.eu [Reference library source; cite alongside the original publications]'
  ];

  bibliography.forEach((ref) => {
    checkPageBreak(12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(75, 85, 99);
    const lines = doc.splitTextToSize(`• ${ref}`, contentWidth);
    doc.text(lines, margin, cursorY);
    cursorY += lines.length * 3.4 + 2;
  });

  // ==================== SECTION 24: FINAL RESEARCH CHECKLIST ====================
  renderSectionHeader('24', 'Final Research Checklist', 'Pre-publication verification and suggested methods text');

  const checklistItems = [
    'Sample ID is unique, permanent, and traceable back to field or laboratory notes.',
    'Analytical units (oxide wt% versus element wt%) have been independently confirmed.',
    'The total-iron reporting convention has been verified, and iron has been entered in one form only.',
    'The reported iron basis in the output matches what the laboratory actually measured.',
    'Raw analytical total falls within the laboratory screening window (98.50-101.50 wt%).',
    'All data-quality flags have been read, not just the totals.',
    'The volatile-free normalization basis is documented in the manuscript methods.',
    'Candidate rankings were recorded with distance, analyte count and score separation, never the score alone.',
    'The similarity score is not described anywhere in the manuscript as a confidence or a probability.',
    'normSum and silicaBalance have been inspected; any anomaly has been explained.',
    'Relevant classification diagrams (TAS, AFM, QAPF or APF) have been inspected, not just the headline name.',
    'Where the Fig. 3 and Fig. 4 alkaline discriminants disagreed, the disagreement has been addressed.',
    'CIPW results are reported explicitly as NORMATIVE allocations, never as observed modal mineralogy.',
    'Mineral identifications cite the structural fit and the oxygen basis, not only the similarity.',
    'GEOROC and the original publications are cited for anything derived from the reference library.',
    'External database cross-references have been independently verified at Mindat or RRUFF.',
    'Any AI-generated interpretation has been critically checked by a geologist and declared as such.',
    'Both raw laboratory CSVs and derived RockMin ID exports have been archived.',
    'Software version (RockMin ID v2.4.0) and its Zenodo DOI are recorded in the methods section.'
  ];

  checklistItems.forEach((item) => {
    checkPageBreak(8);
    // Draw checkbox
    doc.setDrawColor(217, 119, 6);
    doc.setLineWidth(0.3);
    doc.rect(margin, cursorY, 3, 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(55, 65, 81);
    const lines = doc.splitTextToSize(item, contentWidth - 6);
    doc.text(lines, margin + 5, cursorY + 2.4);
    cursorY += lines.length * 3.6 + 2;
  });

  cursorY += 4;
  renderCallout(
    'Suggested Citation & Methods Section Wording for Publications',
    'Citation: Tiwari, K. (2026). RockMin ID: Automated Geochemical Classifier and Petrological Analysis Platform (Version 2.4.0) [Computer software]. Zenodo. https://doi.org/10.5281/zenodo.22875578\n\nThat is the CONCEPT DOI, which always resolves to the latest release. To pin the exact release your results were produced with, cite the version DOI instead: 10.5281/zenodo.22875579 for v2.4.0. A CITATION.cff file in the repository carries the same metadata, so GitHub and reference managers can import it directly.\n\nMethods wording: "Major-element compositions were screened, normalized and classified using the RockMin ID petrological platform (v2.4.0; Tiwari, 2026, doi:10.5281/zenodo.22875578). Total iron was resolved to a single basis before any other calculation, and major oxide weight percentages were normalized to a 100% volatile-free basis. Volcanic rock names follow the IUGS total alkali-silica classification (Le Bas et al., 1986) with the sub-root rules of Le Maitre (2002, s.2.12.2); alkaline/subalkaline and tholeiitic/calc-alkaline discrimination follows the published Appendix III equations of Irvine and Baragar (1971). Normative mineralogy was calculated following standard CIPW conventions (Cross et al., 1902; Kelsey, 1965), with normative totals and residual silica reported rather than renormalized. Compositional similarity scores order candidate references and are not probabilities. Reference distributions were derived from the GEOROC compilation (DIGIS, Georg-August-Universitaet Goettingen); the original publications are cited separately. Diagnostic figures were generated using RockMin ID vector projections."',
    'emerald'
  );

  // ==================== RUNNING HEADERS & FOOTERS (ALL PAGES) ====================
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Running Top Header (pages 2+)
    if (p > 1) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(156, 163, 175);
      doc.text('RockMin ID — Professional User Manual, Analytical Guide & Technical Reference', margin, 11);
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.3);
      doc.line(margin, 13, pageWidth - margin, 13);
    }

    // Running Bottom Footer (all pages)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(156, 163, 175);
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

    doc.text('RockMin ID • IUGS Le Maitre (2002) & GEOROC Calibrated', margin, pageHeight - 6.5);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 6.5, { align: 'right' });
  }

  // Trigger browser download
  doc.save('RockMin_ID_Professional_User_Manual_and_Technical_Reference.pdf');
}
