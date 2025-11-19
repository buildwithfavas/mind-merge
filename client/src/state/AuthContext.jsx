import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { app, auth, googleProvider } from '../utils/firebase.js';
import { onIdTokenChanged, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [idToken, setIdToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onIdTokenChanged(auth, async (u) => {
      if (u) {
        const token = await u.getIdToken();
        setUser(u);
        setIdToken(token);
        localStorage.setItem('idToken', token);
      } else {
        setUser(null);
        setIdToken(null);
        localStorage.removeItem('idToken');
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const value = useMemo(() => ({
    user,
    idToken,
    loading,
    signIn: async () => {
      const cred = await signInWithPopup(auth, googleProvider);
      const token = await cred.user.getIdToken(true);
      localStorage.setItem('idToken', token);
    },
    signOut: async () => {
      await fbSignOut(auth);
    }
  }), [user, idToken, loading]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
