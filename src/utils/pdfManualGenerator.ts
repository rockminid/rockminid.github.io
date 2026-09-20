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
      ['Creator & Author', 'Created by Kishan Tiwari (https://kishangeo.github.io)'],
      ['Purpose', 'Major-element geochemical screening, rock/mineral matching, classification diagrams, normative calculations, batch processing and specimen archiving.'],
      ['Target Audience', 'Petrologists, mineralogists, geochemists, planetary scientists, geology students, laboratory technicians, and researchers.'],
      ['Manual Scope', 'Comprehensive documentation of Single Analyzer, Batch CSV Processor, TAS and ternary classification, CIPW normative calculations, reference datasets, and figure export.']
    ],
    [38, 136]
  );

  renderCallout(
    'Scientific-Use Note & Disclaimer',
    'RockMin ID is a computational screening and visualization platform. Some classification and normative routines are implemented as simplified or proxy calculations. For publication-grade work, verify final classifications against the authoritative published scheme, analytical convention, petrography, and primary literature.',
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
    ['01', 'Application Overview and Architecture', 'Overview of core computational pipeline and components'],
    ['02', 'Interface and Navigation', 'Module layout, navigation bar, and primary interaction patterns'],
    ['03', 'Single Sample Analyzer', 'Input modes, major/minor oxides, normalization, and candidate ranking'],
    ['04', 'Normalization, Iron Handling & Scoring', 'Volatile-free basis, FeO* conversion, and Euclidean distance scoring'],
    ['05', 'Stoichiometry, Indices & Analytical QA/QC', 'Structural cations, Mg#, ASI, A/NK, and analytical sum screening'],
    ['06', 'TAS Diagram (Total Alkali-Silica)', 'Volcanic classification, IUGS Le Bas boundaries, and alkaline divider'],
    ['07', 'Ternary Systems & Projections', 'AFM, QAPF, feldspar, pyroxene, and ultramafic Ol-Opx-Cpx projections'],
    ['08', 'CIPW Normative Mineralogy', 'Idealized anhydrous crystallization, Thornton-Tuttle DI, and Color Index'],
    ['09', 'Batch Geochemical Processor', 'CSV ingestion, 100-row batch limit, global range filters, and undo'],
    ['10', 'Reference Dataset Explorer', 'Curated benchmark rocks, minerals, and external database links'],
    ['11', 'Saved Collection & Cloud Sync', 'Local browser caching and authenticated Firestore cloud synchronization'],
    ['12', 'Custom Plotting & Figure Export', 'Vector SVG and high-resolution raster export with metadata headers'],
    ['13', 'AI Petrogenesis & Tectonic Analysis', 'Optional Gemini AI geochemical narrative and tectonic hypotheses'],
    ['14', 'Quality Control & Troubleshooting', 'Common analytical pitfalls, abnormal totals, and error resolution'],
    ['15', 'Recommended Research Workflow', '7-step protocol for reproducible publication-grade petrology'],
    ['16', 'Technical Reference & Schema', 'Core input schema, output dictionary, and numerical caveats'],
    ['17', 'Diagram Implementation Notes', 'Mathematical formulas used to construct diagram coordinates'],
    ['18', 'Petrological Glossary & Literature', 'Authoritative bibliography and definitions of key petrological indices'],
    ['19', 'Final Research Checklist', 'Pre-publication checklist and suggested methods section wording']
  ];

  renderTable(
    ['Sec', 'Topic', 'Description'],
    tocRows,
    [12, 68, 94]
  );

  // ==================== SECTION 01: APPLICATION OVERVIEW ====================
  renderSectionHeader('01', 'Application Overview and Architecture', 'Core computational pipeline and system design');
  renderParagraph(
    'RockMin ID converts major-element chemical compositions into a structured petrological report. The central analytical pipeline standardizes the composition, evaluates rock and mineral similarity, computes TAS and ternary coordinates, derives stoichiometric indices, and generates a simplified CIPW normative assemblage.'
  );
  renderParagraph(
    'The software is organized around six principal analytical surfaces: Single Analyzer, Batch Processor, TAS Classifier, Ternary Systems, Dataset Explorer, and Saved Collection. The Single Analyzer acts as the primary workbench; the other modules extend visualization, comparison, batch processing, and specimen archiving.'
  );

  renderWorkflowBoxes([
    'Input\nChemistry',
    'Geochemical\nEngine',
    'Reference\nDatasets',
    'Classification\nDiagrams',
    'Normative\nMineralogy',
    'Archive &\nExport'
  ]);

  renderCallout(
    'Scope & Analytical Boundaries',
    'What RockMin ID does not replace: petrographic thin-section observation, quantitative optical modal analysis, phase identification by X-ray diffraction (XRD) or Raman spectroscopy, analytical uncertainty assessment, or thermodynamic equilibrium modeling (e.g. MELTS). A high similarity score should be treated as a screening hypothesis, not proof of identity.',
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
      ['Ternary', 'Ten Compositional Projections', 'AFM (igneous/metamorphic), QAPF, feldspar, pyroxene, and Ol-Opx-Cpx'],
      ['Dataset', 'Reference Specimen Database', 'Explore benchmark records, view occurrence facts, and load chemistry'],
      ['Collection', 'Saved Specimen Archive', 'Search, tag, export, and synchronize user analyses across devices'],
      ['Documentation', 'Manual / Glossary / Citation', 'Searchable glossary of 25+ terms, academic citations, and PDF export']
    ],
    [26, 58, 90]
  );

  renderSubheader('Common Interaction Patterns');
  renderBullet('Inspect', 'Opens detailed specimen information and provides a one-click route back to the Single Analyzer.');
  renderBullet('Plot Custom Data', 'Allows users to plot arbitrary coordinates directly or recalculate from raw oxides.');
  renderBullet('Export Figure', 'Opens high-resolution export controls for PNG, JPEG, and vector SVG formats.');
  renderBullet('Export CSV', 'Writes clean tabular results formatted for Excel, MATLAB, Python (Pandas), or R.');
  renderBullet('Save to Collection', 'Stores the sample in local browser storage; authenticated users sync to Firestore.');

  // ==================== SECTION 03: SINGLE SAMPLE ANALYZER ====================
  renderSectionHeader('03', 'Single Sample Analyzer', 'Primary workbench for specimen evaluation');
  renderParagraph(
    'The Single Analyzer provides comprehensive evaluation of individual rock or mineral compositions with real-time recalculations.'
  );

  renderSubheader('3.1 Input Modes');
  renderBullet('Oxide wt%', 'Default mode for whole-rock XRF, wet chemistry, or EPMA oxide analyses (SiO2, TiO2, Al2O3, FeO, Fe2O3, MnO, MgO, CaO, Na2O, K2O, P2O5, Cr2O3, NiO, LOI).');
  renderBullet('Element wt%', 'For elemental measurements (e.g., SEM-EDS or EMPA elemental wt%). Automatically converted to oxide stoichiometry using molar ratios.');

  renderSubheader('3.2 Oxide Groups & Roles');
  renderTable(
    ['Group', 'Typical Oxides', 'Analytical Purpose & Function'],
    [
      ['Core Majors', 'SiO2, Al2O3, FeO, Fe2O3, MgO, CaO, Na2O, K2O', 'Primary classification chemistry, TAS coordinates, and CIPW norm'],
      ['Additional Oxides', 'TiO2, MnO, P2O5, Cr2O3, NiO', 'Refines mineral stoichiometry, accessory phase allocation (Il, Ap)'],
      ['Volatiles / Loss', 'LOI, H2O+, H2O-, CO2, SO3', 'Evaluates analytical total and supports 100% volatile-free normalization']
    ],
    [32, 60, 82]
  );

  renderSubheader('3.3 Benchmark Presets & Controls');
  renderBullet('Sample ID', 'Specifies a unique specimen identifier that propagates across plots, tables, and exported files.');
  renderBullet('Benchmark Presets', 'Pre-loaded reference standards (e.g., MORB Basalt, S-Type Granite, Peridotite, Andesite) for rapid software demonstration and calibration.');
  renderBullet('Normalize Button', 'Rescales the currently entered non-volatile oxides so their sum equals exactly 100.00 wt%.');
  renderBullet('Reset Button', 'Clears all oxide fields, resets the sample identifier, and unloads active classification results.');

  // ==================== SECTION 04: NORMALIZATION & SCORING ====================
  renderSectionHeader('04', 'Normalization, Iron Handling & Scoring', 'Mathematical foundations of data standardization');

  renderSubheader('4.1 Volatile-Free Normalization');
  renderParagraph(
    'When the classification pipeline applies volatile-free normalization, volatile components (LOI, H2O, CO2, SO3) are excluded from the denominator. The remaining non-volatile oxides are rescaled to 100%:'
  );
  renderCallout('Normalization Formula', 'X_i(normalized) = X_i(raw) * 100 / Sum(X_non-volatile)', 'blue');
  renderParagraph(
    'Note: The raw analytical total and the normalized total serve distinct purposes. The raw total is a crucial QA/QC metric of analytical accuracy, whereas the normalized total is required for standard petrological diagrams (TAS, AFM).'
  );

  renderSubheader('4.2 Total Iron Conversion (FeO*)');
  renderParagraph(
    'Where total iron expressed as ferrous iron equivalent is required, RockMin ID applies the molar stoichiometric conversion:'
  );
  renderCallout('Total Iron Formula', 'FeO* = FeO + 0.8998 * Fe2O3', 'blue');
  renderParagraph(
    'Convention Warning: If your analytical report already lists total iron as FeOT or Fe2O3T, do not enter the same iron value into both FeO and Fe2O3 fields, as this will duplicate iron content.'
  );

  renderSubheader('4.3 Similarity & Confidence Scoring');
  renderBullet('Rock Similarity', 'Calculated using a weighted Euclidean distance across major discriminating oxides (SiO2, alkalis, MgO, CaO, FeO*). Reference ranges from IUGS and GEOROC weight the distance.');
  renderBullet('Mineral Similarity', 'Evaluated against idealized mineral stoichiometry. Significant concentrations of oxides absent from the ideal formula are penalized.');
  renderBullet('Confidence Score', 'The distance metric is transformed non-linearly to a bounded 5–99 range. A score of 85 represents a high similarity relative to the reference database, not an 85% statistical probability.');

  // ==================== SECTION 05: STOICHIOMETRY & QA/QC ====================
  renderSectionHeader('05', 'Stoichiometry, Indices & QA/QC', 'Derived parameters and analytical total screening');

  renderTable(
    ['Parameter', 'Calculation Basis / Formula', 'Geological Interpretation'],
    [
      ['APFU / Cations', 'Oxide molecular proportions normalized to specified oxygen basis', 'Structural formula cation proportions (e.g. 4 O for olivine, 6 O for pyroxene)'],
      ['Mg# (Magnesium Number)', '100 * Mg / (Mg + Fe) [molar]', 'Indicates primitive mantle derivation (>70) vs. crustal fractionation (<50)'],
      ['ASI (Alumina Saturation)', 'Al / (Ca + Na + K) [molar]', 'Peralkaline (<1.0 with agpaitic index), Metaluminous, or Peraluminous (>1.0)'],
      ['A/NK Ratio', 'Al / (Na + K) [molar]', 'Alumina to alkali ratio; characterizes granitic and volcanic magma suites'],
      ['Fe-Index', 'FeO* / (FeO* + MgO) [wt%]', 'Characterizes ferroan vs. magnesian magmatic differentiation suites'],
      ['Total Alkalis', 'Na2O + K2O [wt%]', 'Y-axis coordinate for TAS volcanic classification and alkalinity classification'],
      ['Silica Saturation', 'Normative Q vs. Ne / Ol balance', 'Oversaturated (Q > 0), Saturated (Hy only), or Undersaturated (Ne > 0, Ol > 0)']
    ],
    [32, 60, 82]
  );

  renderSubheader('5.1 Analytical Total Screening Thresholds');
  renderTable(
    ['Raw Total Range', 'Status Label', 'Recommended Interpretation & Action'],
    [
      ['98.50 – 101.50 wt%', 'Good Quality', 'Within standard laboratory acceptance limits for anhydrous rock and mineral analyses'],
      ['95.00 – 105.00 wt%', 'Acceptable', 'Acceptable for preliminary screening; investigate potential minor volatiles or light elements'],
      ['< 95.00 wt%', 'Low Total', 'Potential missing elements (F, Cl, B, Li), unmeasured volatiles, hydrous alteration, or beam defocus'],
      ['> 105.00 wt%', 'High Total', 'Potential transcription error, duplicate iron entry (FeO + Fe2O3), or calibration drift']
    ],
    [35, 35, 104]
  );

  // ==================== SECTION 06: TAS DIAGRAM ====================
  renderSectionHeader('06', 'Total Alkali-Silica (TAS) Diagram', 'Volcanic rock classification after IUGS Le Bas et al. (1986)');
  renderParagraph(
    'The TAS diagram plots total alkalis (Na2O + K2O wt%) against silica (SiO2 wt%) on a 100% volatile-free normalized basis. It is the international standard for classifying volcanic and fine-grained igneous rocks.'
  );

  renderTable(
    ['TAS Volcanic Field', 'SiO2 Range (wt%)', 'Alkali Range (wt%)', 'Typical Petrographic Equivalent'],
    [
      ['Picrobasalt', '41.0 – 45.0', '0.0 – 3.0', 'Ultramafic volcanic rock, high-Mg basaltic precursor'],
      ['Basalt', '45.0 – 52.0', '0.0 – 5.0', 'Mafic volcanic, plagioclase + pyroxene dominant'],
      ['Basaltic Andesite', '52.0 – 57.0', '0.0 – 5.8', 'Intermediate volcanic rock, plagioclase + pyroxene/amphibole'],
      ['Andesite', '57.0 – 63.0', '0.0 – 7.0', 'Intermediate volcanic rock, subduction-zone arc magmatism'],
      ['Dacite', '63.0 – 77.0', '0.0 – 8.8', 'Felsic volcanic rock, quartz and sodic plagioclase phenocrysts'],
      ['Rhyolite', '69.0 – 85.0', '3.0 – 15.0', 'Highly evolved felsic volcanic, quartz + alkali feldspar'],
      ['Trachybasalt', '45.0 – 52.0', '5.0 – 7.2', 'Alkaline basaltic rock (hawaiite / potassic trachybasalt)'],
      ['Basaltic Trachyandesite', '52.0 – 57.0', '5.8 – 9.2', 'Alkaline intermediate (mugearite / shoshonite)'],
      ['Trachyandesite', '57.0 – 63.0', '7.0 – 11.5', 'Alkaline intermediate (benmoreite / latite)'],
      ['Trachyte / Trachydacite', '63.0 – 69.0', '8.0 – 14.5', 'Evolved alkaline rock, sanidine/anorthoclase dominant'],
      ['Tephrite / Basanite', '41.0 – 45.0', '3.0 – 9.5', 'Silica-undersaturated foid-bearing mafic rock (Ol > 10% for basanite)'],
      ['Phonotephrite', '45.0 – 49.0', '7.0 – 12.5', 'Strongly alkaline mafic to intermediate volcanic rock'],
      ['Tephriphonolite', '49.0 – 53.0', '9.5 – 14.0', 'Strongly alkaline intermediate volcanic rock'],
      ['Phonolite', '53.0 – 61.0', '11.5 – 17.5', 'Silica-undersaturated felsic volcanic rock, nepheline-bearing'],
      ['Foidite', '35.0 – 41.0', '3.0 – 18.0', 'Extremely silica-undersaturated, feldspathoid-dominated volcanic rock']
    ],
    [38, 30, 32, 74]
  );

  renderCallout(
    'Alkaline vs. Subalkaline Boundary',
    'RockMin ID implements both the Irvine & Baragar (1971) and Miyashiro (1978) divider curves to distinguish subalkaline (tholeiitic / calc-alkaline) from alkaline volcanic suites.',
    'amber'
  );

  // ==================== SECTION 07: TERNARY SYSTEMS ====================
  renderSectionHeader('07', 'Ternary Systems & Projections', 'Compositional projections across 10 specialized petrological systems');

  renderTable(
    ['Ternary System', 'Components (Normalized to 100%)', 'Petrological Significance & Use'],
    [
      ['AFM (Igneous)', 'A = Na2O + K2O, F = FeO*, M = MgO', 'Distinguishes Tholeiitic (Fe-enrichment) from Calc-Alkaline (arc) trends'],
      ['AFM (Metamorphic)', 'A = Al2O3, F = FeO*, M = MgO', 'Pelitic schist mineral assemblage projection (Thompson, 1957)'],
      ['QAPF (Plutonic)', 'Q = Quartz, A = Alkali Feldspar, P = Plagioclase', 'IUGS plutonic rock classification (granite, granodiorite, tonalite, gabbro)'],
      ['QAPF (Volcanic)', 'Q, A, P (derived from CIPW normative feldspars)', 'Volcanic quartz-feldspar normative proxy classification'],
      ['APF (Plutonic)', 'A = Alkali Feldspar, P = Plagioclase, F = Feldspathoids', 'Silica-undersaturated plutonic rocks (nepheline syenites, ijolites)'],
      ['APF (Volcanic)', 'A = Alkali Feldspar, P = Plagioclase, F = Feldspathoids', 'Silica-undersaturated volcanic rocks (phonolites, tephrites)'],
      ['Basalt Tetrahedron', 'Diopside, Olivine, Silica-Saturation proxy', 'Yoder & Tilley (1962) basalt classification and thermal divide'],
      ['Pyroxene Quad', 'Wo = Wollastonite, En = Enstatite, Fs = Ferrosilite', 'Pyroxene quadrilateral (Augite, Pigeonite, Diopside, Enstatite)'],
      ['Feldspar Ternary', 'Or = Orthoclase, Ab = Albite, An = Anorthite', 'Feldspar solid-solution classification and perthite / antiperthite limits'],
      ['Ultramafic Ternary', 'Ol = Olivine, Opx = Orthopyroxene, Cpx = Clinopyroxene', 'Mantle peridotite (dunite, harzburgite, lherzolite, wehrlite) and pyroxenite']
    ],
    [32, 60, 82]
  );

  // ==================== SECTION 08: CIPW NORMATIVE MINERALOGY ====================
  renderSectionHeader('08', 'CIPW Normative Mineralogy', 'Idealized anhydrous crystallization allocation rules');
  renderParagraph(
    'The CIPW normative calculation converts bulk chemical analyses into an idealized 1-atm anhydrous mineral assemblage. It allocates chemical components in a strict stoichiometric order: accessory phases first (Apatite, Ilmenite, Magnetite), followed by feldspars (Orthoclase, Albite, Anorthite), mafic silicates (Diopside, Hypersthene, Olivine), and free silica / feldspathoids (Quartz or Nepheline).'
  );

  renderWorkflowBoxes([
    'Oxide wt%\nInput',
    'Molecular\nProportions',
    'Accessory\nPhases (Ap, Il, Mt)',
    'Feldspar\nAllocation (Or, Ab, An)',
    'Mafic Silicates\n(Di, Hy, Ol)',
    'Silica Balance\n(Q vs. Ne)'
  ]);

  renderTable(
    ['Norm Mineral', 'Symbol', 'Chemical Formula', 'Stoichiometric Allocation Rule'],
    [
      ['Apatite', 'Ap', '3.33 CaO * P2O5', 'All P2O5 allocated with 3.33 molar equivalents of CaO'],
      ['Ilmenite', 'Il', 'FeO * TiO2', 'All TiO2 allocated with equimolar FeO'],
      ['Magnetite', 'Mt', 'FeO * Fe2O3', 'Allocated from Fe2O3 and equimolar FeO'],
      ['Orthoclase', 'Or', 'K2O * Al2O3 * 6 SiO2', 'All K2O allocated with equimolar Al2O3 and 6 SiO2'],
      ['Albite', 'Ab', 'Na2O * Al2O3 * 6 SiO2', 'Na2O allocated with remaining Al2O3 and 6 SiO2 (desilicated to Ne if SiO2 deficient)'],
      ['Anorthite', 'An', 'CaO * Al2O3 * 2 SiO2', 'Remaining Al2O3 allocated with equimolar CaO and 2 SiO2'],
      ['Diopside', 'Di', 'CaO * (Mg,Fe)O * 2 SiO2', 'Remaining CaO allocated with equimolar (Mg,Fe)O and 2 SiO2'],
      ['Hypersthene', 'Hy', '(Mg,Fe)O * SiO2', 'Remaining (Mg,Fe)O combined with equimolar SiO2'],
      ['Olivine', 'Ol', '2 (Mg,Fe)O * SiO2', 'Formed when silica is insufficient to saturate Hypersthene'],
      ['Nepheline', 'Ne', 'Na2O * Al2O3 * 2 SiO2', 'Formed when silica is insufficient to saturate Albite'],
      ['Quartz', 'Q', 'SiO2', 'Free excess silica remaining after all silicate demands are satisfied']
    ],
    [24, 14, 48, 88]
  );

  renderSubheader('8.1 Key Normative Petrological Indices');
  renderBullet('Thornton-Tuttle DI', 'Sum of normative salic minerals: DI = Q + Or + Ab + Ne + Lc. Measures magmatic differentiation from primitive basalt (DI ~ 20) to evolved rhyolite (DI > 85).');
  renderBullet('Normative Color Index (M\')', 'Sum of normative mafic minerals: M\' = Di + Hy + Ol + Mt + Il. Classifies rocks into Leucocratic (<30%), Mesocratic (30–60%), Melanocratic (60–90%), and Ultramafic (>90%).');
  renderBullet('Plagioclase An#', 'Calculated as: 100 * An / (Ab + An). Reflects plagioclase composition: By-townite/Anorthite in basalts (>70), Andesine/Labradorite in andesites (30–70), Oligoclase/Albite in granites (<30).');

  // ==================== SECTION 09: BATCH CSV PROCESSOR ====================
  renderSectionHeader('09', 'Batch Geochemical Processor', 'High-throughput laboratory screening and bulk data processing');
  renderParagraph(
    'The Batch Processor allows laboratory technicians and researchers to process up to 100 sample analyses simultaneously. It automatically performs header alias matching, anhydrous normalization, quality screening, TAS categorization, and CIPW normative allocation.'
  );

  renderSubheader('9.1 Recommended CSV Header Convention');
  renderCallout(
    'Standard CSV Header Format',
    'Sample_ID, SiO2, TiO2, Al2O3, FeO, Fe2O3, MnO, MgO, CaO, Na2O, K2O, P2O5, Cr2O3, NiO, LOI',
    'emerald'
  );
  renderParagraph(
    'Supported Delimiters & Aliases: The parser automatically recognizes comma (,), semicolon (;), and tab-delimited files. Flexible sample ID headers are supported: Sample, SampleID, ID, Name, SampleName, Specimen, Spot, or Analysis.'
  );

  renderSubheader('9.2 Global Range Filters & Quick Presets');
  renderParagraph(
    'Users can dynamically filter the batch table using real-time minimum/maximum oxide sliders for SiO2, MgO, Al2O3, CaO, Alkalis, and Total FeO, or click one of the quick geochemical presets:'
  );
  renderBullet('Basaltic Suite', 'Filters samples with SiO2 between 45.0% and 52.0% and MgO > 4.0%.');
  renderBullet('Intermediate Suite', 'Filters samples with SiO2 between 52.0% and 63.0%.');
  renderBullet('Felsic Suite', 'Filters samples with SiO2 > 63.0% and Alkalis > 4.0%.');
  renderBullet('Ultramafic Suite', 'Filters samples with SiO2 < 45.0% and MgO > 18.0%.');
  renderBullet('Alkaline Suite', 'Filters samples with Total Alkalis (Na2O + K2O) > 7.0%.');

  // ==================== SECTION 10: REFERENCE DATASET EXPLORER ====================
  renderSectionHeader('10', 'Reference Dataset Explorer', 'Curated benchmark rocks, minerals, and external database metadata');
  renderParagraph(
    'The Dataset Explorer contains curated reference specimens representing major rock types and rock-forming minerals. Each entry contains standardized chemical compositions, physical properties, occurrence notes, and cross-references to authoritative external geological databases.'
  );

  renderTable(
    ['External Database', 'Content Represented in RockMin ID', 'Authoritative Source URL'],
    [
      ['Mindat.org', 'Mineral IDs, IMA official symbols, crystal system, and type-locality data', 'https://www.mindat.org'],
      ['Webmineral.com', 'Dana and Strunz mineral classification hierarchy and physical properties', 'https://www.webmineral.com'],
      ['RRUFF Project', 'Raman spectral IDs, EPMA reference analyses, and unit cell parameters', 'https://rruff.info'],
      ['EarthChem / PetDB', 'Oceanic basalt benchmark compositions and tectonic setting metadata', 'https://www.earthchem.org/petdb'],
      ['GEOROC', 'Global whole-rock volcanic and plutonic igneous geochemical compilations', 'https://georoc.eu']
    ],
    [32, 82, 60]
  );

  // ==================== SECTION 11: SAVED COLLECTION & CLOUD SYNC ====================
  renderSectionHeader('11', 'Saved Collection & Cloud Sync', 'Local caching and authenticated cloud database synchronization');
  renderParagraph(
    'RockMin ID implements a dual-persistence architecture: local browser storage ensures instant access without requiring an internet connection, while authenticated Firebase accounts enable real-time cloud synchronization to Google Cloud Firestore.'
  );

  renderWorkflowBoxes([
    'Analyze\nSpecimen',
    'Save to\nCollection',
    'Local Storage\nCache',
    'Google\nSign-In',
    'Firestore\nSync',
    'Cross-Device\nRetrieval'
  ]);

  renderCallout(
    'Data Management Recommendation',
    'Always maintain external backups of your raw laboratory data files. While RockMin ID stores specimen records locally and in Firestore, it is designed as an analytical workbench rather than a permanent primary laboratory archive.',
    'amber'
  );

  // ==================== SECTION 12: FIGURE EXPORT ====================
  renderSectionHeader('12', 'Custom Plotting & Figure Export', 'Publication-quality vector and raster graphics generation');
  renderParagraph(
    'All diagrams (TAS, AFM, QAPF, Pyroxene Quadrilateral, Ultramafic) can be exported directly for use in presentations, theses, and peer-reviewed journals.'
  );

  renderTable(
    ['Export Format', 'Resolution / Characteristics', 'Recommended Academic Use'],
    [
      ['SVG (Scalable Vector)', 'Infinite resolution, editable vector paths in Adobe Illustrator / Inkscape', 'Standard for peer-reviewed journal submission and LaTeX publications'],
      ['PNG (Lossless Raster)', 'Configurable resolution: 1x (web), 2x (retina), 3x (300 DPI print)', 'Presentations, PowerPoint, Word documents, and digital laboratory reports'],
      ['JPEG (Compressed Raster)', 'High-speed compressed output with customizable background color', 'Fast digital previews, email summaries, and web archiving']
    ],
    [34, 60, 80]
  );

  // ==================== SECTION 13: AI PETROGENESIS ====================
  renderSectionHeader('13', 'AI Petrogenesis & Interpretation', 'Optional AI-assisted petrogenetic and geotectonic synthesis');
  renderParagraph(
    'RockMin ID includes an optional integration with Google Gemini AI via a secure server endpoint (`/api/georoc/interpret`). The model receives structured geochemical parameters and synthesizes a petrological interpretation.'
  );

  renderSubheader('Information Transmitted to AI:');
  renderBullet('Sample Identifier & Mode', 'Sample name, analytical total, and measurement mode (oxide wt% vs element wt%).');
  renderBullet('Major Oxide Chemistry', 'Normalized weight percentages of all core and minor oxides.');
  renderBullet('Leading Candidates', 'Top rock and mineral classifications ranked by weighted compositional distance. The similarity score orders candidates and is not a probability.');
  renderBullet('TAS Field & Indices', 'Assigned volcanic field, alkalinity affinity, Mg#, ASI, and silica saturation.');
  renderBullet('CIPW Assemblage', 'Calculated normative mineral percentages (Q, Or, Ab, An, Di, Hy, Ol, etc.) and differentiation index.');

  renderCallout(
    'Scientific Governance & Critical Appraisal',
    'AI-generated interpretations are hypothesis-generating tools intended to stimulate geological thinking. They must never be accepted uncritically or substituted for empirical thin-section petrography, microprobe phase analysis, or peer-reviewed literature validation.',
    'blue'
  );

  // ==================== SECTION 14: QUALITY CONTROL ====================
  renderSectionHeader('14', 'Quality Control & Troubleshooting', 'Analytical diagnostic guide for common laboratory anomalies');

  renderTable(
    ['Symptom', 'Probable Chemical Cause', 'Recommended Corrective Action'],
    [
      ['Analytical Total < 95%', 'Unmeasured light elements (H2O, CO2, F, Cl), altered groundmass, or EPMA beam defocus', 'Verify LOI; inspect under petrographic microscope for secondary clay / sericite alteration'],
      ['Analytical Total > 105%', 'Duplicate iron entry (entering both FeOT and component oxides) or calibration drift', 'Check laboratory report for Fe reporting conventions; ensure iron is not entered twice'],
      ['Unexpected Mineral Match', 'Bulk whole-rock composition coincidentally matches an endmember mineral chemistry', 'Check leading rock candidate cards; verify whether sample is a monomineralic cumulate'],
      ['TAS Field Divergence', 'Discrepancy caused by unnormalized data or non-standard alkali calculation', 'Ensure volatile-free normalization is enabled; check if LOI was included in denominator'],
      ['Missing Ternary Node', 'One or more required components (e.g. MgO in AFM, or normative foids) equal zero', 'Verify that necessary oxide inputs are populated; check analytical detection limits'],
      ['Batch Rows Rejected', 'Header naming mismatch or non-numeric characters in analytical oxide cells', 'Use standard recommended headers (SiO2, Al2O3, etc.); remove "<dl" or "n.d." strings']
    ],
    [34, 60, 80]
  );

  // ==================== SECTION 15: RESEARCH WORKFLOW ====================
  renderSectionHeader('15', 'Recommended Research Workflow', '7-step protocol for reproducible, publication-grade petrology');

  renderWorkflowBoxes([
    'Step 1:\nPreserve Raw',
    'Step 2:\nValidate Sums',
    'Step 3:\nScreening ID',
    'Step 4:\nCross-Plot',
    'Step 5:\nThin Section',
    'Step 6:\nVerify Lit',
    'Step 7:\nArchive All'
  ]);

  renderBullet('Step 1: Preserve Raw Laboratory Data', 'Retain pristine raw XRF, ICP-MS, or EPMA export files with original instrument metadata and detection limits.');
  renderBullet('Step 2: Validate Analytical Totals & Stoichiometry', 'Screen analytical totals against the 98.5%–101.5% acceptance window. Confirm Fe reporting convention (FeO vs. Fe2O3 vs. FeOT).');
  renderBullet('Step 3: Geochemical Screening & Classification', 'Input data into RockMin ID Single Analyzer or Batch Processor. Record leading rock/mineral candidate rankings, similarity scores and compositional distances.');
  renderBullet('Step 4: Multi-Diagram Cross-Validation', 'Examine the specimen across TAS, AFM, and relevant ternary projections (QAPF, Feldspar, Pyroxene, or Ultramafic).');
  renderBullet('Step 5: Petrographic Ground-Truthing', 'Compare calculated CIPW normative mineralogy against observed optical thin-section modal mineralogy or XRD data.');
  renderBullet('Step 6: Literature & Tectonic Verification', 'Cross-reference results with authoritative regional geological literature, GEOROC compilations, and tectonic discrimination models.');
  renderBullet('Step 7: Archive Derived Products', 'Export classified CSVs, high-resolution vector SVG figures, and PDF reports for long-term project provenance.');

  // ==================== SECTION 16: TECHNICAL REFERENCE ====================
  renderSectionHeader('16', 'Technical Reference & Data Schema', 'Input/output specifications and computational dictionary');

  renderTable(
    ['Field Name', 'Type / Format', 'Valid Range', 'Definition & Computational Role'],
    [
      ['Sample_ID', 'String', '1–64 chars', 'Unique specimen or spot identifier'],
      ['SiO2', 'Numeric (wt%)', '0.00 – 100.00', 'Silica: primary classification oxide for TAS and silicate mineral stoichiometry'],
      ['TiO2', 'Numeric (wt%)', '0.00 – 100.00', 'Titania: allocated to Ilmenite (Il) in CIPW norm; high in intraplate / OIB magmas'],
      ['Al2O3', 'Numeric (wt%)', '0.00 – 100.00', 'Alumina: controls ASI index and allocation of feldspars (Or, Ab, An) and corundum'],
      ['FeO', 'Numeric (wt%)', '0.00 – 100.00', 'Ferrous iron: allocated to Magnetite, Ilmenite, Diopside, Hypersthene, Olivine'],
      ['Fe2O3', 'Numeric (wt%)', '0.00 – 100.00', 'Ferric iron: allocated with equimolar FeO to form normative Magnetite (Mt)'],
      ['MnO', 'Numeric (wt%)', '0.00 – 100.00', 'Manganous oxide: grouped with FeO in mafic silicate solid-solutions'],
      ['MgO', 'Numeric (wt%)', '0.00 – 100.00', 'Magnesia: controls Mg# index and allocation of olivine, pyroxenes, and spinels'],
      ['CaO', 'Numeric (wt%)', '0.00 – 100.00', 'Lime: allocated to Apatite, Anorthite (An), and Diopside (Di)'],
      ['Na2O', 'Numeric (wt%)', '0.00 – 100.00', 'Soda: allocated to Albite (Ab) or Nepheline (Ne); governs TAS Y-axis coordinate'],
      ['K2O', 'Numeric (wt%)', '0.00 – 100.00', 'Potash: allocated to Orthoclase (Or); distinguishes potassic vs. sodic series'],
      ['P2O5', 'Numeric (wt%)', '0.00 – 100.00', 'Phosphorus pentoxide: allocated with 3.33 CaO to form normative Apatite (Ap)'],
      ['LOI', 'Numeric (wt%)', '0.00 – 100.00', 'Loss on Ignition: volatile loss during furnace ignition (H2O, CO2, SO2)']
    ],
    [24, 28, 28, 94]
  );

  // ==================== SECTION 17: DIAGRAM NOTES ====================
  renderSectionHeader('17', 'Diagram Implementation Notes', 'Specific mathematical conventions applied by RockMin ID');

  renderTable(
    ['Projection', 'Mathematical Convention & Normalization Rules Applied'],
    [
      ['TAS Volcanic', 'X = SiO2 / Sum(Majors) * 100; Y = (Na2O + K2O) / Sum(Majors) * 100 on volatile-free basis'],
      ['AFM Igneous', 'A = (Na2O + K2O); F = (FeO + 0.8998 * Fe2O3); M = MgO; rescaled so A + F + M = 100%'],
      ['AFM Metamorphic', 'A = Al2O3; F = (FeO + 0.8998 * Fe2O3); M = MgO; normalized to 100%'],
      ['QAPF Plutonic', 'Calculated from normative quartz and feldspar allocations when modal mineralogy is absent'],
      ['Pyroxene Quad', 'Wo = Ca / (Ca + Mg + Fe); En = Mg / (Ca + Mg + Fe); Fs = Fe / (Ca + Mg + Fe) [molar cations]'],
      ['Feldspar Ternary', 'Or = K / (K + Na + Ca); Ab = Na / (K + Na + Ca); An = Ca / (K + Na + Ca) [molar cations]'],
      ['Ultramafic', 'Ol = Olivine; Opx = Orthopyroxene; Cpx = Clinopyroxene [molar structural allocation]']
    ],
    [36, 138]
  );

  // ==================== SECTION 18: GLOSSARY & LITERATURE ====================
  renderSectionHeader('18', 'Petrological Glossary & Literature', 'Comprehensive definitions and authoritative bibliography');

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
  const bibliography = [
    'Cross, C. W., Iddings, J. P., Pirsson, L. V., & Washington, H. S. (1902). A quantitative chemico-mineralogical classification and nomenclature of igneous rocks. The Journal of Geology, 10(6), 555-690.',
    'Deer, W. A., Howie, R. A., & Zussman, J. (1992). An Introduction to the Rock-Forming Minerals (2nd ed.). Longman Scientific & Technical.',
    'Irvine, T. N., & Baragar, W. R. A. (1971). A guide to the chemical classification of the common volcanic rocks. Canadian Journal of Earth Sciences, 8(5), 523-548.',
    'Le Bas, M. J., Le Maitre, R. W., Streckeisen, A., & Zanettin, B. (1986). A chemical classification of volcanic rocks based on the total alkali-silica diagram. Journal of Petrology, 27(3), 745-750.',
    'Le Maitre, R. W. (Ed.). (2002). Igneous Rocks: A Classification and Glossary of Terms (Recommendations of the IUGS Subcommission on the Systematics of Igneous Rocks). Cambridge University Press.',
    'Middlemost, E. A. (1989). Iron oxidation ratios, norms and the classification of volcanic rocks. Chemical Geology, 77(1), 19-26.',
    'Miyashiro, A. (1978). Nature of alkalic rock series. Contributions to Mineralogy and Petrology, 66(1), 91-104.',
    'Morimoto, N., Fabries, J., Ferguson, A. K., Ginzburg, I. V., Ross, M., Seifert, F. A., Zussman, J., Aoki, K., & Gottardi, G. (1988). Nomenclature of pyroxenes. American Mineralogist, 73(9-10), 1123-1133.',
    'Streckeisen, A. (1976). To each plutonic rock its proper name. Earth-Science Reviews, 12(1), 1-33.',
    'Thompson, J. B. (1957). The graphical analysis of mineral assemblages in pelitic schists. American Mineralogist, 42(11-12), 842-858.',
    'Thornton, C. P., & Tuttle, O. F. (1960). Chemistry of the igneous rocks; I, Differentiation index. American Journal of Science, 258(9), 664-684.',
    'Yoder, H. S., & Tilley, C. E. (1962). Origin of basalt magmas: An experimental study of natural and synthetic rock systems. Journal of Petrology, 3(3), 342-532.'
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

  // ==================== SECTION 19: FINAL RESEARCH CHECKLIST ====================
  renderSectionHeader('19', 'Final Research Checklist', 'Pre-publication verification and suggested methods text');

  const checklistItems = [
    'Sample ID is unique, permanent, and traceable back to field or laboratory notes.',
    'Analytical units (oxide wt% vs. element wt%) have been independently confirmed.',
    'Total iron reporting convention (FeO vs. Fe2O3 vs. FeOT) has been verified.',
    'Raw analytical total falls within laboratory screening bounds (98.50%–101.50%).',
    'Volatile-free normalization basis is documented in all manuscript methods.',
    'Primary and secondary rock/mineral candidate rankings have both been reviewed.',
    'Relevant classification diagrams (TAS, AFM, QAPF) have been inspected.',
    'CIPW results are explicitly reported as normative allocations, not observed modal mineralogy.',
    'External database cross-references have been independently verified at Mindat or RRUFF.',
    'AI-generated interpretation narrative, if used, has been critically checked by a geologist.',
    'Both raw laboratory CSVs and derived RockMin ID export tables have been archived.',
    'Software version (RockMin ID v2.4.0) and citation are recorded in paper methods.'
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
    'Citation: Tiwari, K., & RockMin ID Contributors. (2026). RockMin ID: Automated Geochemical Classifier and Petrological Analysis Platform (Version 2.4.0) [Web Application]. Created by Kishan Tiwari (https://kishangeo.github.io). Calibrated with IUGS Le Maitre (2002) and GEOROC Datasets.\n\nMethods wording: “Major-element compositions were screened, normalized, and classified using the RockMin ID petrological platform (v2.4.0, created by Kishan Tiwari). Major oxide weight percentages were normalized to a 100% volatile-free basis. Rock classifications and normative mineral assemblages were calculated following IUGS recommendations (Le Bas et al., 1986; Le Maitre, 2002) and standard CIPW conventions (Cross et al., 1902). Diagnostic figures were generated using RockMin ID vector projections.”',
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
