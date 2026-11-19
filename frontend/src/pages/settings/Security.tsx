import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Lock, Shield, Laptop, Smartphone, CheckCircle2, AlertTriangle, KeyRound } from 'lucide-react';

export const SecuritySettings: React.FC = () => {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessions, setSessions] = useState([
    { id: 'sess_1', device: 'Chrome on Windows 11', ip: '127.0.0.1 (Localhost)', current: true, time: 'Active now' },
    { id: 'sess_2', device: 'Mobile Safari on iPhone 15', ip: '103.21.244.12', current: false, time: '2 hours ago' }
  ]);

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    // In DEMO_MODE, verify and update
    setStatusMessage('Password updated successfully for demo account.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleSignOutOtherDevices = () => {
    setSessions(prev => prev.filter(s => s.current));
    setStatusMessage('Successfully signed out of 1 other device session.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-surface-border pb-4">
        <h2 className="text-lg font-heading font-extrabold text-content-main">Security & Authentication</h2>
        <p className="text-xs text-content-muted">Manage credentials, active device sessions, and authentication security.</p>
      </div>

      <div className="space-y-6 max-w-xl text-xs">
        {/* Change Password Form */}
        <form onSubmit={handleChangePassword} className="space-y-3 bg-surface-card p-4 rounded-card border border-surface-border">
          <div className="flex items-center space-x-2 pb-2 border-b border-surface-border">
            <KeyRound className="w-4 h-4 text-primary" />
            <span className="font-bold text-content-main">Change Password</span>
          </div>

          <div>
            <label className="block font-semibold text-content-main mb-1">Current Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full p-2 bg-surface-page/50 border border-surface-border rounded-input text-content-main focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-content-main mb-1">New Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2 bg-surface-page/50 border border-surface-border rounded-input text-content-main focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-content-main mb-1">Confirm Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-2 bg-surface-page/50 border border-surface-border rounded-input text-content-main focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="p-2.5 rounded-input bg-status-critical/10 border border-status-critical/30 text-status-critical flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {statusMessage && (
            <div className="p-2.5 rounded-input bg-status-success/10 border border-status-success/30 text-status-success flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          <button
            type="submit"
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-input transition"
          >
            Update Password
          </button>
        </form>

        {/* Active Sessions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-content-main">Active Device Sessions</span>
            {sessions.length > 1 && (
              <button
                type="button"
                onClick={handleSignOutOtherDevices}
                className="text-primary hover:underline font-semibold text-[11px]"
              >
                Sign out other devices
              </button>
            )}
          </div>

          <div className="space-y-2">
            {sessions.map((sess) => (
              <div
                key={sess.id}
                className="p-3 bg-surface-card rounded-card border border-surface-border flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-page text-content-muted flex items-center justify-center">
                    {sess.device.includes('iPhone') ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="font-bold text-content-main flex items-center space-x-1.5">
                      <span>{sess.device}</span>
                      {sess.current && (
                        <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] rounded font-bold">
                          Current Session
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-content-muted font-mono">
                      {sess.ip} • {sess.time}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

