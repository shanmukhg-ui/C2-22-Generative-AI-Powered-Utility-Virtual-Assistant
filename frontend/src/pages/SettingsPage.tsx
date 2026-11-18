import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  User, Sun, Bell, Lock, Sparkles, Shield, Activity, Database
} from 'lucide-react';
import { AccountSettings } from './settings/Account';
import { AppearanceSettings } from './settings/Appearance';
import { NotificationsSettings } from './settings/Notifications';
import { SecuritySettings } from './settings/Security';
import { AiPreferencesSettings } from './settings/AiPreferences';
import { PrivacySettings } from './settings/Privacy';
import { OperationsPrefsSettings } from './settings/OperationsPrefs';
import { SystemSettings } from './settings/System';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || 'Customer';

  const [activeTab, setActiveTab] = useState<string>('account');

  // Compute tabs based on active role
  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Sun },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'ai-prefs', label: 'AI Copilot', icon: Sparkles },
    ...(role === 'Customer' ? [{ id: 'privacy', label: 'Privacy & Data', icon: Shield }] : []),
    ...(role === 'Employee' ? [{ id: 'operations-prefs', label: 'Operations', icon: Activity }] : []),
    ...(role === 'Administrator' ? [{ id: 'system', label: 'System & Infra', icon: Database }] : [])
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Settings Header */}
      <div>
        <h1 className="text-2xl font-heading font-black text-content-main tracking-tight">Settings & Preferences</h1>
        <p className="text-xs text-content-muted mt-1">
          Configure interface appearance, authentication security, role parameters, and AI engine preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Settings Sidebar Tabs */}
        <div className="md:col-span-3 bg-surface-card p-3 rounded-card border border-surface-border space-y-1 shadow-xs">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-input text-xs font-bold transition text-left ${
                  active
                    ? 'bg-primary text-white shadow-subtle'
                    : 'text-content-muted hover:text-content-main hover:bg-surface-page'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-primary'}`} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Active Tab Content */}
        <div className="md:col-span-9 bg-surface-card p-6 md:p-8 rounded-card border border-surface-border shadow-card min-h-[480px]">
          {activeTab === 'account' && <AccountSettings />}
          {activeTab === 'appearance' && <AppearanceSettings />}
          {activeTab === 'notifications' && <NotificationsSettings />}
          {activeTab === 'security' && <SecuritySettings />}
          {activeTab === 'ai-prefs' && <AiPreferencesSettings />}
          {activeTab === 'privacy' && role === 'Customer' && <PrivacySettings />}
          {activeTab === 'operations-prefs' && role === 'Employee' && <OperationsPrefsSettings />}
          {activeTab === 'system' && role === 'Administrator' && <SystemSettings />}
        </div>
      </div>
    </div>
  );
};

