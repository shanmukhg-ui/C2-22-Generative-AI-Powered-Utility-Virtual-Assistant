import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  onIdTokenChanged
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
  firebaseUser: FirebaseUser | null;
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
  isEmailVerified: false,
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
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  const isEmailVerified = Boolean(
    firebaseUser?.emailVerified ||
    firebaseUser?.providerData.some((p) => p.providerId === 'google.com')
  );

  const syncBackendProfile = async (): Promise<User | null> => {
    try {
      const profile = await authApi.getMe();
      setUser(profile);
      return profile;
    } catch (err: any) {
      console.warn('Backend user profile fetch failed:', err?.response?.data || err.message);
      // In case of 401 / 403 (e.g. unverified email or invalid token), user profile is not set
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (currentFbUser) => {
      setFirebaseUser(currentFbUser);
      if (currentFbUser) {
        await syncBackendProfile();
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    const handleUnauthorizedEvent = () => {
      setUser(null);
    };
    window.addEventListener('utilityai:unauthorized', handleUnauthorizedEvent);

    return () => {
      unsubscribe();
      window.removeEventListener('utilityai:unauthorized', handleUnauthorizedEvent);
    };
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), pass);
      setFirebaseUser(userCredential.user);
      await syncBackendProfile();
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (name: string, email: string, pass: string) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      if (name.trim()) {
        await updateProfile(userCredential.user, { displayName: name.trim() });
      }
      await sendEmailVerification(userCredential.user);
      setFirebaseUser(userCredential.user);
      await syncBackendProfile();
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      setFirebaseUser(userCredential.user);
      await syncBackendProfile();
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const sendVerificationEmail = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const switchPersona = async (personaId: string, customPassword?: string): Promise<SwitchPersonaResult> => {
    const demo = PRESET_USERS.find((p) => p.id === personaId);
    if (!demo) {
      return { success: false, message: `Unknown persona ID: ${personaId}` };
    }

    const passwordToTry = customPassword;

    if (!passwordToTry) {
      return {
        success: false,
        requiresPassword: true,
        email: demo.email,
        personaName: demo.name,
        message: `Please enter the Firebase password for demo persona '${demo.name}' (${demo.email}).`
      };
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, demo.email, passwordToTry);
      await syncBackendProfile();
      return { success: true };
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
        return {
          success: false,
          requiresPassword: true,
          email: demo.email,
          personaName: demo.name,
          message: `Demo account '${demo.email}' not found in Firebase project. Please create this user in Firebase Console or check password.`
        };
      }
      return {
        success: false,
        requiresPassword: true,
        email: demo.email,
        personaName: demo.name,
        message: err.message || 'Authentication failed for demo persona.'
      };
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
    } catch (err) {
      console.error('Failed to update user profile in MongoDB:', err);
      throw err;
    }
  };

  const refreshUser = async () => {
    await syncBackendProfile();
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
      setFirebaseUser(null);
    } finally {
      setLoading(false);
    }
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
