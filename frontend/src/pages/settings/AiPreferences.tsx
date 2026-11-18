import React, { useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { Sparkles, FileText, History, Trash2, CheckCircle2, AlertTriangle, Save } from 'lucide-react';

export const AiPreferencesSettings: React.FC = () => {
  const { userPrefs, updateUserPrefs } = useSettings();

  const [responseLength, setResponseLength] = useState<'concise' | 'detailed'>(userPrefs.responseLength);
  const [showCitations, setShowCitations] = useState(userPrefs.showCitations);
  const [saveHistory, setSaveHistory] = useState(userPrefs.saveConversationHistory);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isCleared, setIsCleared] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const handleSave = async () => {
    await updateUserPrefs({
      responseLength,
      showCitations,
      saveConversationHistory: saveHistory
    });
    setIsSaved(true);
    setIsDirty(false);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleConfirmClear = () => {
    localStorage.removeItem('utilityai_chat_history');
    setIsCleared(true);
    setShowClearConfirm(false);
    setTimeout(() => setIsCleared(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-surface-border pb-4">
        <h2 className="text-lg font-heading font-extrabold text-content-main">AI Copilot Preferences</h2>
        <p className="text-xs text-content-muted">Tailor the response format, citations, and conversation memory of your virtual assistant.</p>
      </div>

      <div className="space-y-6 max-w-xl text-xs">
        {/* Response Format / Length */}
        <div>
          <label className="block font-semibold text-content-main mb-2">Answer Synthesis Depth</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => { setResponseLength('concise'); setIsDirty(true); }}
              className={`p-3 rounded-card border text-left transition ${
                responseLength === 'concise'
                  ? 'border-primary bg-primary-light/40 ring-1 ring-primary font-bold text-primary'
                  : 'border-surface-border bg-surface-card text-content-main'
              }`}
            >
              <span className="block text-xs">Concise</span>
              <span className="text-[10px] text-content-muted font-normal">Bullet points and direct answers only</span>
            </button>

            <button
              type="button"
              onClick={() => { setResponseLength('detailed'); setIsDirty(true); }}
              className={`p-3 rounded-card border text-left transition ${
                responseLength === 'detailed'
                  ? 'border-primary bg-primary-light/40 ring-1 ring-primary font-bold text-primary'
                  : 'border-surface-border bg-surface-card text-content-main'
              }`}
            >
              <span className="block text-xs">Detailed (Recommended)</span>
              <span className="text-[10px] text-content-muted font-normal">Step-by-step guidance with procedural context</span>
            </button>
          </div>
        </div>

        {/* Source Citations Toggle */}
        <div className="flex items-center justify-between p-3.5 bg-surface-card rounded-card border border-surface-border">
          <div className="flex items-center space-x-3">
            <FileText className="w-4 h-4 text-primary" />
            <div>
              <span className="font-bold text-content-main block">Show Verified Document Citations</span>
              <span className="text-[11px] text-content-muted">Display page citations and circular chips under answers</span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={showCitations}
            onChange={(e) => { setShowCitations(e.target.checked); setIsDirty(true); }}
            className="w-4 h-4 accent-primary cursor-pointer"
          />
        </div>

        {/* Save Conversation History Toggle */}
        <div className="flex items-center justify-between p-3.5 bg-surface-card rounded-card border border-surface-border">
          <div className="flex items-center space-x-3">
            <History className="w-4 h-4 text-primary" />
            <div>
              <span className="font-bold text-content-main block">Save Conversation Sessions</span>
              <span className="text-[11px] text-content-muted">Persist conversation threads for multi-turn troubleshooting</span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={saveHistory}
            onChange={(e) => { setSaveHistory(e.target.checked); setIsDirty(true); }}
            className="w-4 h-4 accent-primary cursor-pointer"
          />
        </div>

        {/* Save button */}
        <div className="pt-2 flex items-center space-x-3">
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
              <span>Preferences saved!</span>
            </span>
          )}
        </div>

        {/* Clear History Danger Zone */}
        <div className="pt-4 border-t border-surface-border">
          <div className="p-4 bg-status-critical/5 border border-status-critical/20 rounded-card flex items-center justify-between">
            <div>
              <span className="font-bold text-status-critical block">Clear Assistant History</span>
              <span className="text-[11px] text-content-muted">Permanently deletes all previous conversations from local device cache.</span>
            </div>
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="px-3 py-1.5 bg-status-critical hover:bg-red-700 text-white rounded-input font-semibold text-xs transition flex items-center space-x-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          </div>

          {isCleared && (
            <div className="mt-2 text-status-success text-xs font-semibold flex items-center space-x-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Chat history cleared successfully.</span>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-card rounded-card max-w-sm w-full p-6 space-y-4 border border-surface-border shadow-2xl">
            <div className="flex items-center space-x-3 text-status-critical">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-heading font-bold text-sm text-content-main">Confirm Deletion</h3>
            </div>
            <p className="text-xs text-content-muted leading-relaxed">
              Are you sure you want to delete your stored conversation history? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3.5 py-1.5 rounded-input border border-surface-border text-content-main hover:bg-surface-page font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClear}
                className="px-3.5 py-1.5 rounded-input bg-status-critical text-white font-bold text-xs"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

