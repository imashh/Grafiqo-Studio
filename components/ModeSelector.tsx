import React from 'react';
import { ShootMode } from '../types';
import { ShoppingBag, Sparkles, Camera } from 'lucide-react';

interface ModeSelectorProps {
  selectedMode: ShootMode;
  onModeChange: (mode: ShootMode) => void;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ selectedMode, onModeChange }) => {
  const modes = [
    {
      id: ShootMode.ECOMMERCE,
      label: 'E-commerce',
      icon: ShoppingBag,
      description: 'Clean studio shots for marketplaces'
    },
    {
      id: ShootMode.CREATIVE,
      label: 'Creative',
      icon: Sparkles,
      description: 'Artistic lighting and compositions'
    },
    {
      id: ShootMode.LIFESTYLE,
      label: 'Lifestyle',
      icon: Camera,
      description: 'Natural settings and real-world context'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = selectedMode === mode.id;
        
        return (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            className={`flex flex-col items-start p-5 rounded-2xl border-2 transition-all duration-200 text-left ${
              isActive 
                ? 'border-orange-500 bg-orange-500/5 ring-4 ring-orange-500/10' 
                : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700'
            }`}
          >
            <div className={`p-3 rounded-xl mb-4 ${isActive ? 'bg-orange-500 text-white' : 'bg-neutral-800 text-neutral-400'}`}>
              <Icon className="w-6 h-6" />
            </div>
            <h4 className={`font-bold mb-1 ${isActive ? 'text-white' : 'text-neutral-300'}`}>{mode.label}</h4>
            <p className="text-xs text-neutral-500 leading-relaxed">{mode.description}</p>
          </button>
        );
      })}
    </div>
  );
};

export default ModeSelector;
