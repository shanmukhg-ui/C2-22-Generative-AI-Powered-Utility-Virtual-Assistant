import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { User, Mail, Phone, Globe, CheckCircle2, AlertCircle, Save } from 'lucide-react';

export const AccountSettings: React.FC = () => {
  const { user } = useAuth();
  const { userPrefs, updateUserPrefs } = useSettings();

  const [name, setName] = useState(user?.name || 'John Doe');
  const [phone, setPhone] = useState(userPrefs.phone || '+91 98765 43210');
  const [language, setLanguage] = useState(userPrefs.preferredLanguage || 'English');
  const [isSaved, setIsSaved] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateUserPrefs({ phone, preferredLanguage: language });
    setIsSaved(true);
    setIsDirty(false);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-surface-border pb-4">
        <h2 className="text-lg font-heading font-extrabold text-content-main">Account Information</h2>
        <p className="text-xs text-content-muted">Manage your personal profile details and utility contact preferences.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4 max-w-xl text-xs">
        {/* Profile Avatar & Initials */}
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center font-heading font-black text-lg shadow-subtle">
            {name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <span className="text-xs font-bold text-content-main block">{name}</span>
            <span className="text-[11px] text-primary font-semibold">{user?.role || 'Customer'}</span>
          </div>
        </div>

        {/* Full Name */}
        <div>
          <label className="block font-semibold text-content-main mb-1.5">Full Name</label>
          <div className="relative">
            <User className="w-4 h-4 text-content-muted absolute left-3 top-2.5" />
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setIsDirty(true); }}
              className="w-full pl-9 pr-3 py-2 bg-surface-card border border-surface-border rounded-input text-content-main font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Email Address (Read-only as per specification) */}
        <div>
          <label className="block font-semibold text-content-main mb-1.5">
            Registered Email <span className="text-[10px] text-content-muted font-normal">(Read-only)</span>
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-content-muted absolute left-3 top-2.5" />
            <input
              type="email"
              disabled
              value={user?.email || 'customer0001@example.test'}
              className="w-full pl-9 pr-3 py-2 bg-surface-page/60 border border-surface-border rounded-input text-content-muted font-medium cursor-not-allowed"
            />
          </div>
        </div>

        {/* Phone Number */}
        <div>
          <label className="block font-semibold text-content-main mb-1.5">Contact Phone</label>
          <div className="relative">
            <Phone className="w-4 h-4 text-content-muted absolute left-3 top-2.5" />
            <input
              type="text"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setIsDirty(true); }}
              className="w-full pl-9 pr-3 py-2 bg-surface-card border border-surface-border rounded-input text-content-main font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Preferred Language */}
        <div>
          <label className="block font-semibold text-content-main mb-1.5">Preferred Language</label>
          <div className="relative">
            <Globe className="w-4 h-4 text-content-muted absolute left-3 top-2.5" />
            <select
              value={language}
              onChange={(e) => { setLanguage(e.target.value); setIsDirty(true); }}
              className="w-full pl-9 pr-3 py-2 bg-surface-card border border-surface-border rounded-input text-content-main font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="English">English</option>
              <option value="Hindi">Hindi (हिंदी)</option>
              <option value="Telugu">Telugu (తెలుగు)</option>
              <option value="Tamil">Tamil (தமிழ்)</option>
            </select>
          </div>
        </div>

        {/* Actions & Feedback */}
        <div className="pt-3 flex items-center space-x-3">
          <button
            type="submit"
            disabled={!isDirty}
            className={`px-5 py-2.5 rounded-input font-bold transition flex items-center space-x-2 ${
              isDirty
                ? 'bg-primary hover:bg-primary-hover text-white shadow-subtle'
                : 'bg-surface-border text-content-muted cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>Save Changes</span>
          </button>

          {isSaved && (
            <span className="flex items-center space-x-1 text-status-success font-semibold text-xs animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>Saved successfully!</span>
            </span>
          )}
        </div>
      </form>
    </div>
  );
};

