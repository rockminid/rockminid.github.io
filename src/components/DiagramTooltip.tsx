import React from 'react';
import { OxideComposition } from '../types/geochem';

export interface DiagramTooltipData {
  title: string;
  category?: string;
  field?: string;
  coordinates?: { label: string; value: string | number; color?: string }[];
  oxides?: Partial<OxideComposition>;
  notes?: string;
  confidence?: number;
  badge?: string;
}

interface DiagramTooltipProps {
  data: DiagramTooltipData | null;
  x: number;
  y: number;
  containerWidth?: number;
  containerHeight?: number;
}

export const DiagramTooltip: React.FC<DiagramTooltipProps> = ({
  data,
  x,
  y,
  containerWidth = 640,
  containerHeight = 540,
}) => {
  if (!data) return null;

  // Approximate width & height for bounding calculation
  const estWidth = 250;
  const estHeight = data.oxides ? 220 : 130;

  let left = x + 16;
  let top = y - 20;

  // Flip horizontally if near right boundary
  if (left + estWidth > containerWidth - 12) {
    left = Math.max(10, x - estWidth - 16);
  }

  // Flip vertically if near bottom boundary
  if (top + estHeight > containerHeight - 12) {
    top = Math.max(10, y - estHeight - 10);
  }

  const majorOxideKeys: (keyof OxideComposition)[] = [
    'SiO2',
    'TiO2',
    'Al2O3',
    'Fe2O3',
    'FeO',
    'MnO',
    'MgO',
    'CaO',
    'Na2O',
    'K2O',
    'P2O5',
    'LOI',
  ];

  const presentOxides = data.oxides
    ? majorOxideKeys.filter((k) => data.oxides?.[k] !== undefined && data.oxides?.[k] !== null && Number(data.oxides?.[k]) > 0)
    : [];

  return (
    <div
      style={{
        left: `${left}px`,
        top: `${top}px`,
      }}
      className="absolute z-50 pointer-events-none transition-opacity duration-150 max-w-[260px] w-auto bg-stone-950/95 border border-amber-500/50 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs font-sans text-stone-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-stone-800 pb-1.5 mb-2">
        <div className="min-w-0">
          <div className="font-bold text-stone-100 text-xs truncate leading-snug">
            {data.title}
          </div>
          {data.category && (
            <div className="text-[10px] text-stone-400 font-medium truncate">
              {data.category}
            </div>
          )}
        </div>
        {data.badge && (
          <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            {data.badge}
          </span>
        )}
      </div>

      {/* Field / Classification */}
      {data.field && (
        <div className="mb-2 flex items-center gap-1.5 text-[11px]">
          <span className="text-stone-400 font-medium">Field:</span>
          <span className="font-semibold text-amber-400 truncate">{data.field}</span>
          {data.confidence !== undefined && (
            <span className="text-[10px] font-mono text-emerald-400 ml-auto font-bold">
              {data.confidence}%
            </span>
          )}
        </div>
      )}

      {/* Coordinates breakdown */}
      {data.coordinates && data.coordinates.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5 mb-2 bg-stone-900/80 rounded-lg p-1.5 border border-stone-850 font-mono text-[11px]">
          {data.coordinates.map((c, idx) => (
            <div key={`coord-${idx}`} className="flex items-center justify-between gap-1">
              <span className="text-stone-400" style={{ color: c.color }}>
                {c.label}:
              </span>
              <span className="font-semibold text-stone-200">
                {typeof c.value === 'number' ? c.value.toFixed(1) : c.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Detailed Oxides Grid */}
      {presentOxides.length > 0 && (
        <div className="mt-1.5 pt-1.5 border-t border-stone-850">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 mb-1">
            Oxides (wt%)
          </div>
          <div className="grid grid-cols-3 gap-x-2 gap-y-0.5 font-mono text-[10px] text-stone-300">
            {presentOxides.slice(0, 9).map((k) => (
              <div key={k} className="flex items-center justify-between">
                <span className="text-stone-500">{k}:</span>
                <span className="font-medium text-stone-200">
                  {Number(data.oxides?.[k]).toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.notes && (
        <div className="text-[10px] text-stone-400 mt-1.5 italic leading-tight">
          {data.notes}
        </div>
      )}
    </div>
  );
};
