import React, { useState } from 'react';
import { Plus, X, Sparkles, MapPin, Layers, Check, Trash2 } from 'lucide-react';
import { OxideComposition } from '../types/geochem';

export interface CustomPlottedPoint {
  id: string;
  name: string;
  color: string;
  oxides?: OxideComposition;
  directCoords?: { a: number; b: number; c: number };
  tasCoords?: { sio2: number; totalAlkalis: number };
  category?: string;
}

interface PlotCustomDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPoint: (point: CustomPlottedPoint) => void;
  diagramType: 'ternary' | 'tas';
  activeDiagramName: string;
}

const PRESET_COLORS = [
  '#f59e0b', // Amber
  '#38bdf8', // Sky Blue
  '#10b981', // Emerald
  '#f43f5e', // Rose
  '#a855f7', // Purple
  '#eab308', // Yellow
  '#06b6d4', // Cyan
  '#ffffff', // White
];

export const PlotCustomDataModal: React.FC<PlotCustomDataModalProps> = ({
  isOpen,
  onClose,
  onAddPoint,
  diagramType,
  activeDiagramName,
}) => {
  const [sampleName, setSampleName] = useState<string>('My Sample 1');
  const [selectedColor, setSelectedColor] = useState<string>('#f59e0b');
  const [entryMode, setEntryMode] = useState<'oxides' | 'direct'>('oxides');

  // Oxide inputs
  const [sio2, setSio2] = useState<string>('52.5');
  const [tio2, setTio2] = useState<string>('1.2');
  const [al2o3, setAl2o3] = useState<string>('15.8');
  const [feot, setFeot] = useState<string>('9.4');
  const [mgo, setMgo] = useState<string>('6.5');
  const [cao, setCao] = useState<string>('9.8');
  const [na2o, setNa2o] = useState<string>('2.8');
  const [k2o, setK2o] = useState<string>('0.9');

  // Direct inputs
  const [coordA, setCoordA] = useState<string>('33.3');
  const [coordB, setCoordB] = useState<string>('33.3');
  const [coordC, setCoordC] = useState<string>('33.4');
  const [directSio2, setDirectSio2] = useState<string>('54.0');
  const [directAlk, setDirectAlk] = useState<string>('4.5');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `custom-user-point-${Date.now()}`;

    if (entryMode === 'oxides') {
      const oxides: OxideComposition = {
        SiO2: parseFloat(sio2) || 0,
        TiO2: parseFloat(tio2) || 0,
        Al2O3: parseFloat(al2o3) || 0,
        FeOT: parseFloat(feot) || 0,
        FeO: parseFloat(feot) || 0,
        MgO: parseFloat(mgo) || 0,
        CaO: parseFloat(cao) || 0,
        Na2O: parseFloat(na2o) || 0,
        K2O: parseFloat(k2o) || 0,
      };

      onAddPoint({
        id,
        name: sampleName || 'User Sample',
        color: selectedColor,
        oxides,
        category: 'Custom Plotted Specimen',
      });
    } else {
      if (diagramType === 'ternary') {
        const a = parseFloat(coordA) || 0;
        const b = parseFloat(coordB) || 0;
        const c = parseFloat(coordC) || 0;
        const sum = a + b + c || 1;
        onAddPoint({
          id,
          name: sampleName || 'User Sample',
          color: selectedColor,
          directCoords: {
            a: (a / sum) * 100,
            b: (b / sum) * 100,
            c: (c / sum) * 100,
          },
          category: 'Direct Barycentric Coordinates',
        });
      } else {
        onAddPoint({
          id,
          name: sampleName || 'User Sample',
          color: selectedColor,
          tasCoords: {
            sio2: parseFloat(directSio2) || 0,
            totalAlkalis: parseFloat(directAlk) || 0,
          },
          category: 'Direct TAS Coordinates',
        });
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-100">Plot Custom Data on Diagram</h3>
              <p className="text-xs text-stone-400">Target Diagram: {activeDiagramName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Sample Name & Color */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-300 mb-1">Sample ID / Label</label>
              <input
                type="text"
                required
                value={sampleName}
                onChange={(e) => setSampleName(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-1.5 text-stone-100 focus:outline-none focus:border-amber-500"
                placeholder="e.g. My Basalt 01"
              />
            </div>
            <div>
              <label className="block font-semibold text-stone-300 mb-1">Plot Marker Color</label>
              <div className="flex items-center gap-1.5 mt-1">
                {PRESET_COLORS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setSelectedColor(col)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      selectedColor === col ? 'scale-125 border-white' : 'border-transparent hover:scale-110'
                    }`}
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-2 pt-2 border-t border-stone-800">
            <button
              type="button"
              onClick={() => setEntryMode('oxides')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                entryMode === 'oxides'
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              Major Oxides (wt%)
            </button>
            <button
              type="button"
              onClick={() => setEntryMode('direct')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                entryMode === 'direct'
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              Direct Diagram Coordinates
            </button>
          </div>

          {/* Oxides Inputs */}
          {entryMode === 'oxides' ? (
            <div className="space-y-2">
              <p className="text-[11px] text-stone-400">
                Enter whole-rock oxides (wt%). The engine will automatically project onto the active ternary or TAS diagram.
              </p>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-[10px] text-stone-400 block">SiO₂</label>
                  <input
                    type="number"
                    step="any"
                    value={sio2}
                    onChange={(e) => setSio2(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-stone-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 block">TiO₂</label>
                  <input
                    type="number"
                    step="any"
                    value={tio2}
                    onChange={(e) => setTio2(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-stone-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 block">Al₂O₃</label>
                  <input
                    type="number"
                    step="any"
                    value={al2o3}
                    onChange={(e) => setAl2o3(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-stone-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 block">FeO*</label>
                  <input
                    type="number"
                    step="any"
                    value={feot}
                    onChange={(e) => setFeot(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-stone-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 block">MgO</label>
                  <input
                    type="number"
                    step="any"
                    value={mgo}
                    onChange={(e) => setMgo(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-stone-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 block">CaO</label>
                  <input
                    type="number"
                    step="any"
                    value={cao}
                    onChange={(e) => setCao(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-stone-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 block">Na₂O</label>
                  <input
                    type="number"
                    step="any"
                    value={na2o}
                    onChange={(e) => setNa2o(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-stone-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 block">K₂O</label>
                  <input
                    type="number"
                    step="any"
                    value={k2o}
                    onChange={(e) => setK2o(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-stone-200"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {diagramType === 'ternary' ? (
                <div>
                  <p className="text-[11px] text-stone-400 mb-2">
                    Enter direct normalized barycentric percentages (Top Apex A, Bottom-Left B, Bottom-Right C):
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-stone-400 block">Apex A (Top %)</label>
                      <input
                        type="number"
                        step="any"
                        value={coordA}
                        onChange={(e) => setCoordA(e.target.value)}
                        className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-stone-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-stone-400 block">Apex B (Bottom-Left %)</label>
                      <input
                        type="number"
                        step="any"
                        value={coordB}
                        onChange={(e) => setCoordB(e.target.value)}
                        className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-stone-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-stone-400 block">Apex C (Bottom-Right %)</label>
                      <input
                        type="number"
                        step="any"
                        value={coordC}
                        onChange={(e) => setCoordC(e.target.value)}
                        className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-stone-200"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-[11px] text-stone-400 mb-2">
                    Enter direct TAS coordinates (SiO₂ wt% and Total Alkalis Na₂O + K₂O wt%):
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-stone-400 block">SiO₂ (wt%)</label>
                      <input
                        type="number"
                        step="any"
                        value={directSio2}
                        onChange={(e) => setDirectSio2(e.target.value)}
                        className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-stone-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-stone-400 block">Na₂O + K₂O (wt%)</label>
                      <input
                        type="number"
                        step="any"
                        value={directAlk}
                        onChange={(e) => setDirectAlk(e.target.value)}
                        className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-stone-200"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg shadow transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Plot on Diagram</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
