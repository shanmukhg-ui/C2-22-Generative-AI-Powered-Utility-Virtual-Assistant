import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { Bell, Mail, ShieldAlert, CheckCircle2, Save } from 'lucide-react';

export const NotificationsSettings: React.FC = () => {
  const { user } = useAuth();
  const { userPrefs, updateUserPrefs } = useSettings();
  const role = user?.role || 'Customer';

  const [emailAlerts, setEmailAlerts] = useState(userPrefs.emailNotifications);
  const [inAppAlerts, setInAppAlerts] = useState(userPrefs.inAppAlerts);
  const [criticalOutageAlerts, setCriticalOutageAlerts] = useState(userPrefs.criticalOutageAlerts);
  const [dailySummaryReadyAlerts, setDailySummaryReadyAlerts] = useState(userPrefs.dailySummaryReadyAlerts);
  const [ingestionAlerts, setIngestionAlerts] = useState(userPrefs.ingestionAlerts);
  const [securityAlerts, setSecurityAlerts] = useState(userPrefs.securityAlerts);

  const [isSaved, setIsSaved] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const handleSave = async () => {
    await updateUserPrefs({
      emailNotifications: emailAlerts,
      inAppAlerts: inAppAlerts,
      criticalOutageAlerts,
      dailySummaryReadyAlerts,
      ingestionAlerts,
      securityAlerts
    });
    setIsSaved(true);
    setIsDirty(false);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-surface-border pb-4">
        <h2 className="text-lg font-heading font-extrabold text-content-main">Notification Preferences</h2>
        <p className="text-xs text-content-muted">Configure real-time alerts according to your authorized {role} duties.</p>
      </div>

      <div className="space-y-5 max-w-xl text-xs">
        {/* General Alert Channels */}
        <div className="space-y-3">
          <span className="font-bold text-content-main block">Notification Channels</span>

          {/* In-app */}
          <div className="flex items-center justify-between p-3.5 bg-surface-card rounded-card border border-surface-border">
            <div className="flex items-center space-x-3">
              <Bell className="w-4 h-4 text-primary" />
              <div>
                <span className="font-bold text-content-main block">In-App Push Alerts</span>
                <span className="text-[11px] text-content-muted">Real-time status banners and badge counters</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={inAppAlerts}
              onChange={(e) => { setInAppAlerts(e.target.checked); setIsDirty(true); }}
              className="w-4 h-4 accent-primary cursor-pointer"
            />
          </div>

          {/* Email */}
          <div className="flex items-center justify-between p-3.5 bg-surface-card rounded-card border border-surface-border">
            <div className="flex items-center space-x-3">
              <Mail className="w-4 h-4 text-primary" />
              <div>
                <span className="font-bold text-content-main block">Email Dispatch Reports</span>
                <span className="text-[11px] text-content-muted">Daily digests and milestone confirmations</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={emailAlerts}
              onChange={(e) => { setEmailAlerts(e.target.checked); setIsDirty(true); }}
              className="w-4 h-4 accent-primary cursor-pointer"
            />
          </div>
        </div>

        {/* Role-Specific Notification Rules */}
        <div className="space-y-3 pt-2">
          <span className="font-bold text-content-main block">Role Events ({role})</span>

          {role === 'Customer' && (
            <>
              <div className="flex items-center justify-between p-3 bg-surface-card rounded-card border border-surface-border">
                <div>
                  <span className="font-bold text-content-main block">Service Request Status Changes</span>
                  <span className="text-[11px] text-content-muted">Alerts when your meter or connection request progresses</span>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  onChange={() => setIsDirty(true)}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-surface-card rounded-card border border-surface-border">
                <div>
                  <span className="font-bold text-content-main block">Grievance / Complaint Resolution Updates</span>
                  <span className="text-[11px] text-content-muted">Notifications when technician is assigned or complaint is resolved</span>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  onChange={() => setIsDirty(true)}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              </div>
            </>
          )}

          {role === 'Employee' && (
            <>
              <div className="flex items-center justify-between p-3 bg-surface-card rounded-card border border-surface-border">
                <div>
                  <span className="font-bold text-content-main block">Critical Incident & Outage Feeder Alerts</span>
                  <span className="text-[11px] text-content-muted">High-priority dispatch notification for P4 transformer faults</span>
                </div>
                <input
                  type="checkbox"
                  checked={criticalOutageAlerts}
                  onChange={(e) => { setCriticalOutageAlerts(e.target.checked); setIsDirty(true); }}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-surface-card rounded-card border border-surface-border">
                <div>
                  <span className="font-bold text-content-main block">Daily AI Operational Summary Ready</span>
                  <span className="text-[11px] text-content-muted">Alerts when morning ward analytics are synthesized</span>
                </div>
                <input
                  type="checkbox"
                  checked={dailySummaryReadyAlerts}
                  onChange={(e) => { setDailySummaryReadyAlerts(e.target.checked); setIsDirty(true); }}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              </div>
            </>
          )}

          {role === 'Administrator' && (
            <>
              <div className="flex items-center justify-between p-3 bg-surface-card rounded-card border border-surface-border">
                <div>
                  <span className="font-bold text-content-main block">Document Ingestion & ChromaDB Index Status</span>
                  <span className="text-[11px] text-content-muted">Notifications on PDF chunking and vector index completion</span>
                </div>
                <input
                  type="checkbox"
                  checked={ingestionAlerts}
                  onChange={(e) => { setIngestionAlerts(e.target.checked); setIsDirty(true); }}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-surface-card rounded-card border border-surface-border">
                <div>
                  <span className="font-bold text-content-main block">Security Audit & Rate-Limit Warnings</span>
                  <span className="text-[11px] text-content-muted">Alerts on unauthorized RBAC attempts or suspicious lookups</span>
                </div>
                <input
                  type="checkbox"
                  checked={securityAlerts}
                  onChange={(e) => { setSecurityAlerts(e.target.checked); setIsDirty(true); }}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              </div>
            </>
          )}
        </div>

        <div className="pt-3 flex items-center space-x-3">
          <button
            onClick={handleSave}
            disabled={!isDirty}
            className={`px-5 py-2.5 rounded-input font-bold transition flex items-center space-x-2 ${
              isDirty
                ? 'bg-primary hover:bg-primary-hover text-white shadow-subtle'
                : 'bg-surface-border text-content-muted cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>

          {isSaved && (
            <span className="flex items-center space-x-1 text-status-success font-semibold text-xs animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>Saved successfully!</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

