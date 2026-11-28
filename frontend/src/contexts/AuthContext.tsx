import React, { createContext, useContext, useState, useEffect } from 'react';
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

export interface SwitchPersonaResult {
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
  loading: false,
  isEmailVerified: true,
  loginWithEmail: async () => {},
  registerWithEmail: async () => {},
  loginWithGoogle: async () => {},
  resetPassword: async () => {},
  sendVerificationEmail: async () => {},
  switchPersona: async () => ({ success: true }),
  updateUserProfile: async () => {},
  refreshUser: async () => {},
  logout: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getInitialUser = (): User => {
    const savedId = localStorage.getItem('utilityai_active_user_id') || 'CUST0001';
    const match = PRESET_USERS.find(p => p.id === savedId) || PRESET_USERS[0];
    return {
      user_id: match.id,
      firebase_uid: match.id,
      name: match.name,
      email: match.email,
      role: match.role,
      city: match.city,
      department: match.dept,
      is_active: true,
      status: 'Active',
      email_verified: true,
      preferred_language: 'English',
      notifications: { sms: false, email: true, whatsapp: false }
    };
  };

  const [user, setUser] = useState<User | null>(getInitialUser);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sync = async () => {
      try {
        const profile = await authApi.getMe();
        if (profile && profile.user_id) {
          setUser(profile);
        }
      } catch {
        // Offline / mock mode
      }
    };
    sync();
  }, []);

  const switchPersona = async (personaId: string, _customPassword?: string): Promise<SwitchPersonaResult> => {
    const demo = PRESET_USERS.find((p) => p.id === personaId);
    if (!demo) {
      return { success: false, message: `Unknown persona ID: ${personaId}` };
    }

    localStorage.setItem('utilityai_active_user_id', demo.id);
    const updatedUser: User = {
      user_id: demo.id,
      firebase_uid: demo.id,
      name: demo.name,
      email: demo.email,
      role: demo.role,
      city: demo.city,
      department: demo.dept,
      is_active: true,
      status: 'Active',
      email_verified: true,
      preferred_language: 'English',
      notifications: { sms: false, email: true, whatsapp: false }
    };
    setUser(updatedUser);

    try {
      const profile = await authApi.getMe();
      if (profile && profile.user_id) {
        setUser(profile);
      }
    } catch {
      // Offline fallback
    }

    return { success: true };
  };

  const loginWithEmail = async (email: string, _pass: string) => {
    const match = PRESET_USERS.find(p => p.email.toLowerCase() === email.toLowerCase()) || PRESET_USERS[0];
    await switchPersona(match.id);
  };

  const registerWithEmail = async (name: string, email: string, _pass: string) => {
    const newUser: User = {
      user_id: `CUST${Math.floor(1000 + Math.random() * 9000)}`,
      firebase_uid: `cust_${Date.now()}`,
      name: name || 'Citizen',
      email: email || 'citizen@utilityai.org',
      role: 'Customer',
      is_active: true,
      status: 'Active',
      email_verified: true,
      preferred_language: 'English',
      notifications: { sms: false, email: true, whatsapp: false }
    };
    localStorage.setItem('utilityai_active_user_id', newUser.user_id);
    setUser(newUser);
  };

  const loginWithGoogle = async () => {
    await switchPersona('CUST0001');
  };

  const resetPassword = async (_email: string) => {};
  const sendVerificationEmail = async () => {};

  const logout = async () => {
    await switchPersona('CUST0001');
  };

  const updateUserProfile = async (data: Partial<User>) => {
    if (user) {
      const updated = { ...user, ...data };
      setUser(updated);
      try {
        await authApi.updateProfile(data);
      } catch {}
    }
  };

  const refreshUser = async () => {
    try {
      const profile = await authApi.getMe();
      if (profile && profile.user_id) {
        setUser(profile);
      }
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser: null,
        loading,
        isEmailVerified: true,
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
