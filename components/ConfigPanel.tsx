import React from 'react';
import { AspectRatio, OutputMode } from '../types';
import { Layout, Type, Image as ImageIcon, Layers } from 'lucide-react';

interface ConfigPanelProps {
  aspectRatio: AspectRatio;
  onAspectRatioChange: (ratio: AspectRatio) => void;
  outputMode: OutputMode;
  onOutputModeChange: (mode: OutputMode) => void;
  count: number;
  onCountChange: (count: number) => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({
  aspectRatio,
  onAspectRatioChange,
  outputMode,
  onOutputModeChange,
  count,
  onCountChange
}) => {
  const ratios = [
    { id: AspectRatio.SQUARE, label: '1:1', sub: 'Square' },
    { id: AspectRatio.LANDSCAPE, label: '16:9', sub: 'Landscape' },
    { id: AspectRatio.PORTRAIT, label: '9:16', sub: 'Portrait' }
  ];

  return (
    <div className="space-y-8">
      {/* Aspect Ratio */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
          <Layout className="w-4 h-4" />
          Aspect Ratio
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {ratios.map((r) => (
            <button
              key={r.id}
              onClick={() => onAspectRatioChange(r.id)}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                aspectRatio === r.id 
                  ? 'border-orange-500 bg-orange-500/5 text-white' 
                  : 'border-neutral-800 bg-neutral-900 text-neutral-500 hover:border-neutral-700'
              }`}
            >
              <span className="text-sm font-bold">{r.label}</span>
              <span className="text-[10px] opacity-60">{r.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Output Mode */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
          <Layers className="w-4 h-4" />
          Output Type
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onOutputModeChange(OutputMode.IMAGE)}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
              outputMode === OutputMode.IMAGE 
                ? 'border-orange-500 bg-orange-500/5 text-white' 
                : 'border-neutral-800 bg-neutral-900 text-neutral-500 hover:border-neutral-700'
            }`}
          >
            <ImageIcon className="w-5 h-5" />
            <div className="text-left">
              <p className="text-sm font-bold">Image</p>
              <p className="text-[10px] opacity-60">Direct generation</p>
            </div>
          </button>
          <button
            onClick={() => onOutputModeChange(OutputMode.PROMPT)}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
              outputMode === OutputMode.PROMPT 
                ? 'border-orange-500 bg-orange-500/5 text-white' 
                : 'border-neutral-800 bg-neutral-900 text-neutral-500 hover:border-neutral-700'
            }`}
          >
            <Type className="w-5 h-5" />
            <div className="text-left">
              <p className="text-sm font-bold">Prompt</p>
              <p className="text-[10px] opacity-60">Optimized text</p>
            </div>
          </button>
        </div>
      </div>

      {/* Generation Count */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500">Variations</h3>
          <span className="text-orange-500 font-bold">{count}</span>
        </div>
        <input 
          type="range" 
          min="1" 
          max="4" 
          step="1"
          value={count}
          onChange={(e) => onCountChange(parseInt(e.target.value))}
          className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
        />
        <div className="flex justify-between text-[10px] text-neutral-600 font-bold">
          <span>1</span>
          <span>2</span>
          <span>3</span>
          <span>4</span>
        </div>
      </div>
    </div>
  );
};

export default ConfigPanel;
