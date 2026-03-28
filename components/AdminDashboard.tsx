import React, { useState, useEffect } from 'react';
import { collection, doc, updateDoc, onSnapshot, query, where, deleteDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, ProRequest, Tier, AppConfig, GeneratedImage, RequestType } from '../types';
import { 
  Users, Image as ImageIcon, CheckCircle, XCircle, ArrowLeft, 
  Loader2, Gem, Plus, Minus, Trash2, Key, CreditCard, QrCode, 
  Search, ExternalLink, Phone, Mail, Calendar, History, Settings
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

import { cleanupAllExpiredGenerations, cleanupExpiredProRequests } from '../utils/cleanup';

const AdminDashboard: React.FC<{ config: AppConfig }> = ({ config }) => {
  useEffect(() => {
    cleanupAllExpiredGenerations();
    cleanupExpiredProRequests();
  }, []);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [proRequests, setProRequests] = useState<ProRequest[]>([]);
  const [userFilter, setUserFilter] = useState<'all' | Tier.FREE | Tier.PRO>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userGenerations, setUserGenerations] = useState<GeneratedImage[]>([]);
  const [creditAmount, setCreditAmount] = useState<number>(50);
  
  // Config state
  const [newApiKey, setNewApiKey] = useState(config.geminiApiKey || '');
  const [newBankDetails, setNewBankDetails] = useState(config.bankDetails || '');
  const [newQrCode, setNewQrCode] = useState(config.paymentQrCode || '');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [hasInitializedConfig, setHasInitializedConfig] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (!hasInitializedConfig && (config.geminiApiKey || config.bankDetails || config.paymentQrCode)) {
      setNewApiKey(config.geminiApiKey || '');
      setNewBankDetails(config.bankDetails || '');
      setNewQrCode(config.paymentQrCode || '');
      setHasInitializedConfig(true);
    }
  }, [config, hasInitializedConfig]);

  useEffect(() => {
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => doc.data() as UserProfile);
      setUsers(usersData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    const unsubscribeRequests = onSnapshot(query(collection(db, 'proRequests'), where('status', '==', 'pending')), (snapshot) => {
      const requestsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProRequest));
      setProRequests(requestsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'proRequests');
    });

    return () => {
      unsubscribeUsers();
      unsubscribeRequests();
    };
  }, []);

  const fetchUserGenerations = async (userId: string) => {
    try {
      const now = Date.now();
      const q = query(
        collection(db, 'generations'), 
        where('userId', '==', userId),
        where('expiresAt', '>', now)
      );
      const snapshot = await getDocs(q);
      const gens = snapshot.docs.map(doc => doc.data() as GeneratedImage);
      setUserGenerations(gens.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'generations');
    }
  };

  const handleApprove = async (request: ProRequest) => {
    setIsProcessing(request.id);
    try {
      await updateDoc(doc(db, 'proRequests', request.id), { status: 'approved' });
      const user = users.find(u => u.uid === request.userId);
      if (!user) return;

      if (request.type === RequestType.PRO_UPGRADE) {
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        await updateDoc(doc(db, 'users', request.userId), { 
          tier: Tier.PRO,
          credits: (user.credits || 0) + 400,
          subscriptionExpiresAt: Date.now() + thirtyDaysInMs
        });
      } else if (request.type === RequestType.CREDIT_PURCHASE) {
        await updateDoc(doc(db, 'users', request.userId), { 
          credits: (user.credits || 0) + (request.creditsToGrant || 0)
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `proRequests/${request.id}`);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDeny = async (request: ProRequest) => {
    setIsProcessing(request.id);
    try {
      await updateDoc(doc(db, 'proRequests', request.id), { status: 'rejected' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `proRequests/${request.id}`);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleAddCredits = async (userId: string, amount: number) => {
    const user = users.find(u => u.uid === userId);
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', userId), { 
        credits: (user.credits || 0) + amount
      });
      if (selectedUser?.uid === userId) {
        setSelectedUser({ ...selectedUser, credits: (selectedUser.credits || 0) + amount });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleDeductCredits = async (userId: string, amount: number) => {
    const user = users.find(u => u.uid === userId);
    if (!user) return;
    try {
      const newCredits = Math.max(0, (user.credits || 0) - amount);
      await updateDoc(doc(db, 'users', userId), { 
        credits: newCredits
      });
      if (selectedUser?.uid === userId) {
        setSelectedUser({ ...selectedUser, credits: newCredits });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to remove this user? This action cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
    }
  };

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      await setDoc(doc(db, 'config', 'app'), {
        geminiApiKey: newApiKey,
        bankDetails: newBankDetails,
        paymentQrCode: newQrCode
      }, { merge: true });
      alert("Configuration updated successfully!");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'config/app');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewQrCode(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesTier = userFilter === 'all' || user.tier === userFilter;
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.contactNumber && user.contactNumber.includes(searchTerm));
    return matchesTier && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="p-2.5 bg-neutral-900 hover:bg-neutral-800 rounded-xl border border-neutral-800 transition-all">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-black tracking-tighter">ADMIN <span className="text-orange-500">DASHBOARD</span></h1>
              <p className="text-neutral-500 text-sm">Manage users, API keys, and studio configuration.</p>
            </div>
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-3xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest">Total Users</p>
                <p className="text-2xl font-black">{users.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-3xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/10 rounded-2xl text-orange-500">
                <Gem className="w-6 h-6" />
              </div>
              <div>
                <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest">Pro Members</p>
                <p className="text-2xl font-black">{users.filter(u => u.tier === Tier.PRO).length}</p>
              </div>
            </div>
          </div>
          <div className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-3xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-2xl text-green-500">
                <ImageIcon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest">Pending Requests</p>
                <p className="text-2xl font-black">{proRequests.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-neutral-900/50 border border-neutral-800 p-6 rounded-3xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-500">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest">API Status</p>
                <p className={`text-sm font-bold ${config.geminiApiKey ? 'text-green-500' : 'text-red-500'}`}>
                  {config.geminiApiKey ? 'ACTIVE' : 'OFFLINE'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Config & Requests */}
          <div className="lg:col-span-4 space-y-8">
            {/* API & Payment Config */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-[2rem] p-6 space-y-6">
              <h2 className="text-lg font-black flex items-center gap-2">
                <Settings className="w-5 h-5 text-orange-500" />
                STUDIO CONFIG
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Gemini API Key</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                    <input 
                      type="text"
                      value={newApiKey}
                      onChange={(e) => setNewApiKey(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Enter Gemini API Key"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Bank Details</label>
                  <textarea 
                    value={newBankDetails}
                    onChange={(e) => setNewBankDetails(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[80px]"
                    placeholder="Bank Name, Account Number, etc."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Payment QR Code</label>
                  <div className="flex items-center gap-4">
                    {newQrCode && (
                      <img src={newQrCode} alt="QR Preview" className="w-16 h-16 rounded-lg object-cover border border-neutral-700" />
                    )}
                    <label className="flex-1 cursor-pointer">
                      <div className="w-full bg-neutral-800 border border-dashed border-neutral-700 rounded-xl py-4 flex flex-col items-center justify-center gap-1 hover:bg-neutral-700/50 transition-colors">
                        <QrCode className="w-5 h-5 text-neutral-500" />
                        <span className="text-[10px] font-bold text-neutral-500">UPLOAD QR</span>
                      </div>
                      <input type="file" accept="image/*" onChange={handleQrUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                <button 
                  onClick={handleSaveConfig}
                  disabled={isSavingConfig}
                  className="w-full bg-white text-black font-black py-3 rounded-xl hover:bg-neutral-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSavingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  SAVE CONFIGURATION
                </button>
              </div>
            </div>

            {/* Pro Requests */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-[2rem] p-6">
              <h2 className="text-lg font-black flex items-center gap-2 mb-6">
                <Gem className="w-5 h-5 text-purple-500" />
                PRO REQUESTS
              </h2>
              {proRequests.length === 0 ? (
                <div className="text-center py-12 bg-neutral-800/30 rounded-2xl border border-dashed border-neutral-800">
                  <p className="text-neutral-500 text-sm">No pending requests.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {proRequests.map(req => (
                    <div key={req.id} className="bg-neutral-800/50 border border-neutral-700 p-4 rounded-2xl space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-sm truncate max-w-[150px]">{req.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest ${req.type === RequestType.PRO_UPGRADE ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'}`}>
                              {req.type === RequestType.PRO_UPGRADE ? 'PRO UPGRADE' : `+${req.creditsToGrant} CREDITS`}
                            </span>
                            <p className="text-[10px] text-neutral-500 font-mono uppercase">ID: {req.userId.slice(0, 8)}...</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => handleApprove(req)} 
                            disabled={isProcessing === req.id}
                            className="p-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 transition-colors disabled:opacity-50"
                          >
                            {isProcessing === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={() => handleDeny(req)} 
                            disabled={isProcessing === req.id}
                            className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {req.screenshotUrl && (
                        <div className="space-y-2">
                          <div className="relative group/img aspect-video bg-neutral-800 rounded-xl overflow-hidden border border-neutral-700">
                            <img 
                              src={req.screenshotUrl} 
                              alt="Payment Screenshot" 
                              className="w-full h-full object-cover cursor-zoom-in hover:scale-105 transition-transform duration-500"
                              onClick={() => window.open(req.screenshotUrl, '_blank')}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                              <ExternalLink className="w-5 h-5 text-white" />
                            </div>
                          </div>
                          <a 
                            href={req.screenshotUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="flex items-center gap-2 text-orange-500 text-[10px] font-bold uppercase tracking-widest hover:text-orange-400 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Open Full Image
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: User Management */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-neutral-900 border border-neutral-800 rounded-[2rem] p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <h2 className="text-xl font-black flex items-center gap-2">
                  <Users className="w-6 h-6 text-blue-500" />
                  USER MANAGEMENT
                </h2>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input 
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-neutral-800 border border-neutral-700 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 w-full md:w-48"
                    />
                  </div>
                  <div className="flex bg-neutral-800 rounded-xl p-1 border border-neutral-700">
                    <button onClick={() => setUserFilter('all')} className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${userFilter === 'all' ? 'bg-neutral-700 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}>All</button>
                    <button onClick={() => setUserFilter(Tier.PRO)} className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${userFilter === Tier.PRO ? 'bg-orange-500 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}>Pro</button>
                    <button onClick={() => setUserFilter(Tier.FREE)} className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${userFilter === Tier.FREE ? 'bg-neutral-700 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}>Free</button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em] border-b border-neutral-800">
                      <th className="pb-4 px-2">User Details</th>
                      <th className="pb-4 px-2">Tier</th>
                      <th className="pb-4 px-2">Credits</th>
                      <th className="pb-4 px-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/50">
                    {filteredUsers.map(user => (
                      <tr key={user.uid} className="group hover:bg-neutral-800/30 transition-colors">
                        <td className="py-4 px-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-neutral-800 rounded-xl flex items-center justify-center text-neutral-400 font-bold border border-neutral-700">
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-sm group-hover:text-orange-500 transition-colors">{user.name}</div>
                              <div className="text-[10px] text-neutral-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <div className="flex flex-col gap-1">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest w-fit ${user.tier === Tier.PRO ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : 'bg-neutral-800 text-neutral-500 border border-neutral-700'}`}>
                              {user.tier}
                            </span>
                            {user.tier === Tier.PRO && user.subscriptionExpiresAt && (
                              <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-tighter">
                                {Math.max(0, Math.ceil((user.subscriptionExpiresAt - Date.now()) / (1000 * 60 * 60 * 24)))} Days Left
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <div className="flex items-center gap-1.5 font-black text-sm">
                            <Gem className="w-3.5 h-3.5 text-orange-500" />
                            {user.credits}
                          </div>
                        </td>
                        <td className="py-4 px-2 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => {
                                setSelectedUser(user);
                                fetchUserGenerations(user.uid);
                              }}
                              className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg border border-neutral-700 transition-all"
                              title="View Details"
                            >
                              <ExternalLink className="w-4 h-4 text-neutral-400" />
                            </button>
                            <button 
                              onClick={() => handleRemoveUser(user.uid)}
                              className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/10 transition-all"
                              title="Remove User"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-8 border-b border-neutral-800 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-neutral-800 rounded-2xl flex items-center justify-center text-2xl font-black border border-neutral-700">
                  {selectedUser.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-2xl font-black">{selectedUser.name}</h2>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="flex items-center gap-1.5 text-xs text-neutral-500">
                      <Mail className="w-3 h-3" />
                      {selectedUser.email}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-neutral-500">
                      <Phone className="w-3 h-3" />
                      {selectedUser.contactNumber || 'No number'}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-neutral-800 rounded-full transition-colors">
                <XCircle className="w-8 h-8 text-neutral-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                <div className="bg-neutral-800/50 p-6 rounded-3xl border border-neutral-700">
                  <p className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest mb-2">Account Tier</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gem className={`w-5 h-5 ${selectedUser.tier === Tier.PRO ? 'text-orange-500' : 'text-neutral-500'}`} />
                      <span className="text-xl font-black">{selectedUser.tier.toUpperCase()}</span>
                    </div>
                    {selectedUser.tier === Tier.PRO && selectedUser.subscriptionExpiresAt && (
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-orange-500 uppercase">
                          {Math.max(0, Math.ceil((selectedUser.subscriptionExpiresAt - Date.now()) / (1000 * 60 * 60 * 24)))} Days Left
                        </p>
                        <p className="text-[8px] text-neutral-500">Expires: {new Date(selectedUser.subscriptionExpiresAt).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-neutral-800/50 p-6 rounded-3xl border border-neutral-700">
                  <p className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest mb-2">Current Credits</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black">{selectedUser.credits}</span>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                        className="w-16 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                      <div className="flex gap-1">
                        <button 
                          onClick={() => handleDeductCredits(selectedUser.uid, creditAmount)}
                          className="p-1.5 bg-neutral-800 text-white rounded-lg hover:bg-neutral-700 transition-colors border border-neutral-700"
                          title="Deduct Credits"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleAddCredits(selectedUser.uid, creditAmount)}
                          className="p-1.5 bg-orange-500 text-black rounded-lg hover:bg-orange-400 transition-colors"
                          title="Add Credits"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-neutral-800/50 p-6 rounded-3xl border border-neutral-700">
                  <p className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest mb-2">Total Generations</p>
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-500" />
                    <span className="text-2xl font-black">{selectedUser.totalImagesGenerated || 0}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-black flex items-center gap-2">
                  <History className="w-5 h-5 text-orange-500" />
                  GENERATION HISTORY
                </h3>
                {userGenerations.length === 0 ? (
                  <div className="text-center py-20 bg-neutral-800/20 rounded-[2rem] border border-dashed border-neutral-800">
                    <p className="text-neutral-500">No generations found for this user.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {userGenerations.map((gen, idx) => (
                      <div key={idx} className="group relative aspect-square bg-neutral-800 rounded-2xl overflow-hidden border border-neutral-700">
                        <img src={gen.url} alt="Generation" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                          <p className="text-[8px] text-white/70 line-clamp-2 mb-1">{gen.prompt}</p>
                          <p className="text-[8px] text-orange-500 font-bold">{new Date(gen.createdAt || 0).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
