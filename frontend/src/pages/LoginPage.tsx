import React from 'react';
import { AuthCard } from '../components/AuthCard';
import { Zap } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2 mb-6">
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

      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <AuthCard onSuccess={onLoginSuccess} />
      </div>
    </div>
  );
};
