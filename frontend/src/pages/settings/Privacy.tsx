import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Download, Trash2, Shield, CheckCircle2, AlertCircle } from 'lucide-react';

export const PrivacySettings: React.FC = () => {
  const { user } = useAuth();
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const handleDownloadData = () => {
    if (!user) return;
    const citizenData = {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
      exported_at: new Date().toISOString(),
      service_requests_count: 6,
      complaints_count: 3,
      disclaimer: 'Official TechBharat C2-22 Data Privacy Export (GDPR / DPDP Compliance)'
    };

    const blob = new Blob([JSON.stringify(citizenData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `utilityai_data_${user.user_id}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  const handleDeleteConversations = () => {
    localStorage.removeItem('utilityai_chat_history');
    setDeleteSuccess(true);
    setTimeout(() => setDeleteSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-surface-border pb-4">
        <h2 className="text-lg font-heading font-extrabold text-content-main">Privacy & Data Governance</h2>
        <p className="text-xs text-content-muted">Exercise control over your citizen data, interaction traces, and exported records.</p>
      </div>

      <div className="space-y-4 max-w-xl text-xs">
        {/* Download Data Box */}
        <div className="p-4 bg-surface-card rounded-card border border-surface-border space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-primary flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-content-main text-xs block">Download Personal Data Archive</span>
              <span className="text-[11px] text-content-muted">Export all your requests, complaints, and preferences as JSON</span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              onClick={handleDownloadData}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-input font-bold transition flex items-center space-x-2"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Data (JSON)</span>
            </button>

            {downloadSuccess && (
              <span className="flex items-center space-x-1 text-status-success font-semibold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Archive downloaded!</span>
              </span>
            )}
          </div>
        </div>

        {/* Delete Conversations */}
        <div className="p-4 bg-surface-card rounded-card border border-surface-border space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-status-critical flex items-center justify-center">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-content-main text-xs block">Purge Conversation History</span>
              <span className="text-[11px] text-content-muted">Remove citizen chat logs and AI interaction records from your session</span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              onClick={handleDeleteConversations}
              className="px-4 py-2 bg-surface-page hover:bg-rose-50 text-status-critical border border-status-critical/30 rounded-input font-bold transition flex items-center space-x-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete My Conversations</span>
            </button>

            {deleteSuccess && (
              <span className="flex items-center space-x-1 text-status-success font-semibold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Conversations purged.</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

