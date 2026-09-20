import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import {
  TernarySystemConfig,
  TernaryPoint,
  ternaryToCartesian,
  cartesianToTernary,
  pyroxeneToCartesian,
  cartesianToPyroxene,
  TriangleBounds,
  QuadBounds,
} from '../utils/ternaryCalculations';
import { Download, Eye, Layers, ZoomIn, ZoomOut, RotateCcw, Plus, Sparkles } from 'lucide-react';
import { DiagramExportModal } from './DiagramExportModal';
import { PlotCustomDataModal, CustomPlottedPoint } from './PlotCustomDataModal';
import { DiagramTooltip } from './DiagramTooltip';

interface TernaryDiagramProps {
  system: TernarySystemConfig;
  points: TernaryPoint[];
  selectedPointId?: string;
  onSelectPoint?: (id: string) => void;
  onCoordinateClick?: (coords: { a: number; b: number; c: number }) => void;
  onAddCustomPoint?: (point: CustomPlottedPoint) => void;
  width?: number;
  height?: number;
  showGrid?: boolean;
  showLabels?: boolean;
  showFieldColors?: boolean;
}

export const TernaryDiagram: React.FC<TernaryDiagramProps> = ({
  system,
  points,
  selectedPointId,
  onSelectPoint,
  onCoordinateClick,
  onAddCustomPoint,
  width = 680,
  height = 560,
  showGrid = true,
  showLabels = true,
  showFieldColors = true,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isPlotModalOpen, setIsPlotModalOpen] = useState<boolean>(false);

  const [hoveredCoords, setHoveredCoords] = useState<{
    a: number;
    b: number;
    c: number;
    x: number;
    y: number;
    field?: string;
  } | null>(null);

  const [hoveredPoint, setHoveredPoint] = useState<TernaryPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const isQuad = Boolean(system.isQuadrilateral);

  // Geometric layout margins with generous room for apex labels on mobile
  const margin = isQuad
    ? { top: 45, right: 65, bottom: 65, left: 65 }
    : { top: 55, right: 75, bottom: 70, left: 75 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  // Triangle bounds (Equilateral triangle centered in plot area)
  const triangleBounds: TriangleBounds = useMemo(() => {
    const side = Math.min(plotWidth, plotHeight * (2 / Math.sqrt(3)));
    const triHeight = (side * Math.sqrt(3)) / 2;

    const centerX = margin.left + plotWidth / 2;
    const baseY = margin.top + plotHeight - 10;
    const topY = baseY - triHeight;

    return {
      topX: centerX,
      topY: Math.max(margin.top, topY),
      blX: centerX - side / 2,
      blY: baseY,
      brX: centerX + side / 2,
      brY: baseY,
    };
  }, [plotWidth, plotHeight, margin.left, margin.top]);

  // Quadrilateral bounds for Pyroxene
  const quadBounds: QuadBounds = useMemo(() => {
    return {
      left: margin.left + 20,
      right: margin.left + plotWidth - 20,
      top: margin.top + 30,
      bottom: margin.top + plotHeight - 15,
    };
  }, [plotWidth, plotHeight, margin.left, margin.top]);

  // Coordinate projector
  const projectPoint = useMemo(() => {
    if (isQuad) {
      return (a: number, b: number, c: number) => pyroxeneToCartesian(a, b, c, quadBounds);
    }
    return (a: number, b: number, c: number) => ternaryToCartesian(a, b, c, triangleBounds);
  }, [isQuad, quadBounds, triangleBounds]);

  // Transform screen client coordinates to SVG user-space coordinates accurately
  const getSVGCoordinates = (clientX: number, clientY: number) => {
    if (!svgRef.current) return null;
    const pt = svgRef.current.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return null;
    const svgPoint = pt.matrixTransform(ctm.inverse());
    return { x: svgPoint.x, y: svgPoint.y };
  };

  const processCoordinates = (clientX: number, clientY: number) => {
    if (isQuad) {
      if (
        clientX < quadBounds.left ||
        clientX > quadBounds.right ||
        clientY < quadBounds.top ||
        clientY > quadBounds.bottom
      ) {
        setHoveredCoords(null);
        return;
      }
      const pCoords = cartesianToPyroxene(clientX, clientY, quadBounds);
      setHoveredCoords({
        a: Math.round(pCoords.wo * 10) / 10,
        b: Math.round(pCoords.en * 10) / 10,
        c: Math.round(pCoords.fs * 10) / 10,
        x: clientX,
        y: clientY,
      });
    } else {
      const bCoords = cartesianToTernary(clientX, clientY, triangleBounds);

      // Verify barycentric bounds [0, 100]
      if (
        bCoords.a < -2 ||
        bCoords.b < -2 ||
        bCoords.c < -2 ||
        bCoords.a > 102 ||
        bCoords.b > 102 ||
        bCoords.c > 102
      ) {
        setHoveredCoords(null);
        return;
      }

      setHoveredCoords({
        a: Math.round(bCoords.a * 10) / 10,
        b: Math.round(bCoords.b * 10) / 10,
        c: Math.round(bCoords.c * 10) / 10,
        x: clientX,
        y: clientY,
      });
    }
  };

  // Handle Mouse Move for interactive crosshairs
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const coords = getSVGCoordinates(e.clientX, e.clientY);
    if (!coords) return;
    processCoordinates(coords.x, coords.y);
  };

  // Handle Touch Move for mobile touch exploration
  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const coords = getSVGCoordinates(touch.clientX, touch.clientY);
    if (!coords) return;
    processCoordinates(coords.x, coords.y);
  };

  const handleMouseLeave = () => {
    setHoveredCoords(null);
    setHoveredPoint(null);
    setTooltipPos(null);
  };

  const handleSvgClick = () => {
    if (hoveredCoords && onCoordinateClick) {
      onCoordinateClick({ a: hoveredCoords.a, b: hoveredCoords.b, c: hoveredCoords.c });
    }
  };

  // Export SVG utility
  const handleExportSvg = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `${system.id}-diagram.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  // Generate grid lines
  const gridLines = useMemo(() => {
    if (!showGrid) return [];
    const lines: { x1: number; y1: number; x2: number; y2: number; label?: string }[] = [];

    if (isQuad) {
      // Horizontal Wo lines at 10, 20, 30, 40, 50%
      for (let wo = 10; wo <= 50; wo += 10) {
        const p1 = pyroxeneToCartesian(wo, 100 - wo, 0, quadBounds);
        const p2 = pyroxeneToCartesian(wo, 0, 100 - wo, quadBounds);
        lines.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, label: `Wo${wo}` });
      }
      // Vertical En-Fs lines at 20, 40, 60, 80%
      for (let en = 20; en < 100; en += 20) {
        const pBottom = pyroxeneToCartesian(0, en, 100 - en, quadBounds);
        const pTop = pyroxeneToCartesian(50, (100 - 50) * (en / 100), (100 - 50) * ((100 - en) / 100), quadBounds);
        lines.push({ x1: pBottom.x, y1: pBottom.y, x2: pTop.x, y2: pTop.y, label: `En${en}` });
      }
    } else {
      // Ternary 20% grid lines
      const step = 20;
      for (let pct = step; pct < 100; pct += step) {
        // Parallel to bottom edge (constant a)
        const pA1 = ternaryToCartesian(pct, 100 - pct, 0, triangleBounds);
        const pA2 = ternaryToCartesian(pct, 0, 100 - pct, triangleBounds);
        lines.push({ x1: pA1.x, y1: pA1.y, x2: pA2.x, y2: pA2.y });

        // Parallel to right edge (constant b)
        const pB1 = ternaryToCartesian(100 - pct, pct, 0, triangleBounds);
        const pB2 = ternaryToCartesian(0, pct, 100 - pct, triangleBounds);
        lines.push({ x1: pB1.x, y1: pB1.y, x2: pB2.x, y2: pB2.y });

        // Parallel to left edge (constant c)
        const pC1 = ternaryToCartesian(100 - pct, 0, pct, triangleBounds);
        const pC2 = ternaryToCartesian(0, 100 - pct, pct, triangleBounds);
        lines.push({ x1: pC1.x, y1: pC1.y, x2: pC2.x, y2: pC2.y });
      }
    }
    return lines;
  }, [showGrid, isQuad, quadBounds, triangleBounds]);

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center select-none bg-stone-900 border border-stone-800 rounded-xl p-3 sm:p-4 shadow-xl overflow-hidden"
    >
      {/* Top Header & Toolbar */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-stone-800">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-stone-100 flex items-center gap-2">
            <span>{system.name}</span>
            <span className="text-[11px] font-normal px-2 py-0.5 rounded bg-stone-800 text-amber-400 border border-stone-700 font-mono">
              {system.referenceAuthor}
            </span>
          </h3>
          <p className="text-xs text-stone-400 mt-0.5">{system.subtitle}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {onAddCustomPoint && (
            <button
              onClick={() => setIsPlotModalOpen(true)}
              title="Plot custom geochemical data or barycentric coordinates"
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-800 flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Plot Custom Data</span>
            </button>
          )}

          <button
            onClick={() => setIsExportModalOpen(true)}
            title="Download publication-quality figure at custom DPI and format (PNG, JPEG, SVG)"
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Export Figure</span>
          </button>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div className="relative w-full flex justify-center">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseLeave}
          onClick={handleSvgClick}
          className="w-full max-w-2xl h-auto block select-none cursor-crosshair"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Soft Glow for Active Sample Marker */}
            <filter id="active-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feColorMatrix
                type="matrix"
                values="
                  1 0 0 0 0.98
                  0 0.6 0 0 0.75
                  0 0 0.2 0 0.14
                  0 0 0 1 0"
              />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Gradient for Apex Titles */}
            <linearGradient id="top-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={system.apices.top.color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={system.apices.top.color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Background Area */}
          {isQuad ? (
            <polygon
              points={`
                ${quadBounds.left},${quadBounds.top}
                ${quadBounds.right},${quadBounds.top}
                ${quadBounds.right},${quadBounds.bottom}
                ${quadBounds.left},${quadBounds.bottom}
              `}
              fill="var(--stone-900)"
              stroke="var(--stone-700)"
              strokeWidth="2"
            />
          ) : (
            <polygon
              points={`
                ${triangleBounds.topX},${triangleBounds.topY}
                ${triangleBounds.blX},${triangleBounds.blY}
                ${triangleBounds.brX},${triangleBounds.brY}
              `}
              fill="var(--stone-900)"
              stroke="var(--stone-700)"
              strokeWidth="2"
            />
          )}

          {/* Field Polygons */}
          {system.fields.map((field) => {
            const pointsStr = field.vertices
              .map(([a, b, c]) => {
                const pt = projectPoint(a, b, c);
                return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
              })
              .join(' ');

            return (
              <g key={field.id} className="group/field">
                <polygon
                  points={pointsStr}
                  fill={showFieldColors && field.fillColor ? field.fillColor : 'transparent'}
                  stroke={field.color}
                  strokeWidth="1.2"
                  strokeOpacity="0.75"
                  className="transition-all duration-200 hover:fill-amber-500/20"
                />

                {/* Field Code / Label */}
                {showLabels && field.labelPosition && (
                  <text
                    x={projectPoint(field.labelPosition[0], field.labelPosition[1], field.labelPosition[2]).x}
                    y={projectPoint(field.labelPosition[0], field.labelPosition[1], field.labelPosition[2]).y}
                    fill={field.textColor || '#d6d3d1'}
                    fontSize={field.code ? '10' : '9'}
                    fontWeight={field.code ? '600' : 'normal'}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="pointer-events-none drop-shadow-sm opacity-90 select-none"
                  >
                    {field.code || field.name}
                  </text>
                )}
              </g>
            );
          })}

          {/* Reference Curves (e.g. Irvine & Baragar 1971 boundary) */}
          {system.curves?.map((curve) => {
            const pathD = curve.points
              .map((pt, i) => {
                const coord = projectPoint(pt[0], pt[1], pt[2]);
                return `${i === 0 ? 'M' : 'L'} ${coord.x.toFixed(1)} ${coord.y.toFixed(1)}`;
              })
              .join(' ');

            return (
              <g key={curve.id}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={curve.color}
                  strokeWidth="2"
                  strokeDasharray={curve.strokeDasharray}
                />
                {curve.label && curve.points.length > 4 && (
                  <text
                    x={projectPoint(curve.points[4][0], curve.points[4][1], curve.points[4][2]).x + 8}
                    y={projectPoint(curve.points[4][0], curve.points[4][1], curve.points[4][2]).y - 8}
                    fill={curve.color}
                    fontSize="9"
                    fontWeight="600"
                    textAnchor="start"
                    className="select-none"
                  >
                    {curve.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Grid Lines */}
          {gridLines.map((line, idx) => (
            <line
              key={`grid-${idx}`}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="var(--stone-600)"
              strokeWidth="0.75"
              strokeDasharray="2 3"
              strokeOpacity="0.4"
            />
          ))}

          {/* Outer Apex Labels & Ticks */}
          {isQuad ? (
            /* Pyroxene Quadrilateral Outer Labels */
            <g className="select-none text-xs">
              {/* Diopside Top Left */}
              <text
                x={quadBounds.left - 8}
                y={quadBounds.top}
                fill={system.apices.top.color}
                fontSize="11"
                fontWeight="bold"
                textAnchor="end"
                dominantBaseline="middle"
              >
                Diopside (CaMgSi₂O₆)
              </text>
              {/* Hedenbergite Top Right */}
              <text
                x={quadBounds.right + 8}
                y={quadBounds.top}
                fill={system.apices.top.color}
                fontSize="11"
                fontWeight="bold"
                textAnchor="start"
                dominantBaseline="middle"
              >
                Hedenbergite (CaFeSi₂O₆)
              </text>
              {/* Enstatite Bottom Left */}
              <text
                x={quadBounds.left - 8}
                y={quadBounds.bottom}
                fill={system.apices.bottomLeft.color}
                fontSize="11"
                fontWeight="bold"
                textAnchor="end"
                dominantBaseline="middle"
              >
                Enstatite (Mg₂Si₂O₆)
              </text>
              {/* Ferrosilite Bottom Right */}
              <text
                x={quadBounds.right + 8}
                y={quadBounds.bottom}
                fill={system.apices.bottomRight.color}
                fontSize="11"
                fontWeight="bold"
                textAnchor="start"
                dominantBaseline="middle"
              >
                Ferrosilite (Fe₂Si₂O₆)
              </text>
              {/* Wo 50% Top Line */}
              <text
                x={(quadBounds.left + quadBounds.right) / 2}
                y={quadBounds.top - 12}
                fill="#38bdf8"
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
              >
                Wo = 50 mol% (Clinopyroxene)
              </text>
              {/* Wo 0% Base Line */}
              <text
                x={(quadBounds.left + quadBounds.right) / 2}
                y={quadBounds.bottom + 22}
                fill="var(--stone-400)"
                fontSize="11"
                fontWeight="bold"
                textAnchor="middle"
              >
                Wo = 0 mol% (Orthopyroxene / Pigeonite Base)
              </text>
            </g>
          ) : (
            /* Standard Ternary Apices */
            <g className="select-none">
              {/* Top Apex */}
              <g transform={`translate(${triangleBounds.topX}, ${triangleBounds.topY - 14})`}>
                <text
                  x="0"
                  y="0"
                  fill={system.apices.top.color}
                  fontSize="13"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {system.apices.top.label}
                </text>
                {system.apices.top.sublabel && (
                  <text x="0" y="14" fill="var(--stone-400)" fontSize="9.5" textAnchor="middle">
                    {system.apices.top.sublabel}
                  </text>
                )}
              </g>

              {/* Bottom-Left Apex */}
              <g transform={`translate(${triangleBounds.blX - 10}, ${triangleBounds.blY + 22})`}>
                <text
                  x="0"
                  y="0"
                  fill={system.apices.bottomLeft.color}
                  fontSize="13"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {system.apices.bottomLeft.label}
                </text>
                {system.apices.bottomLeft.sublabel && (
                  <text x="0" y="14" fill="var(--stone-400)" fontSize="9.5" textAnchor="middle">
                    {system.apices.bottomLeft.sublabel}
                  </text>
                )}
              </g>

              {/* Bottom-Right Apex */}
              <g transform={`translate(${triangleBounds.brX + 10}, ${triangleBounds.brY + 22})`}>
                <text
                  x="0"
                  y="0"
                  fill={system.apices.bottomRight.color}
                  fontSize="13"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {system.apices.bottomRight.label}
                </text>
                {system.apices.bottomRight.sublabel && (
                  <text x="0" y="14" fill="var(--stone-400)" fontSize="9.5" textAnchor="middle">
                    {system.apices.bottomRight.sublabel}
                  </text>
                )}
              </g>
            </g>
          )}

          {/* Sample Points */}
          {points.map((pt) => {
            const coord = projectPoint(pt.a, pt.b, pt.c);
            const isSelected = selectedPointId === pt.id;
            const isPrimary = Boolean(pt.isPrimary);
            const isHovered = hoveredPoint?.id === pt.id;

            return (
              <g
                key={pt.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPoint?.(pt.id);
                }}
                onMouseEnter={(e) => {
                  if (containerRef.current) {
                    const rect = containerRef.current.getBoundingClientRect();
                    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                  }
                  setHoveredPoint(pt);
                }}
                onMouseMove={(e) => {
                  if (containerRef.current) {
                    const rect = containerRef.current.getBoundingClientRect();
                    setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                  }
                }}
                onMouseLeave={() => {
                  setHoveredPoint(null);
                  setTooltipPos(null);
                }}
                className="cursor-pointer"
              >
                {/* Generous invisible hit target to completely prevent flicker */}
                <circle
                  cx={coord.x}
                  cy={coord.y}
                  r="14"
                  fill="transparent"
                  className="pointer-events-auto"
                />

                {/* Concentric highlight ring for active sample (stable, non-shifting) */}
                {isPrimary && (
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r="11"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    strokeOpacity="0.6"
                    strokeDasharray="3 2"
                  />
                )}

                {/* Outer selection ring */}
                {(isSelected || isPrimary || isHovered) && (
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r={isPrimary ? 8.5 : isHovered ? 7.5 : 6}
                    fill="none"
                    stroke={isPrimary ? '#fbbf24' : isHovered ? '#38bdf8' : '#38bdf8'}
                    strokeWidth={isHovered ? 2.5 : 1.75}
                    className="transition-all duration-150"
                  />
                )}

                {/* Point body (smooth radius change without CSS transform shift) */}
                <circle
                  cx={coord.x}
                  cy={coord.y}
                  r={isPrimary ? 5.5 : isHovered ? 5 : 4}
                  fill={pt.color || (isPrimary ? '#f59e0b' : '#38bdf8')}
                  stroke="var(--stone-900)"
                  strokeWidth="1.5"
                  className="transition-all duration-150"
                />

                {/* Active Sample Text Label */}
                {isPrimary && (
                  <g transform={`translate(${coord.x + 8}, ${coord.y - 8})`} className="pointer-events-none">
                    <rect
                      x="0"
                      y="-12"
                      width={Math.min(180, pt.name.length * 7 + 16)}
                      height="18"
                      rx="4"
                      fill="var(--stone-900)"
                      fillOpacity="0.9"
                      stroke="#f59e0b"
                      strokeWidth="1"
                    />
                    <text
                      x="6"
                      y="1"
                      fill="var(--stone-100)"
                      fontSize="10"
                      fontWeight="bold"
                      dominantBaseline="middle"
                    >
                      {pt.name}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Interactive Hover Crosshair / Marker */}
          {hoveredCoords && (
            <g className="pointer-events-none">
              <circle
                cx={hoveredCoords.x}
                cy={hoveredCoords.y}
                r="5"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <line
                x1={hoveredCoords.x - 8}
                y1={hoveredCoords.y}
                x2={hoveredCoords.x + 8}
                y2={hoveredCoords.y}
                stroke="#fbbf24"
                strokeWidth="1"
              />
              <line
                x1={hoveredCoords.x}
                y1={hoveredCoords.y - 8}
                x2={hoveredCoords.x}
                y2={hoveredCoords.y + 8}
                stroke="#fbbf24"
                strokeWidth="1"
              />
            </g>
          )}
        </svg>

        {/* Hover Coordinate Card Overlay (only when exploring empty canvas) */}
        {hoveredCoords && !hoveredPoint && (
          <div
            style={{
              left: Math.min(width - 170, Math.max(10, hoveredCoords.x + 12)),
              top: Math.min(height - 70, Math.max(10, hoveredCoords.y - 45)),
            }}
            className="absolute pointer-events-none z-30 bg-stone-950/95 border border-amber-600/60 rounded-md px-2.5 py-1.5 shadow-2xl backdrop-blur-md text-[11px] font-mono leading-tight"
          >
            <div className="flex items-center gap-2 text-stone-300">
              <span className="font-bold text-amber-400">
                {isQuad ? 'Wo' : system.apices.top.id}: {hoveredCoords.a}%
              </span>
              <span className="text-stone-500">|</span>
              <span className="font-bold text-emerald-400">
                {isQuad ? 'En' : system.apices.bottomLeft.id}: {hoveredCoords.b}%
              </span>
              <span className="text-stone-500">|</span>
              <span className="font-bold text-red-400">
                {isQuad ? 'Fs' : system.apices.bottomRight.id}: {hoveredCoords.c}%
              </span>
            </div>
          </div>
        )}

        {/* Rich Interactive Diagram Tooltip with Oxides & Metadata */}
        {hoveredPoint && tooltipPos && (
          <DiagramTooltip
            data={{
              title: hoveredPoint.name,
              category: hoveredPoint.category,
              field: hoveredPoint.field,
              badge: hoveredPoint.isPrimary ? 'Active Sample' : undefined,
              coordinates: [
                { label: isQuad ? 'Wo' : system.apices.top.id, value: `${hoveredPoint.a.toFixed(1)}%`, color: system.apices.top.color },
                { label: isQuad ? 'En' : system.apices.bottomLeft.id, value: `${hoveredPoint.b.toFixed(1)}%`, color: system.apices.bottomLeft.color },
                { label: isQuad ? 'Fs' : system.apices.bottomRight.id, value: `${hoveredPoint.c.toFixed(1)}%`, color: system.apices.bottomRight.color },
              ],
              oxides: hoveredPoint.oxides,
              notes: hoveredPoint.notes,
            }}
            x={tooltipPos.x}
            y={tooltipPos.y}
            containerWidth={containerRef.current?.clientWidth || width}
            containerHeight={containerRef.current?.clientHeight || height}
          />
        )}
      </div>

      {/* Legend & Guide Footer */}
      <div className="w-full mt-3 pt-2 border-t border-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-400">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-500/30" />
            <span className="text-stone-300 font-medium">Active Sample</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            <span>Reference Rocks / Minerals</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span>Batch Uploaded Samples</span>
          </div>
        </div>
        <div className="text-[11px] text-stone-500 font-mono">
          Click canvas to inspect coordinates
        </div>
      </div>

      {/* High-Resolution Diagram Export Modal */}
      <DiagramExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        svgRef={svgRef}
        diagramTitle={system.name}
        defaultFilename={`${system.id}-classification`}
      />

      {/* Plot Custom Data Modal */}
      {onAddCustomPoint && (
        <PlotCustomDataModal
          isOpen={isPlotModalOpen}
          onClose={() => setIsPlotModalOpen(false)}
          diagramType="ternary"
          activeDiagramName={system.name}
          onAddPoint={(point) => {
            onAddCustomPoint(point);
          }}
        />
      )}
    </div>
  );
};
