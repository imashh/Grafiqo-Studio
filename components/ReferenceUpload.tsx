import React from 'react';
import { Image as ImageIcon, X, Upload, Gem } from 'lucide-react';
import { Tier } from '../types';

interface ReferenceUploadProps {
  referenceFile: File | null;
  onReferenceChange: (file: File | null) => void;
  tier: Tier;
  onUpgradeClick: () => void;
}

const ReferenceUpload: React.FC<ReferenceUploadProps> = ({ referenceFile, onReferenceChange, tier, onUpgradeClick }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onReferenceChange(e.target.files[0]);
    }
  };

  const isLocked = tier === Tier.FREE;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-purple-500" />
          Style Reference
          {isLocked && (
            <span className="flex items-center gap-1 text-[10px] bg-orange-500/20 text-orange-500 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
              <Gem className="w-3 h-3" />
              Pro
            </span>
          )}
        </h3>
      </div>

      <div className="relative group">
        {isLocked && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-20 rounded-2xl flex flex-col items-center justify-center p-6 text-center">
            <Gem className="w-10 h-10 text-orange-500 mb-3" />
            <p className="text-sm font-bold mb-4">Style Reference is a Pro Feature</p>
            <button 
              onClick={onUpgradeClick}
              className="bg-orange-500 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors shadow-lg"
            >
              Upgrade to Pro
            </button>
          </div>
        )}

        <div className={`border-2 border-dashed rounded-2xl p-6 transition-all duration-200 ${
          referenceFile 
            ? 'border-purple-500/50 bg-purple-500/5' 
            : 'border-neutral-800 bg-neutral-900/50'
        }`}>
          {referenceFile ? (
            <div className="relative aspect-video rounded-xl overflow-hidden border border-purple-500/30">
              <img 
                src={URL.createObjectURL(referenceFile)} 
                alt="Reference" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
                <span className="text-xs font-medium text-white truncate max-w-[150px]">{referenceFile.name}</span>
                <button 
                  onClick={() => onReferenceChange(null)}
                  className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-12 h-12 bg-neutral-800 rounded-xl flex items-center justify-center mb-3">
                <Upload className="w-6 h-6 text-neutral-500" />
              </div>
              <p className="text-neutral-400 text-sm mb-4">Upload a photo to copy its style</p>
              <label className={`px-5 py-2 rounded-xl font-bold text-xs cursor-pointer transition-colors ${
                isLocked ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed' : 'bg-neutral-800 text-white hover:bg-neutral-700'
              }`}>
                Select Style
                {!isLocked && <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />}
              </label>
            </div>
          )}
        </div>
      </div>
      <p className="text-[10px] text-neutral-500 leading-relaxed">
        Upload an image with the lighting, background, or composition you want to replicate. Our AI will extract the style and apply it to your product.
      </p>
    </div>
  );
};

export default ReferenceUpload;
