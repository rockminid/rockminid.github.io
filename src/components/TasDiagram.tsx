import React, { useRef, useState } from 'react';
import { Download, Plus } from 'lucide-react';
import { DiagramExportModal } from './DiagramExportModal';
import { PlotCustomDataModal, CustomPlottedPoint } from './PlotCustomDataModal';
import { DiagramTooltip, DiagramTooltipData } from './DiagramTooltip';
import { OxideComposition } from '../types/geochem';

export interface TASPoint {
  id: string;
  name: string;
  sio2: number;
  totalAlkalis: number; // Na2O + K2O
  category?: string;
  field?: string;
  isPrimary?: boolean;
  oxides?: Partial<OxideComposition>;
  confidence?: number;
  metadata?: Record<string, any>;
}

interface TasDiagramProps {
  points: TASPoint[];
  selectedPointId?: string;
  onSelectPoint?: (id: string) => void;
  onAddCustomPoint?: (point: CustomPlottedPoint) => void;
  height?: number;
}

export const TasDiagram: React.FC<TasDiagramProps> = ({
  points,
  selectedPointId,
  onSelectPoint,
  onAddCustomPoint,
  height = 420,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<TASPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isPlotModalOpen, setIsPlotModalOpen] = useState<boolean>(false);
  // Chart coordinates:
  // X: SiO2 from 35 to 80 wt%
  // Y: Na2O + K2O from 0 to 16 wt%
  const minX = 35;
  const maxX = 80;
  const minY = 0;
  const maxY = 16;

  const width = 600;
  const margin = { top: 25, right: 30, bottom: 45, left: 55 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const scaleX = (x: number) => margin.left + ((x - minX) / (maxX - minX)) * plotWidth;
  const scaleY = (y: number) => margin.top + plotHeight - ((y - minY) / (maxY - minY)) * plotHeight;

  // Key TAS field boundary lines (Le Bas et al., 1986)
  const boundaryLines = [
    // Vertical / sloped lines
    { x1: 41, y1: 0, x2: 41, y2: 7, label: '' },
    { x1: 45, y1: 0, x2: 45, y2: 9.4, label: '' },
    { x1: 52, y1: 0, x2: 52, y2: 5, label: '' },
    { x1: 57, y1: 0, x2: 57, y2: 5.9, label: '' },
    { x1: 63, y1: 0, x2: 63, y2: 7, label: '' },
    { x1: 69, y1: 8, x2: 69, y2: 13, label: '' },
    { x1: 52.5, y1: 5, x2: 49.4, y2: 7.3, label: '' },
    { x1: 57.6, y1: 11.7, x2: 53.0, y2: 9.3, label: '' },
    { x1: 49.4, y1: 7.3, x2: 45.0, y2: 9.4, label: '' },
    { x1: 53.0, y1: 9.3, x2: 48.4, y2: 11.5, label: '' },
    { x1: 57.6, y1: 11.7, x2: 52.5, y2: 14.0, label: '' },
    // Horizontal dividing bounds
    { x1: 41, y1: 3, x2: 45, y2: 3, label: '' },
    { x1: 45, y1: 5, x2: 52, y2: 5, label: '' },
    { x1: 52, y1: 5, x2: 57, y2: 5.9, label: '' },
    { x1: 57, y1: 5.9, x2: 63, y2: 7.0, label: '' },
    { x1: 63, y1: 7.0, x2: 69, y2: 8.0, label: '' },
    { x1: 41, y1: 7.0, x2: 52.5, y2: 14.0, label: '' },
  ];

  // Alkaline vs Subalkaline boundary (Irvine & Baragar, 1971)
  const alkalineBoundaryCurve: { x: number; y: number }[] = [];
  for (let s = 39.2; s <= 76; s += 2) {
    const alk = -0.0038 * Math.pow(s, 2) + 0.65 * s - 21.0;
    if (alk >= 0 && alk <= 16) {
      alkalineBoundaryCurve.push({ x: s, y: alk });
    }
  }

  const alkPathD = alkalineBoundaryCurve
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(pt.x).toFixed(1)} ${scaleY(pt.y).toFixed(1)}`)
    .join(' ');

  // Field text labels in the diagram
  const fieldLabels = [
    { x: 43, y: 1.5, text: 'Picrobasalt', size: 9 },
    { x: 48.5, y: 2.5, text: 'Basalt', size: 11 },
    { x: 54.5, y: 3.0, text: 'Basaltic Andesite', size: 10 },
    { x: 60.0, y: 3.5, text: 'Andesite', size: 11 },
    { x: 67.0, y: 4.5, text: 'Dacite', size: 11 },
    { x: 75.0, y: 6.0, text: 'Rhyolite', size: 12 },
    { x: 47.0, y: 6.0, text: 'Trachybasalt', size: 9 },
    { x: 53.0, y: 7.5, text: 'Bas. Trachyand.', size: 9 },
    { x: 57.0, y: 9.0, text: 'Trachyandesite', size: 9 },
    { x: 64.0, y: 10.5, text: 'Trachyte', size: 10 },
    { x: 44.0, y: 5.5, text: 'Tephrite', size: 9 },
    { x: 47.0, y: 9.0, text: 'Phonotephrite', size: 8 },
    { x: 51.0, y: 11.0, text: 'Tephriphonolite', size: 8 },
    { x: 57.0, y: 13.5, text: 'Phonolite', size: 10 },
    { x: 42.0, y: 12.0, text: 'Foidite', size: 10 },
  ];

  // Grid tick marks
  const xTicks = [40, 45, 50, 55, 60, 65, 70, 75, 80];
  const yTicks = [0, 2, 4, 6, 8, 10, 12, 14, 16];

  return (
    <div className="w-full flex flex-col items-center bg-stone-900 border border-stone-800 rounded-xl p-4 select-none">
      <div className="w-full flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-stone-800">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <h4 className="text-sm font-semibold tracking-wide text-stone-200">
            TAS Diagram (Le Bas et al., 1986 / IUGS)
          </h4>
        </div>

        <div className="flex items-center gap-2">
          {onAddCustomPoint && (
            <button
              onClick={() => setIsPlotModalOpen(true)}
              title="Plot custom data on TAS diagram"
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-800 flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Plot Custom Data</span>
            </button>
          )}

          <button
            onClick={() => setIsExportModalOpen(true)}
            title="Download publication-quality figure at custom DPI and format"
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Export Figure</span>
          </button>
        </div>
      </div>

      <div ref={containerRef} className="relative w-full flex justify-center">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full max-w-2xl h-auto drop-shadow-sm select-none"
        >
          {/* Diagram Canvas Background */}
          <rect
            x={margin.left}
            y={margin.top}
            width={plotWidth}
            height={plotHeight}
            fill="var(--stone-900)"
            stroke="var(--stone-700)"
            strokeWidth="1.5"
          />

          {/* Background grid lines */}
          {xTicks.map((x) => (
            <line
              key={`grid-x-${x}`}
              x1={scaleX(x)}
              y1={margin.top}
              x2={scaleX(x)}
              y2={margin.top + plotHeight}
              stroke="var(--stone-800)"
              strokeDasharray="2,2"
              strokeWidth="1"
            />
          ))}
          {yTicks.map((y) => (
            <line
              key={`grid-y-${y}`}
              x1={margin.left}
              y1={scaleY(y)}
              x2={margin.left + plotWidth}
              y2={scaleY(y)}
              stroke="var(--stone-800)"
              strokeDasharray="2,2"
              strokeWidth="1"
            />
          ))}

          {/* TAS Classification Boundary Lines */}
          {boundaryLines.map((line, idx) => (
            <line
              key={`bound-${idx}`}
              x1={scaleX(line.x1)}
              y1={scaleY(line.y1)}
              x2={scaleX(line.x2)}
              y2={scaleY(line.y2)}
              stroke="var(--stone-600)"
              strokeWidth="1.2"
            />
          ))}

          {/* Alkaline / Subalkaline dividing line */}
          <path
            d={alkPathD}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="1.8"
            strokeDasharray="4,3"
            className="opacity-90"
          />

          {/* Field Labels */}
          {fieldLabels.map((lbl, idx) => (
            <text
              key={`label-${idx}`}
              x={scaleX(lbl.x)}
              y={scaleY(lbl.y)}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--stone-400)"
              fontSize={lbl.size}
              fontWeight="500"
              className="pointer-events-none opacity-80"
            >
              {lbl.text}
            </text>
          ))}

          {/* Axes Numbers */}
          {xTicks.map((x) => (
            <text
              key={`tx-${x}`}
              x={scaleX(x)}
              y={margin.top + plotHeight + 18}
              textAnchor="middle"
              fill="var(--stone-400)"
              fontSize="10"
              fontFamily="monospace"
            >
              {x}
            </text>
          ))}

          {yTicks.map((y) => (
            <text
              key={`ty-${y}`}
              x={margin.left - 10}
              y={scaleY(y) + 3}
              textAnchor="end"
              fill="var(--stone-400)"
              fontSize="10"
              fontFamily="monospace"
            >
              {y}
            </text>
          ))}

          {/* Axis Labels */}
          <text
            x={margin.left + plotWidth / 2}
            y={height - 8}
            textAnchor="middle"
            fill="var(--stone-200)"
            fontSize="12"
            fontWeight="600"
          >
            SiO₂ (wt%)
          </text>
          <text
            x={-(margin.top + plotHeight / 2)}
            y={16}
            textAnchor="middle"
            transform="rotate(-90)"
            fill="var(--stone-200)"
            fontSize="12"
            fontWeight="600"
          >
            Na₂O + K₂O (wt%)
          </text>

          {/* Plotted Sample Points */}
          {points.map((pt) => {
            const cx = scaleX(Math.max(minX, Math.min(maxX, pt.sio2)));
            const cy = scaleY(Math.max(minY, Math.min(maxY, pt.totalAlkalis)));
            const isSelected = selectedPointId === pt.id;
            const isHovered = hoveredPoint?.id === pt.id;

            return (
              <g
                key={pt.id}
                onClick={() => onSelectPoint && onSelectPoint(pt.id)}
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
                {/* Invisible generous hit circle to ensure stable mouseover without flickering */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={16}
                  fill="transparent"
                  pointerEvents="all"
                />

                {isSelected && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={13}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2"
                    strokeDasharray="3,3"
                    className="animate-pulse pointer-events-none"
                  />
                )}
                {(isHovered || pt.isPrimary) && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={pt.isPrimary ? 9.5 : 8}
                    fill="none"
                    stroke={pt.isPrimary ? '#fbbf24' : '#38bdf8'}
                    strokeWidth={isHovered ? 2.5 : 1.5}
                    className="pointer-events-none transition-all duration-150"
                  />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={pt.isPrimary ? (isHovered ? 7.5 : 6) : isHovered ? 6 : 4.5}
                  fill={pt.isPrimary ? '#f59e0b' : isSelected ? '#f43f5e' : '#38bdf8'}
                  stroke="#ffffff"
                  strokeWidth={pt.isPrimary ? '2' : '1.2'}
                  className="pointer-events-none transition-all duration-150"
                />
              </g>
            );
          })}
        </svg>

        {/* Interactive Tooltip on Hover */}
        {hoveredPoint && tooltipPos && (
          <DiagramTooltip
            data={{
              title: hoveredPoint.name,
              category: hoveredPoint.category,
              field: hoveredPoint.field || (hoveredPoint.category?.includes('Volcanic') ? hoveredPoint.category : undefined),
              badge: hoveredPoint.isPrimary ? 'Active Sample' : undefined,
              confidence: hoveredPoint.confidence,
              coordinates: [
                { label: 'SiO₂', value: `${hoveredPoint.sio2.toFixed(2)} wt%`, color: '#38bdf8' },
                { label: 'Alkalis', value: `${hoveredPoint.totalAlkalis.toFixed(2)} wt%`, color: '#f59e0b' },
              ],
              oxides: hoveredPoint.oxides,
            }}
            x={tooltipPos.x}
            y={tooltipPos.y}
            containerWidth={containerRef.current?.clientWidth || width}
            containerHeight={containerRef.current?.clientHeight || height}
          />
        )}
      </div>

      <div className="w-full flex justify-between items-center text-[11px] text-stone-500 pt-2 border-t border-stone-800/80 mt-1">
        <span>Field boundaries calibrated after IUGS Subcommission on the Systematics of Igneous Rocks</span>
        <span>Click any dot to inspect geochemical sample</span>
      </div>

      {/* High-Resolution Diagram Export Modal */}
      <DiagramExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        svgRef={svgRef}
        diagramTitle="Total Alkali - Silica (TAS) Diagram"
        defaultFilename="tas-classification-diagram"
      />

      {/* Plot Custom Data Modal */}
      {onAddCustomPoint && (
        <PlotCustomDataModal
          isOpen={isPlotModalOpen}
          onClose={() => setIsPlotModalOpen(false)}
          diagramType="tas"
          activeDiagramName="Total Alkali - Silica (TAS)"
          onAddPoint={(point) => {
            onAddCustomPoint(point);
          }}
        />
      )}
    </div>
  );
};
