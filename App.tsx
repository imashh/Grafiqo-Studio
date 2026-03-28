import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { 
  Camera, Sparkles, AlertCircle, Loader2, Gem, 
  Settings, LogOut, ShieldCheck, Zap, History,
  ChevronRight, ArrowRight
} from 'lucide-react';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from './firebase';
import { 
  ShootMode, AspectRatio, OutputMode, 
  GeneratedImage, UserProfile, Tier, AppConfig 
} from './types';
import { generateProductPhotos } from './services/geminiService';
import { handleFirestoreError, OperationType } from './utils/firestoreErrorHandler';

// Components
import AuthGuard from './components/AuthGuard';
import UploadZone from './components/UploadZone';
import ModeSelector from './components/ModeSelector';
import ReferenceUpload from './components/ReferenceUpload';
import ResultsGallery from './components/ResultsGallery';
import ConfigPanel from './components/ConfigPanel';
import ProUpgradeModal from './components/ProUpgradeModal';
import BuyCreditsModal from './components/BuyCreditsModal';
import AdminDashboard from './components/AdminDashboard';
import StudioVault from './components/StudioVault';

import { cleanupExpiredGenerations } from './utils/cleanup';

const MainApp: React.FC<{ user: UserProfile; config: AppConfig; logout: () => void }> = ({ user, config, logout }) => {
  useEffect(() => {
    cleanupExpiredGenerations();
  }, []);

  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<ShootMode>(ShootMode.ECOMMERCE);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [outputMode, setOutputMode] = useState<OutputMode>(OutputMode.IMAGE);
  const [count, setCount] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showProModal, setShowProModal] = useState(false);
  const [showBuyCreditsModal, setShowBuyCreditsModal] = useState(false);
  const [showVault, setShowVault] = useState(false);
  const navigate = useNavigate();

  const creditCost = outputMode === OutputMode.PROMPT ? count : count * 2;

  const handleGenerate = async () => {
    if (files.length === 0) {
      setError("Please upload at least one product photo.");
      return;
    }

    if (user.credits < creditCost) {
      setError(`Insufficient credits. You need ${creditCost} credits but only have ${user.credits}.`);
      if (user.tier === Tier.PRO) {
        setShowBuyCreditsModal(true);
      } else {
        setShowProModal(true);
      }
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const generated = await generateProductPhotos(
        files, mode, aspectRatio, referenceFile, outputMode, count, user.tier
      );
      
      const now = Date.now();
      const expirationTime = user.tier === Tier.PRO ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
      
      const newResults = generated.map(g => ({ 
        ...g, 
        id: Math.random().toString(36).substring(2, 15),
        userId: user.uid,
        mode: mode,
        createdAt: now,
        expiresAt: now + expirationTime
      }));
      
      setResults(newResults);
      
      try {
        // Save to Firestore for admin view
        for (const res of newResults) {
          await addDoc(collection(db, 'generations'), res);
        }
        
        // Update user credits
        await updateDoc(doc(db, 'users', user.uid), {
          credits: user.credits - creditCost,
          totalImagesGenerated: (user.totalImagesGenerated || 0) + (outputMode === OutputMode.IMAGE ? count : 0)
        });
      } catch (firestoreErr: any) {
        handleFirestoreError(firestoreErr, OperationType.UPDATE, `users/${user.uid}`);
      }
    } catch (err: any) {
      console.error("Generation error:", err);
      setError(err.message || "Generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-orange-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-neutral-800/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-black tracking-tighter">
              GRAFIQO <span className="text-orange-500">STUDIO</span>
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <button 
              onClick={() => user.tier === Tier.PRO ? setShowBuyCreditsModal(true) : setShowProModal(true)}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-full hover:bg-neutral-800 transition-all group"
            >
              <Gem className="w-4 h-4 text-orange-500 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold">{user.credits} <span className="text-neutral-500 font-normal group-hover:text-neutral-300 transition-colors">Credits</span></span>
            </button>

            <div className="flex items-center gap-3">
              {user.role === 'admin' && (
                <button 
                  onClick={() => navigate('/admin')}
                  className="p-2.5 bg-neutral-900 hover:bg-neutral-800 rounded-xl border border-neutral-800 transition-all"
                  title="Admin Dashboard"
                >
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                </button>
              )}
              <div className="h-10 w-[1px] bg-neutral-800 mx-1 hidden md:block" />
              <button 
                onClick={logout}
                className="p-2.5 bg-neutral-900 hover:bg-red-500/10 hover:border-red-500/20 rounded-xl border border-neutral-800 transition-all group"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5 text-neutral-400 group-hover:text-red-500" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto pt-32 pb-24 px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Controls */}
          <div className="lg:col-span-8 space-y-12">
            {/* Hero Section */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full text-[10px] font-bold uppercase tracking-widest text-orange-500">
                <Zap className="w-3 h-3" />
                Next-Gen AI Engine
              </div>
              <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1]">
                Transform your products into <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">Studio Art.</span>
              </h2>
              <p className="text-neutral-400 text-lg max-w-2xl">
                Upload raw photos and let our AI generate professional, high-end studio photography in seconds.
              </p>
            </div>

            {/* Upload Section */}
            <div className="bg-neutral-900/30 border border-neutral-800/50 rounded-[2.5rem] p-8 space-y-10">
              <UploadZone files={files} onFilesChange={setFiles} />
              
              <div className="space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-500">Select Studio Mode</h3>
                <ModeSelector selectedMode={mode} onModeChange={setMode} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-6 border-t border-neutral-800/50">
                <ReferenceUpload 
                  referenceFile={referenceFile} 
                  onReferenceChange={setReferenceFile} 
                  tier={user.tier}
                  onUpgradeClick={() => setShowProModal(true)}
                />
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <History className="w-5 h-5 text-blue-500" />
                    </div>
                    <h3 className="font-bold">Studio History</h3>
                  </div>
                  <p className="text-sm text-neutral-500 mb-6">View and download your previous generations from the studio vault.</p>
                  <button 
                    onClick={() => setShowVault(true)}
                    className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    Open Vault
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Results Section */}
            <ResultsGallery 
              images={results} 
              user={user} 
              onUpgradeClick={() => setShowProModal(true)} 
            />
          </div>

          {/* Right Column: Configuration Sidebar */}
          <div className="lg:col-span-4">
            <div className="sticky top-32 space-y-6">
              <div className="bg-neutral-900 border border-neutral-800 rounded-[2rem] p-8 shadow-2xl">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-neutral-800 rounded-lg">
                    <Settings className="w-5 h-5 text-neutral-400" />
                  </div>
                  <h3 className="text-xl font-bold">Studio Config</h3>
                </div>

                <ConfigPanel 
                  aspectRatio={aspectRatio}
                  onAspectRatioChange={setAspectRatio}
                  outputMode={outputMode}
                  onOutputModeChange={setOutputMode}
                  count={count}
                  onCountChange={setCount}
                />

                <div className="mt-10 pt-8 border-t border-neutral-800">
                  {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-500 text-sm animate-in fade-in slide-in-from-top-2">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <p className="font-medium leading-relaxed">{error}</p>
                    </div>
                  )}

                  <button 
                    onClick={handleGenerate}
                    disabled={isGenerating || files.length === 0}
                    className="w-full group relative bg-white text-black font-black py-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-neutral-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-white/5"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        DEVELOPING...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-6 h-6 text-orange-500" />
                        GENERATE PHOTOS
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                  
                  <p className="text-center text-[10px] text-neutral-500 mt-4 uppercase font-bold tracking-widest">
                    Costs {creditCost} Studio Credits
                  </p>
                </div>
              </div>

              {user.tier === Tier.FREE && (
                <button 
                  onClick={() => setShowProModal(true)}
                  className="w-full p-6 bg-gradient-to-br from-orange-500 to-red-600 rounded-[2rem] text-left group relative overflow-hidden shadow-2xl shadow-orange-500/20"
                >
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 text-white/80 text-[10px] font-bold uppercase tracking-widest mb-2">
                      <Gem className="w-3 h-3" />
                      Limited Time
                    </div>
                    <h4 className="text-xl font-black mb-1">UPGRADE TO PRO</h4>
                    <p className="text-white/70 text-xs leading-relaxed max-w-[200px]">
                      Unlock 4K resolution, style reference, and 400 monthly credits.
                    </p>
                  </div>
                  <Gem className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 rotate-12 group-hover:scale-110 transition-transform duration-500" />
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {showProModal && (
        <ProUpgradeModal user={user} config={config} onClose={() => setShowProModal(false)} />
      )}

      {showBuyCreditsModal && (
        <BuyCreditsModal user={user} config={config} onClose={() => setShowBuyCreditsModal(false)} />
      )}

      {showVault && (
        <StudioVault user={user} onClose={() => setShowVault(false)} />
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthGuard>
        {(user, config, logout) => (
          <Routes>
            <Route path="/" element={<MainApp user={user} config={config} logout={logout} />} />
            <Route path="/admin" element={user.role === 'admin' ? <AdminDashboard config={config} /> : <MainApp user={user} config={config} logout={logout} />} />
          </Routes>
        )}
      </AuthGuard>
    </Router>
  );
};

export default App;
