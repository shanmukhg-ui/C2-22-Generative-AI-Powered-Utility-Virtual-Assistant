import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export interface UserPreferences {
  // Appearance
  theme: 'light' | 'dark' | 'system';
  density: 'comfortable' | 'compact';
  defaultLandingPage: string;
  intro_mode?: 'always' | 'session' | 'never';
  // Account
  preferredLanguage: string;
  phone: string;
  // Notifications
  emailNotifications: boolean;
  inAppAlerts: boolean;
  criticalOutageAlerts: boolean;
  dailySummaryReadyAlerts: boolean;
  ingestionAlerts: boolean;
  securityAlerts: boolean;
  // AI Assistant Preferences
  responseLength: 'concise' | 'detailed';
  showCitations: boolean;
  saveConversationHistory: boolean;
  // Operations Preferences (Employee)
  defaultRegionFilter: string;
  defaultSeverityFilter: string;
  defaultSummaryTimeRange: string;
}

export interface SystemSettings {
  version: number;
  chatModel: string;
  embeddingModel: string;
  topK: number;
  similarityThreshold: number;
  chunkSize: number;
  chunkOverlap: number;
  safeFallbackMessage: string;
  allowedFileTypes: string[];
  maxUploadSizeBytes: number;
  defaultVisibility: string;
  enableSelfSignup: boolean;
  defaultRoleForNewUsers: string;
  sessionTimeoutMinutes: number;
  rateLimitPerMinute: number;
  demoMode: boolean;
  updatedBy?: string;
  updatedAt?: string;
}

interface SettingsContextType {
  userPrefs: UserPreferences;
  systemSettings: SystemSettings | null;
  loading: boolean;
  updateUserPrefs: (prefs: Partial<UserPreferences>) => Promise<boolean>;
  updateSystemSettings: (settings: Partial<SystemSettings>) => Promise<boolean>;
  refreshSettings: () => Promise<void>;
}

const DEFAULT_USER_PREFS: UserPreferences = {
  theme: 'light',
  density: 'comfortable',
  defaultLandingPage: 'dashboard',
  intro_mode: 'session',
  preferredLanguage: 'English',
  phone: '',
  emailNotifications: true,
  inAppAlerts: true,
  criticalOutageAlerts: true,
  dailySummaryReadyAlerts: true,
  ingestionAlerts: true,
  securityAlerts: true,
  responseLength: 'detailed',
  showCitations: true,
  saveConversationHistory: true,
  defaultRegionFilter: 'All Wards',
  defaultSeverityFilter: 'All Severities',
  defaultSummaryTimeRange: 'Today'
};

const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  version: 1,
  chatModel: 'google/gemini-2.5-flash',
  embeddingModel: 'text-embedding-3-small',
  topK: 5,
  similarityThreshold: 0.7,
  chunkSize: 800,
  chunkOverlap: 100,
  safeFallbackMessage: "I couldn't find this in the approved utility documents. Please contact support.",
  allowedFileTypes: ['application/pdf'],
  maxUploadSizeBytes: 10485760, // 10MB
  defaultVisibility: 'public',
  enableSelfSignup: true,
  defaultRoleForNewUsers: 'Customer',
  sessionTimeoutMinutes: 60,
  rateLimitPerMinute: 60,
  demoMode: true
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [userPrefs, setUserPrefs] = useState<UserPreferences>(() => {
    const saved = localStorage.getItem('utilityai_user_prefs');
    if (saved) {
      try { return { ...DEFAULT_USER_PREFS, ...JSON.parse(saved) }; } catch (e) {}
    }
    return DEFAULT_USER_PREFS;
  });

  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(DEFAULT_SYSTEM_SETTINGS);
  const [loading, setLoading] = useState(false);

  const refreshSettings = async () => {
    // In Phase 0 / Demo mode, read local settings
    const saved = localStorage.getItem('utilityai_user_prefs');
    if (saved) {
      try { setUserPrefs({ ...DEFAULT_USER_PREFS, ...JSON.parse(saved) }); } catch (e) {}
    }
  };

  const updateUserPrefs = async (prefs: Partial<UserPreferences>): Promise<boolean> => {
    const updated = { ...userPrefs, ...prefs };
    setUserPrefs(updated);
    localStorage.setItem('utilityai_user_prefs', JSON.stringify(updated));
    return true;
  };

  const updateSystemSettings = async (settings: Partial<SystemSettings>): Promise<boolean> => {
    if (!systemSettings) return false;
    const updated = { ...systemSettings, ...settings, updatedAt: new Date().toISOString() };
    setSystemSettings(updated);
    localStorage.setItem('utilityai_system_settings', JSON.stringify(updated));
    return true;
  };

  return (
    <SettingsContext.Provider
      value={{
        userPrefs,
        systemSettings,
        loading,
        updateUserPrefs,
        updateSystemSettings,
        refreshSettings
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

