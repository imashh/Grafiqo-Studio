import React, { useState } from 'react';
import { GeneratedImage, Tier, UserProfile } from '../types';
import { Download, Share2, Maximize2, Sparkles, Wand2, Loader2, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { upscaleImage, editProductPhoto } from '../services/geminiService';

import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

interface ResultsGalleryProps {
  images: GeneratedImage[];
  user: UserProfile;
  onUpgradeClick: () => void;
}

const ResultsGallery: React.FC<ResultsGalleryProps> = ({ images, user, onUpgradeClick }) => {
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleDownload = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `grafiqo-studio-${Date.now()}.png`;
    link.click();
  };

  const handleUpscale = async (image: GeneratedImage) => {
    if (user.tier === Tier.FREE) {
      onUpgradeClick();
      return;
    }

    if (user.credits < 1) {
      setNotification({ type: 'error', message: 'Insufficient credits for 4K upscale (1 credit required).' });
      return;
    }

    setIsProcessing(true);
    try {
      const upscaledUrl = await upscaleImage(image.url, image.prompt, user.tier);
      
      // Deduct 1 credit for 4K upscale
      await updateDoc(doc(db, 'users', user.uid), {
        credits: user.credits - 1
      });

      const link = document.createElement('a');
      link.href = upscaledUrl;
      link.download = `grafiqo-studio-4k-${Date.now()}.png`;
      link.click();
      setNotification({ type: 'success', message: 'Image upscaled and downloaded in 4K!' });
    } catch (err) {
      setNotification({ type: 'error', message: 'Upscaling failed. Please try again.' });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleEdit = async () => {
    if (!selectedImage || !editPrompt) return;
    setIsProcessing(true);
    try {
      const editedUrl = await editProductPhoto(selectedImage.url, editPrompt, user.tier);
      setSelectedImage({ ...selectedImage, url: editedUrl });
      setEditPrompt('');
      setShowEditPanel(false);
      setNotification({ type: 'success', message: 'Image edited successfully!' });
    } catch (err) {
      setNotification({ type: 'error', message: 'Edit failed. Please try again.' });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  if (images.length === 0) return null;

  return (
    <div className="space-y-8 mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-orange-500" />
          Generated Studio Results
        </h2>
        <span className="text-sm text-neutral-500">{images.length} variations generated</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.map((image, index) => (
          <div 
            key={index} 
            className="group relative bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl hover:border-orange-500/50 transition-all duration-300"
          >
            <div className="aspect-square overflow-hidden bg-neutral-800">
              <img 
                src={image.url} 
                alt={`Generated ${index}`} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
              <div className="flex gap-2">
                <button 
                  onClick={() => handleDownload(image.url)}
                  className="flex-1 bg-white text-black py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
                <button 
                  onClick={() => setSelectedImage(image)}
                  className="p-2 bg-neutral-800 text-white rounded-xl hover:bg-neutral-700 transition-colors"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[60] flex items-center justify-center p-4 md:p-8">
          <button 
            onClick={() => { setSelectedImage(null); setShowEditPanel(false); }}
            className="absolute top-6 right-6 p-2 bg-neutral-800 hover:bg-neutral-700 rounded-full text-white transition-colors z-[70]"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="max-w-6xl w-full h-full flex flex-col md:flex-row gap-8 items-center justify-center">
            <div className="relative flex-grow max-h-[80vh] flex items-center justify-center">
              <img 
                src={selectedImage.url} 
                alt="Selected" 
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
              />
              {isProcessing && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl">
                  <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
                  <p className="text-white font-bold">Processing Image...</p>
                </div>
              )}
            </div>

            <div className="w-full md:w-80 flex flex-col gap-4">
              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-orange-500" />
                  Studio Tools
                </h3>

                <div className="space-y-3">
                  <button 
                    onClick={() => handleUpscale(selectedImage)}
                    disabled={isProcessing}
                    className="w-full flex items-center justify-between p-4 bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-all group disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <Maximize2 className="w-5 h-5 text-blue-400" />
                      <div className="text-left">
                        <p className="text-sm font-bold">Upscale to 4K</p>
                        <p className="text-[10px] text-neutral-500">Enhance details & resolution</p>
                      </div>
                    </div>
                    {user.tier === Tier.FREE && <span className="text-[10px] bg-orange-500/20 text-orange-500 px-2 py-0.5 rounded-full font-bold">PRO</span>}
                  </button>

                  <button 
                    onClick={() => setShowEditPanel(!showEditPanel)}
                    disabled={isProcessing}
                    className={`w-full flex items-center justify-between p-4 rounded-xl transition-all group disabled:opacity-50 ${showEditPanel ? 'bg-orange-500/10 border border-orange-500/30' : 'bg-neutral-800 hover:bg-neutral-700'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-orange-400" />
                      <div className="text-left">
                        <p className="text-sm font-bold">AI Magic Edit</p>
                        <p className="text-[10px] text-neutral-500">Modify with text prompts</p>
                      </div>
                    </div>
                  </button>

                  {showEditPanel && (
                    <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                      <textarea 
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                        placeholder="e.g., Change background to a beach at sunset..."
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-3 text-sm focus:border-orange-500 outline-none min-h-[100px] resize-none"
                      />
                      <button 
                        onClick={handleEdit}
                        disabled={!editPrompt || isProcessing}
                        className="w-full bg-orange-500 text-white py-3 rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors disabled:opacity-50"
                      >
                        Apply Edit
                      </button>
                    </div>
                  )}

                  <button 
                    onClick={() => handleDownload(selectedImage.url)}
                    className="w-full flex items-center gap-3 p-4 bg-white text-black rounded-xl hover:bg-neutral-200 transition-all font-bold text-sm"
                  >
                    <Download className="w-5 h-5" />
                    Download Original
                  </button>
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl">
                <p className="text-xs text-neutral-500 uppercase font-bold mb-2">Share Studio Link</p>
                <div className="flex gap-2">
                  <input 
                    readOnly 
                    value={`https://grafiqo.studio/s/${Math.random().toString(36).substr(2, 9)}`}
                    className="flex-grow bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-[10px] text-neutral-400 outline-none"
                  />
                  <button className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {notification && (
            <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl animate-in slide-in-from-bottom-4 ${notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
              {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span className="text-sm font-bold">{notification.message}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResultsGallery;
