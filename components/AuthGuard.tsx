import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, getDocFromServer, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, Tier, AppConfig } from '../types';
import { Loader2, LogIn, Phone, User, Mail } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

interface AuthGuardProps {
  children: (user: UserProfile, config: AppConfig, logout: () => void) => React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [appConfig, setAppConfig] = useState<AppConfig>({ 
    geminiApiKey: '', 
    paymentQrCode: '', 
    bankDetails: '' 
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSignup, setShowSignup] = useState(false);
  const [tempUser, setTempUser] = useState<any>(null);
  const [signupData, setSignupData] = useState({
    name: '',
    contactNumber: ''
  });

  useEffect(() => {
    // Listen for App Config
    const unsubscribeConfig = onSnapshot(doc(db, 'config', 'app'), (snapshot) => {
      const defaultKey = 'AIzaSyBBR1ZiBG84FVAtGHIF0nZUaw-O570q1CU';
      if (snapshot.exists()) {
        const data = snapshot.data() as AppConfig;
        setAppConfig({
          ...data,
          geminiApiKey: data.geminiApiKey || process.env.GEMINI_API_KEY || defaultKey
        });
      } else {
        // Initialize with provided default key if config doesn't exist in Firestore
        setAppConfig({
          geminiApiKey: process.env.GEMINI_API_KEY || defaultKey,
          paymentQrCode: '',
          bankDetails: ''
        });
      }
    });

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            // Real-time listener for profile updates
            const unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
              if (snapshot.exists()) {
                setUserProfile(snapshot.data() as UserProfile);
              }
              setLoading(false);
            }, (err) => {
              handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
              setLoading(false);
            });
            return () => unsubscribeProfile();
          } else {
            setTempUser(user);
            setSignupData({ name: user.displayName || '', contactNumber: '+977 ' });
            setShowSignup(true);
            setLoading(false);
          }
        } catch (err: any) {
          handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
          setLoading(false);
        }
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeConfig();
    };
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempUser) return;
    
    setLoading(true);
    try {
      const isAdmin = ['grafiqo.np@gmail.com', 'v.divash@gmail.com'].includes(tempUser.email || '');
      const newUser: UserProfile = {
        uid: tempUser.uid,
        email: tempUser.email || '',
        name: signupData.name,
        contactNumber: signupData.contactNumber,
        tier: Tier.FREE,
        role: isAdmin ? 'admin' : 'user',
        credits: 10,
        createdAt: Date.now(),
        totalImagesGenerated: 0
      };
      await setDoc(doc(db, 'users', tempUser.uid), newUser);
      setUserProfile(newUser);
      setShowSignup(false);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `users/${tempUser.uid}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (showSignup) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center text-white p-6">
        <div className="bg-neutral-900/50 border border-neutral-800 p-8 rounded-3xl max-w-md w-full shadow-2xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black tracking-tighter mb-2">CREATE <span className="text-orange-500">ACCOUNT</span></h2>
            <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest">Join Grafiqo Studio</p>
          </div>
          
          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                <input
                  type="text"
                  required
                  value={signupData.name}
                  onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  placeholder="Enter your name"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Email ID</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                <input
                  type="email"
                  disabled
                  value={tempUser?.email || ''}
                  className="w-full bg-neutral-800/50 border border-neutral-700 rounded-xl py-3 pl-10 pr-4 text-sm text-neutral-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Contact Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                <input
                  type="tel"
                  required
                  value={signupData.contactNumber}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.startsWith('+977 ')) {
                      setSignupData({ ...signupData, contactNumber: val });
                    } else if (val.length < 5) {
                      setSignupData({ ...signupData, contactNumber: '+977 ' });
                    }
                  }}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                  placeholder="+977 98XXXXXXXX"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-white text-black font-black py-4 rounded-xl hover:bg-neutral-200 transition-all mt-4 shadow-lg shadow-white/5"
            >
              CREATE ACCOUNT
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center text-white p-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Grafiqo <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">Studio</span>
          </h1>
          <p className="text-neutral-400 max-w-md mx-auto">
            Professional AI Product Photography Engine. Sign in to start generating studio-quality images.
          </p>
        </div>
        <button 
          onClick={handleLogin}
          className="flex items-center gap-3 bg-white text-black px-8 py-4 rounded-xl font-bold text-lg hover:bg-neutral-200 transition-colors shadow-xl"
        >
          <LogIn className="w-5 h-5" />
          Sign in with Google
        </button>
      </div>
    );
  }

  return <>{children(userProfile, appConfig, handleLogout)}</>;
};

export default AuthGuard;
