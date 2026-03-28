import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from './firestoreErrorHandler';

export const cleanupExpiredGenerations = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const now = Date.now();
    const q = query(
      collection(db, 'generations'), 
      where('userId', '==', user.uid),
      where('expiresAt', '<=', now)
    );
    const snapshot = await getDocs(q);
    
    const deletePromises = snapshot.docs.map(document => 
      deleteDoc(doc(db, 'generations', document.id))
    );
    
    await Promise.all(deletePromises);
    if (snapshot.size > 0) {
      console.log(`Cleaned up ${snapshot.size} expired generations.`);
    }
  } catch (error) {
    console.error('Cleanup failed:', error);
    // Silent fail for background cleanup
  }
};

export const cleanupAllExpiredGenerations = async () => {
  try {
    const now = Date.now();
    const q = query(
      collection(db, 'generations'), 
      where('expiresAt', '<=', now)
    );
    const snapshot = await getDocs(q);
    
    const deletePromises = snapshot.docs.map(document => 
      deleteDoc(doc(db, 'generations', document.id))
    );
    
    await Promise.all(deletePromises);
    if (snapshot.size > 0) {
      console.log(`Admin cleanup: Removed ${snapshot.size} expired generations.`);
    }
  } catch (error) {
    console.error('Admin cleanup failed:', error);
  }
};

export const cleanupExpiredProRequests = async () => {
  try {
    const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const threeDaysAgo = now - threeDaysInMs;

    // Query all requests older than 3 days
    const q = query(
      collection(db, 'proRequests'), 
      where('createdAt', '<=', threeDaysAgo)
    );
    const snapshot = await getDocs(q);
    
    // Only delete if they are already processed (Approved/Rejected)
    // We keep pending ones even if they are old so admin doesn't miss them
    const toDelete = snapshot.docs.filter(doc => doc.data().status !== 'pending');
    
    const deletePromises = toDelete.map(document => 
      deleteDoc(doc(db, 'proRequests', document.id))
    );
    
    await Promise.all(deletePromises);
    if (toDelete.length > 0) {
      console.log(`Admin cleanup: Removed ${toDelete.length} old pro requests.`);
    }
  } catch (error) {
    console.error('Pro request cleanup failed:', error);
  }
};
