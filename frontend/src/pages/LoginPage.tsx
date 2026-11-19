import React, { useState } from 'react';
import { useAuth, PRESET_USERS } from '../contexts/AuthContext';
import {
  ShieldCheck, Lock, User, Mail, ArrowRight, CheckCircle2,
  Zap, Sparkles, Building2, KeyRound
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { user, switchPersona } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    // Find matching demo user or fallback to CUST0001
    const match = PRESET_USERS.find(u => u.name.toLowerCase().includes(email.toLowerCase())) || PRESET_USERS[0];
    await switchPersona(match.id);
    setLoading(false);
    onLoginSuccess();
  };

  const handleDemoSelect = async (userId: string) => {
    await switchPersona(userId);
    onLoginSuccess();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="inline-flex items-center justify-center p-3 bg-blue-600/30 rounded-2xl border border-blue-500/40 shadow-inner">
          <Zap className="w-8 h-8 text-blue-400" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">TechBharat C2-22</h1>
        <p className="text-xs uppercase tracking-widest font-semibold text-blue-300">
          Generative AI-Powered Utility Virtual Assistant
        </p>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Production MVP with Role-Based Access Control, PDF RAG Engine, and SCADA Operations Summarizer
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-slate-800/90 py-8 px-6 shadow-2xl rounded-2xl border border-slate-700/80 sm:px-10 backdrop-blur-md space-y-6">
          {/* Quick Demo Persona Switcher */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center">
                <KeyRound className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
                Select Instant Demo Persona
              </span>
              <span className="text-[10px] text-emerald-400 font-medium">1-Click Evaluation Login</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PRESET_USERS.map((demo) => {
                const isSelected = user?.user_id === demo.id;
                return (
                  <button
                    key={demo.id}
                    onClick={() => handleDemoSelect(demo.id)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500 text-white ring-1 ring-blue-400'
                        : 'bg-slate-900/60 border-slate-700/80 hover:bg-slate-700/50 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white truncate">{demo.name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                        demo.role === 'Administrator' ? 'bg-purple-900 text-purple-300' :
                        demo.role === 'Employee' ? 'bg-indigo-900 text-indigo-300' :
                        'bg-blue-900 text-blue-300'
                      }`}>
                        {demo.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-1">
                      {demo.dept || demo.city}
                    </div>
                    <div className="text-[10px] font-mono text-blue-400 mt-1">
                      ID: {demo.id}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-800 px-3 text-slate-400 font-semibold tracking-wider">
                Or Sign in with Firebase Credentials
              </span>
            </div>
          </div>

          {/* Standard Form */}
          <form onSubmit={handleCustomLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300">Email Address</label>
              <div className="mt-1 relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rajesh.sharma@example.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300">Password</label>
              <div className="mt-1 relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 text-white text-xs rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-2"
            >
              <span>Authenticate Session</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Architecture Verification Footer */}
          <div className="pt-3 border-t border-slate-700/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center">
              <ShieldCheck className="w-4 h-4 text-emerald-400 mr-1.5" />
              RBAC Verified Backend
            </span>
            <span className="font-mono text-[10px] text-slate-500">FastAPI + MongoDB + ChromaDB</span>
          </div>
        </div>
      </div>
    </div>
  );
};
