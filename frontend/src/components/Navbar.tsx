import React, { useState } from 'react';
import { useAuth, PRESET_USERS } from '../contexts/AuthContext';
import {
  Shield, Sparkles, User, Database, CheckCircle2, Zap,
  ArrowRight, Search, Bell, ExternalLink, ChevronDown, Check,
  Radio, ShieldCheck, Activity
} from 'lucide-react';

interface NavbarProps {
  onNavigateLanding?: () => void;
  onOpenCommandPalette?: () => void;
  onNavigateProfile?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigateLanding, onOpenCommandPalette, onNavigateProfile }) => {
  const { user, switchPersona } = useAuth();
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  const roleBadgeColor = () => {
    switch (user?.role) {
      case 'Administrator':
        return 'bg-purple-100 text-[#6D28F5] border-purple-200';
      case 'Employee':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs transition-all">
      {/* Left: Project Badge & Command Search */}
      <div className="flex items-center gap-4">
        {/* Brand Home Button */}
        <button
          onClick={onNavigateLanding}
          className="text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#6D28F5] border border-purple-200 shadow-xs transition flex items-center gap-1.5 group"
          title="Return to Public Landing Page"
        >
          <Zap className="w-3.5 h-3.5 fill-[#6D28F5] group-hover:scale-110 transition" />
          <span>UtilityAI</span>
        </button>

        {/* Global Command Palette Launcher */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden md:flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 text-xs font-medium border border-slate-200 transition shadow-inner"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span>Search procedures, tickets, or actions...</span>
          <kbd className="px-1.5 py-0.5 rounded bg-white text-[10px] font-mono font-bold text-slate-500 shadow-xs border border-slate-200">
            Ctrl+K
          </kbd>
        </button>

        {/* System telemetry pill */}
        <div className="hidden lg:flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-bold text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Grounded RAG Live</span>
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-[#6D28F5] border border-purple-200/80 font-bold text-[11px]">
            <ShieldCheck className="w-3 h-3 text-[#6D28F5]" />
            <span>RBAC Strict</span>
          </span>
        </div>
      </div>

      {/* Right: Persona Switcher & Notifications */}
      <div className="flex items-center gap-3">
        {/* AI Model Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 text-[11px] font-semibold text-slate-600 border border-slate-200/80">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>gemini-2.5-flash</span>
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotification(!showNotification)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition relative"
            title="Operational Alerts"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
          </button>

          {showNotification && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 text-xs animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 font-bold text-slate-800">
                <span>Recent System Alerts</span>
                <span className="text-[10px] bg-purple-50 text-[#6D28F5] px-2 py-0.5 rounded-full">Live</span>
              </div>
              <div className="py-2 space-y-2">
                <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-200/60 text-amber-900">
                  <div className="font-bold flex items-center gap-1">
                    <Activity className="w-3 h-3 text-amber-600" />
                    <span>Transformer Alert - Ward 4</span>
                  </div>
                  <p className="text-[11px] text-amber-800 mt-0.5">Distribution feeder line inspection in progress.</p>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-200/60 text-emerald-900">
                  <div className="font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Vector Ingestion Complete</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 mt-0.5">Electricity Connection SOP.pdf re-indexed in ChromaDB.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Persona Select Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowRoleDropdown(!showRoleDropdown)}
            className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-purple-50/80 hover:bg-purple-100/80 border border-purple-200 transition shadow-xs"
          >
            <div className="w-6 h-6 rounded-lg bg-[#6D28F5] text-white flex items-center justify-center font-bold text-[11px]">
              {user?.name?.slice(0, 1) || 'U'}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-[#171642] leading-tight">
                {user?.name || 'John Doe'}
              </div>
              <div className="text-[10px] font-semibold text-[#6D28F5] leading-tight">
                {user?.role || 'Customer'}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showRoleDropdown && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 animate-in fade-in duration-150">
              <div className="px-3 py-2 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Switch Role / Persona (One-Click RBAC)
                </span>
                <span className="text-[11px] text-slate-500">
                  Instantly tests authorization and data isolation.
                </span>
              </div>

              <div className="py-1 space-y-1">
                {/* Customer */}
                <button
                  onClick={() => { switchPersona('CUST0001'); setShowRoleDropdown(false); }}
                  className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between transition ${
                    user?.user_id === 'CUST0001' ? 'bg-[#F3EEFF] text-[#6D28F5] font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <div>
                      <div className="text-xs font-bold">John Doe</div>
                      <div className="text-[10px] text-slate-400">Citizen / Customer (CUST0001)</div>
                    </div>
                  </div>
                  {user?.user_id === 'CUST0001' && <Check className="w-4 h-4 text-[#6D28F5]" />}
                </button>

                {/* Employee */}
                <button
                  onClick={() => { switchPersona('EMP0001'); setShowRoleDropdown(false); }}
                  className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between transition ${
                    user?.user_id === 'EMP0001' ? 'bg-[#F3EEFF] text-[#6D28F5] font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <div>
                      <div className="text-xs font-bold">Priya Singh</div>
                      <div className="text-[10px] text-slate-400">Operations Staff (EMP0001)</div>
                    </div>
                  </div>
                  {user?.user_id === 'EMP0001' && <Check className="w-4 h-4 text-[#6D28F5]" />}
                </button>

                {/* Admin */}
                <button
                  onClick={() => { switchPersona('ADM0001'); setShowRoleDropdown(false); }}
                  className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between transition ${
                    user?.user_id === 'ADM0001' ? 'bg-[#F3EEFF] text-[#6D28F5] font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="w-2 h-2 rounded-full bg-slate-900" />
                    <div>
                      <div className="text-xs font-bold">Amit Kumar</div>
                      <div className="text-[10px] text-slate-400">System Administrator (ADM0001)</div>
                    </div>
                  </div>
                  {user?.user_id === 'ADM0001' && <Check className="w-4 h-4 text-[#6D28F5]" />}
                </button>
              </div>

              {/* View & Edit Profile Link */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    setShowRoleDropdown(false);
                    if (onNavigateProfile) onNavigateProfile();
                  }}
                  className="w-full py-2 px-3 bg-[#6D28F5] hover:bg-[#5B21D6] text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-xs"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>View & Edit Profile</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
