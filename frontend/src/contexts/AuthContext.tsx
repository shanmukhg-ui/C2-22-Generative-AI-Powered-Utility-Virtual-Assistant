import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  switchPersona: (userId: string) => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  switchPersona: async () => {},
  updateUserProfile: async () => {},
  refreshUser: async () => {},
  logout: () => {}
});

export const PRESET_USERS = [
  { id: 'CUST0001', name: 'John Doe', role: 'Customer' as Role, city: 'Riverside', dept: 'Customer' },
  { id: 'EMP0001', name: 'Priya Singh', role: 'Employee' as Role, city: 'Green Park', dept: 'Operations' },
  { id: 'ADM0001', name: 'Amit Kumar', role: 'Administrator' as Role, city: 'Central Office', dept: 'Administrator' },
  { id: 'CUST0010', name: 'Priya Patel', role: 'Customer' as Role, city: 'Lakeview', dept: 'Customer' },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const u = await authApi.getMe();
      setUser(u);
    } catch (e) {
      console.error('Failed to load user from backend:', e);
      // Fallback
      setUser({
        user_id: 'CUST0001',
        firebase_uid: 'firebase_cust0001',
        name: 'John Doe',
        email: 'john.doe@example.com',
        role: 'Customer',
        city: 'Riverside',
        department: 'Customer'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const switchPersona = async (userId: string) => {
    setLoading(true);
    localStorage.setItem('utility_auth_token', `dev-token-${userId}`);
    await fetchUser();
  };

  const updateUserProfile = async (data: Partial<User>) => {
    try {
      const res = await authApi.updateProfile(data);
      if (res && res.user) {
        setUser(res.user);
      } else {
        setUser((prev) => (prev ? { ...prev, ...data } : null));
      }
    } catch (e) {
      console.error('Failed to update user profile:', e);
      setUser((prev) => (prev ? { ...prev, ...data } : null));
    }
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  const logout = () => {
    localStorage.removeItem('utility_auth_token');
    fetchUser();
  };

  return (
    <AuthContext.Provider value={{ user, loading, switchPersona, updateUserProfile, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
