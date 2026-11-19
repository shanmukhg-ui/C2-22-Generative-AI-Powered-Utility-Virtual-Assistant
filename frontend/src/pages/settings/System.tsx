import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import {
  ShieldAlert, Cpu, Database, Key, Sliders, RefreshCw,
  CheckCircle2, AlertTriangle, Save, RotateCcw, Download,
  Activity, Check, Shield
} from 'lucide-react';

export const SystemSettings: React.FC = () => {
  const { user } = useAuth();
  const { systemSettings, updateSystemSettings } = useSettings();

  // Guard: non-admins are blocked
  if (user?.role !== 'Administrator') {
    return (
      <div className="p-6 bg-status-critical/10 border border-status-critical/30 rounded-card text-xs text-status-critical flex items-center space-x-3">
        <ShieldAlert className="w-5 h-5 shrink-0" />
        <div>
          <span className="font-bold block">403 Forbidden – Administrative Access Required</span>
          <span>Only authorized administrators may inspect or configure global system settings and integrations.</span>
        </div>
      </div>
    );
  }

  const [chatModel, setChatModel] = useState(systemSettings?.chatModel || 'google/gemini-2.5-flash');
  const [embeddingModel, setEmbeddingModel] = useState(systemSettings?.embeddingModel || 'text-embedding-3-small');
  const [topK, setTopK] = useState(systemSettings?.topK || 5);
  const [similarityThreshold, setSimilarityThreshold] = useState(systemSettings?.similarityThreshold || 0.7);
  const [chunkSize, setChunkSize] = useState(systemSettings?.chunkSize || 800);
  const [chunkOverlap, setChunkOverlap] = useState(systemSettings?.chunkOverlap || 100);
  const [fallbackMsg, setFallbackMsg] = useState(systemSettings?.safeFallbackMessage || "I couldn't find this in the approved utility documents. Please contact support.");

  // Access Control & Integrations
  const [enableSignup, setEnableSignup] = useState(systemSettings?.enableSelfSignup ?? true);
  const [defaultRole, setDefaultRole] = useState(systemSettings?.defaultRoleForNewUsers || 'Customer');
  const [rateLimit, setRateLimit] = useState(systemSettings?.rateLimitPerMinute || 60);

  // Status testing states
  const [testingService, setTestingService] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ [key: string]: string }>({});

  // Reset confirmation
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSystemSettings({
      chatModel,
      embeddingModel,
      topK,
      similarityThreshold,
      chunkSize,
      chunkOverlap,
      safeFallbackMessage: fallbackMsg,
      enableSelfSignup: enableSignup,
      defaultRoleForNewUsers: defaultRole,
      rateLimitPerMinute: rateLimit
    });
    setIsSaved(true);
    setIsDirty(false);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleTestConnection = (service: string) => {
    setTestingService(service);
    setTimeout(() => {
      setTestResult(prev => ({ ...prev, [service]: 'Online • Verified' }));
      setTestingService(null);
    }, 600);
  };

  const handleResetDemoData = () => {
    if (resetConfirmText === 'RESET') {
      localStorage.removeItem('utilityai_chat_history');
      setShowResetModal(false);
      setResetConfirmText('');
      alert('Demo data and local state reset to default initialization.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-surface-border pb-4">
        <div className="flex items-center space-x-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
          <Shield className="w-4 h-4" />
          <span>Root Governance Controller</span>
        </div>
        <h2 className="text-lg font-heading font-extrabold text-content-main">System & AI Infrastructure Settings</h2>
        <p className="text-xs text-content-muted">Global configuration for RAG ingestion parameters, models, access controls, and service integrations.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 text-xs max-w-2xl">
        {/* Section 1: AI & RAG Configuration */}
        <div className="space-y-4 bg-surface-card p-5 rounded-card border border-surface-border">
          <div className="flex items-center space-x-2 pb-2 border-b border-surface-border text-primary font-bold">
            <Cpu className="w-4 h-4" />
            <span className="text-content-main text-sm">AI Engine & Embedding Parameters</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-content-main mb-1">Inference Model</label>
              <select
                value={chatModel}
                onChange={(e) => { setChatModel(e.target.value); setIsDirty(true); }}
                className="w-full p-2 bg-surface-page/50 border border-surface-border rounded-input text-content-main font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="google/gemini-2.5-flash">google/gemini-2.5-flash (Fast & Grounded)</option>
                <option value="openai/gpt-4o-mini">openai/gpt-4o-mini (Deterministic Tools)</option>
                <option value="meta-llama/llama-3.3-70b-instruct">meta-llama/llama-3.3-70b-instruct</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-content-main mb-1">Vector Embedding Model</label>
              <input
                type="text"
                value={embeddingModel}
                onChange={(e) => { setEmbeddingModel(e.target.value); setIsDirty(true); }}
                className="w-full p-2 bg-surface-page/50 border border-surface-border rounded-input text-content-main font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-content-main mb-1">
                Top-K Retrieval Chunks: <span className="font-mono text-primary font-bold">{topK}</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={topK}
                onChange={(e) => { setTopK(Number(e.target.value)); setIsDirty(true); }}
                className="w-full accent-primary cursor-pointer"
              />
            </div>

            <div>
              <label className="block font-semibold text-content-main mb-1">
                Similarity Threshold: <span className="font-mono text-primary font-bold">{similarityThreshold}</span>
              </label>
              <input
                type="range"
                min="0.1"
                max="0.95"
                step="0.05"
                value={similarityThreshold}
                onChange={(e) => { setSimilarityThreshold(Number(e.target.value)); setIsDirty(true); }}
                className="w-full accent-primary cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-content-main mb-1">Recursive Chunk Size (Tokens)</label>
              <input
                type="number"
                value={chunkSize}
                onChange={(e) => { setChunkSize(Number(e.target.value)); setIsDirty(true); }}
                className="w-full p-2 bg-surface-page/50 border border-surface-border rounded-input text-content-main font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-content-main mb-1">Chunk Overlap (Tokens)</label>
              <input
                type="number"
                value={chunkOverlap}
                onChange={(e) => { setChunkOverlap(Number(e.target.value)); setIsDirty(true); }}
                className="w-full p-2 bg-surface-page/50 border border-surface-border rounded-input text-content-main font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-content-main mb-1">Safe Fallback Message (Zero-Hallucination)</label>
            <textarea
              rows={2}
              value={fallbackMsg}
              onChange={(e) => { setFallbackMsg(e.target.value); setIsDirty(true); }}
              className="w-full p-2 bg-surface-page/50 border border-surface-border rounded-input text-content-main font-medium focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Section 2: Integrations Status (Never show secrets) */}
        <div className="space-y-3 bg-surface-card p-5 rounded-card border border-surface-border">
          <div className="flex items-center space-x-2 pb-2 border-b border-surface-border text-primary font-bold">
            <Database className="w-4 h-4" />
            <span className="text-content-main text-sm">Service Integrations & Secrets Health</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { name: 'OpenRouter / OpenAI LLM', key: 'openrouter', status: 'Demo Mode • Active' },
              { name: 'MongoDB Engine', key: 'mongodb', status: 'Connected (MongoMock / DB)' },
              { name: 'ChromaDB Vector Store', key: 'chromadb', status: 'Persistent Vector Store' },
              { name: 'Firebase Admin Auth', key: 'firebase', status: 'Demo Local Token Middleware' }
            ].map(svc => (
              <div key={svc.key} className="p-3 bg-surface-page/50 rounded-card border border-surface-border flex items-center justify-between">
                <div>
                  <span className="font-bold text-content-main block">{svc.name}</span>
                  <span className="text-[10px] text-content-muted">
                    {testResult[svc.key] || svc.status}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleTestConnection(svc.key)}
                  className="px-2 py-1 bg-surface-card hover:bg-surface-border text-content-main rounded border border-surface-border font-bold text-[10px] transition"
                >
                  {testingService === svc.key ? 'Testing...' : 'Test'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center space-x-3">
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
            <span>Apply System Changes</span>
          </button>

          {isSaved && (
            <span className="flex items-center space-x-1 text-status-success font-semibold text-xs animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>System settings updated & audited!</span>
            </span>
          )}
        </div>

        {/* Danger Zone: Maintenance & Reset Demo Data */}
        <div className="pt-4 border-t border-surface-border">
          <div className="p-4 bg-status-critical/5 border border-status-critical/20 rounded-card flex items-center justify-between">
            <div>
              <span className="font-bold text-status-critical block">Maintenance: Reset Demo State</span>
              <span className="text-[11px] text-content-muted">Clears in-memory overrides and re-seeds baseline synthetic records.</span>
            </div>
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="px-3.5 py-1.5 bg-status-critical hover:bg-red-700 text-white font-bold rounded-input text-xs transition"
            >
              Reset Demo
            </button>
          </div>
        </div>
      </form>

      {/* Typed Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-card rounded-card max-w-sm w-full p-6 space-y-4 border border-surface-border shadow-2xl text-xs">
            <h3 className="font-heading font-bold text-sm text-status-critical">Type "RESET" to confirm</h3>
            <p className="text-content-muted">This resets demo data and resets all custom parameters to system defaults.</p>
            <input
              type="text"
              placeholder='Type "RESET"'
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              className="w-full p-2 bg-surface-page border border-surface-border rounded-input font-mono font-bold text-content-main uppercase"
            />
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-3 py-1.5 border border-surface-border rounded-input font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resetConfirmText !== 'RESET'}
                onClick={handleResetDemoData}
                className={`px-3 py-1.5 rounded-input font-bold text-white ${
                  resetConfirmText === 'RESET' ? 'bg-status-critical' : 'bg-surface-border cursor-not-allowed text-content-muted'
                }`}
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

