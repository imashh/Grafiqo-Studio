import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, GeneratedImage } from '../types';
import { X, Loader2, Download, Trash2, Image as ImageIcon } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

interface StudioVaultProps {
  user: UserProfile;
  onClose: () => void;
}

const StudioVault: React.FC<StudioVaultProps> = ({ user, onClose }) => {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVault = async () => {
      try {
        const q = query(
          collection(db, 'generations'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const fetchedImages = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as GeneratedImage[];
        setImages(fetchedImages);
      } catch (err: any) {
        console.error("Vault fetch error:", err);
        setError("Failed to load vault images.");
        handleFirestoreError(err, OperationType.GET, 'generations');
      } finally {
        setLoading(false);
      }
    };

    fetchVault();
  }, [user.uid]);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'generations', id));
      setImages(images.filter(img => img.id !== id));
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `generations/${id}`);
    }
  };

  const handleDownload = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `grafiqo-vault-${Date.now()}.jpg`;
    link.click();
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-6 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-[2.5rem] w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl">
        <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <ImageIcon className="w-6 h-6 text-blue-500" />
            </div>
            <h2 className="text-xl font-black tracking-tighter">STUDIO <span className="text-blue-500">VAULT</span></h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full transition-colors">
            <X className="w-6 h-6 text-neutral-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center text-red-500">
              {error}
            </div>
          ) : images.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-neutral-500 gap-4">
              <ImageIcon className="w-16 h-16 opacity-20" />
              <p>Your vault is empty. Generate some images first!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {images.map((img) => (
                <div key={img.id} className="group relative bg-neutral-800 rounded-2xl overflow-hidden aspect-square border border-neutral-700 hover:border-blue-500 transition-colors">
                  <img src={img.url} alt="Vault" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4">
                    <div className="flex justify-end">
                      <button 
                        onClick={() => handleDelete(img.id)}
                        className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-500 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="text-[10px] font-bold text-neutral-300 uppercase tracking-wider">
                        {new Date(img.createdAt).toLocaleDateString()}
                      </div>
                      <button 
                        onClick={() => handleDownload(img.url)}
                        className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudioVault;
