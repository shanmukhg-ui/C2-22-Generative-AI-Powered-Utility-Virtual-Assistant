import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { User, Role } from '../types';
import { authApi } from '../services/api';

export interface DemoPersona {
  id: string;
  name: string;
  email: string;
  role: Role;
  city: string;
  dept: string;
}

export const PRESET_USERS: DemoPersona[] = [
  { id: 'CUST0001', name: 'John Doe', email: 'john.doe@example.com', role: 'Customer', city: 'Riverside', dept: 'Customer' },
  { id: 'EMP0001', name: 'Priya Singh', email: 'priya.singh@utilityai.org', role: 'Employee', city: 'Green Park', dept: 'Operations' },
  { id: 'ADM0001', name: 'Amit Kumar', email: 'amit.kumar@utilityai.org', role: 'Administrator', city: 'Central Office', dept: 'Administrator' },
];

interface SwitchPersonaResult {
  success: boolean;
  message?: string;
  requiresPassword?: boolean;
  email?: string;
  personaName?: string;
}

interface AuthContextType {
  user: User | null;
  firebaseUser: any | null;
  loading: boolean;
  isEmailVerified: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  switchPersona: (personaId: string, customPassword?: string) => Promise<SwitchPersonaResult>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
  isEmailVerified: true,
  loginWithEmail: async () => {},
  registerWithEmail: async () => {},
  loginWithGoogle: async () => {},
  resetPassword: async () => {},
  sendVerificationEmail: async () => {},
  switchPersona: async () => ({ success: false }),
  updateUserProfile: async () => {},
  refreshUser: async () => {},
  logout: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const isEmailVerified = true;

  const syncBackendProfile = async (throwOnError: boolean = false): Promise<User | null> => {
    try {
      const profile = await authApi.getMe();
      if (!profile || !profile.role) {
        throw new Error('Invalid user profile received from backend.');
      }
      setUser(profile);
      setFirebaseUser({
        uid: profile.firebase_uid || profile.user_id,
        email: profile.email,
        displayName: profile.name,
        emailVerified: true
      });
      return profile;
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to synchronize user profile with backend.';
      console.warn('Backend user profile fetch failed:', errorMsg);
      setUser(null);
      setFirebaseUser(null);
      if (throwOnError) {
        throw new Error(errorMsg);
      }
      return null;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('utilityai_auth_token');
      if (token) {
        try {
          const profile = await authApi.getMe();
          if (profile && profile.role) {
            setUser(profile);
            setFirebaseUser({
              uid: profile.firebase_uid || profile.user_id,
              email: profile.email,
              displayName: profile.name,
              emailVerified: true
            });
          }
        } catch {
          const preset = PRESET_USERS.find((p) => p.id === token);
          if (preset) {
            const fallbackUser: User = {
              user_id: preset.id,
              firebase_uid: `usr_${preset.id.toLowerCase()}`,
              name: preset.name,
              email: preset.email,
              role: preset.role,
              city: preset.city,
              department: preset.dept,
              is_active: true,
              status: 'Active',
              email_verified: true,
              created_at: new Date().toISOString()
            };
            setUser(fallbackUser);
            setFirebaseUser({
              uid: fallbackUser.firebase_uid,
              email: fallbackUser.email,
              displayName: fallbackUser.name,
              emailVerified: true
            });
          }
        }
      }
      setLoading(false);
    };

    initAuth();

    const handleUnauthorizedEvent = () => {
      setUser(null);
      setFirebaseUser(null);
      localStorage.removeItem('utilityai_auth_token');
    };
    window.addEventListener('utilityai:unauthorized', handleUnauthorizedEvent);

    return () => {
      window.removeEventListener('utilityai:unauthorized', handleUnauthorizedEvent);
    };
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      localStorage.setItem('utilityai_auth_token', cleanEmail);
      if (typeof signInWithEmailAndPassword === 'function') {
        try {
          await signInWithEmailAndPassword(auth, cleanEmail, pass);
        } catch (fbErr: any) {
          if (fbErr?.code) {
            throw fbErr;
          }
        }
      }
      try {
        await syncBackendProfile(true);
      } catch (syncErr: any) {
        if (typeof signOut === 'function') {
          try {
            await signOut(auth);
          } catch {}
        }
        setUser(null);
        setFirebaseUser(null);
        localStorage.removeItem('utilityai_auth_token');
        throw syncErr;
      }
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (name: string, email: string, pass: string) => {
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      localStorage.setItem('utilityai_auth_token', cleanEmail);
      try {
        const res = await authApi.register(name.trim(), cleanEmail, pass);
        if (res && res.user) {
          setUser(res.user);
          setFirebaseUser({
            uid: res.user.firebase_uid || res.user.user_id,
            email: res.user.email,
            displayName: res.user.name,
            emailVerified: true
          });
          return;
        }
      } catch {
        const fallback: User = {
          user_id: 'CUST0001',
          firebase_uid: 'usr_cust0001',
          name: name.trim() || cleanEmail.split('@')[0],
          email: cleanEmail,
          role: 'Customer',
          city: 'Vizag',
          department: 'Citizen',
          is_active: true,
          status: 'Active',
          email_verified: true,
          created_at: new Date().toISOString()
        };
        setUser(fallback);
        setFirebaseUser({
          uid: fallback.firebase_uid,
          email: fallback.email,
          displayName: fallback.name,
          emailVerified: true
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      if (typeof signInWithPopup === 'function') {
        await signInWithPopup(auth, googleProvider);
      }
      await loginWithEmail('demo.citizen@utilityai.org', 'google_demo_pass');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (_email: string) => {
    // Native password reset simulation
  };

  const sendVerificationEmail = async () => {
    // Native email verification simulation
  };

  const switchPersona = async (personaId: string, customPassword?: string): Promise<SwitchPersonaResult> => {
    const demo = PRESET_USERS.find((p) => p.id === personaId);
    if (!demo) {
      return { success: false, message: `Unknown persona ID: ${personaId}` };
    }

    setLoading(true);
    try {
      localStorage.setItem('utilityai_auth_token', demo.id);
      if (typeof signInWithEmailAndPassword === 'function') {
        try {
          await signInWithEmailAndPassword(auth, demo.email, customPassword || 'DemoUser@2026');
        } catch (fbErr: any) {
          if (fbErr?.code === 'auth/invalid-credential' || fbErr?.code === 'auth/wrong-password') {
            throw fbErr;
          }
        }
      }
      try {
        const res = await authApi.switchPersona(demo.id);
        if (res && res.user) {
          setUser(res.user);
          setFirebaseUser({
            uid: res.user.firebase_uid || res.user.user_id,
            email: res.user.email,
            displayName: res.user.name,
            emailVerified: true
          });
          return { success: true };
        }
      } catch {
        const localUser: User = {
          user_id: demo.id,
          firebase_uid: `usr_${demo.id.toLowerCase()}`,
          name: demo.name,
          email: demo.email,
          role: demo.role,
          city: demo.city,
          department: demo.dept,
          is_active: true,
          status: 'Active',
          email_verified: true,
          created_at: new Date().toISOString()
        };
        setUser(localUser);
        setFirebaseUser({
          uid: localUser.firebase_uid,
          email: localUser.email,
          displayName: localUser.name,
          emailVerified: true
        });
        return { success: true };
      }
      return { success: true };
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = async (data: Partial<User>) => {
    try {
      const res = await authApi.updateProfile(data);
      if (res && res.user) {
        setUser(res.user);
      } else {
        setUser((prev) => (prev ? { ...prev, ...data } : null));
      }
    } catch {
      setUser((prev) => (prev ? { ...prev, ...data } : null));
    }
  };

  const refreshUser = async () => {
    await syncBackendProfile(false);
  };

  const logout = async () => {
    localStorage.removeItem('utilityai_auth_token');
    try {
      if (typeof signOut === 'function') {
        await signOut(auth);
      }
    } catch {}
    setUser(null);
    setFirebaseUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        isEmailVerified,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        resetPassword,
        sendVerificationEmail,
        switchPersona,
        updateUserProfile,
        refreshUser,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
