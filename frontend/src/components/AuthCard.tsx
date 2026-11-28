import React from 'react';
import { useAuth, PRESET_USERS, DemoPersona } from '../contexts/AuthContext';
import {
  User, Briefcase, Shield, ArrowRight, CheckCircle2, Zap
} from 'lucide-react';

export interface AuthCardProps {
  onSuccess?: () => void;
  isModal?: boolean;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
  initialPersonaId?: string;
}

export const AuthCard: React.FC<AuthCardProps> = ({
  onSuccess,
  isModal = false,
  onClose,
  title = "Select Persona to Enter",
  subtitle = "Direct 1-Click Role-Based Access Control (No passwords required)"
}) => {
  const { user, switchPersona } = useAuth();

  const handleSelect = async (demo: DemoPersona) => {
    await switchPersona(demo.id);
    if (onSuccess) onSuccess();
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Administrator':
        return <Shield className="w-5 h-5 text-purple-400" />;
      case 'Employee':
        return <Briefcase className="w-5 h-5 text-blue-400" />;
      default:
        return <User className="w-5 h-5 text-emerald-400" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'Administrator':
        return 'bg-purple-900/60 text-purple-300 border-purple-700/60';
      case 'Employee':
        return 'bg-blue-900/60 text-blue-300 border-blue-700/60';
      default:
        return 'bg-emerald-900/60 text-emerald-300 border-emerald-700/60';
    }
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100 max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center space-y-2 mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#6D28F5]/20 text-[#6D28F5] border border-[#6D28F5]/40 mb-1">
          <Zap className="w-6 h-6 fill-current" />
        </div>
        <h2 className="text-xl font-black text-white tracking-tight">{title}</h2>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>

      {/* Persona Cards */}
      <div className="space-y-3">
        {PRESET_USERS.map((demo) => {
          const isSelected = user?.user_id === demo.id;
          return (
            <button
              key={demo.id}
              onClick={() => handleSelect(demo)}
              className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all transform hover:-translate-y-0.5 group ${
                isSelected
                  ? 'bg-purple-950/40 border-[#6D28F5] shadow-lg shadow-purple-900/30'
                  : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-500 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                  {getRoleIcon(demo.role)}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-white group-hover:text-purple-300 transition">
                      {demo.name}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getRoleBadge(demo.role)}`}>
                      {demo.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    ID: {demo.id} • {demo.dept} ({demo.city})
                  </p>
                </div>
              </div>

              <div className="flex items-center text-slate-400 group-hover:text-white transition">
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Instant One-Click Entry</span>
        </div>
        <span>MongoDB RBAC Isolated</span>
      </div>
    </div>
  );
};
