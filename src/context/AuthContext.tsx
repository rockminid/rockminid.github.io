import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  auth,
  signInWithGoogle,
  logOut,
  onAuthStateChanged,
  testFirebaseConnection,
  db,
} from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { syncLocalCollectionToCloud } from '../services/collectionService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  error: null,
  clearError: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initial connection test
    testFirebaseConnection();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        // Upsert user profile in firestore safely obeying security rules
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const existingSnap = await getDoc(userDocRef);
          
          if (!existingSnap.exists()) {
            await setDoc(userDocRef, {
              id: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || 'Geochemist',
              photoURL: currentUser.photoURL || '',
              createdAt: new Date().toISOString(),
            });
          } else {
            const existingData = existingSnap.data();
            await setDoc(
              userDocRef,
              {
                id: currentUser.uid,
                email: currentUser.email || '',
                displayName: currentUser.displayName || existingData?.displayName || 'Geochemist',
                photoURL: currentUser.photoURL || existingData?.photoURL || '',
                createdAt: existingData?.createdAt || new Date().toISOString(),
              },
              { merge: true }
            );
          }

          // Sync local saved specimens to cloud
          await syncLocalCollectionToCloud(currentUser);
        } catch (err: any) {
          // Only log if it's an unexpected error, avoid noisy console warnings on unprovisioned / offline states
          if (err?.code !== 'permission-denied' && err?.code !== 'unavailable') {
            console.debug('User profile sync note:', err?.message || err);
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      // Friendly message for popup closed or canceled
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled by user.');
      } else {
        setError(err.message || 'Failed to sign in with Google.');
      }
    }
  };

  const handleSignOut = async () => {
    setError(null);
    try {
      await logOut();
    } catch (err: any) {
      console.error('Sign-out error:', err);
      setError(err.message || 'Failed to sign out.');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signOut: handleSignOut,
        error,
        clearError: () => setError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
