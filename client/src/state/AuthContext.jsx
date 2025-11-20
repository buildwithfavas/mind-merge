import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { app, auth, googleProvider } from '../utils/firebase.js';
import { onIdTokenChanged, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import api from '../utils/api.js';

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
        // Mark ready immediately; hydrate role/blocked in background to avoid blocking UI
        setLoading(false);
        api.get('/me')
          .then(({ data }) => {
            setMeta({ role: data.role || 'user', blocked: !!data.blocked, blockedReason: data.blockedReason || null });
          })
          .catch(() => {
            setMeta({ role: 'user', blocked: false, blockedReason: null });
          });
      } else {
        setUser(null);
        setIdToken(null);
        localStorage.removeItem('idToken');
        setMeta({ role: 'user', blocked: false, blockedReason: null });
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const [meta, setMeta] = useState({ role: 'user', blocked: false, blockedReason: null });

  const value = useMemo(() => ({
    user,
    idToken,
    loading,
    role: meta.role,
    blocked: meta.blocked,
    blockedReason: meta.blockedReason,
    refreshMe: async () => {
      try {
        const { data } = await api.get('/me');
        setMeta({ role: data.role || 'user', blocked: !!data.blocked, blockedReason: data.blockedReason || null });
      } catch {}
    },
    signIn: async () => {
      const cred = await signInWithPopup(auth, googleProvider);
      const token = await cred.user.getIdToken(true);
      localStorage.setItem('idToken', token);
    },
    signOut: async () => {
      await fbSignOut(auth);
    }
  }), [user, idToken, loading, meta]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
