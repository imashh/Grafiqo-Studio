import React, { useState } from 'react';
import { X, Gem, CheckCircle2, Upload, Loader2, AlertCircle, QrCode, CreditCard, PlusCircle } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, AppConfig, RequestType } from '../types';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

interface BuyCreditsModalProps {
  user: UserProfile;
  config: AppConfig;
  onClose: () => void;
}

const CREDIT_PACKS = [
  { credits: 150, price: 499 },
  { credits: 300, price: 999 },
  { credits: 600, price: 1999 },
];

const BuyCreditsModal: React.FC<BuyCreditsModalProps> = ({ user, config, onClose }) => {
  const [selectedPack, setSelectedPack] = useState(CREDIT_PACKS[0]);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScreenshot(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!screenshot) return;
    setIsUploading(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(screenshot);
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          await addDoc(collection(db, 'proRequests'), {
            userId: user.uid,
            email: user.email,
            screenshotUrl: base64,
            status: 'pending',
            createdAt: Date.now(),
            type: RequestType.CREDIT_PURCHASE,
            creditsToGrant: selectedPack.credits
          });
          setIsSuccess(true);
        } catch (err: any) {
          handleFirestoreError(err, OperationType.CREATE, 'proRequests');
        } finally {
          setIsUploading(false);
        }
      };
    } catch (err: any) {
      setError("Failed to process image. Please try again.");
      setIsUploading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Request Submitted!</h2>
          <p className="text-neutral-400 mb-8">
            Our team will review your payment screenshot and add {selectedPack.credits} credits to your account within 24 hours.
          </p>
          <button 
            onClick={onClose}
            className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-neutral-200 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-[2.5rem] w-full max-w-4xl overflow-hidden shadow-2xl my-auto">
        <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <PlusCircle className="w-6 h-6 text-blue-500" />
            </div>
            <h2 className="text-xl font-black tracking-tighter">ADD EXTRA <span className="text-blue-500">CREDITS</span></h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full transition-colors">
            <X className="w-6 h-6 text-neutral-500" />
          </button>
        </div>

        <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-black mb-6 flex items-center gap-2">
                <Gem className="w-5 h-5 text-orange-500" />
                SELECT CREDIT PACK
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {CREDIT_PACKS.map((pack) => (
                  <button
                    key={pack.credits}
                    onClick={() => setSelectedPack(pack)}
                    className={`p-6 rounded-2xl border-2 transition-all text-left flex justify-between items-center ${
                      selectedPack.credits === pack.credits
                        ? 'border-orange-500 bg-orange-500/5'
                        : 'border-neutral-800 bg-neutral-800/30 hover:border-neutral-700'
                    }`}
                  >
                    <div>
                      <p className="text-xl font-black">{pack.credits} Credits</p>
                      <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest">Extra Studio Credits</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-orange-500">NPR {pack.price}/-</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 bg-neutral-800/50 border border-neutral-700 rounded-3xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <Gem className="w-4 h-4 text-orange-500" />
                </div>
                <p className="text-sm font-bold">Selected: {selectedPack.credits} Credits</p>
              </div>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Credits will be added to your account after manual verification of your payment.
              </p>
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-black mb-6 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-500" />
                PAYMENT DETAILS
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-neutral-800/50 border border-neutral-700 p-4 rounded-2xl">
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-2">Bank Transfer</p>
                    <p className="text-xs text-neutral-300 whitespace-pre-line leading-relaxed">
                      {config.bankDetails || "Contact admin for bank details."}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl">
                  {config.paymentQrCode ? (
                    <img src={config.paymentQrCode} alt="Payment QR" className="w-full aspect-square object-contain" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-neutral-400">
                      <QrCode className="w-12 h-12" />
                      <span className="text-[10px] font-bold">NO QR CODE</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-black flex items-center gap-2">
                <Upload className="w-5 h-5 text-green-500" />
                UPLOAD SCREENSHOT
              </h3>
              
              <div className="relative group">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`border-2 border-dashed rounded-[2rem] p-8 text-center transition-all ${screenshot ? 'border-orange-500 bg-orange-500/5' : 'border-neutral-800 bg-neutral-900/50 group-hover:border-neutral-700'}`}>
                  {screenshot ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-orange-500" />
                      </div>
                      <span className="text-sm font-bold text-orange-500 truncate max-w-[200px]">{screenshot.name}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-neutral-800 rounded-full flex items-center justify-center">
                        <Upload className="w-6 h-6 text-neutral-500" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-neutral-300">Click to upload</p>
                        <p className="text-[10px] text-neutral-500 uppercase tracking-widest">Payment Confirmation</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p className="font-medium">{error}</p>
                </div>
              )}

              <button 
                onClick={handleSubmit}
                disabled={!screenshot || isUploading}
                className="w-full bg-white text-black font-black py-4 rounded-2xl hover:bg-neutral-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl shadow-white/5"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    PROCESSING...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    SUBMIT FOR APPROVAL
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyCreditsModal;
