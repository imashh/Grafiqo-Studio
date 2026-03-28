import React, { useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Plus } from 'lucide-react';

interface UploadZoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
}

const UploadZone: React.FC<UploadZoneProps> = ({ files, onFilesChange }) => {
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files as FileList).filter(f => f.type.startsWith('image/'));
    onFilesChange([...files, ...droppedFiles].slice(0, 5));
  }, [files, onFilesChange]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files as FileList).filter(f => f.type.startsWith('image/'));
      onFilesChange([...files, ...selectedFiles].slice(0, 5));
    }
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-orange-500" />
          Product Photos
          <span className="text-xs font-normal text-neutral-500 ml-2">({files.length}/5)</span>
        </h3>
        {files.length > 0 && (
          <button 
            onClick={() => onFilesChange([])}
            className="text-xs text-neutral-500 hover:text-red-500 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      <div 
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 transition-all duration-200 ${
          files.length === 0 
            ? 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700 hover:bg-neutral-900' 
            : 'border-neutral-800 bg-neutral-900/30'
        }`}
      >
        {files.length === 0 ? (
          <div className="flex flex-col items-center text-center py-8">
            <div className="w-16 h-16 bg-neutral-800 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Upload className="w-8 h-8 text-neutral-500" />
            </div>
            <p className="text-neutral-300 font-medium mb-1">Drop your product photos here</p>
            <p className="text-neutral-500 text-sm mb-6">Support PNG, JPG, WEBP (Max 5MB)</p>
            <label className="bg-white text-black px-6 py-2.5 rounded-xl font-bold text-sm cursor-pointer hover:bg-neutral-200 transition-colors">
              Browse Files
              <input type="file" multiple accept="image/*" onChange={handleFileSelect} className="hidden" />
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {files.map((file, index) => (
              <div key={index} className="relative aspect-square rounded-xl overflow-hidden group border border-neutral-800">
                <img 
                  src={URL.createObjectURL(file)} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
                <button 
                  onClick={() => removeFile(index)}
                  className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-red-500 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {files.length < 5 && (
              <label className="aspect-square border-2 border-dashed border-neutral-800 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-neutral-700 hover:bg-neutral-800/50 cursor-pointer transition-all">
                <Plus className="w-6 h-6 text-neutral-600" />
                <span className="text-[10px] uppercase font-bold text-neutral-600">Add More</span>
                <input type="file" multiple accept="image/*" onChange={handleFileSelect} className="hidden" />
              </label>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadZone;
